import { Request, Response, NextFunction } from 'express'
import prisma from '../lib/prisma'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.sessionId

  if (!sessionId) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  res.locals.user = session.user
  next()
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  await requireAuth(req, res, async () => {
    if (res.locals.user?.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  })
}
