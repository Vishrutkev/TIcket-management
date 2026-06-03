import { Router } from 'express'
import { Role } from '@prisma/client'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

// Allowlists derived from the documented ticket enums.
// Kept here (not in a shared module) so the route file is self-contained.
const VALID_STATUSES = ['open', 'resolved', 'closed'] as const
const VALID_CATEGORIES = ['general_question', 'technical_question', 'refund_request'] as const
const VALID_PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const

type TicketStatus = (typeof VALID_STATUSES)[number]
type TicketCategory = (typeof VALID_CATEGORIES)[number]
type TicketPriority = (typeof VALID_PRIORITIES)[number]

router.get('/', async (req, res, next) => {
  try {
    const { status, category, priority } = req.query

    // Reject unrecognised filter values early — storing or filtering on arbitrary
    // strings produces confusing empty results and masks typos in client code.
    if (status && !VALID_STATUSES.includes(status as TicketStatus)) {
      res.status(400).json({ error: `Invalid status filter. Allowed: ${VALID_STATUSES.join(', ')}` })
      return
    }
    if (category && !VALID_CATEGORIES.includes(category as TicketCategory)) {
      res.status(400).json({ error: `Invalid category filter. Allowed: ${VALID_CATEGORIES.join(', ')}` })
      return
    }
    if (priority && !VALID_PRIORITIES.includes(priority as TicketPriority)) {
      res.status(400).json({ error: `Invalid priority filter. Allowed: ${VALID_PRIORITIES.join(', ')}` })
      return
    }

    const tickets = await prisma.ticket.findMany({
      where: {
        ...(status ? { status: status as TicketStatus } : {}),
        ...(category ? { category: category as TicketCategory } : {}),
        ...(priority ? { priority: priority as TicketPriority } : {}),
      },
      include: {
        assignedAgent: { select: { id: true, name: true, email: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(tickets)
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { status, assignedAgentId } = req.body

    // Validate status against the known allowlist before writing to the DB.
    // The schema stores status as a plain String (not a Prisma enum), so the
    // ORM will not catch invalid values — we must do it here.
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      res.status(400).json({ error: `Invalid status. Allowed: ${VALID_STATUSES.join(', ')}` })
      return
    }

    // Validate that assignedAgentId refers to an existing, active agent.
    // Prevents: assigning to non-existent IDs (FK crash), assigning to admins,
    // and assigning to deactivated users.
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
  } catch (err) {
    next(err)
  }
})

export default router
