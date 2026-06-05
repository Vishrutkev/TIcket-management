import { describe, it, expect, vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderPage } from '@/test/renderPage'
import { TicketsTable } from './TicketsTable'
import type { Ticket } from '@tm/core'

const defaultSortingProps = {
  sorting: [{ id: 'createdAt', desc: true }],
  onSortingChange: vi.fn(),
}

const TICKET_1: Ticket = {
  id: '1',
  subject: 'My order arrived damaged',
  customerEmail: 'alice@example.com',
  customerName: 'Alice Example',
  status: 'open',
  priority: 'urgent',
  category: 'refund_request',
  assignedAgentId: 'a1',
  aiSummary: null,
  aiSummaryUpdatedAt: null,
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
  assignedAgent: { id: 'a1', name: 'Bob Agent', email: 'bob@example.com' },
  _count: { messages: 3 },
}

const TICKET_2: Ticket = {
  id: '2',
  subject: 'How do I reset my password?',
  customerEmail: 'carol@example.com',
  customerName: 'Carol Example',
  status: 'resolved',
  priority: null,
  category: 'general_question',
  assignedAgentId: null,
  aiSummary: null,
  aiSummaryUpdatedAt: null,
  createdAt: '2026-06-02T10:00:00.000Z',
  updatedAt: '2026-06-02T10:00:00.000Z',
  assignedAgent: null,
  _count: { messages: 0 },
}

describe('loading state', () => {
  it('shows 5 skeleton rows while loading', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[]} isLoading={true} />)
    // 1 header row + 5 skeleton rows
    expect(screen.getAllByRole('row')).toHaveLength(6)
    expect(screen.queryByText('My order arrived damaged')).toBeNull()
  })
})

describe('empty state', () => {
  it('shows empty message when there are no tickets', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[]} isLoading={false} />)
    expect(screen.getByText(/no tickets yet/i)).toBeInTheDocument()
  })
})

describe('ticket rows', () => {
  it('renders subject as a link to the ticket detail page', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_1]} isLoading={false} />)
    const link = screen.getByRole('link', { name: /my order arrived damaged/i })
    expect(link).toHaveAttribute('href', '/tickets/1')
  })

  it('renders customer email', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_1]} isLoading={false} />)
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
  })

  it('renders status badge', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_1, TICKET_2]} isLoading={false} />)
    expect(screen.getByText('open', { exact: true })).toBeInTheDocument()
    expect(screen.getByText('resolved', { exact: true })).toBeInTheDocument()
  })

  it('renders priority badge when set', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_1]} isLoading={false} />)
    expect(screen.getByText('urgent', { exact: true })).toBeInTheDocument()
  })

  it('shows — when priority is null', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_2]} isLoading={false} />)
    const rows = screen.getAllByRole('row').slice(1)
    // priority column (index 3) should show —
    expect(within(rows[0]).getAllByText('—').length).toBeGreaterThanOrEqual(1)
  })

  it('renders human-readable category label', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_1, TICKET_2]} isLoading={false} />)
    expect(screen.getByText('Refund')).toBeInTheDocument()
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('renders assigned agent name', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_1]} isLoading={false} />)
    expect(screen.getByText('Bob Agent')).toBeInTheDocument()
  })

  it('shows Unassigned when no agent', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_2]} isLoading={false} />)
    expect(screen.getByText('Unassigned')).toBeInTheDocument()
  })

  it('shows message count when messages > 0', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_1]} isLoading={false} />)
    expect(screen.getByText(/3 msgs/i)).toBeInTheDocument()
  })

  it('hides message count when there are no messages', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_2]} isLoading={false} />)
    expect(screen.queryByText(/msg/i)).toBeNull()
  })

  it('renders all tickets passed in', () => {
    renderPage(<TicketsTable {...defaultSortingProps} tickets={[TICKET_1, TICKET_2]} isLoading={false} />)
    expect(screen.getByText('My order arrived damaged')).toBeInTheDocument()
    expect(screen.getByText('How do I reset my password?')).toBeInTheDocument()
  })
})
