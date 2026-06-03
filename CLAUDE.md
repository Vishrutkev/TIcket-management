# Ticket Management — CLAUDE.md

## Project Overview

AI-powered support ticket management system. Receives support emails, auto-classifies and responds using Claude AI, and provides agents with a dashboard to manage tickets.

---

## Tech Stack

| Layer      | Technology                                        |
|------------|---------------------------------------------------|
| Frontend   | React 18, TypeScript, Vite                        |
| Styling    | Tailwind CSS v4 (`@tailwindcss/vite`)             |
| Components | shadcn/ui (Button, Input, Label, Card)            |
| Forms      | react-hook-form + zod + @hookform/resolvers       |
| Routing    | React Router v6                                   |
| Backend    | Node.js, Express 4, TypeScript                    |
| ORM        | Prisma 5 (PostgreSQL)                             |
| Auth       | Better Auth (email/password, database sessions)   |
| AI         | Anthropic Claude API (`@anthropic-ai/sdk`)        |
| Email      | Resend (inbound + outbound)                       |

---

## Monorepo Structure

```
ticket-management/
├── client/                   # Vite + React frontend (port 5173)
│   ├── components.json       # shadcn config
│   ├── vite.config.ts        # uses @tailwindcss/vite plugin
│   └── src/
│       ├── components/
│       │   ├── ui/           # shadcn components (Button, Input, Label, Card)
│       │   └── Navbar.tsx    # top nav with user name + sign out
│       ├── pages/
│       │   ├── LoginPage.tsx # email/password login form
│       │   ├── HomePage.tsx  # dashboard shell
│       │   └── UsersPage.tsx # admin-only user management
│       ├── lib/
│       │   ├── auth-client.ts  # Better Auth React client
│       │   ├── api.ts          # typed fetch wrapper for all API calls
│       │   └── utils.ts        # shadcn cn() utility
│       ├── index.css         # Tailwind v4 entrypoint + shadcn CSS variables
│       └── App.tsx           # router + RequireAuth + RequireAdmin guards
├── server/                   # Express backend (port 3000)
│   ├── prisma/
│   │   ├── schema.prisma     # DB schema
│   │   └── seed.ts           # seeds default admin account
│   └── src/
│       ├── routes/           # Express route handlers
│       ├── middleware/        # requireAuth, requireAdmin
│       ├── lib/              # prisma.ts, auth.ts, anthropic.ts, resend.ts
│       └── index.ts          # Express app entry
└── package.json              # root workspace
```

---

## Development Commands

```bash
# Start both client and server
npm run dev

# Server only
npm run dev --workspace=server

# Client only
npm run dev --workspace=client

# Prisma
npm run db:generate --workspace=server   # regenerate client after schema changes
npm run db:migrate --workspace=server    # apply migrations
npm run db:seed --workspace=server       # seed admin + agent users
npm run db:studio --workspace=server     # open Prisma Studio

# E2E tests (Playwright)
npm run test:e2e           # run all tests headless
npm run test:e2e:ui        # Playwright UI mode
npm run test:e2e:report    # open last HTML report

# Add a shadcn component (use temp cache to bypass root-owned npm cache)
npm_config_cache=/tmp/npm-cache npx shadcn@latest add <component>
```

---

## Environment Variables

`server/.env`:
```
DATABASE_URL="postgresql://postgres:password@localhost:5432/ticket_management"
PORT=3000
CLIENT_URL="http://localhost:5173"
NODE_ENV=development
BETTER_AUTH_SECRET=""
BETTER_AUTH_URL="http://localhost:3000"
SEED_ADMIN_EMAIL="admin@example.com"
SEED_ADMIN_PASSWORD="password123"
SEED_AGENT_EMAIL="agent@example.com"
SEED_AGENT_PASSWORD=""           # required — separate from admin password
ANTHROPIC_API_KEY=""
RESEND_API_KEY=""
RESEND_FROM_EMAIL="support@yourdomain.com"
RESEND_INBOUND_DOMAIN="yourdomain.com"
```

`client/.env.local`:
```
VITE_API_URL=http://localhost:3000
```

---

## Database Models

- **User** — `id, name, email, role (admin|agent), isActive` (Better Auth manages password)
- **Session** — managed by Better Auth (`account`, `session`, `verification` tables)
- **Ticket** — `id, subject, customerEmail, status, category, priority, assignedAgentId, aiSummary`
- **Message** — `id, ticketId, body, isFromCustomer`
- **KnowledgeDoc** — `id, title, content` (RAG source documents)

---

## Auth Pattern

Better Auth handles all authentication. Sessions are database-backed with an `httpOnly` cookie.

