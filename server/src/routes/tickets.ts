import { Router } from 'express'
import { z } from 'zod'
import { Role } from '@prisma/client'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

const SORTABLE_COLUMNS = ['subject', 'customerEmail', 'status', 'priority', 'createdAt'] as const

const ticketQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'closed']).optional(),
  category: z.enum(['general_question', 'technical_question', 'refund_request']).optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  sortBy: z.enum(SORTABLE_COLUMNS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

const patchTicketSchema = z.object({
  status: z.enum(['open', 'resolved', 'closed']).optional(),
  category: z.enum(['general_question', 'technical_question', 'refund_request']).nullable().optional(),
  assignedAgentId: z.string().nullable().optional(),
})

router.get('/agents', async (_req, res) => {
  const agents = await prisma.user.findMany({
    where: { role: 'agent', isActive: true, deletedAt: null },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  })
  res.json(agents)
})

router.get('/', async (req, res) => {
  const result = ticketQuerySchema.safeParse(req.query)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }
  const { status, category, priority, sortBy = 'createdAt', sortOrder = 'desc', search, page, pageSize } = result.data

  const where = {
    ...(status ? { status } : {}),
    ...(category ? { category } : {}),
    ...(priority ? { priority } : {}),
    ...(search ? {
      OR: [
        { subject: { contains: search, mode: 'insensitive' as const } },
        { customerEmail: { contains: search, mode: 'insensitive' as const } },
      ],
    } : {}),
  }

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
  ])

  res.json({
    data: tickets,
    total,
    page,
    pageSize,
    pageCount: Math.ceil(total / pageSize),
  })
})

router.get('/:id', async (req, res) => {
  const ticket = await prisma.ticket.findUnique({
    where: { id: req.params.id },
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
      messages: { orderBy: { createdAt: 'asc' } },
    },
  })

  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' })
    return
  }

  res.json(ticket)
})

router.patch('/:id', async (req, res) => {
  const result = patchTicketSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }
  const { status, category, assignedAgentId } = result.data

  if (assignedAgentId !== undefined && assignedAgentId !== null) {
    const agent = await prisma.user.findUnique({ where: { id: assignedAgentId } })
    if (!agent || agent.role !== Role.agent || !agent.isActive) {
      res.status(400).json({ error: 'assignedAgentId must refer to an active agent' })
      return
    }
  }

  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: {
      ...(status !== undefined ? { status } : {}),
      ...(category !== undefined ? { category } : {}),
      ...(assignedAgentId !== undefined ? { assignedAgentId } : {}),
    },
  })

  res.json(ticket)
})

export default router
