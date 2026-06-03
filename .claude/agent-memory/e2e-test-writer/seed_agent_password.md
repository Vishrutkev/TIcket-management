---
name: seed-agent-password
description: SEED_AGENT_PASSWORD is hardcoded as password123 in both global-setup.ts and playwright.config.ts; process.env.SEED_AGENT_PASSWORD will always equal 'password123' in tests
metadata:
  type: project
---

Both `e2e/global-setup.ts` and the `webServer` env block in `playwright.config.ts` hardcode `SEED_AGENT_PASSWORD: 'password123'`.

The `process.env.SEED_AGENT_PASSWORD` env var is available in test files at runtime and resolves to `'password123'`.

**Why:** The seeding script uses this value to create the agent account, and the server's webServer config injects it as an env var so it's accessible in tests without a separate `.env.test` file.

**How to apply:** When writing tests that need the agent password, read it via `process.env.SEED_AGENT_PASSWORD` with a fallback of `'password123'`. Do not hardcode passwords directly — use the env var pattern for correctness even though both resolve to the same value today.
