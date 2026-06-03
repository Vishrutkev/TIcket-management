import { Router } from 'express'
import { Role } from '@prisma/client'
import prisma from '../lib/prisma'
import { auth } from '../lib/auth'
import { requireAdmin } from '../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(users)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
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
  } catch (err) {
    next(err)
  }
})

router.patch('/:id', async (req, res, next) => {
  try {
    const { isActive } = req.body

    // Require an explicit boolean — reject numeric 1/0, strings "true"/"false",
    // and null. TypeScript types are erased at runtime so we must check here.
    if (typeof isActive !== 'boolean') {
      res.status(400).json({ error: 'isActive must be a boolean' })
      return
    }

    // Prevent an admin from accidentally deactivating their own account,
    // which would immediately lock them out of the system.
    if (req.params.id === res.locals.user.id && !isActive) {
      res.status(400).json({ error: 'You cannot deactivate your own account' })
      return
    }

    // Only agent accounts are managed through this endpoint.
    // Blocks modification of other admin accounts via a known ID.
    const target = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!target) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (target.role === Role.admin) {
      res.status(403).json({ error: 'Admin accounts cannot be modified through this endpoint' })
      return
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive },
      select: { id: true, name: true, email: true, isActive: true },
    })

    res.json(user)
  } catch (err) {
    next(err)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    // Prevent an admin from deleting their own account — would leave the system
    // with no admins and no way to recover via the API.
    if (req.params.id === res.locals.user.id) {
      res.status(400).json({ error: 'You cannot delete your own account' })
      return
    }

    // Only agent accounts are managed through this endpoint.
    const target = await prisma.user.findUnique({ where: { id: req.params.id } })
    if (!target) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    if (target.role === Role.admin) {
      res.status(403).json({ error: 'Admin accounts cannot be deleted through this endpoint' })
      return
    }

    await prisma.user.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch (err) {
    next(err)
  }
})

export default router
