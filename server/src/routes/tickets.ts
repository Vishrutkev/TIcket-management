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
})

const patchTicketSchema = z.object({
  status: z.enum(['open', 'resolved', 'closed']).optional(),
  assignedAgentId: z.string().nullable().optional(),
})

router.get('/', async (req, res) => {
  const result = ticketQuerySchema.safeParse(req.query)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }
  const { status, category, priority, sortBy = 'createdAt', sortOrder = 'desc', search } = result.data

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(category ? { category } : {}),
      ...(priority ? { priority } : {}),
      ...(search ? {
        OR: [
          { subject: { contains: search, mode: 'insensitive' } },
          { customerEmail: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    },
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { [sortBy]: sortOrder },
  })

  res.json(tickets)
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
  const { status, assignedAgentId } = result.data

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
      ...(assignedAgentId !== undefined ? { assignedAgentId } : {}),
    },
  })

  res.json(ticket)
})

export default router
