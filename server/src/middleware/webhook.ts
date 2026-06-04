import crypto from 'node:crypto'
import { Request, Response, NextFunction } from 'express'

export function requireWebhookToken(req: Request, res: Response, next: NextFunction) {
  const webhookToken = process.env.SENDGRID_WEBHOOK_TOKEN
  if (!webhookToken) {
    next()
    return
  }

  const provided = req.query.token
  if (typeof provided !== 'string' || provided.length === 0) {
    res.status(401).json({ error: 'Missing webhook token' })
    return
  }

  const a = Buffer.from(provided)
  const b = Buffer.from(webhookToken)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Invalid webhook token' })
    return
  }

  next()
}
