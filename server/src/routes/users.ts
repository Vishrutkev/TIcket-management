import { Router } from "express";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { Role } from "@prisma/client";

import prisma from "../lib/prisma";
import { auth } from "../lib/auth";
import { requireAdmin } from "../middleware/auth";
import { createUserSchema, editUserSchema } from "@tm/core";

const router = Router();

router.use(requireAdmin);

const patchUserSchema = z.object({
  isActive: z.boolean(),
});

router.get("/", async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { deletedAt: null },
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

  const existing = await prisma.user.findFirst({
    where: { email, deletedAt: null },
  });
  if (existing) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const signUpResult = await auth.api.signUpEmail({
    body: { name, email, password },
  });

  await prisma.user.update({
    where: { id: signUpResult.user.id },
    data: { role: Role.agent },
  });

  res
    .status(201)
    .json({ id: signUpResult.user.id, name, email, isActive: true });
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
