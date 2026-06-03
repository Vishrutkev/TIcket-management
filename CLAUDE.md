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
| Data fetching | axios + TanStack Query v5                      |
| Routing    | React Router v6                                   |
| Backend    | Node.js, Express 5, TypeScript                    |
| ORM        | Prisma 5 (PostgreSQL)                             |
| Auth       | Better Auth (email/password, database sessions)   |
| AI         | Anthropic Claude API (`@anthropic-ai/sdk`)        |
| Email      | Resend (inbound + outbound)                       |

---

## Monorepo Structure

```
ticket-management/
├── core/                     # Shared TypeScript package (@tm/core)
│   └── src/
│       ├── schemas/
│       │   └── users.ts      # createUserSchema, CreateUserFields, User type
│       └── index.ts          # Barrel export
├── client/                   # Vite + React frontend (port 5173)
│   ├── components.json       # shadcn config
│   ├── vite.config.ts        # uses @tailwindcss/vite plugin
│   └── src/
│       ├── components/
│       │   ├── ui/           # shadcn components (Button, Input, Label, Card)
│       │   ├── users/
│       │   │   ├── CreateUserForm.tsx  # create-user form card (manages its own mutation)
│       │   │   ├── EditUserDialog.tsx  # edit-user dialog (pre-populated; optional password change)
│       │   │   └── UsersTable.tsx      # users table + loading skeleton + edit/toggle/delete
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

## Component Testing (Vitest + React Testing Library)

Component tests live in `client/src/` alongside the files they test, named `*.test.tsx`.

### Running tests

```bash
npm run test:components --workspace=client        # run once (CI)
npm run test:components:watch --workspace=client  # watch mode (dev)
```

### Infrastructure

| File | Purpose |
|------|---------|
| `client/src/test/setup.ts` | Imports `@testing-library/jest-dom` matchers — runs before every test file |
| `client/src/test/renderPage.tsx` | Shared render helper: wraps a component in `QueryClientProvider` + `MemoryRouter`, returns `{ user, qc }` |
| `client/vite.config.ts` | `test: { environment: 'jsdom', setupFiles, globals: true }` |

### Writing tests

- Import `renderPage` from `@/test/renderPage` and pass the component as JSX: `renderPage(<UsersPage />)`
- Mock `@/lib/api` with `vi.mock` — return resolved/rejected promises from `mockApi.get/post/patch/delete`
- Mock `@/lib/auth-client` with `vi.mock` — stub `useSession` to return a session object so `Navbar` renders without errors
- Use `userEvent.setup()` (already wired in `renderPage`) — always destructure `user` from the return value
- Prefer `screen.findBy*` (async) over `getBy*` after any state change or API call
- Scope assertions to a specific row with `within(row).getBy*` to avoid ambiguous multi-match errors — e.g. `/activate/i` matches both "Activate" and "Deactivate"
- Call `vi.clearAllMocks()` in `beforeEach`

```tsx
// Minimal example
vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() } }))
vi.mock('@/lib/auth-client', () => ({
  useSession: () => ({ data: { user: { name: 'Admin', role: 'admin' } }, isPending: false }),
  signOut: vi.fn(),
}))
import { api } from '@/lib/api'
const mockApi = api as { get: ReturnType<typeof vi.fn>; /* … */ }

it('renders the list', async () => {
  mockApi.get.mockResolvedValue([{ id: '1', name: 'Alice', email: 'a@example.com', role: 'agent', isActive: true }])
  const { user } = renderPage(<UsersPage />)
  await screen.findByText('Alice')
})
```

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

### Writing E2E Tests

Always use the **`e2e-test-writer` agent** to write or expand Playwright tests — never write them inline.

Trigger it after completing any new page or feature:

```
Use the e2e-test-writer agent to write tests for <feature/page>
```

The agent knows the project's test setup (ports, DB, seed credentials, global-setup) and will produce correctly structured tests in `e2e/`.

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

## Shared Schemas (`@tm/core`)

Any zod schema **or TypeScript type** that is used by both client and server **must** live in `core/src/schemas/` and be exported from `core/src/index.ts`. Import it in both places as `import { ... } from '@tm/core'`.

- Add the schema file under `core/src/schemas/<domain>.ts`
- Re-export it from `core/src/index.ts`
- Both `client/tsconfig.json` and `server/tsconfig.json` have `paths` entries pointing `@tm/core` at `../core/src/index.ts`
- Never duplicate a schema or type — if a shape is used on both sides, it belongs in `core`
- API response types (e.g. `User`) belong in `core` alongside their validation schemas

```ts
// core/src/schemas/users.ts
export const createUserSchema = z.object({ ... })
export type CreateUserFields = z.infer<typeof createUserSchema>
export type User = { id: string; name: string; email: string; role: 'admin' | 'agent'; isActive: boolean }

