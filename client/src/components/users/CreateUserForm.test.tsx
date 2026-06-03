import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderPage } from '@/test/renderPage'
import { CreateUserForm } from './CreateUserForm'

vi.mock('@/lib/api', () => ({
  api: {
    post: vi.fn(),
  },
}))

vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({
    data: { user: { name: 'Admin', role: 'admin' } },
    isPending: false,
  }),
  signOut: vi.fn(),
}))

import { api } from '@/lib/api'
const mockApi = api as { post: ReturnType<typeof vi.fn> }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('rendering', () => {
  it('renders all fields and action buttons', () => {
    renderPage(<CreateUserForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByText('New User')).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create user/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
  })
})

describe('validation', () => {
  it('shows required errors for all fields when submitted empty', async () => {
    const { user } = renderPage(<CreateUserForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText(/name is required/i)
    await screen.findByText(/enter a valid email address/i)
    await screen.findByText(/password must be at least 8 characters/i)
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('shows an error for an invalid email address', async () => {
    const { user } = renderPage(<CreateUserForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane')
    await user.type(screen.getByLabelText(/email/i), 'not-an-email')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText(/enter a valid email address/i)
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('shows an error when the password is shorter than 8 characters', async () => {
    const { user } = renderPage(<CreateUserForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText(/password must be at least 8 characters/i)
    expect(mockApi.post).not.toHaveBeenCalled()
  })
})

describe('submission', () => {
  it('calls POST /users with the correct payload on valid submit', async () => {
    mockApi.post.mockResolvedValue({ id: '1', name: 'Jane Doe', email: 'jane@example.com', isActive: true })

    const { user } = renderPage(<CreateUserForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/users', {
        name: 'Jane Doe',
        email: 'jane@example.com',
        password: 'securepassword',
      })
    })
  })

  it('calls onSuccess after a successful submission', async () => {
    mockApi.post.mockResolvedValue({ id: '1', name: 'Jane Doe', email: 'jane@example.com', isActive: true })
    const onSuccess = vi.fn()

    const { user } = renderPage(<CreateUserForm onSuccess={onSuccess} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
  })

  it('clears the fields after a successful submission', async () => {
    mockApi.post.mockResolvedValue({ id: '1', name: 'Jane Doe', email: 'jane@example.com', isActive: true })

    const { user } = renderPage(<CreateUserForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => {
      expect(screen.getByLabelText<HTMLInputElement>(/name/i).value).toBe('')
      expect(screen.getByLabelText<HTMLInputElement>(/email/i).value).toBe('')
      expect(screen.getByLabelText<HTMLInputElement>(/password/i).value).toBe('')
    })
  })

  it('shows an API error inside the form and does not call onSuccess', async () => {
    mockApi.post.mockRejectedValue(new Error('Email already in use'))
    const onSuccess = vi.fn()

    const { user } = renderPage(<CreateUserForm onSuccess={onSuccess} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText('Email already in use')
    expect(onSuccess).not.toHaveBeenCalled()
  })
})

describe('cancel', () => {
  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    const { user } = renderPage(<CreateUserForm onSuccess={vi.fn()} onCancel={onCancel} />)

    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('clears the fields when Cancel is clicked', async () => {
    const { user } = renderPage(<CreateUserForm onSuccess={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.getByLabelText<HTMLInputElement>(/name/i).value).toBe('')
    expect(screen.getByLabelText<HTMLInputElement>(/email/i).value).toBe('')
    expect(screen.getByLabelText<HTMLInputElement>(/password/i).value).toBe('')
  })
})
