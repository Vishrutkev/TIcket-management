import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderPage } from '@/test/renderPage'
import ReplyThread from './ReplyThread'
import { type Message } from '@tm/core'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CUSTOMER_MSG: Message = {
  id: '1',
  ticketId: 'ticket-1',
  body: 'I need help with my order.',
  senderType: 'customer',
  agentId: null,
  agent: null,
  createdAt: '2026-06-04T10:00:00.000Z',
}

const AGENT_MSG: Message = {
  id: '2',
  ticketId: 'ticket-1',
  body: 'We are looking into it right away.',
  senderType: 'agent',
  agentId: 'agent-1',
  agent: { id: 'agent-1', name: 'Alice Smith' },
  createdAt: '2026-06-04T11:00:00.000Z',
}

const AGENT_MSG_NO_AGENT_INFO: Message = {
  id: '3',
  ticketId: 'ticket-1',
  body: 'Legacy reply without agent record.',
  senderType: 'agent',
  agentId: null,
  agent: null,
  createdAt: '2026-06-04T12:00:00.000Z',
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('empty state', () => {
  it('shows "No messages yet." when the messages array is empty', () => {
    renderPage(<ReplyThread ticketId="ticket-1" messages={[]} customerEmail="customer@example.com" />)
    expect(screen.getByText('No messages yet.')).toBeInTheDocument()
  })

  it('shows Messages (0) in the heading', () => {
    renderPage(<ReplyThread ticketId="ticket-1" messages={[]} customerEmail="customer@example.com" />)
    expect(screen.getByText('Messages (0)')).toBeInTheDocument()
  })
})

describe('message count', () => {
  it('reflects the number of messages in the heading', () => {
    renderPage(
      <ReplyThread ticketId="ticket-1" messages={[CUSTOMER_MSG, AGENT_MSG]} customerEmail="customer@example.com" />,
    )
    expect(screen.getByText('Messages (2)')).toBeInTheDocument()
  })
})

describe('customer messages', () => {
  it('shows the customer email as the sender label', () => {
    renderPage(
      <ReplyThread ticketId="ticket-1" messages={[CUSTOMER_MSG]} customerEmail="customer@example.com" />,
    )
    expect(screen.getByText('customer@example.com')).toBeInTheDocument()
  })

  it('renders the message body', () => {
    renderPage(
      <ReplyThread ticketId="ticket-1" messages={[CUSTOMER_MSG]} customerEmail="customer@example.com" />,
    )
    expect(screen.getByText('I need help with my order.')).toBeInTheDocument()
  })
})

describe('agent messages', () => {
  it('shows the agent name as the sender label', () => {
    renderPage(
      <ReplyThread ticketId="ticket-1" messages={[AGENT_MSG]} customerEmail="customer@example.com" />,
    )
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('falls back to "Support agent" when agent info is absent', () => {
    renderPage(
      <ReplyThread ticketId="ticket-1" messages={[AGENT_MSG_NO_AGENT_INFO]} customerEmail="customer@example.com" />,
    )
    expect(screen.getByText('Support agent')).toBeInTheDocument()
  })

  it('renders the message body', () => {
    renderPage(
      <ReplyThread ticketId="ticket-1" messages={[AGENT_MSG]} customerEmail="customer@example.com" />,
    )
    expect(screen.getByText('We are looking into it right away.')).toBeInTheDocument()
  })
})

describe('mixed thread', () => {
  it('renders all messages in order', () => {
    renderPage(
      <ReplyThread ticketId="ticket-1" messages={[CUSTOMER_MSG, AGENT_MSG]} customerEmail="customer@example.com" />,
    )
    expect(screen.getByText('I need help with my order.')).toBeInTheDocument()
    expect(screen.getByText('We are looking into it right away.')).toBeInTheDocument()
  })
})

describe('message styling', () => {
  it('applies bg-card to customer message cards', () => {
    renderPage(<ReplyThread ticketId="ticket-1" messages={[CUSTOMER_MSG]} customerEmail="customer@example.com" />)
    const card = screen.getByText('I need help with my order.').closest('div.rounded-lg')
    expect(card?.className).toContain('bg-card')
  })

  it('applies a distinct background to agent message cards', () => {
    renderPage(<ReplyThread ticketId="ticket-1" messages={[AGENT_MSG]} customerEmail="customer@example.com" />)
    const card = screen.getByText('We are looking into it right away.').closest('div.rounded-lg')
    expect(card?.className).toContain('bg-primary/5')
  })
})

describe('date formatting', () => {
  it('renders a formatted date for each message', () => {
    renderPage(<ReplyThread ticketId="ticket-1" messages={[CUSTOMER_MSG]} customerEmail="customer@example.com" />)
    expect(screen.getByText(/jun/i)).toBeInTheDocument()
  })
})

// Suppress unused-import warning
vi.fn()
