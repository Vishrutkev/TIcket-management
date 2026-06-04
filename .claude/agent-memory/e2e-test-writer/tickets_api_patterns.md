---
name: tickets-api-patterns
description: Confirmed patterns for ticket API calls in Playwright tests — response shapes, cookie auth, and session clearing
metadata:
  type: reference
---

## Tickets list endpoint response shape (paginated)

`GET /api/tickets` returns `{ data: Ticket[], total, page, pageSize, pageCount }` — NOT a plain array.
This changed when pagination was added (commit "Add Pagination"). Always type as `{ data: Array<...> }` and use `body.data.find(...)`.

```ts
const body = await res.json() as { data: Array<{ id: string; subject: string }> }
const ticket = body.data.find((t) => t.subject === subject)
```

**Note:** `inbound-email.spec.ts` still uses the old array format and is broken after pagination was added — pre-existing bug, not introduced by ticket-detail tests.

## Creating tickets in tests via webhook

Use `page.request.post(WEBHOOK_URL, { multipart: {...} })` with `SERVER_BASE = 'http://localhost:3001'`.
`page.request` shares cookies with the browser page, so after `loginAsAdmin()` the session is available.
Then fetch the ticket id via `page.request.get('http://localhost:3001/api/tickets')` — must use the full absolute URL, NOT a relative path (which would hit port 5174/Vite, not the API server).

## Clearing session for auth guard tests

`page.request.post('/api/auth/sign-out')` alone does NOT clear the browser cookie jar.
To properly log out for an auth guard test:
```ts
await page.request.post(`${SERVER_BASE}/api/auth/sign-out`)
await page.context().clearCookies()
```

## Strict mode violations on customer email

The customer email appears in TWO places on the ticket detail page:
1. The metadata grid (`<p class="text-foreground">`)
2. The message sender label (`<span class="text-xs font-medium text-muted-foreground">`)

To avoid strict mode violations, scope the metadata assertion:
```ts
const metadataGrid = page.locator('div.grid')
await expect(metadataGrid.getByText(customerEmail)).toBeVisible()
```

## Ticket detail page key selectors

- Subject: `page.getByRole('heading', { level: 1, name: subject })`
- Status badge: `page.getByText('open', { exact: true })`
- "Back to tickets" link: `page.getByRole('link', { name: /back to tickets/i })`
- Error state: `page.locator('p.text-sm.text-destructive')`
- Messages heading: `page.getByText('Messages (N)')` where N is message count
- Assigned agent section: `page.getByText('Assigned agent')` + `page.getByText('Unassigned')`
- Created/updated labels: `page.getByText('Created')`, `page.getByText('Last updated')`

## Server reuse gotcha

`playwright.config.ts` uses `reuseExistingServer: !isCI`. If an old dev server is running on port 3001 with OLD code (before pagination was added), tests will fail because the API returns a plain array instead of `{ data: [...] }`. Kill the server and let Playwright start a fresh one.
