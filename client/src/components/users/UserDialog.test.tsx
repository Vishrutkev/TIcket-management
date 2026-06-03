import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderPage } from '@/test/renderPage'
import { UserDialog } from './UserDialog'

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
  },
}))

vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({
    data: { user: { name: 'Admin', role: 'admin' } },
    isPending: false,
  }),
  signOut: vi.fn(),
}))

import { Role } from '@tm/core'
import { api } from '@/lib/api'
const mockApi = api as unknown as {
  post: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

const EXISTING_USER = {
  id: '1',
  name: 'Alice Smith',
  email: 'alice@example.com',
  role: Role.agent,
  isActive: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Create mode (no user prop)
// ---------------------------------------------------------------------------

describe('create mode', () => {
  it('shows "New User" title and "Create User" button', () => {
    renderPage(<UserDialog open={true} onClose={vi.fn()} />)

    expect(screen.getByText('New User')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    renderPage(<UserDialog open={false} onClose={vi.fn()} />)

    expect(screen.queryByText('New User')).toBeNull()
  })

  it('shows required errors when submitted empty', async () => {
    const { user } = renderPage(<UserDialog open={true} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText(/name is required/i)
    await screen.findByText(/enter a valid email address/i)
    await screen.findByText(/password is required/i)
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('shows a validation error for a short password', async () => {
    const { user } = renderPage(<UserDialog open={true} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText(/password must be at least 8 characters/i)
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('calls POST /users with correct payload on valid submit', async () => {
    mockApi.post.mockResolvedValue({ id: '2', name: 'Jane Doe', email: 'jane@example.com', isActive: true })

    const { user } = renderPage(<UserDialog open={true} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() =>
      expect(mockApi.post).toHaveBeenCalledWith('/users', {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securepassword',
      })
    )
  })

  it('calls onClose after a successful creation', async () => {
    mockApi.post.mockResolvedValue({ id: '2', name: 'Jane Doe', email: 'jane@example.com', isActive: true })
    const onClose = vi.fn()

    const { user } = renderPage(<UserDialog open={true} onClose={onClose} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('shows an API error and does not call onClose on failure', async () => {
    mockApi.post.mockRejectedValue(new Error('Email already in use'))
    const onClose = vi.fn()

    const { user } = renderPage(<UserDialog open={true} onClose={onClose} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText('Email already in use')
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Cancel is clicked', async () => {
    const onClose = vi.fn()
    const { user } = renderPage(<UserDialog open={true} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// Edit mode (user prop provided)
// ---------------------------------------------------------------------------

describe('edit mode', () => {
  it('shows "Edit User" title and "Save changes" button', () => {
    renderPage(<UserDialog open={true} user={EXISTING_USER} onClose={vi.fn()} />)

    expect(screen.getByText('Edit User')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('pre-populates name and email from the user prop', () => {
    renderPage(<UserDialog open={true} user={EXISTING_USER} onClose={vi.fn()} />)

    expect(screen.getByLabelText<HTMLInputElement>(/name/i).value).toBe('Alice Smith')
    expect(screen.getByLabelText<HTMLInputElement>(/email/i).value).toBe('alice@example.com')
    expect(screen.getByLabelText<HTMLInputElement>(/password/i).value).toBe('')
  })

  it('allows saving without a password (keeps existing password)', async () => {
    mockApi.put.mockResolvedValue({ ...EXISTING_USER, name: 'Alice Smith' })

    const { user } = renderPage(<UserDialog open={true} user={EXISTING_USER} onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(mockApi.put).toHaveBeenCalledWith(`/users/${EXISTING_USER.id}`, {
        name: 'Alice Smith',
        email: 'alice@example.com',
        password: '',
      })
    )
  })

  it('sends the new password when provided', async () => {
    mockApi.put.mockResolvedValue(EXISTING_USER)

    const { user } = renderPage(<UserDialog open={true} user={EXISTING_USER} onClose={vi.fn()} />)

    await user.clear(screen.getByLabelText(/name/i))
    await user.type(screen.getByLabelText(/name/i), 'Alice Updated')
    await user.type(screen.getByLabelText(/password/i), 'newpassword123')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() =>
      expect(mockApi.put).toHaveBeenCalledWith(`/users/${EXISTING_USER.id}`, {
        name: 'Alice Updated',
        email: 'alice@example.com',
        password: 'newpassword123',
      })
    )
  })

  it('shows a validation error for a short new password', async () => {
    const { user } = renderPage(<UserDialog open={true} user={EXISTING_USER} onClose={vi.fn()} />)

    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await screen.findByText(/password must be at least 8 characters/i)
    expect(mockApi.put).not.toHaveBeenCalled()
  })

  it('calls onClose after a successful save', async () => {
    mockApi.put.mockResolvedValue(EXISTING_USER)
    const onClose = vi.fn()

    const { user } = renderPage(<UserDialog open={true} user={EXISTING_USER} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('shows an API error and does not call onClose on failure', async () => {
    mockApi.put.mockRejectedValue(new Error('Email already in use'))
    const onClose = vi.fn()

    const { user } = renderPage(<UserDialog open={true} user={EXISTING_USER} onClose={onClose} />)

    await user.click(screen.getByRole('button', { name: /save changes/i }))

    await screen.findByText('Email already in use')
    expect(onClose).not.toHaveBeenCalled()
  })
})
