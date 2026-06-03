import { Router } from 'express'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res) => {
  const { status, category, priority } = req.query

  const tickets = await prisma.ticket.findMany({
    where: {
      ...(status ? { status: String(status) } : {}),
      ...(category ? { category: String(category) } : {}),
      ...(priority ? { priority: String(priority) } : {}),
    },
    include: {
      assignedAgent: { select: { id: true, name: true, email: true } },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: 'desc' },
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
  const { status, assignedAgentId } = req.body

  const ticket = await prisma.ticket.update({
    where: { id: req.params.id },
    data: {
      ...(status ? { status } : {}),
      ...(assignedAgentId !== undefined ? { assignedAgentId } : {}),
    },
  })

  res.json(ticket)
})

export default router
