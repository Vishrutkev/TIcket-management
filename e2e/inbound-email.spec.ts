import { test, expect, type APIRequestContext } from '@playwright/test'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SERVER_BASE = 'http://localhost:3001'
const WEBHOOK_PATH = `${SERVER_BASE}/api/inbound-email`

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'password123'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Sign in as admin via the API and return the raw Set-Cookie header string so
 * subsequent requests can be made in the same session.
 */
async function adminSessionCookie(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${SERVER_BASE}/api/auth/sign-in/email`, {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  expect(res.status()).toBe(200)
  const setCookie = res.headers()['set-cookie']
  expect(setCookie).toBeTruthy()
  return setCookie
}

/**
 * POST a multipart/form-data payload to the inbound-email webhook, mirroring
 * the shape SendGrid Inbound Parse sends.
 */
async function postWebhook(
  request: APIRequestContext,
  fields: Record<string, string>,
  queryParams?: Record<string, string>,
) {
  const url = new URL(WEBHOOK_PATH)
  if (queryParams) {
    for (const [k, v] of Object.entries(queryParams)) {
      url.searchParams.set(k, v)
    }
  }

  // Playwright's APIRequestContext sends multipart when the `multipart` option
  // is provided.  Each string value becomes a plain text part, which matches
  // what multer's upload.none() expects.
  return request.post(url.toString(), { multipart: fields })
}

/**
 * Find a ticket by subject in the admin tickets list.
 * Returns the full ticket object (with id) or throws if not found.
 */
async function findTicketBySubject(
  request: APIRequestContext,
  sessionCookie: string,
  subject: string,
) {
  const res = await request.get(`${SERVER_BASE}/api/tickets`, {
    headers: { cookie: sessionCookie },
  })
  expect(res.status()).toBe(200)
  const tickets = await res.json() as Array<{
    id: string
    subject: string
    customerEmail: string
    status: string
    _count?: { messages: number }
  }>
  const ticket = tickets.find((t) => t.subject === subject)
  expect(ticket, `Ticket with subject "${subject}" not found`).toBeDefined()
  return ticket!
}

/**
 * Fetch a single ticket with its messages array.
 */
async function fetchTicketDetail(
  request: APIRequestContext,
  sessionCookie: string,
  ticketId: string,
) {
  const res = await request.get(`${SERVER_BASE}/api/tickets/${ticketId}`, {
    headers: { cookie: sessionCookie },
  })
  expect(res.status()).toBe(200)
  return res.json() as Promise<{
    id: string
    subject: string
    customerEmail: string
    status: string
    messages: Array<{ body: string; isFromCustomer: boolean }>
  }>
}

// ---------------------------------------------------------------------------
// Helper to produce a unique subject so parallel test runs don't collide
// ---------------------------------------------------------------------------
function uniqueSubject(label: string) {
  return `[E2E ${label}] ${Date.now()}`
}

// ---------------------------------------------------------------------------
// Tests — happy paths
// ---------------------------------------------------------------------------

test.describe('Inbound Email Webhook — happy paths', () => {
  // Run sequentially to avoid Prisma connection-pool contention (P2028) when
  // multiple parallel tests all open transactions against the test DB at once.
  test.describe.configure({ mode: 'serial' })
  test('returns { ok: true } and creates a ticket with correct subject and status', async ({
    request,
  }) => {
    const subject = uniqueSubject('create-ticket')

    // Act — POST the webhook
    const webhookRes = await postWebhook(request, {
      from: 'alice@customer.com',
      to: 'support@company.com',
      subject,
      text: 'I need help with my account.',
    })

    // Assert response
    expect(webhookRes.status()).toBe(200)
    const body = await webhookRes.json()
    expect(body).toEqual({ ok: true })

    // Assert DB state via tickets API
    const cookie = await adminSessionCookie(request)
    const ticket = await findTicketBySubject(request, cookie, subject)

    expect(ticket.subject).toBe(subject)
    expect(ticket.customerEmail).toBe('alice@customer.com')
    expect(ticket.status).toBe('open')
  })

  test('creates exactly one message linked to the new ticket', async ({ request }) => {
    const subject = uniqueSubject('one-message')
    const messageBody = 'Please help me reset my password.'

    await postWebhook(request, {
      from: 'bob@customer.com',
      to: 'support@company.com',
      subject,
      text: messageBody,
    })

    const cookie = await adminSessionCookie(request)
    const ticket = await findTicketBySubject(request, cookie, subject)

    // _count.messages should be 1
    expect(ticket._count?.messages).toBe(1)

    // Fetch full detail to check message body and direction
    const detail = await fetchTicketDetail(request, cookie, ticket.id)
    expect(detail.messages).toHaveLength(1)
    expect(detail.messages[0].isFromCustomer).toBe(true)
    expect(detail.messages[0].body).toBe(messageBody)
  })

  test('extracts bare email from "Name <email>" formatted From header', async ({ request }) => {
    const subject = uniqueSubject('parse-from')

    await postWebhook(request, {
      from: 'Jane Customer <jane@example.com>',
      to: 'support@company.com',
      subject,
      text: 'Hello there.',
    })

    const cookie = await adminSessionCookie(request)
    const ticket = await findTicketBySubject(request, cookie, subject)

    // customerEmail must be the bare email, not the full "Name <email>" string
    expect(ticket.customerEmail).toBe('jane@example.com')
    expect(ticket.customerEmail).not.toContain('Jane Customer')
  })

  test('uses bare email address as customerEmail when From has no display name', async ({
    request,
  }) => {
    const subject = uniqueSubject('bare-email-from')

    await postWebhook(request, {
      from: 'noreply@service.com',
      to: 'support@company.com',
      subject,
      text: 'Automated notification.',
    })

    const cookie = await adminSessionCookie(request)
    const ticket = await findTicketBySubject(request, cookie, subject)

    expect(ticket.customerEmail).toBe('noreply@service.com')
  })

  test('falls back to HTML body (stripped of tags) when no text field is provided', async ({
    request,
  }) => {
    const subject = uniqueSubject('html-fallback')
    const htmlBody = '<p>Hello, I have <strong>an urgent question</strong> about my invoice.</p>'
    const expectedText = 'Hello, I have an urgent question about my invoice.'

    await postWebhook(request, {
      from: 'carol@customer.com',
      to: 'support@company.com',
      subject,
      html: htmlBody,
      // intentionally omitting `text`
    })

    const cookie = await adminSessionCookie(request)
    const ticket = await findTicketBySubject(request, cookie, subject)
    const detail = await fetchTicketDetail(request, cookie, ticket.id)

    expect(detail.messages).toHaveLength(1)
    // The stored body should be the HTML-stripped version
    expect(detail.messages[0].body).toBe(expectedText)
  })

  test('stores an empty message body when neither text nor html is provided', async ({
    request,
  }) => {
    const subject = uniqueSubject('empty-body')

    await postWebhook(request, {
      from: 'dave@customer.com',
      to: 'support@company.com',
      subject,
      // no text, no html
    })

    const cookie = await adminSessionCookie(request)
    const ticket = await findTicketBySubject(request, cookie, subject)
    const detail = await fetchTicketDetail(request, cookie, ticket.id)

    expect(detail.messages).toHaveLength(1)
    expect(detail.messages[0].body).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Tests — validation / error paths
// ---------------------------------------------------------------------------

test.describe('Inbound Email Webhook — validation', () => {
  test('returns 400 when subject field is missing', async ({ request }) => {
    const res = await postWebhook(request, {
      from: 'user@example.com',
      to: 'support@company.com',
      // subject intentionally omitted
      text: 'Some body text.',
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('returns 400 when from field is missing', async ({ request }) => {
    const res = await postWebhook(request, {
      // from intentionally omitted
      to: 'support@company.com',
      subject: 'Missing from field',
      text: 'Some body text.',
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('returns 400 when to field is missing', async ({ request }) => {
    const res = await postWebhook(request, {
      from: 'user@example.com',
      // to intentionally omitted
      subject: 'Missing to field',
      text: 'Some body text.',
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('returns 400 when subject is an empty string', async ({ request }) => {
    const res = await postWebhook(request, {
      from: 'user@example.com',
      to: 'support@company.com',
      subject: '',
      text: 'Some body text.',
    })

    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })
})

// ---------------------------------------------------------------------------
// Tests — webhook token security
//
// SENDGRID_WEBHOOK_TOKEN is NOT set in playwright.config.ts, so the
// requireWebhookToken middleware calls next() unconditionally during the test
// run. The 401 cases below verify the middleware logic but require the env var
// to be set in order to actually exercise the rejection paths.
//
// These tests are skipped by default. To enable them, set SENDGRID_WEBHOOK_TOKEN
// in the webServer env block of playwright.config.ts and remove the test.skip.
// ---------------------------------------------------------------------------

test.describe('Inbound Email Webhook — token security', () => {
  // Skipped: SENDGRID_WEBHOOK_TOKEN is not set in the test environment.
  // The middleware bypasses token checks when the env var is absent.
  // Remove the skip annotation after setting the env var to activate these tests.
  test.skip(
    !process.env.SENDGRID_WEBHOOK_TOKEN,
    'SENDGRID_WEBHOOK_TOKEN is not set — token enforcement is bypassed in this test environment',
  )

  test('returns 401 when token query param is missing and env var is set', async ({
    request,
  }) => {
    // POST with no ?token param — middleware should reject
    const res = await postWebhook(request, {
      from: 'user@example.com',
      to: 'support@company.com',
      subject: 'Token missing test',
      text: 'Body text.',
    })

    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('returns 401 when token query param is incorrect', async ({ request }) => {
    const res = await postWebhook(
      request,
      {
        from: 'user@example.com',
        to: 'support@company.com',
        subject: 'Wrong token test',
        text: 'Body text.',
      },
      { token: 'this-is-the-wrong-token' },
    )

    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body).toHaveProperty('error')
  })

  test('returns 200 when the correct token is provided', async ({ request }) => {
    const correctToken = process.env.SENDGRID_WEBHOOK_TOKEN!

    const res = await postWebhook(
      request,
      {
        from: 'user@example.com',
        to: 'support@company.com',
        subject: uniqueSubject('correct-token'),
        text: 'Body text.',
      },
      { token: correctToken },
    )

    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ ok: true })
  })
})
