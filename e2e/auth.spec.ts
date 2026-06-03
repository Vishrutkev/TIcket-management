import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Log in via the UI form and wait for the redirect to /dashboard.
 */
async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login')
  // Wait for the form to be ready (session check may briefly show loading)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/dashboard')
}

/**
 * Log out via the Navbar "Sign out" button and wait for redirect to /login.
 */
async function logoutViaUI(page: Page) {
  await page.getByRole('button', { name: /sign out/i }).click()
  await page.waitForURL('/login')
}

/**
 * Log out via the API directly (faster, no UI needed).
 */
async function logoutViaAPI(page: Page) {
  await page.request.post('/api/auth/sign-out')
}

const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'password123'
const AGENT_EMAIL = 'agent@example.com'

// SEED_AGENT_PASSWORD is injected into the process env by playwright.config.ts
function agentPassword(): string {
  return process.env.SEED_AGENT_PASSWORD ?? 'password123'
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

test.describe('Happy path', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we start each test without an active session
    await logoutViaAPI(page)
  })

  test('admin logs in and lands on /dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/dashboard')
    // Welcome heading confirms the session is loaded
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
  })

  test('agent logs in and lands on /dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Email').fill(AGENT_EMAIL)
    await page.getByLabel('Password').fill(agentPassword())
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
  })

  test('already-logged-in user visiting /login is redirected to /dashboard', async ({ page }) => {
    // Establish session first
    await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    // Now navigate back to /login — should be bounced to /dashboard
    await page.goto('/login')
    await expect(page).toHaveURL('/dashboard')
  })

  test('user logs out and is redirected to /login', async ({ page }) => {
    await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    await logoutViaUI(page)

    await expect(page).toHaveURL('/login')
    // The login form should be visible again
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('after logout, visiting a protected route redirects to /login', async ({ page }) => {
    await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await logoutViaUI(page)

    // Try to access a protected route without a session
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })
})

// ---------------------------------------------------------------------------
// Route guards
// ---------------------------------------------------------------------------

test.describe('Route guards', () => {
  test.beforeEach(async ({ page }) => {
    await logoutViaAPI(page)
  })

  test('unauthenticated user visiting /dashboard is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL('/login')
  })

  test('unauthenticated user visiting /users is redirected to /login', async ({ page }) => {
    await page.goto('/users')
    await expect(page).toHaveURL('/login')
  })

  test('agent (non-admin) visiting /users is redirected to /dashboard', async ({ page }) => {
    await loginViaUI(page, AGENT_EMAIL, agentPassword())

    await page.goto('/users')
    await expect(page).toHaveURL('/dashboard')
  })

  test('admin visiting /users is allowed through', async ({ page }) => {
    await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    await page.goto('/users')
    await expect(page).toHaveURL('/users')
    // UsersPage renders an h1 with "User Management"
    await expect(page.getByRole('heading', { name: /user management/i })).toBeVisible()
  })

  test('admin navbar shows Users link; agent navbar does not', async ({ page }) => {
    // Admin sees the Users nav link
    await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD)
    await expect(page.getByRole('link', { name: 'Users' })).toBeVisible()

    await logoutViaUI(page)

    // Agent does not see the Users nav link
    await loginViaUI(page, AGENT_EMAIL, agentPassword())
    await expect(page.getByRole('link', { name: 'Users' })).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Validation and error handling
// ---------------------------------------------------------------------------

test.describe('Validation and error handling', () => {
  test.beforeEach(async ({ page }) => {
    await logoutViaAPI(page)
    await page.goto('/login')
  })

  test('submitting empty form shows inline validation errors without an API call', async ({ page }) => {
    // Only watch for sign-in calls — get-session fires on page load via useSession() and is expected
    let apiCallMade = false
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/sign-in')) {
        apiCallMade = true
      }
    })

    await page.getByRole('button', { name: /sign in/i }).click()

    // zod schema requires a valid email and a non-empty password
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible()
    await expect(page.getByText(/password is required/i)).toBeVisible()

    expect(apiCallMade).toBe(false)
    // URL stays on /login
    await expect(page).toHaveURL('/login')
  })

  test('invalid email format shows inline email validation error', async ({ page }) => {
    let apiCallMade = false
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/sign-in')) {
        apiCallMade = true
      }
    })

    await page.getByLabel('Email').fill('not-an-email')
    await page.getByLabel('Password').fill('somepassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/enter a valid email address/i)).toBeVisible()
    expect(apiCallMade).toBe(false)
    await expect(page).toHaveURL('/login')
  })

  test('valid email with wrong password shows API error message', async ({ page }) => {
    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Better Auth returns an error; the form renders it via errors.root
    // The error paragraph has a destructive/bg-destructive styling
    await expect(
      page.locator('p.text-sm.text-destructive'),
    ).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('non-existent email shows API error message', async ({ page }) => {
    await page.getByLabel('Email').fill('nobody@example.com')
    await page.getByLabel('Password').fill('somepassword')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(
      page.locator('p.text-sm.text-destructive'),
    ).toBeVisible()
    await expect(page).toHaveURL('/login')
  })

  test('password field obscures input', async ({ page }) => {
    const passwordInput = page.getByLabel('Password')
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('sign-in button shows loading state while submitting', async ({ page }) => {
    // Slow down the response so we can observe the loading label
    await page.route('**/api/auth/sign-in/email', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500))
      await route.continue()
    })

    await page.getByLabel('Email').fill(ADMIN_EMAIL)
    await page.getByLabel('Password').fill(ADMIN_PASSWORD)

    const submitButton = page.getByRole('button', { name: /sign in/i })
    await submitButton.click()

    // While request is in flight the button should be disabled and show the loading label
    await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /signing in/i })).toBeDisabled()
  })

  test('sign-up is disabled — login page has no registration link or form', async ({ page }) => {
    // The app has disableSignUp: true, so there should be no sign-up affordance
    await expect(page.getByRole('link', { name: /sign up|register|create account/i })).not.toBeVisible()
    await expect(page.getByRole('button', { name: /sign up|register|create account/i })).not.toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

test.describe('Session persistence', () => {
  test.beforeEach(async ({ page }) => {
    await logoutViaAPI(page)
  })

  test('session survives a full page reload', async ({ page }) => {
    await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    // Hard-reload the page — the httpOnly cookie persists across reloads
    await page.reload()

    // RequireAuth should still let us through
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
  })

  test('session survives navigating away and back', async ({ page }) => {
    await loginViaUI(page, ADMIN_EMAIL, ADMIN_PASSWORD)

    // Navigate to another protected route then back
    await page.goto('/users')
    await expect(page).toHaveURL('/users')

    await page.goto('/dashboard')
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: /welcome/i })).toBeVisible()
  })
})
