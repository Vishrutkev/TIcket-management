---
name: test-patterns
description: Reusable structural patterns for e2e tests in this project
metadata:
  type: feedback
---

## Unique email suffix for test isolation

Each test that creates a user must use a unique email to avoid conflicts with other
tests (tests run in parallel with fullyParallel: true):

```typescript
function uniqueSuffix() {
  return Date.now()
}
const email = `testagent${uniqueSuffix()}@example.com`
```

**Why:** Global setup does NOT truncate user rows between individual tests — only between
full test suite runs. Reusing the same email causes a unique-constraint error on the second run.

**How to apply:** Always use timestamp-based unique email/name for any test that creates a user.

## No cleanup needed

The test database is reset by global-setup at the start of each full test run (prisma db push + seed).
Tests do not need afterEach cleanup.

## beforeEach for authenticated pages

```typescript
test.beforeEach(async ({ page }) => {
  await page.request.post('/api/auth/sign-out')  // clear stale session
  await loginAsAdmin(page)
  await goToUsersPage(page)
})
```

## Waiting for dialog to close after form submit

After clicking a submit button in a dialog, wait for the dialog to disappear before
asserting table state — this confirms the mutation completed and the query was invalidated:

```typescript
await page.getByRole('button', { name: 'Create User' }).click()
await expect(page.getByRole('dialog')).not.toBeVisible()
// Now safe to assert on the updated table
```

## Scoping assertions to a table row

Use `.filter({ hasText: '<email>' })` on `getByRole('row')` to target a specific row
and avoid ambiguous multi-match errors (e.g., "Delete" or "Active" appear in multiple rows):

```typescript
const userRow = page.getByRole('row').filter({ hasText: email })
await userRow.getByRole('button', { name: 'Deactivate' }).click()
await expect(userRow.getByText('Inactive')).toBeVisible()
```

## Dialogs rendered in a portal

All dialogs (UserDialog, delete confirm) are Base UI dialogs rendered in a portal outside
the component tree. `page.getByRole('dialog')` correctly finds them regardless.

## API-only tests — use `request` fixture, no `page` needed

For endpoint-only tests (no browser UI), destructure `request` instead of `page`:

```typescript
test('returns 200', async ({ request }) => {
  const res = await request.post('http://localhost:3001/api/inbound-email', {
    multipart: { from: '...', to: '...', subject: '...', text: '...' },
  })
  expect(res.status()).toBe(200)
})
```

Use `multipart: { key: value }` to send multipart/form-data (what multer's `upload.none()` expects).
Note: `request.baseURL` is set to the client port (5174), so always use the full `http://localhost:3001` URL for server calls in request-fixture tests.

## Session cookie for authenticated API calls in request-fixture tests

The `request` fixture does NOT share cookies with a browser page. To call authenticated
endpoints, sign in via API and forward the Set-Cookie header manually:

```typescript
const signInRes = await request.post('http://localhost:3001/api/auth/sign-in/email', {
  data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
})
const cookie = signInRes.headers()['set-cookie']
const ticketsRes = await request.get('http://localhost:3001/api/tickets', {
  headers: { cookie },
})
```

## Preventing Prisma P2028 (transaction timeout) under parallel load

When multiple tests in a describe block all POST to a transactional endpoint simultaneously,
Prisma can fail with P2028 "Unable to start a transaction in the given time."

Fix: add `test.describe.configure({ mode: 'serial' })` at the top of the describe block
to sequence the tests and avoid connection-pool saturation:

```typescript
test.describe('...', () => {
  test.describe.configure({ mode: 'serial' })
  // tests...
})
```

This is the right fix for API test groups that share a single test-DB server; it does NOT
affect other describe blocks, which continue to run in parallel.

## Skipping tests that require an unset env var

Use `test.skip(condition, reason)` at the describe level so the skip is self-documenting:

```typescript
test.describe('token security', () => {
  test.skip(
    !process.env.SENDGRID_WEBHOOK_TOKEN,
    'SENDGRID_WEBHOOK_TOKEN is not set — token enforcement is bypassed',
  )
  // tests that only make sense when the env var IS set
})
```
