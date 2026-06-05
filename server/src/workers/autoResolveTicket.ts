import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import PgBoss from 'pg-boss'
import { generateObject } from 'ai'
import { openai } from '@ai-sdk/openai'
import { z } from 'zod'
import prisma from '../lib/prisma'

export const AUTO_RESOLVE_QUEUE = 'auto-resolve-ticket'

export type AutoResolveData = {
  ticketId: string
  subject: string
  body: string
}

const KNOWLEDGE_BASE = readFileSync(join(__dirname, '../../knowledge-base.md'), 'utf-8')

const autoResolveSchema = z.object({
  canResolve: z.boolean().describe('True only if the knowledge base fully answers the question'),
  reply: z.string().nullable().describe('Complete reply to send to the customer, or null if canResolve is false'),
})

export async function autoResolveWorker([job]: PgBoss.Job<AutoResolveData>[]) {
  const { ticketId, subject, body } = job.data

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { customerName: true, customerEmail: true },
  })
  if (!ticket) return

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { status: 'processing' },
  })

  const customerFirstName = (ticket.customerName || ticket.customerEmail.split('@')[0]).split(' ')[0]

  const { object } = await generateObject({
    model: openai('gpt-5-nano'),
    schema: autoResolveSchema,
    system: `You are a support agent. Use ONLY the knowledge base below to answer customer questions.
If the knowledge base fully answers the question, set canResolve to true and write a clear, professional reply that begins with "Dear ${customerFirstName}," and ends with "Warm regards,\nSupport Team".
If the knowledge base does not contain enough information to fully resolve the issue, set canResolve to false and reply to null.

Knowledge Base:
${KNOWLEDGE_BASE}`,
    prompt: `Subject: ${subject}\n\nCustomer message:\n${body.slice(0, 2000)}`,
  })

  if (object.canResolve && object.reply) {
    // Atomic: reply is created and status flips to resolved together.
    // If either fails the ticket stays in 'processing' and pg-boss retries.
    await prisma.$transaction([
      prisma.message.create({
        data: { ticketId, body: object.reply, senderType: 'agent' },
      }),
      prisma.ticket.update({
        where: { id: ticketId },
        data: { status: 'resolved' },
      }),
    ])
    console.log(`[auto-resolve] ticket ${ticketId} resolved by AI`)
  } else {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: 'open' },
    })
    console.log(`[auto-resolve] ticket ${ticketId} could not be resolved, moved to open`)
  }
}
