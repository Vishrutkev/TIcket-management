---
name: auth-helpers
description: loginAsAdmin helper pattern, beforeEach sign-out, credential env vars used across all e2e specs
metadata:
  type: reference
---

## Pattern (from users.spec.ts, tickets.spec.ts)

```ts
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com'
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'password123'

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email').fill(ADMIN_EMAIL)
  await page.getByLabel('Password').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL('/dashboard')
}
```

- `beforeEach` always calls `page.request.post('/api/auth/sign-out')` first to clear any leftover session, then calls `loginAsAdmin`.
- Label text is exactly `'Email'` and `'Password'` (exact case, no regex needed).
- After login the app redirects to `/dashboard` — use `waitForURL('/dashboard')` to gate on it.
- Credentials come from env vars injected by `playwright.config.ts` — never hardcode.
