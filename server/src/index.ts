import express from 'express'
import cors from 'cors'
import { toNodeHandler } from 'better-auth/node'
import { auth } from './lib/auth'
import ticketsRouter from './routes/tickets'
import usersRouter from './routes/users'

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }))

// Better Auth handler must come before express.json()
app.all('/api/auth/*', toNodeHandler(auth))

app.use(express.json())

app.use('/api/tickets', ticketsRouter)
app.use('/api/users', usersRouter)

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
