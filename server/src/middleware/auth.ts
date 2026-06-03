import { Request, Response, NextFunction } from 'express'
import { Role } from '@prisma/client'
import { fromNodeHeaders } from 'better-auth/node'
import { auth } from '../lib/auth'
import prisma from '../lib/prisma'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) })

  if (!session) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  // Fetch full user to include custom fields (role, isActive) not returned by BA
  const user = await prisma.user.findUnique({ where: { id: session.user.id } })

  if (!user || !user.isActive) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  res.locals.user = user
  next()
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    if (res.locals.user?.role !== Role.admin) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  })
}
