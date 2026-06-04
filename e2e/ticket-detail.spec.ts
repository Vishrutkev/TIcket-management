import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'password123'

const SERVER_BASE = 'http://localhost:3001'
const WEBHOOK_URL = `${SERVER_BASE}/api/inbound-email`

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Log in as admin via the UI form and wait for the dashboard redirect. */
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/dashboard')
}

/**
 * POST a fake inbound email to the webhook, creating a ticket in the test DB.
 * Returns the created ticket's id by looking it up via the tickets API.
 */
async function createTicketViaWebhook(
  page: Page,
  fields: { from: string; subject: string; text?: string },
): Promise<string> {
  const webhookRes = await page.request.post(WEBHOOK_URL, {
    multipart: {
      from: fields.from,
      to: 'support@example.com',
      subject: fields.subject,
      text: fields.text ?? 'Test message body.',
    },
  })
  if (!webhookRes.ok()) {
    throw new Error(
      `Webhook POST failed: ${webhookRes.status()} ${await webhookRes.text()}`,
    )
  }

  // Fetch the ticket id via the API (session cookie is shared by page.request)
  const listRes = await page.request.get(`${SERVER_BASE}/api/tickets`)
  expect(listRes.ok()).toBe(true)
  const body = await listRes.json() as { data: Array<{ id: string; subject: string }> }
  const ticket = body.data.find((t) => t.subject === fields.subject)
  expect(ticket, `Ticket with subject "${fields.subject}" was not found`).toBeDefined()
  return ticket!.id
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Ticket detail page', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure no stale session before each test
    await page.request.post('/api/auth/sign-out')
    await loginAsAdmin(page)
  })

  // -------------------------------------------------------------------------
  // Navigation from the list
  // -------------------------------------------------------------------------

  test('clicking a subject link in the tickets list opens the detail page with the correct h1', async ({
    page,
  }) => {
    const suffix = Date.now()
    const subject = `Detail nav test ${suffix}`

    await page.request.post(WEBHOOK_URL, {
      multipart: {
        from: `customer${suffix}@example.com`,
        to: 'support@example.com',
        subject,
        text: 'Opening from list.',
      },
    })

    await page.goto('/tickets')
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    // Subject renders as a link in the table — click it
    await page.getByRole('link', { name: subject }).click()

    // URL changes to /tickets/:id
    await expect(page).toHaveURL(/\/tickets\/[a-z0-9]+/)

    // The page h1 should show the ticket subject
    await expect(page.getByRole('heading', { level: 1, name: subject })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Metadata section
  // -------------------------------------------------------------------------

  test('ticket detail page displays status badge, customer email and assigned agent label', async ({
    page,
  }) => {
    const suffix = Date.now()
    const subject = `Metadata test ${suffix}`
    const customerEmail = `metadata${suffix}@example.com`

    const ticketId = await createTicketViaWebhook(page, {
      from: customerEmail,
      subject,
      text: 'Checking metadata.',
    })

    await page.goto(`/tickets/${ticketId}`)

    // Subject h1
    await expect(page.getByRole('heading', { level: 1, name: subject })).toBeVisible()

    // Status badge — new tickets start as "open"
    await expect(page.getByText('open', { exact: true })).toBeVisible()

    // Customer email is shown in the metadata grid (scoped to avoid matching the
    // sender label in the message thread which also contains the customer email)
    const metadataGrid = page.locator('div.grid')
    await expect(metadataGrid.getByText(customerEmail)).toBeVisible()

    // Assigned agent label
    await expect(page.getByText('Assigned agent')).toBeVisible()

    // No agent assigned yet — should show "Unassigned"
    await expect(page.getByText('Unassigned')).toBeVisible()
  })

  test('ticket detail page shows Created and Last updated labels', async ({ page }) => {
    const suffix = Date.now()
    const subject = `Timestamps test ${suffix}`

    const ticketId = await createTicketViaWebhook(page, {
      from: `ts${suffix}@example.com`,
      subject,
    })

    await page.goto(`/tickets/${ticketId}`)

    await expect(page.getByText('Created')).toBeVisible()
    await expect(page.getByText('Last updated')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Message thread
  // -------------------------------------------------------------------------

  test('the initial customer message is rendered with the customer email as sender', async ({
    page,
  }) => {
    const suffix = Date.now()
    const subject = `Message thread test ${suffix}`
    const customerEmail = `thread${suffix}@example.com`
    const messageBody = `Please help me with ticket ${suffix}`

    const ticketId = await createTicketViaWebhook(page, {
      from: customerEmail,
      subject,
      text: messageBody,
    })

    await page.goto(`/tickets/${ticketId}`)

    // The message body text is rendered
    await expect(page.getByText(messageBody)).toBeVisible()

    // The sender label uses the customer's email
    await expect(page.getByText(customerEmail).first()).toBeVisible()
  })

  test('messages section heading shows the message count', async ({ page }) => {
    const suffix = Date.now()
    const subject = `Message count test ${suffix}`

    const ticketId = await createTicketViaWebhook(page, {
      from: `count${suffix}@example.com`,
      subject,
      text: 'One message.',
    })

    await page.goto(`/tickets/${ticketId}`)

    // After one inbound email the heading should read "Messages (1)"
    await expect(page.getByText('Messages (1)')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Back navigation
  // -------------------------------------------------------------------------

  test('"Back to tickets" link navigates to /tickets', async ({ page }) => {
    const suffix = Date.now()
    const subject = `Back link test ${suffix}`

    const ticketId = await createTicketViaWebhook(page, {
      from: `back${suffix}@example.com`,
      subject,
    })

    await page.goto(`/tickets/${ticketId}`)
    await expect(page.getByRole('heading', { level: 1, name: subject })).toBeVisible()

    await page.getByRole('link', { name: /back to tickets/i }).click()

    await expect(page).toHaveURL('/tickets')
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // 404 / error state
  // -------------------------------------------------------------------------

  test('navigating to a non-existent ticket id shows an error message', async ({ page }) => {
    await page.goto('/tickets/non-existent-ticket-id-00000000')

    // The page should render an error paragraph, not crash
    // The API returns 404 → axios rejects → error state is rendered
    await expect(page.locator('p.text-sm.text-destructive')).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Auth guard
  // -------------------------------------------------------------------------

  test('unauthenticated user visiting a ticket detail URL is redirected to /login', async ({
    page,
  }) => {
    // Sign out via the API and clear browser cookies to ensure no session remains
    await page.request.post(`${SERVER_BASE}/api/auth/sign-out`)
    await page.context().clearCookies()

    await page.goto('/tickets/any-ticket-id')

    await expect(page).toHaveURL('/login')
  })
})
