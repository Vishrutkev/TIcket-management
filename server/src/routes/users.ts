import { Router } from 'express'
import { Role } from '@prisma/client'
import prisma from '../lib/prisma'
import { auth } from '../lib/auth'
import { requireAdmin } from '../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/', async (_req, res) => {
  const users = await prisma.user.findMany({
    where: { role: Role.agent },
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

  const result = await auth.api.signUpEmail({ body: { name, email, password } })

  await prisma.user.update({
    where: { id: result.user.id },
    data: { role: Role.agent },
  })

  res.status(201).json({ id: result.user.id, name, email, isActive: true })
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
