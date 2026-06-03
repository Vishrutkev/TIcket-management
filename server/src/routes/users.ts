import { Router } from 'express'
import bcrypt from 'bcryptjs'
import prisma from '../lib/prisma'
import { requireAdmin } from '../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: 'agent' },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  })
  res.json(users)
})

router.post('/', async (req, res) => {
  const { name, email, password } = req.body

  if (!name || !email || !password) {
    res.status(400).json({ error: 'name, email, and password are required' })
    return
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    res.status(409).json({ error: 'Email already in use' })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: 'agent' },
    select: { id: true, name: true, email: true, isActive: true, createdAt: true },
  })

  res.status(201).json(user)
})

router.patch('/:id', async (req, res) => {
  const { isActive } = req.body

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive },
    select: { id: true, name: true, email: true, isActive: true },
  })

  res.json(user)
})

router.delete('/:id', async (req, res) => {
  await prisma.user.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
