import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import { renderPage } from '@/test/renderPage'
import UsersPage from './UsersPage'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
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

const mockApi = api as {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AGENT_1 = { id: '1', name: 'Alice Smith', email: 'alice@example.com', isActive: true }
const AGENT_2 = { id: '2', name: 'Bob Jones', email: 'bob@example.com', isActive: false }

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
})

describe('loading state', () => {
  it('shows skeleton rows while the query is in flight', () => {
    mockApi.get.mockReturnValue(new Promise(() => {}))
    renderPage(<UsersPage />)
    const rows = screen.getAllByRole('row')
    // 1 header row + 4 skeleton rows
    expect(rows.length).toBe(5)
    expect(screen.queryByText('Alice Smith')).toBeNull()
  })
})

describe('empty state', () => {
  it('shows empty message when the server returns no users', async () => {
    mockApi.get.mockResolvedValue([])
    renderPage(<UsersPage />)
    await screen.findByText(/no agents yet/i)
  })
})

describe('user list', () => {
  it('renders all users returned by the API', async () => {
    mockApi.get.mockResolvedValue([AGENT_1, AGENT_2])
    renderPage(<UsersPage />)
    await screen.findByText('Alice Smith')
    expect(screen.getByText('alice@example.com')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
    expect(screen.getByText('bob@example.com')).toBeInTheDocument()
  })

  it('shows Active badge for active users and Inactive for inactive users', async () => {
    mockApi.get.mockResolvedValue([AGENT_1, AGENT_2])
    renderPage(<UsersPage />)
    await screen.findByText('Alice Smith')
    const rows = screen.getAllByRole('row').slice(1) // skip header
    expect(within(rows[0]).getByText('Active')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Inactive')).toBeInTheDocument()
  })

  it('shows Deactivate for active users and Activate for inactive users', async () => {
    mockApi.get.mockResolvedValue([AGENT_1, AGENT_2])
    renderPage(<UsersPage />)
    await screen.findByText('Alice Smith')
    const [, aliceRow, bobRow] = screen.getAllByRole('row')
    expect(within(aliceRow).getByRole('button', { name: 'Deactivate' })).toBeInTheDocument()
    expect(within(bobRow).getByRole('button', { name: 'Activate' })).toBeInTheDocument()
  })
})

describe('Add User form', () => {
  it('opens the form when Add User is clicked', async () => {
    mockApi.get.mockResolvedValue([])
    const { user } = renderPage(<UsersPage />)
    await screen.findByText(/no agents yet/i)

    await user.click(screen.getByRole('button', { name: /add user/i }))

    expect(screen.getByText('New User')).toBeInTheDocument()
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
  })

  it('hides the Add User button while the form is open', async () => {
    mockApi.get.mockResolvedValue([])
    const { user } = renderPage(<UsersPage />)
    await screen.findByText(/no agents yet/i)

    await user.click(screen.getByRole('button', { name: /add user/i }))

    expect(screen.queryByRole('button', { name: /add user/i })).toBeNull()
  })

  it('closes the form after a user is successfully created', async () => {
    const newUser = { id: '3', name: 'Jane Doe', email: 'jane@example.com', isActive: true }
    mockApi.get
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([newUser])
    mockApi.post.mockResolvedValue(newUser)

    const { user } = renderPage(<UsersPage />)
    await screen.findByText(/no agents yet/i)

    await user.click(screen.getByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await waitFor(() => expect(screen.queryByText('New User')).toBeNull())
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument()
  })

  it('shows the new user in the list after creation', async () => {
    const newUser = { id: '3', name: 'Jane Doe', email: 'jane@example.com', isActive: true }
    mockApi.get
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([newUser])
    mockApi.post.mockResolvedValue(newUser)

    const { user } = renderPage(<UsersPage />)
    await screen.findByText(/no agents yet/i)

    await user.click(screen.getByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText('Jane Doe')
  })

  it('shows validation errors when submitted empty', async () => {
    mockApi.get.mockResolvedValue([])
    const { user } = renderPage(<UsersPage />)
    await screen.findByText(/no agents yet/i)

    await user.click(screen.getByRole('button', { name: /add user/i }))
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText(/name is required/i)
    await screen.findByText(/enter a valid email address/i)
    await screen.findByText(/password must be at least 8 characters/i)
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('shows password length error for short passwords', async () => {
    mockApi.get.mockResolvedValue([])
    const { user } = renderPage(<UsersPage />)
    await screen.findByText(/no agents yet/i)

    await user.click(screen.getByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText(/name/i), 'Jane')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'short')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText(/password must be at least 8 characters/i)
    expect(mockApi.post).not.toHaveBeenCalled()
  })

  it('shows an API error inside the form when creation fails', async () => {
    mockApi.get.mockResolvedValue([])
    mockApi.post.mockRejectedValue(new Error('Email already in use'))

    const { user } = renderPage(<UsersPage />)
    await screen.findByText(/no agents yet/i)

    await user.click(screen.getByRole('button', { name: /add user/i }))
    await user.type(screen.getByLabelText(/name/i), 'Jane Doe')
    await user.type(screen.getByLabelText(/email/i), 'jane@example.com')
    await user.type(screen.getByLabelText(/password/i), 'securepassword')
    await user.click(screen.getByRole('button', { name: /create user/i }))

    await screen.findByText('Email already in use')
    expect(screen.getByText('New User')).toBeInTheDocument()
  })

  it('closes the form when Cancel is clicked', async () => {
    mockApi.get.mockResolvedValue([])
    const { user } = renderPage(<UsersPage />)
    await screen.findByText(/no agents yet/i)

    await user.click(screen.getByRole('button', { name: /add user/i }))
    await user.click(screen.getByRole('button', { name: /cancel/i }))

    expect(screen.queryByText('New User')).toBeNull()
    expect(screen.getByRole('button', { name: /add user/i })).toBeInTheDocument()
  })
})

describe('toggle active / inactive', () => {
  it('calls PATCH with isActive: false when Deactivate is clicked', async () => {
    mockApi.get
      .mockResolvedValueOnce([AGENT_1])
      .mockResolvedValueOnce([{ ...AGENT_1, isActive: false }])
    mockApi.patch.mockResolvedValue({ ...AGENT_1, isActive: false })

    const { user } = renderPage(<UsersPage />)
    await screen.findByText('Alice Smith')

    await user.click(screen.getByRole('button', { name: /deactivate/i }))

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith('/users/1', { isActive: false })
    })
    await screen.findByText('Inactive')
  })

  it('calls PATCH with isActive: true when Activate is clicked', async () => {
    mockApi.get
      .mockResolvedValueOnce([AGENT_2])
      .mockResolvedValueOnce([{ ...AGENT_2, isActive: true }])
    mockApi.patch.mockResolvedValue({ ...AGENT_2, isActive: true })

    const { user } = renderPage(<UsersPage />)
    await screen.findByText('Bob Jones')

    await user.click(screen.getByRole('button', { name: /activate/i }))

    await waitFor(() => {
      expect(mockApi.patch).toHaveBeenCalledWith('/users/2', { isActive: true })
    })
    await screen.findByText('Active')
  })

  it('shows an error banner when the toggle call fails', async () => {
    mockApi.get.mockResolvedValue([AGENT_1])
    mockApi.patch.mockRejectedValue(new Error('Admin accounts cannot be modified'))

    const { user } = renderPage(<UsersPage />)
    await screen.findByText('Alice Smith')

    await user.click(screen.getByRole('button', { name: /deactivate/i }))

    await screen.findByText('Admin accounts cannot be modified')
  })
})

describe('delete user', () => {
  it('calls DELETE and removes the user row after confirmation', async () => {
    mockApi.get
      .mockResolvedValueOnce([AGENT_1, AGENT_2])
      .mockResolvedValueOnce([AGENT_2])
    mockApi.delete.mockResolvedValue({ ok: true })
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { user } = renderPage(<UsersPage />)
    await screen.findByText('Alice Smith')

    const aliceRow = screen.getByRole('row', { name: /alice smith/i })
    await user.click(within(aliceRow).getByRole('button', { name: /delete/i }))

    await waitFor(() => {
      expect(mockApi.delete).toHaveBeenCalledWith('/users/1')
    })
    await waitFor(() => expect(screen.queryByText('Alice Smith')).toBeNull())
  })

  it('does not call DELETE when the confirm dialog is cancelled', async () => {
    mockApi.get.mockResolvedValue([AGENT_1])
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    const { user } = renderPage(<UsersPage />)
    await screen.findByText('Alice Smith')

    await user.click(screen.getByRole('button', { name: /delete/i }))

    expect(mockApi.delete).not.toHaveBeenCalled()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
  })

  it('shows an error banner when the delete call fails', async () => {
    mockApi.get.mockResolvedValue([AGENT_1])
    mockApi.delete.mockRejectedValue(new Error('User not found'))
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    const { user } = renderPage(<UsersPage />)
    await screen.findByText('Alice Smith')

    await user.click(screen.getByRole('button', { name: /delete/i }))

    await screen.findByText('User not found')
  })
})
