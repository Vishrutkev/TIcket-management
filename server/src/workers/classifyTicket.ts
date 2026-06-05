import PgBoss from 'pg-boss'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import prisma from '../lib/prisma'

export const CLASSIFY_TICKET_QUEUE = 'classify-ticket'

export type ClassifyTicketData = {
  ticketId: string
  subject: string
  body: string
}

const classificationSchema = z.object({
  category: z.enum(['general_question', 'technical_question', 'refund_request']).nullable(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).nullable(),
  aiSummary: z.string().nullable().describe("1-2 sentence summary of the customer's issue for agents"),
})

export async function classifyTicketWorker([job]: PgBoss.Job<ClassifyTicketData>[]) {
  const { ticketId, subject, body } = job.data

  const { object } = await generateObject({
    model: openai('gpt-5-nano'),
    schema: classificationSchema,
    system:
      'You are a support ticket classifier. Analyse the email and return the category, priority, and a brief agent-facing summary.',
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
}
