import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderPage } from '@/test/renderPage'
import ReplyForm from './ReplyForm'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api', () => ({
  api: { post: vi.fn() },
}))

import { api } from '@/lib/api'
const mockApi = api as unknown as { post: ReturnType<typeof vi.fn> }

// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('rendering', () => {
  it('renders the textarea and send button', () => {
    renderPage(<ReplyForm ticketId="ticket-1" />)
    expect(screen.getByPlaceholderText(/write your reply/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
  })
})

describe('validation', () => {
  it('shows an error and does not call the API when submitted empty', async () => {
    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)

    await user.click(screen.getByRole('button', { name: /send reply/i }))

    await screen.findByText(/reply cannot be empty/i)
    expect(mockApi.post).not.toHaveBeenCalled()
  })
})

describe('successful submission', () => {
  it('calls api.post with the correct endpoint and body', async () => {
    mockApi.post.mockResolvedValue({
      id: 'msg-1',
      body: 'Hello there!',
      senderType: 'agent',
      agentId: 'agent-1',
      agent: { id: 'agent-1', name: 'Admin' },
      createdAt: new Date().toISOString(),
    })

    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    await user.type(screen.getByPlaceholderText(/write your reply/i), 'Hello there!')
    await user.click(screen.getByRole('button', { name: /send reply/i }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/tickets/ticket-1/messages', { body: 'Hello there!' })
    })
  })

  it('clears the textarea after a successful submission', async () => {
    mockApi.post.mockResolvedValue({
      id: 'msg-1',
      body: 'Hello there!',
      senderType: 'agent',
      agentId: 'agent-1',
      agent: { id: 'agent-1', name: 'Admin' },
      createdAt: new Date().toISOString(),
    })

    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    const textarea = screen.getByPlaceholderText(/write your reply/i)

    await user.type(textarea, 'Hello there!')
    expect(textarea).toHaveValue('Hello there!')

    await user.click(screen.getByRole('button', { name: /send reply/i }))

    await waitFor(() => expect(textarea).toHaveValue(''))
  })
})

describe('API error', () => {
  it('shows the error message when the API call fails', async () => {
    mockApi.post.mockRejectedValue(new Error('Failed to send reply'))

    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    await user.type(screen.getByPlaceholderText(/write your reply/i), 'Hello there!')
    await user.click(screen.getByRole('button', { name: /send reply/i }))

    await screen.findByText('Failed to send reply')
  })

  it('does not clear the textarea when the API call fails', async () => {
    mockApi.post.mockRejectedValue(new Error('Server error'))

    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    const textarea = screen.getByPlaceholderText(/write your reply/i)

    await user.type(textarea, 'Hello there!')
    await user.click(screen.getByRole('button', { name: /send reply/i }))

    await screen.findByText('Server error')
    expect(textarea).toHaveValue('Hello there!')
  })
})
