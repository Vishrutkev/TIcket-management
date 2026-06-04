export type TicketStatus = 'open' | 'resolved' | 'closed'
export type TicketCategory = 'general_question' | 'technical_question' | 'refund_request'
export type TicketPriority = 'urgent' | 'high' | 'normal' | 'low'

export type PaginatedTickets = {
  data: Ticket[]
  total: number
  page: number
  pageSize: number
  pageCount: number
}

export type Ticket = {
  id: string
  subject: string
  customerEmail: string
  status: TicketStatus
  category: TicketCategory | null
  priority: TicketPriority | null
  assignedAgentId: string | null
  aiSummary: string | null
  createdAt: string
  updatedAt: string
  assignedAgent: { id: string; name: string; email: string } | null
  _count: { messages: number }
}

export type Message = {
  id: string
  ticketId: string
  body: string
  isFromCustomer: boolean
  createdAt: string
}

export type TicketWithMessages = Omit<Ticket, '_count'> & {
  messages: Message[]
}
