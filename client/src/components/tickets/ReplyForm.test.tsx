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
  it('renders the textarea, polish button, and send button', () => {
    renderPage(<ReplyForm ticketId="ticket-1" />)
    expect(screen.getByPlaceholderText(/write your reply/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /polish/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /send reply/i })).toBeInTheDocument()
  })
})

describe('validation', () => {
  it('send reply button is disabled when the textarea is empty', () => {
    renderPage(<ReplyForm ticketId="ticket-1" />)
    expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled()
  })

  it('send reply button is enabled once the textarea has content', async () => {
    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    await user.type(screen.getByPlaceholderText(/write your reply/i), 'Hello')
    expect(screen.getByRole('button', { name: /send reply/i })).toBeEnabled()
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

describe('polish button', () => {
  it('is disabled when the textarea is empty', () => {
    renderPage(<ReplyForm ticketId="ticket-1" />)
    expect(screen.getByRole('button', { name: /polish/i })).toBeDisabled()
  })

  it('is enabled once the textarea has content', async () => {
    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    await user.type(screen.getByPlaceholderText(/write your reply/i), 'draft')
    expect(screen.getByRole('button', { name: /polish/i })).toBeEnabled()
  })

  it('calls api.post on the polish endpoint with the current body', async () => {
    mockApi.post.mockResolvedValue({ polished: 'Dear James, Thank you.\n\nWarm regards,\nAgent' })

    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    await user.type(screen.getByPlaceholderText(/write your reply/i), 'thanks for reaching out')
    await user.click(screen.getByRole('button', { name: /polish/i }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/tickets/ticket-1/polish', { body: 'thanks for reaching out' })
    })
  })

  it('replaces the textarea content with the polished text', async () => {
    const polished = 'Dear James, Thank you.\n\nWarm regards,\nAgent'
    mockApi.post.mockResolvedValue({ polished })

    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    const textarea = screen.getByPlaceholderText(/write your reply/i)

    await user.type(textarea, 'rough draft')
    await user.click(screen.getByRole('button', { name: /polish/i }))

    await waitFor(() => expect(textarea).toHaveValue(polished))
  })

  it('shows "Polishing…" and disables both buttons while the request is in flight', async () => {
    let resolve!: (v: unknown) => void
    mockApi.post.mockImplementation(() => new Promise(r => { resolve = r }))

    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    await user.type(screen.getByPlaceholderText(/write your reply/i), 'draft')
    await user.click(screen.getByRole('button', { name: /polish/i }))

    expect(screen.getByRole('button', { name: /polishing/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /send reply/i })).toBeDisabled()

    resolve({ polished: 'Polished text' })
  })

  it('shows an error message when the polish API call fails', async () => {
    mockApi.post.mockRejectedValue(new Error('Failed to polish reply. Please try again.'))

    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    await user.type(screen.getByPlaceholderText(/write your reply/i), 'draft text')
    await user.click(screen.getByRole('button', { name: /polish/i }))

    await screen.findByText('Failed to polish reply. Please try again.')
  })

  it('preserves the original draft when the polish API call fails', async () => {
    mockApi.post.mockRejectedValue(new Error('Service unavailable'))

    const { user } = renderPage(<ReplyForm ticketId="ticket-1" />)
    const textarea = screen.getByPlaceholderText(/write your reply/i)
    await user.type(textarea, 'my original draft')
    await user.click(screen.getByRole('button', { name: /polish/i }))

    await screen.findByText('Service unavailable')
    expect(textarea).toHaveValue('my original draft')
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
