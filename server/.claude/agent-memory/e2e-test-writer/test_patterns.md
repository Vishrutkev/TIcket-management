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
