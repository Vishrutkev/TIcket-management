import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderPage } from '@/test/renderPage'
import TicketsPage from './TicketsPage'
import type { Ticket } from '@tm/core'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn() },
}))

vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({
    data: { user: { name: 'Agent', role: 'agent' } },
    isPending: false,
  }),
  signOut: vi.fn(),
}))

import { api } from '@/lib/api'
const mockApi = api as unknown as { get: ReturnType<typeof vi.fn> }

const TICKET: Ticket = {
  id: '1',
  subject: 'Login is broken',
  customerEmail: 'user@example.com',
  status: 'open',
  priority: 'high',
  category: 'technical_question',
  assignedAgentId: null,
  aiSummary: null,
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
  assignedAgent: null,
  _count: { messages: 1 },
}

beforeEach(() => vi.clearAllMocks())

describe('TicketsPage', () => {
  it('shows skeleton rows while loading', () => {
    mockApi.get.mockReturnValue(new Promise(() => {}))
    renderPage(<TicketsPage />)
    // 1 header + 5 skeleton rows
    expect(screen.getAllByRole('row')).toHaveLength(6)
  })

  it('renders the page heading', async () => {
    mockApi.get.mockResolvedValue([])
    renderPage(<TicketsPage />)
    expect(screen.getByRole('heading', { name: /tickets/i })).toBeInTheDocument()
  })

  it('shows empty state when no tickets are returned', async () => {
    mockApi.get.mockResolvedValue([])
    renderPage(<TicketsPage />)
    await screen.findByText(/no tickets yet/i)
  })

  it('shows ticket count after loading', async () => {
    mockApi.get.mockResolvedValue([TICKET])
    renderPage(<TicketsPage />)
    await screen.findByText('1 ticket')
  })

  it('shows plural ticket count for multiple tickets', async () => {
    mockApi.get.mockResolvedValue([TICKET, { ...TICKET, id: '2' }])
    renderPage(<TicketsPage />)
    await screen.findByText('2 tickets')
  })

  it('renders ticket subject in the table', async () => {
    mockApi.get.mockResolvedValue([TICKET])
    renderPage(<TicketsPage />)
    await screen.findByText('Login is broken')
  })

  it('shows error message when the API call fails', async () => {
    mockApi.get.mockRejectedValue(new Error('Failed to load tickets'))
    renderPage(<TicketsPage />)
    await screen.findByText('Failed to load tickets')
  })

  it('calls GET /tickets with default sort params on mount', async () => {
    mockApi.get.mockResolvedValue([])
    renderPage(<TicketsPage />)
    await screen.findByText(/no tickets yet/i)
    expect(mockApi.get).toHaveBeenCalledWith('/tickets?sortBy=createdAt&sortOrder=desc')
  })
})
