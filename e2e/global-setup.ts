import { execSync } from 'child_process'
import path from 'path'

const TEST_DB_URL = 'postgresql://vishrutkevadiya@localhost:5432/ticketmanagement_test'
const SERVER_DIR = path.join(__dirname, '..', 'server')

export default async function globalSetup() {
  // Ensure the test database exists
  try {
    execSync(
      `psql "postgresql://vishrutkevadiya@localhost:5432/postgres" -c "CREATE DATABASE ticketmanagement_test;"`,
      { stdio: 'pipe' },
    )
  } catch {
    // Already exists — that's fine
  }

  // Sync schema to test DB (handles renames, new tables, enum changes)
  execSync('npx prisma db push --skip-generate', {
    cwd: SERVER_DIR,
    env: { ...process.env, DATABASE_URL: TEST_DB_URL },
    stdio: 'inherit',
  })

  // Seed test users (seed script skips rows that already exist)
  execSync('npx tsx prisma/seed.ts', {
    cwd: SERVER_DIR,
    env: {
      ...process.env,
      DATABASE_URL: TEST_DB_URL,
      SEED_ADMIN_EMAIL: 'admin@example.com',
      SEED_ADMIN_PASSWORD: 'password123',
      SEED_AGENT_EMAIL: 'agent@example.com',
      SEED_AGENT_PASSWORD: 'password123',
    },
    stdio: 'inherit',
  })
}
