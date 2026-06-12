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
  subject: z.string().optional(),
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
 * Removes quoted reply history from a plain-text email body.
 * Cuts at the first line that looks like a quote delimiter:
 *   - Gmail/Apple Mail: "On [date] ... wrote:"  (single or wrapped across two lines)
 *   - Outlook: "-----Original Message-----" or "____..."
 *   - Any line starting with ">" (inline quoted text)
 */
function stripQuotedReply(text: string): string {
  const normalized = text.replace(/\r\n/g, '\n')
  const lines = normalized.split('\n')
  const out: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    // Outlook "-----Original Message-----" or similar
    if (/^-{3,}.*original\s+message.*-{3,}$/i.test(trimmed)) break

    // Outlook underline separator
    if (/^_{5,}$/.test(trimmed) && i > 0) break

    // Quoted line prefix ">"
    if (trimmed.startsWith('>') && i > 0) break

    // Gmail / Apple Mail: "On [date] ... wrote:"
    // May be wrapped: "On [date]\n[name] <email> wrote:"
    if (/^On .{5,}/.test(trimmed)) {
      const thisAndNext = trimmed + ' ' + (lines[i + 1] ?? '')
      if (/wrote:\s*$/.test(thisAndNext)) break
    }

    out.push(line)
  }

  return out.join('\n').trim()
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

  const { from, subject: rawSubject, text, html, headers } = result.data
  const subject = rawSubject?.trim() || '(No Subject)'
  const { email: customerEmail, name: customerName } = parseFrom(from)
  // Use || not ?? so an empty-string text field (HTML-only emails) falls through to html
  const rawBody = text || (html ? stripHtml(html) : '')
  const textBody = stripQuotedReply(rawBody)

  // --- Thread detection: route reply to existing ticket if possible ---

  // 1. Header-based threading (primary): check In-Reply-To / References for our Message-ID
  if (headers) {
    const ticketId = extractTicketIdFromHeaders(headers)
    if (ticketId) {
      const existingTicket = await prisma.ticket.findUnique({ where: { id: ticketId } })
      // Guard: ticket must exist AND belong to this sender to prevent cross-customer threading
      if (existingTicket && existingTicket.customerEmail === customerEmail) {
        await prisma.message.create({
          data: { ticketId, body: textBody, senderType: 'customer' },
        })
        // Re-open resolved tickets when the customer replies
        if (existingTicket.status === 'resolved') {
          await prisma.ticket.update({ where: { id: ticketId }, data: { status: 'open' } })
        }
        res.json({ ok: true })
        console.log(`[inbound-email] threaded reply added to ticket ${ticketId} (header match)`)
        return
      }
    }
  }

  // 2. Subject-based fallback: catches replies from clients that strip threading headers.
  //    Only runs when the subject has a "Re:" prefix — a reliable signal that this is a reply.
  const rePrefix = /^re:\s*/i
  if (rePrefix.test(subject)) {
    const originalSubject = subject.replace(rePrefix, '').trim()
    const existingBySubject = await prisma.ticket.findFirst({
      where: {
        subject: { equals: originalSubject, mode: 'insensitive' },
        customerEmail,
        status: { in: ['new', 'processing', 'open'] },
      },
      orderBy: { createdAt: 'desc' },
    })
    if (existingBySubject) {
      await prisma.message.create({
        data: { ticketId: existingBySubject.id, body: textBody, senderType: 'customer' },
      })
      if (existingBySubject.status === 'resolved') {
        await prisma.ticket.update({ where: { id: existingBySubject.id }, data: { status: 'open' } })
      }
      res.json({ ok: true })
      console.log(`[inbound-email] threaded reply added to ticket ${existingBySubject.id} (subject match)`)
      return
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