// server/src/routes/users.ts  and  client/src/pages/UsersPage.tsx
import { createUserSchema, type CreateUserFields, type User } from '@tm/core'
```

---

## Data Validation

**Always use zod for all data validation** — both on the client (forms) and the server (request bodies). Never trust incoming data without parsing it through a zod schema first.

### Client — react-hook-form + zod

```tsx
const schema = z.object({ email: z.string().email(), password: z.string().min(1) })
type Fields = z.infer<typeof schema>

const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
  useForm<Fields>({ resolver: zodResolver(schema) })
```

- Always add `noValidate` to `<form>` to disable browser-native validation
- Inline field errors via `errors.fieldName.message`
- API errors via `setError('root', { message: '...' })` → `errors.root.message`

### Server — Express route handlers

Parse and validate `req.body` with a zod schema at the top of every mutating route handler. Return `400` on failure.

```ts
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'agent']),
})

router.post('/users', requireAdmin, async (req, res) => {
  const result = createUserSchema.safeParse(req.body)
  if (!result.success) {
    return res.status(400).json({ error: result.error.issues[0].message })
  }
  const { name, email, password, role } = result.data
  // …
})
```

- Use `safeParse` (not `parse`) so validation errors don't throw unhandled exceptions
- Return the first issue message via `result.error.issues[0].message` for a consistent client-facing error shape
- Derive the TypeScript type with `z.infer<typeof schema>` — never write a separate interface

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
| PUT | `/api/users/:id` | admin | Edit user name, email, and optionally password |
| PATCH | `/api/users/:id` | admin | Activate/deactivate agent |
| DELETE | `/api/users/:id` | admin | Delete agent |

---

## Ticket Enums

**Status:** `open` · `resolved` · `closed`  
**Category:** `general_question` · `technical_question` · `refund_request`  
**Priority:** `urgent` · `high` · `normal` · `low`

---

## Data Fetching

All client-side HTTP uses **axios** + **TanStack Query v5**.

- **Axios instance** — `client/src/lib/api.ts` exports `httpClient` (axios instance with `baseURL`, `withCredentials: true`) and a typed `api` helper (`api.get/post/patch/delete`). The response interceptor extracts the server's `error` field from failed responses and rejects with a plain `Error`.
- **QueryClient** — singleton in `client/src/lib/queryClient.ts`; mounted via `<QueryClientProvider>` in `App.tsx`.
- **useQuery** — for all data reads. `queryKey` must be an array, e.g. `['users']`, `['tickets', id]`.
- **useMutation** — for creates/updates/deletes. Always call `qc.invalidateQueries({ queryKey: [...] })` in `onSuccess` to keep the cache fresh.
- **mutateAsync + try/catch** — use `mutateAsync` inside react-hook-form `onSubmit` so `isSubmitting` works correctly; catch errors and forward with `setError('root', { message })`.
- Never use `useEffect` + `useState` for data fetching — use `useQuery` instead.

```ts
// read
const { data, isLoading, error } = useQuery({
  queryKey: ['users'],
  queryFn: () => api.get<User[]>('/users'),
})

// write
const mutation = useMutation({
  mutationFn: (body: CreateFields) => api.post<User>('/users', body),
  onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
})
```

---

## Coding Conventions

- **No try/catch in route handlers** — Express 5 automatically forwards rejected async promises to the global error handler in `index.ts`. Never wrap route logic in try/catch; just `await` directly.
- **Express 5 wildcard routes** — Express 5 requires named wildcards. Use `/api/auth/*path` not `/api/auth/*` — the bare `*` throws a `PathError` at startup.
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
| TanStack Query | `TanStack Query` |
| Axios | `Axios` |
