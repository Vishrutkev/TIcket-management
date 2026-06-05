import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderPage } from '@/test/renderPage'
import TicketDetail from './TicketDetail'
import type { TicketWithMessages } from '@tm/core'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const baseTicket: Pick<TicketWithMessages, 'subject' | 'customerEmail' | 'priority' | 'aiSummary' | 'createdAt'> = {
  subject: 'Cannot log in to my account',
  customerEmail: 'customer@example.com',
  priority: 'high',
  aiSummary: 'Customer is unable to log in.',
  createdAt: '2026-06-04T10:00:00.000Z',
}

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
      // Just assert that a date-looking string is present — exact format is locale-dependent
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
      ['urgent', 'bg-red-100'],
      ['high', 'bg-orange-100'],
      ['normal', 'bg-blue-100'],
      ['low', 'bg-muted'],
    ] as const)('applies correct style for priority "%s"', (priority, expectedClass) => {
      renderPage(<TicketDetail ticket={{ ...baseTicket, priority }} />)
      const badge = screen.getByText(priority)
      expect(badge.className).toContain(expectedClass)
    })
  })
})
