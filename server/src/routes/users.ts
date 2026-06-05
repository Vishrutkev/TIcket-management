import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { Role } from "@prisma/client";

import prisma from "../lib/prisma";
import { requireAdmin } from "../middleware/auth";
import { createUserSchema, editUserSchema } from "@tm/core";

const router = Router();

router.use(requireAdmin);

const AI_SYSTEM_EMAIL = 'ai@system.local'

const patchUserSchema = z.object({
  isActive: z.boolean(),
});

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null, email: { not: AI_SYSTEM_EMAIL } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
  res.json(users);
});

router.post("/", async (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { name, email, password } = result.data;

  // Use findUnique (email has a @unique constraint) so both active and
  // soft-deleted records are caught — prevents a DB unique violation later.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const userId = randomUUID();
  const hash = await hashPassword(password);

  await prisma.$transaction([
    prisma.user.create({
      data: { id: userId, name, email, role: Role.agent, emailVerified: true },
    }),
    prisma.account.create({
      data: {
        id: randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hash,
      },
    }),
  ]);

  res.status(201).json({ id: userId, name, email, isActive: true });
});

router.patch("/:id", async (req, res) => {
  const result = patchUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { isActive } = result.data;

  if (req.params.id === res.locals.user.id && !isActive) {
    res.status(400).json({ error: "You cannot deactivate your own account" });
    return;
  }

  const target = await prisma.user.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.email === AI_SYSTEM_EMAIL) {
    res.status(403).json({ error: "The AI system account cannot be modified" });
    return;
  }
  if (target.role === Role.admin) {
    res.status(403).json({
      error: "Admin accounts cannot be modified through this endpoint",
    });
    return;
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive },
    select: { id: true, name: true, email: true, isActive: true },
  });

  res.json(user);
});

router.put("/:id", async (req, res) => {
  const result = editUserSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { name, email, password } = result.data;

  const target = await prisma.user.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.email === AI_SYSTEM_EMAIL) {
    res.status(403).json({ error: "The AI system account cannot be modified" });
    return;
  }
  if (target.role === Role.admin) {
    res.status(403).json({
      error: "Admin accounts cannot be modified through this endpoint",
    });
    return;
  }

  if (email !== target.email) {
    const conflict = await prisma.user.findUnique({ where: { email } });
    if (conflict) {
      res.status(409).json({ error: "Email already in use" });
      return;
    }
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { name, email },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });

  if (password) {
    const hash = await hashPassword(password);
    await prisma.account.updateMany({
      where: { userId: req.params.id, providerId: "credential" },
      data: { password: hash },
    });
  }

  res.json(user);
});

router.delete("/:id", async (req, res) => {
  if (req.params.id === res.locals.user.id) {
    res.status(400).json({ error: "You cannot delete your own account" });
    return;
  }

  const target = await prisma.user.findFirst({
    where: { id: req.params.id, deletedAt: null },
  });
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (target.email === AI_SYSTEM_EMAIL) {
    res.status(403).json({ error: "The AI system account cannot be deleted" });
    return;
  }
  if (target.role === Role.admin) {
    res.status(403).json({ error: "Admin accounts cannot be deleted" });
    return;
  }

  await prisma.$transaction([
    prisma.ticket.updateMany({
      where: { assignedAgentId: req.params.id },
      data: { assignedAgentId: null },
    }),
    prisma.user.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), isActive: false },
    }),
  ]);
  res.json({ ok: true });
});

export default router;
