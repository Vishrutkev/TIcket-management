---
name: ticket-page-patterns
description: How to create tickets in tests (inbound-email webhook), key selectors for /tickets, and sort-order assertion approach
metadata:
  type: reference
---

## Creating tickets in tests

Tickets are created only via `POST /api/inbound-email` (no admin UI).  
Webhook endpoint: `http://localhost:3001/api/inbound-email`  
Auth: none required in test env (`SENDGRID_WEBHOOK_TOKEN` is not set).

```ts
await page.request.post('http://localhost:3001/api/inbound-email', {
  multipart: {
    from: 'customer@example.com',
    to: 'support@example.com',
    subject: 'My subject',
    text: 'Email body.',
  },
})
```

Always use `page.request.post` (not `request` fixture) so the call uses the browser context.  
Use a `Date.now()` suffix in subjects to avoid collisions across parallel runs.

## Key selectors for /tickets

- Page heading: `page.getByRole('heading', { name: 'Tickets' })`
- Tickets navbar link: `page.getByRole('link', { name: 'Tickets' })` (exact text match, second nav link after "Support Desk")
- Subject cell: subjects render as `<Link>` elements — use `page.getByRole('link', { name: subject })`
- All subject links in document order: `page.locator('tbody tr').getByRole('link').allTextContents()`

## Sort-order assertion (newest first)

```ts
const subjectTexts = await page.locator('tbody tr').getByRole('link').allTextContents()
const firstIndex = subjectTexts.findIndex((t) => t.includes(firstSubject))
const secondIndex = subjectTexts.findIndex((t) => t.includes(secondSubject))
expect(secondIndex).toBeLessThan(firstIndex) // second-created ticket appears first
```

Note: `locator('tbody tr').getByRole('link')` returns ALL links in all rows including any multi-link rows. Safe here because each row has exactly one subject link, and `includes()` matching handles any extra message-count spans that share the cell.
