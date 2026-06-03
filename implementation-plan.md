# Implementation Plan

## Phase 1 — Project Setup

- Initialise monorepo with `/client` (React) and `/server` (Node.js) directories
- Set up React app with TypeScript
- Set up Express server with TypeScript
- Connect PostgreSQL and initialise Prisma
- Configure environment variables (`.env`) for both client and server

---

## Phase 2 — Authentication

- Build login page (email + password form)
- Implement session creation on the server (store session in PostgreSQL via Prisma)
- Set session cookie on successful login
- Implement logout (destroy session)
- Protect all API routes with session middleware
- Protect all frontend routes with an auth guard
- Redirect unauthenticated users to login

---

## Phase 3 — User Management

- Admin-only: create agent (name, email, password)
- Admin-only: list all agents
- Admin-only: deactivate / delete an agent
- Block deactivated agents from logging in
- Enforce role-based access control (admin vs. agent) on both API and UI

---

## Phase 4 — Ticket Management (Core)

- Ticket list page with columns: ID, subject, category, status, priority, assigned agent, created date
- Filter tickets by status, category, and priority
- Sort tickets by date, priority, and status
- Ticket detail page: subject, customer email, full message thread, status, category, priority, assigned agent
- Manually update ticket status (Open → Resolved → Closed)
- Manually reassign ticket to a different agent

---

## Phase 5 — Email Ingestion

- Set up Resend inbound webhook endpoint on the server
- Parse inbound email into a new ticket (subject, body, sender email)
- Detect reply threading: if inbound email matches an existing ticket thread, append as a new message instead of creating a new ticket
- Re-open a Resolved ticket when a customer replies
- Send outbound email replies from the system via Resend
- Store all inbound and outbound messages on the ticket

---

## Phase 6 — AI Features

- On ticket creation, call Claude API to:
  - Classify category (General Question / Technical Question / Refund Request)
  - Assign priority (Urgent / High / Normal / Low)
  - Generate a short AI summary of the ticket
- Display AI classification and summary on the ticket detail page
- Generate an AI-suggested reply draft on the ticket detail page
- Implement hybrid send logic:
  - General Question → auto-send reply
  - Technical Question → agent reviews before sending
  - Refund Request → agent reviews before sending
- Allow agent to edit the AI draft before sending
- Auto-assign ticket to an agent based on category

---

## Phase 7 — Knowledge Base

- Admin UI to upload knowledge documents (plain text or markdown)
- Store documents in the database
- Generate embeddings for each document using Claude and store in PostgreSQL via pgvector
- On AI reply generation, retrieve the most relevant knowledge chunks via vector similarity search
- Use retrieved chunks as context when prompting Claude to draft replies
- Admin UI to view and delete existing knowledge documents

---

## Phase 8 — Dashboard & Notifications

- Dashboard page with summary metrics:
  - Total open tickets
  - Tickets resolved today
  - Average response time
  - Breakdown by category and priority
- Email notification to assigned agent when a new ticket is assigned to them
- Email notification to agent when a customer replies to their ticket
- Final UI polish, loading states, and error handling