- **Server:** `server/src/lib/auth.ts` — `betterAuth()` with `prismaAdapter`, `emailAndPassword: { disableSignUp: true }`, `user.additionalFields` declaring `role`, explicit `SameSite: lax` / `secure: isProd` cookies, rate limiting production-only (`enabled: isProd`)
- **Client:** `client/src/lib/auth-client.ts` — `createAuthClient` with `InferServerPlugin<typeof auth>()` from `better-auth/client/plugins`. Use `InferServerPlugin` — `inferAdditionalFields` does not exist in this version and will crash the app. `baseURL` reads from `VITE_API_URL`.
- **Middleware:** `requireAuth` calls `auth.api.getSession()` then fetches full user from Prisma (for `role` + `isActive`). `requireAdmin` wraps `requireAuth`.
- **Route handler:** `app.all('/api/auth/*', toNodeHandler(auth))` — must come **before** `express.json()`
- **Rate limiting:** `express-rate-limit` on `/api/auth/sign-in` — **production only** (`NODE_ENV === 'production'`)
- **Route guards (client):** `RequireAuth` — redirects to `/login` if no session. `RequireAdmin` — additionally checks `session.user.role === 'admin'`, redirects non-admins to `/dashboard`.
- **Login redirect:** `LoginPage` uses `useSession()` and returns `<Navigate to="/dashboard" replace />` when session is set — avoids race condition where `navigate()` fires before session store updates after sign-in.
- **Seeded users:** `admin@example.com` / `password123` (admin), `agent@example.com` / `SEED_AGENT_PASSWORD` (agent)

**Auth endpoint mapping:**

| Old | Better Auth |
|-----|-------------|
| `POST /api/auth/login` | `POST /api/auth/sign-in/email` |
| `POST /api/auth/logout` | `POST /api/auth/sign-out` |
| `GET /api/auth/me` | `GET /api/auth/get-session` |

---

## E2E Testing (Playwright)

Tests live in `e2e/` at the repo root. Playwright uses isolated ports and a dedicated database so tests can run alongside the dev server.

| | Dev | Test |
|--|-----|------|
| Server port | 3000 | 3001 |
| Client port | 5173 | 5174 |
| Database | `ticketmanagement` | `ticketmanagement_test` |

- `playwright.config.ts` — config at repo root; Chromium only; `webServer` starts both servers automatically with test env vars injected inline (no `.env.test` file needed)
- `e2e/global-setup.ts` — creates test DB if missing, runs `prisma migrate deploy`, seeds users
- All test env vars (DB URL, Better Auth secret, seed credentials) are declared in `playwright.config.ts`

---

## Tailwind CSS v4 Setup

Tailwind v4 uses a Vite plugin instead of PostCSS — there is no `tailwind.config.js` or `postcss.config.js`.

- `vite.config.ts` imports `tailwindcss` from `@tailwindcss/vite` and adds it to `plugins`
- `src/index.css` starts with `@import "tailwindcss"` (replaces the three `@tailwind` directives)
- Theme is configured in CSS via `@theme inline { --color-* }` — maps shadcn CSS variables to Tailwind color utilities
- All shadcn color tokens (`bg-background`, `text-foreground`, `border-border`, etc.) are available as Tailwind utilities

---

## shadcn Components

- Config: `client/components.json` (style: `base-nova`, cssVariables: true)
- Components live in `client/src/components/ui/`
- **Important:** shadcn CLI v4 generates components using `@base-ui/react` primitives which don't forward refs. Always rewrite generated `Input` and `Button` to use native `<input>` / `<button>` with `React.forwardRef` — otherwise react-hook-form breaks.

---

## Form Pattern (react-hook-form + zod)

```tsx
const schema = z.object({ email: z.string().email(), password: z.string().min(1) })
type Fields = z.infer<typeof schema>

const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
  useForm<Fields>({ resolver: zodResolver(schema) })
```

- Always add `noValidate` to `<form>` to disable browser-native validation
- Inline field errors via `errors.fieldName.message`
- API errors via `setError('root', { message: '...' })` → `errors.root.message`

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/sign-in/email` | — | Login, sets session cookie |
| POST | `/api/auth/sign-out` | user | Destroys session |
| GET | `/api/auth/get-session` | — | Returns current session/user |
| GET | `/api/tickets` | user | List tickets (filterable) |
| GET | `/api/tickets/:id` | user | Ticket detail + messages |
| PATCH | `/api/tickets/:id` | user | Update status / assignee |
| GET | `/api/users` | admin | List agents |
| POST | `/api/users` | admin | Create agent |
| PATCH | `/api/users/:id` | admin | Activate/deactivate agent |
| DELETE | `/api/users/:id` | admin | Delete agent |

---

## Ticket Enums

**Status:** `open` · `resolved` · `closed`  
**Category:** `general_question` · `technical_question` · `refund_request`  
**Priority:** `urgent` · `high` · `normal` · `low`

---

## Coding Conventions

- No default exports except React components and the Express app
- All API calls from the client go through `client/src/lib/api.ts`
- All Prisma queries go through `server/src/lib/prisma.ts` singleton
- Never expose `passwordHash` in API responses — always `select` explicit fields
- Ticket status transitions: `open → resolved → closed`; customer reply re-opens `resolved` tickets
- Path alias `@/` maps to `client/src/` — use it for all client imports

---

## Context7 — Up-to-date Documentation

Always use Context7 MCP to fetch current docs before writing code that uses any library in this project.

1. Call `mcp__context7__resolve-library-id` with the library name and your question
2. Pick the best match (highest benchmark score + source reputation)
3. Call `mcp__context7__query-docs` with the library ID and your specific question

| Library | Query as |
|---------|----------|
| React | `React` |
| React Router | `React Router` |
| Tailwind CSS v4 | `Tailwind CSS` |
| shadcn/ui | `shadcn/ui` |
| react-hook-form | `react-hook-form` |
| zod | `zod` |
| Better Auth | `Better Auth` |
| Express | `Express` |
| Prisma | `Prisma` |
| Anthropic SDK | `Anthropic SDK` |
| Resend | `Resend` |
