import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import prisma from '../lib/prisma'
import { requireWebhookToken } from '../middleware/webhook'

const router = Router()
const upload = multer()

const inboundEmailSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
})

const classificationSchema = z.object({
  category: z.enum(['general_question', 'technical_question', 'refund_request']).nullable(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).nullable(),
  aiSummary: z.string().nullable().describe('1-2 sentence summary of the customer\'s issue for agents'),
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

async function classifyTicket(ticketId: string, subject: string, body: string) {
  try {
    const { object } = await generateObject({
      model: openai('gpt-5-nano'),
      schema: classificationSchema,
      system: 'You are a support ticket classifier. Analyse the email and return the category, priority, and a brief agent-facing summary.',
      prompt: `Subject: ${subject}\n\nBody: ${body.slice(0, 2000)}`,
    })

    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        category: object.category,
        priority: object.priority,
        aiSummary: object.aiSummary,
      },
    })
  } catch (err) {
    console.error('[classify-ticket] failed for ticket', ticketId, err)
  }
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

  // Create the ticket and first message immediately so the webhook returns fast
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

  // Classify in the background — does not block the response
  classifyTicket(ticket.id, subject, textBody)
})

export default router
