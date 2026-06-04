import { test, expect, type Page } from '@playwright/test'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'password123'

const WEBHOOK_URL = 'http://localhost:3001/api/inbound-email'

/** Log in as admin and wait for the dashboard redirect. */
async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/dashboard')
}

/**
 * POST a fake inbound email to the webhook endpoint.
 * Uses page.request so the call shares the same browser context
 * (important for cookie-based session sharing if ever needed).
 */
async function postInboundEmail(
  page: Page,
  fields: { from: string; to: string; subject: string; text?: string },
) {
  const response = await page.request.post(WEBHOOK_URL, {
    multipart: {
      from: fields.from,
      to: fields.to,
      subject: fields.subject,
      text: fields.text ?? 'Test email body.',
    },
  })
  // Surface unexpected failures early so test output is actionable
  if (!response.ok()) {
    throw new Error(
      `Webhook POST failed: ${response.status()} ${await response.text()}`,
    )
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Tickets page', () => {
  test.beforeEach(async ({ page }) => {
    await page.request.post('/api/auth/sign-out')
    await loginAsAdmin(page)
  })

  // -------------------------------------------------------------------------
  // Navigation
  // -------------------------------------------------------------------------

  test('Tickets navbar link navigates to /tickets and shows the page heading', async ({ page }) => {
    // Start from dashboard, then click the Tickets nav link
    await page.goto('/dashboard')

    await page.getByRole('link', { name: 'Tickets' }).click()

    await expect(page).toHaveURL('/tickets')
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Data visibility (webhook → table round-trip)
  // -------------------------------------------------------------------------

  test('ticket created via webhook appears in the list', async ({ page }) => {
    const suffix = Date.now()
    const subject = `Webhook ticket ${suffix}`

    await postInboundEmail(page, {
      from: `customer${suffix}@example.com`,
      to: 'support@example.com',
      subject,
    })

    await page.goto('/tickets')
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    // Subject renders as a link inside the table row
    await expect(page.getByRole('link', { name: subject })).toBeVisible()
  })

  // -------------------------------------------------------------------------
  // Sort order — newest first
  // -------------------------------------------------------------------------

  test('most recently created ticket appears before an earlier one', async ({ page }) => {
    const suffix = Date.now()
    const firstSubject = `First ticket ${suffix}`
    const secondSubject = `Second ticket ${suffix}`

    await postInboundEmail(page, {
      from: `customer${suffix}a@example.com`,
      to: 'support@example.com',
      subject: firstSubject,
    })

    await postInboundEmail(page, {
      from: `customer${suffix}b@example.com`,
      to: 'support@example.com',
      subject: secondSubject,
    })

    await page.goto('/tickets')
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible()

    // Both tickets must be present before checking order
    await expect(page.getByRole('link', { name: firstSubject })).toBeVisible()
    await expect(page.getByRole('link', { name: secondSubject })).toBeVisible()

    // Collect the text of every subject link in document order (newest-first sort)
    const subjectLinks = page.locator('tbody tr').getByRole('link')
    const subjectTexts = await subjectLinks.allTextContents()

    const firstIndex = subjectTexts.findIndex((t) => t.includes(firstSubject))
    const secondIndex = subjectTexts.findIndex((t) => t.includes(secondSubject))

    // secondSubject was created later, so it should appear at a lower row index
    expect(secondIndex).toBeLessThan(firstIndex)
  })
})
