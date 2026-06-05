import { z } from 'zod'

export const SORTABLE_COLUMNS = ['subject', 'customerEmail', 'status', 'priority', 'createdAt'] as const

export const ticketQuerySchema = z.object({
  status: z.enum(['open', 'resolved', 'closed']).optional(),
  category: z.enum(['general_question', 'technical_question', 'refund_request']).optional(),
  priority: z.enum(['urgent', 'high', 'normal', 'low']).optional(),
  sortBy: z.enum(SORTABLE_COLUMNS).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
})

export const patchTicketSchema = z.object({
  status: z.enum(['open', 'resolved', 'closed']).optional(),
  category: z.enum(['general_question', 'technical_question', 'refund_request']).nullable().optional(),
  assignedAgentId: z.string().nullable().optional(),
})

export const postMessageSchema = z.object({
  body: z.string().min(1, 'Reply cannot be empty'),
})

export const polishReplySchema = z.object({
  body: z.string().min(1, 'Reply body is required'),
})
