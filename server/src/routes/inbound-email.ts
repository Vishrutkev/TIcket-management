import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import prisma from '../lib/prisma'
import boss from '../lib/boss'
import { requireWebhookToken } from '../middleware/webhook'
import { CLASSIFY_TICKET_QUEUE } from '../workers/classifyTicket'

const router = Router()
const upload = multer()

const inboundEmailSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
})

function parseFrom(raw: string): { email: string; name: string } {
  const match = raw.match(/^(.+?)\s*<([^>]+)>$/)
  return match
    ? { name: match[1].trim(), email: match[2].trim() }
    : { name: '', email: raw.trim() }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

router.post('/', requireWebhookToken, upload.none(), async (req, res) => {
  const result = inboundEmailSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }

  const { from, subject, text, html } = result.data
  const { email: customerEmail, name: customerName } = parseFrom(from)
  const textBody = text ?? (html ? stripHtml(html) : '')

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      customerEmail,
      customerName: customerName || null,
      status: 'open',
    },
  })

  await prisma.message.create({
    data: {
      ticketId: ticket.id,
      body: textBody,
      senderType: 'customer',
    },
  })

  res.json({ ok: true })

  await boss.send(
    CLASSIFY_TICKET_QUEUE,
    { ticketId: ticket.id, subject, body: textBody },
    { retryLimit: 3, retryBackoff: true },
  )
})

export default router
