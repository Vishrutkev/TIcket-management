# Ticket Management — CLAUDE.md

## Project Overview

AI-powered support ticket management system. Receives support emails, auto-classifies and responds using Claude AI, and provides agents with a dashboard to manage tickets.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, TypeScript, Vite          |
| Styling    | Tailwind CSS v3                     |
| Routing    | React Router v6                     |
| Backend    | Node.js, Express 4, TypeScript      |
| ORM        | Prisma 5 (PostgreSQL)               |
| Auth       | Server-side sessions (PostgreSQL)   |
| AI         | Anthropic Claude API (`@anthropic-ai/sdk`) |
| Email      | Resend (inbound + outbound)         |

---

## Monorepo Structure

```
ticket-management/
├── client/               # Vite + React frontend (port 5173)
│   └── src/
│       ├── components/   # Shared UI components
│       ├── pages/        # Route-level page components
│       ├── hooks/        # Custom React hooks
│       ├── lib/          # API clients, utilities
│       └── App.tsx       # Router setup
├── server/               # Express backend (port 3000)
│   ├── prisma/
│   │   ├── schema.prisma # DB schema
│   │   └── seed.ts       # Seeds default admin account
│   └── src/
│       ├── routes/       # Express route handlers
│       ├── middleware/   # Auth middleware (requireAuth, requireAdmin)
│       ├── lib/          # prisma.ts, anthropic.ts, resend.ts
│       └── index.ts      # Express app entry
└── package.json          # Root workspace
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
npm run db:seed --workspace=server       # seed admin user
npm run db:studio --workspace=server     # open Prisma Studio
```

---

## Environment Variables

All in `server/.env`:

```
DATABASE_URL="postgresql://postgres:password@localhost:5432/ticket_management"
PORT=3000
CLIENT_URL="http://localhost:5173"
NODE_ENV=development
ANTHROPIC_API_KEY=""
RESEND_API_KEY=""
RESEND_FROM_EMAIL="support@yourdomain.com"
RESEND_INBOUND_DOMAIN="yourdomain.com"
```

---

## Database Models

- **User** — `id, name, email, passwordHash, role (admin|agent), isActive`
- **Session** — `id, userId, expiresAt` (server-side sessions)
- **Ticket** — `id, subject, customerEmail, status, category, priority, assignedAgentId, aiSummary`
- **Message** — `id, ticketId, body, isFromCustomer`
- **KnowledgeDoc** — `id, title, content` (RAG source documents)

---

## Auth Pattern

- Sessions stored in PostgreSQL, session ID set as `httpOnly` cookie (`sessionId`)
- `requireAuth` middleware reads cookie → looks up session → attaches `res.locals.user`
- `requireAdmin` wraps `requireAuth` and checks `role === 'admin'`
- Default admin seed: `admin@example.com` / `admin123`

---

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/login` | — | Login, sets session cookie |
| POST | `/api/auth/logout` | user | Destroys session |
| GET | `/api/auth/me` | user | Returns current user |
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
- All API calls from the client go through `client/src/lib/api.ts` (to be created)
- All Prisma queries go through `server/src/lib/prisma.ts` singleton
- Never expose `passwordHash` in API responses — always `select` explicit fields
- Ticket status transitions: `open → resolved → closed`; customer reply re-opens `resolved` tickets

---

## Context7 — Up-to-date Documentation

Always use Context7 MCP to fetch current docs before writing code that uses any library in this project. Training data may be outdated.

**How to use:**

1. Call `mcp__context7__resolve-library-id` with the library name and your question
2. Pick the best match (highest benchmark score + source reputation)
3. Call `mcp__context7__query-docs` with the library ID and your specific question
4. Write code based on the fetched docs

**Library reference IDs for this project** (resolve first to confirm):

| Library | Query as |
|---------|----------|
| React | `React` |
| React Router | `React Router` |
| Tailwind CSS | `Tailwind CSS` |
| Express | `Express` |
| Prisma | `Prisma` |
| Anthropic SDK | `Anthropic SDK` |
| Resend | `Resend` |
| bcryptjs | `bcryptjs` |

**Always use Context7 for:**
- Prisma schema syntax, migrations, queries
- React Router v6 route/loader/action patterns
- Tailwind CSS utility classes and config
- Anthropic SDK messages API, tool use, streaming
- Resend inbound webhook payload shape and outbound API
- Express middleware and error handler signatures
