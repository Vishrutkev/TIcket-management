import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import prisma from '../lib/prisma'
import { requireAuth } from '../middleware/auth'

const router = Router()

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

router.post('/login', async (req, res) => {
  const { email, password } = req.body

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const valid = await bcrypt.compare(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  const session = await prisma.session.create({
    data: {
      id: uuidv4(),
      userId: user.id,
      expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
    },
  })

  res.cookie('sessionId', session.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS,
  })

  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

router.post('/logout', requireAuth, async (req, res) => {
  const sessionId = req.cookies?.sessionId
  await prisma.session.delete({ where: { id: sessionId } })
  res.clearCookie('sessionId')
  res.json({ ok: true })
})

router.get('/me', requireAuth, (req, res) => {
  const { id, name, email, role } = res.locals.user
  res.json({ id, name, email, role })
})

export default router
