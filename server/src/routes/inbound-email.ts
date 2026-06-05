import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import prisma from '../lib/prisma'
import boss from '../lib/boss'
import { requireWebhookToken } from '../middleware/webhook'
import { CLASSIFY_TICKET_QUEUE } from '../workers/classifyTicket'
import { AUTO_RESOLVE_QUEUE } from '../workers/autoResolveTicket'

const router = Router()
const upload = multer()

// Cached on first use — the AI agent ID never changes at runtime
let aiAgentId: string | null | undefined

async function getAiAgentId(): Promise<string | null> {
  if (aiAgentId !== undefined) return aiAgentId
  const agent = await prisma.user.findFirst({
    where: { email: 'ai@system.local', role: 'agent', isActive: true },
    select: { id: true },
  })
  aiAgentId = agent?.id ?? null
  return aiAgentId
}

const inboundEmailSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  headers: z.string().optional(),
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

/**
 * Extracts a ticket ID from email threading headers (In-Reply-To / References).
 * We embed Message-ID: <ticket-{id}@domain> on outgoing emails, so replies
 * carry that value back in In-Reply-To / References.
 */
function extractTicketIdFromHeaders(headers: string): string | null {
  // Match <ticket-{id}@anything> in In-Reply-To or References lines
  const match = headers.match(/^(?:In-Reply-To|References):.*<ticket-([^@>]+)@/im)
  return match ? match[1] : null
}

router.post('/', requireWebhookToken, upload.none(), async (req, res) => {
  const result = inboundEmailSchema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return
  }

  const { from, subject, text, html, headers } = result.data
  const { email: customerEmail, name: customerName } = parseFrom(from)
  const textBody = text ?? (html ? stripHtml(html) : '')

  // --- Thread detection: route reply to existing ticket if possible ---
  if (headers) {
    const ticketId = extractTicketIdFromHeaders(headers)
    if (ticketId) {
      const existingTicket = await prisma.ticket.findUnique({ where: { id: ticketId } })
      if (existingTicket) {
        await prisma.message.create({
          data: { ticketId, body: textBody, senderType: 'customer' },
        })
        // Re-open resolved tickets when the customer replies
        if (existingTicket.status === 'resolved') {
          await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'open' } })
        }
        res.json({ ok: true })
        console.log(`[inbound-email] threaded reply added to ticket ${ticketId}`)
        return
      }
    }
  }

  // --- No thread match: create a new ticket ---
  const resolvedAiAgentId = await getAiAgentId()

  const ticket = await prisma.ticket.create({
    data: {
      subject,
      customerEmail,
      customerName: customerName || null,
      status: 'new',
      assignedAgentId: resolvedAiAgentId,
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
  await boss.send(
    AUTO_RESOLVE_QUEUE,
    { ticketId: ticket.id, subject, body: textBody, aiAgentId: resolvedAiAgentId },
    { retryLimit: 3, retryBackoff: true },
  )
})

export default router
