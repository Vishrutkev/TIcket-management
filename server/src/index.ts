import express, { NextFunction, Request, Response } from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { toNodeHandler } from 'better-auth/node'
import { Prisma } from '@prisma/client'
import { auth } from './lib/auth'
import boss from './lib/boss'
import ticketsRouter from './routes/tickets'
import usersRouter from './routes/users'
import inboundEmailRouter from './routes/inbound-email'
import { CLASSIFY_TICKET_QUEUE, classifyTicketWorker } from './workers/classifyTicket'

const app = express()
const PORT = process.env.PORT || 3000

// CORS: use the same CLIENT_URL env var that Better Auth trustedOrigins uses.
// Never hardcode a port here — a mismatch silently trusts the wrong origin.
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))

// Rate-limit sign-in attempts in production only — keep dev/test unrestricted.
if (process.env.NODE_ENV === 'production') {
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts, please try again later' },
  })
  app.use('/api/auth/sign-in', authLimiter)
}

// Better Auth handler must come before express.json()
app.all('/api/auth/*path', toNodeHandler(auth))

app.use(express.json())

app.use('/api/inbound-email', inboundEmailRouter)

app.use('/api/tickets', ticketsRouter)
app.use('/api/users', usersRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

// Global error handler — catches all errors forwarded via next(err).
// Maps known Prisma error codes to clean HTTP responses so stack traces
// and query context never reach the client.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Resource not found' })
      return
    }
    if (err.code === 'P2003') {
      res.status(400).json({ error: 'Invalid reference: related record does not exist' })
      return
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A record with that value already exists' })
      return
    }
  }
  // Log internally but never surface internal details to the caller
  console.error('[unhandled error]', err)
  res.status(500).json({ error: 'Internal server error' })
})

async function startServer() {
  await boss.start()
  await boss.createQueue(CLASSIFY_TICKET_QUEUE)
  await boss.work(CLASSIFY_TICKET_QUEUE, classifyTicketWorker)
  console.log('[pg-boss] classify-ticket worker registered')

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

startServer().catch(console.error)
