---
name: auth-ui-patterns
description: Actual label text, button names, error selector patterns, and confirmed route paths for auth-related Playwright tests
metadata:
  type: reference
---

## LoginPage (client/src/pages/LoginPage.tsx)

- Email label: `Email` (htmlFor="email") — use `page.getByLabel('Email')`
- Password label: `Password` (htmlFor="password") — use `page.getByLabel('Password')`
- Submit button: `Sign in` (text) — use `page.getByRole('button', { name: /sign in/i })`
- Loading button text: `Signing in…` (with ellipsis) — use `/signing in/i`
- Root/API error: `<p class="text-sm text-destructive bg-destructive/10 ...">` — select via `page.locator('p.text-sm.text-destructive')`
- Field errors (email, password): `<p class="text-xs text-destructive">` — match by text content
- Email validation message: "Enter a valid email address" (from zod schema)
- Password validation message: "Password is required" (from zod schema)
- Form has `noValidate` — browser validation is suppressed, zod handles it client-side
- `LoginPage` auto-redirects to `/dashboard` when `useSession()` returns a session (before rendering the form)

## Navbar (client/src/components/Navbar.tsx)

- Sign out button: `Sign out` — use `page.getByRole('button', { name: /sign out/i })`
- Users nav link (admin only): `<Link to="/users">Users</Link>` — use `page.getByRole('link', { name: 'Users' })`
- Admin role check: `session?.user.role === 'admin'` gates the Users link visibility

## Route paths (App.tsx)

- Login: `/login`
- Dashboard: `/dashboard` (RequireAuth guard)
- Admin users: `/users` (RequireAdmin guard) — NOT `/admin/users`
- Root `/` redirects to `/dashboard`

## Route guard behavior

- `RequireAuth`: unauthenticated → `/login`; shows "Loading…" while session is pending
- `RequireAdmin`: unauthenticated → `/login`; non-admin role → `/dashboard`

## HomePage (client/src/pages/HomePage.tsx)

- Welcome heading: `<h2>Welcome, {name}</h2>` — use `page.getByRole('heading', { name: /welcome/i })`

## UsersPage (client/src/pages/UsersPage.tsx)

- Main heading: `<h1>User Management</h1>` — use `page.getByRole('heading', { name: /user management/i })`
