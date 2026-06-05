import { Router } from 'express'
import multer from 'multer'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { anthropic } from '../lib/anthropic'
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

const aiResultSchema = z.object({
  category: z.enum(['general_question', 'technical_question', 'refund_request']).nullable(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).nullable(),
  summary: z.string().nullable(),
})

const CLASSIFICATION_SYSTEM_PROMPT = `You are a support ticket classifier. Given an email subject and body, respond with ONLY a JSON object (no markdown, no explanation) with:
- "category": "general_question" | "technical_question" | "refund_request" | null
- "priority": "urgent" | "high" | "normal" | "low" | null
- "summary": 1-2 sentence summary of the customer's issue for agents, or null`

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

  let category: string | null = null
  let priority: string | null = null
  let aiSummary: string | null = null

  try {
    const aiResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: CLASSIFICATION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Subject: ${subject}\n\nBody: ${textBody.slice(0, 2000)}`,
        },
      ],
    })

    const firstBlock = aiResponse.content[0]
    if (firstBlock.type === 'text') {
      const aiResult = aiResultSchema.safeParse(JSON.parse(firstBlock.text))
      if (aiResult.success) {
        category = aiResult.data.category
        priority = aiResult.data.priority
        aiSummary = aiResult.data.summary
      }
    }
  } catch (err) {
    console.error('[inbound-email] AI classification failed:', err)
  }

  await prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        subject,
        customerEmail,
        customerName: customerName || null,
        status: 'open',
        category: category ?? null,
        priority: priority ?? null,
        aiSummary: aiSummary ?? null,
      },
    })
    await tx.message.create({
      data: {
        ticketId: ticket.id,
        body: textBody,
        senderType: 'customer',
      },
    })
  })

  res.json({ ok: true })
})

export default router
