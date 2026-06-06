import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderPage } from '@/test/renderPage'
import TicketDetail from './TicketDetail'
import type { TicketWithMessages, Message } from '@tm/core'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn() },
}))

import { api } from '@/lib/api'
const mockApi = api as unknown as { post: ReturnType<typeof vi.fn> }

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MSG: Message = {
  id: 'm1',
  ticketId: 'ticket-1',
  body: 'Hello',
  senderType: 'customer',
  agentId: null,
  agent: null,
  createdAt: '2026-06-04T11:00:00.000Z',
}

const baseTicket: Pick<
  TicketWithMessages,
  'id' | 'subject' | 'customerEmail' | 'priority' | 'aiSummary' | 'aiSummaryUpdatedAt' | 'createdAt' | 'messages'
> = {
  id: 'ticket-1',
  subject: 'Cannot log in to my account',
  customerEmail: 'customer@example.com',
  priority: 'high',
  aiSummary: 'Customer is unable to log in.',
  aiSummaryUpdatedAt: '2026-06-04T12:00:00.000Z',
  createdAt: '2026-06-04T10:00:00.000Z',
  messages: [],
}

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('TicketDetail', () => {
  describe('rendering', () => {
    it('renders the ticket subject', () => {
      renderPage(<TicketDetail ticket={baseTicket} />)
      expect(screen.getByRole('heading', { name: /cannot log in/i })).toBeInTheDocument()
    })

    it('renders the customer email', () => {
      renderPage(<TicketDetail ticket={baseTicket} />)
      expect(screen.getByText('customer@example.com')).toBeInTheDocument()
    })

    it('renders the formatted creation date', () => {
      renderPage(<TicketDetail ticket={baseTicket} />)
      expect(screen.getByText(/jun/i)).toBeInTheDocument()
    })

    it('renders the AI summary when present', () => {
      renderPage(<TicketDetail ticket={baseTicket} />)
      expect(screen.getByText('AI Summary')).toBeInTheDocument()
      expect(screen.getByText('Customer is unable to log in.')).toBeInTheDocument()
    })

    it('does not render the AI summary section when aiSummary is null', () => {
      renderPage(<TicketDetail ticket={{ ...baseTicket, aiSummary: null }} />)
      expect(screen.queryByText('AI Summary')).not.toBeInTheDocument()
    })
  })

  describe('priority badge', () => {
    it('renders the priority badge when priority is set', () => {
      renderPage(<TicketDetail ticket={baseTicket} />)
      expect(screen.getByText('high')).toBeInTheDocument()
    })

    it('does not render a priority badge when priority is null', () => {
      renderPage(<TicketDetail ticket={{ ...baseTicket, priority: null }} />)
      expect(screen.queryByText('high')).not.toBeInTheDocument()
      expect(screen.queryByText('urgent')).not.toBeInTheDocument()
    })

    it.each([
      ['urgent', 'text-red-700'],
      ['high', 'text-rose-700'],
      ['normal', 'text-blue-700'],
      ['low', 'text-slate-500'],
    ] as const)('applies correct style for priority "%s"', (priority, expectedClass) => {
      renderPage(<TicketDetail ticket={{ ...baseTicket, priority }} />)
      const badge = screen.getByText(priority)
      expect(badge.className).toContain(expectedClass)
    })
  })

  describe('summarize button', () => {
    it('shows "Generate summary" when there is no existing summary', () => {
      renderPage(<TicketDetail ticket={{ ...baseTicket, aiSummary: null, aiSummaryUpdatedAt: null, messages: [] }} />)
      expect(screen.getByRole('button', { name: /generate summary/i })).toBeInTheDocument()
    })

    it('shows "Re-generate summary" when a new message arrived after the last summary', () => {
      const ticket = {
        ...baseTicket,
        aiSummaryUpdatedAt: '2026-06-04T09:00:00.000Z',
        messages: [MSG], // MSG.createdAt is 11:00, summary is 09:00 → outdated
      }
      renderPage(<TicketDetail ticket={ticket} />)
      expect(screen.getByRole('button', { name: /re-generate summary/i })).toBeInTheDocument()
    })

    it('hides the button when the summary covers all messages', () => {
      const ticket = {
        ...baseTicket,
        aiSummaryUpdatedAt: '2026-06-04T12:00:00.000Z',
        messages: [MSG], // MSG.createdAt is 11:00, summary is 12:00 → up-to-date
      }
      renderPage(<TicketDetail ticket={ticket} />)
      expect(screen.queryByRole('button', { name: /summary/i })).not.toBeInTheDocument()
    })

    it('calls api.post on the summarize endpoint when clicked', async () => {
      mockApi.post.mockResolvedValue({ aiSummary: 'New summary.', aiSummaryUpdatedAt: new Date().toISOString() })

      const { user } = renderPage(
        <TicketDetail ticket={{ ...baseTicket, aiSummary: null, aiSummaryUpdatedAt: null, messages: [] }} />,
      )
      await user.click(screen.getByRole('button', { name: /generate summary/i }))

      await waitFor(() => {
        expect(mockApi.post).toHaveBeenCalledWith('/tickets/ticket-1/summarize', {})
      })
    })

    it('shows "Summarizing…" and disables the button while in flight', async () => {
      let resolve!: (v: unknown) => void
      mockApi.post.mockImplementation(() => new Promise(r => { resolve = r }))

      const { user } = renderPage(
        <TicketDetail ticket={{ ...baseTicket, aiSummary: null, aiSummaryUpdatedAt: null, messages: [] }} />,
      )
      await user.click(screen.getByRole('button', { name: /generate summary/i }))

      expect(screen.getByRole('button', { name: /summarizing/i })).toBeDisabled()

      resolve({ aiSummary: 'Done.', aiSummaryUpdatedAt: new Date().toISOString() })
    })

    it('shows an error message when the summarize API call fails', async () => {
      mockApi.post.mockRejectedValue(new Error('Failed to generate summary. Please try again.'))

      const { user } = renderPage(
        <TicketDetail ticket={{ ...baseTicket, aiSummary: null, aiSummaryUpdatedAt: null, messages: [] }} />,
      )
      await user.click(screen.getByRole('button', { name: /generate summary/i }))

      await screen.findByText('Failed to generate summary. Please try again.')
    })
  })
})
