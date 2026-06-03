---
name: auth-helpers
description: Auth helper patterns used in e2e tests — login/logout via UI and API
metadata:
  type: reference
---

## Credentials

Read from env vars injected by playwright.config.ts:
- Admin: `process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'` / `process.env.SEED_ADMIN_PASSWORD ?? 'password123'`
- Agent: `process.env.SEED_AGENT_EMAIL ?? 'agent@example.com'` / `process.env.SEED_AGENT_PASSWORD ?? 'password123'`

## Login via UI

```typescript
async function loginViaUI(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/dashboard')
}
```

## Logout via API (fast, use in beforeEach)

```typescript
await page.request.post('/api/auth/sign-out')
```

## Logout via UI

```typescript
await page.getByRole('button', { name: /sign out/i }).click()
await page.waitForURL('/login')
```

## beforeEach pattern

```typescript
test.beforeEach(async ({ page }) => {
  await page.request.post('/api/auth/sign-out')  // clear any stale session
  await loginAsAdmin(page)
  await page.goto('/target-page')
})
```

## Auth.spec.ts location

`e2e/auth.spec.ts` — covers login happy path, route guards, validation, session persistence.
Helpers are defined inline in that file (not in a shared helper module yet).
