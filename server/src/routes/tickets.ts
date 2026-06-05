import { Router } from "express";
import { Role } from "@prisma/client";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import prisma from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import {
  ticketQuerySchema,
  patchTicketSchema,
  postMessageSchema,
  polishReplySchema,
} from "../schemas/tickets";

const router = Router();

router.use(requireAuth);

router.get("/agents", async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: "agent", isActive: true, deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
  res.json(agents);
});

router.get("/", async (req, res) => {
  const result = ticketQuerySchema.safeParse(req.query);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const {
    status,
    category,
    priority,
    sortBy = "createdAt",
    sortOrder = "desc",
    search,
    page,
    pageSize,
  } = result.data;

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(priority ? { priority } : {}),
    ...(search
      ? {
          OR: [
            { subject: { contains: search, mode: "insensitive" as const } },
            {
              customerEmail: { contains: search, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
  };

  const [tickets, total] = await prisma.$transaction([
    prisma.ticket.findMany({
      where,
      include: {
        assignedAgent: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
  ]);

  res.json({
    data: tickets,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  });
});

router.get("/:id", async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        include: { agent: { select: { id: true, name: true } } },
      },
    },
  });

  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  res.json(ticket);
});

router.post("/:id/messages", async (req, res) => {
  const result = postMessageSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const message = await prisma.message.create({
    data: {
      ticketId: req.params.id,
      body: result.data.body,
      senderType: "agent",
      agentId: res.locals.user.id,
    },
    include: { agent: { select: { id: true, name: true } } },
  });

  res.status(201).json(message);
});

router.post("/:id/polish", async (req, res) => {
  const result = polishReplySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }

  const agentName: string = res.locals.user.name
  const fullName = ticket.customerName || ticket.customerEmail.split('@')[0]
  const customerFirstName = fullName.split(' ')[0]

  try {
    const { text } = await generateText({
      model: openai("gpt-5-nano"),
      messages: [
        {
          role: "system",
          content:
            `You are a support agent assistant. Rewrite the draft reply to be clear, professional, and empathetic while preserving the original intent. Begin the reply with "Dear ${customerFirstName}," on its own line. End the reply with a warm closing (e.g. "Warm regards,") followed by the agent's name "${agentName}" on the next line. Return only the polished reply text with no extra commentary.`,
        },
        {
          role: "user",
          content: `Support ticket subject: "${ticket.subject}"\n\nDraft reply:\n${result.data.body}`,
        },
      ],
    });
    res.json({ polished: text });
  } catch (err) {
    console.error("[polish-reply error]", err);
    res
      .status(502)
      .json({ error: "Failed to polish reply. Please try again." });
  }
});

router.patch("/:id", async (req, res) => {
  const result = patchTicketSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }
  const { status, category, assignedAgentId } = result.data;

  if (assignedAgentId !== undefined && assignedAgentId !== null) {
    const agent = await prisma.user.findUnique({
      where: { id: assignedAgentId },
    });
    if (!agent || agent.role !== Role.agent || !agent.isActive) {
      res
        .status(400)
        .json({ error: "assignedAgentId must refer to an active agent" });
      return;
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(assignedAgentId !== undefined ? { assignedAgentId } : {}),
    },
  });

  res.json(ticket);
});

export default router;
