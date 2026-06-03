import { execSync } from 'child_process'

const TEST_DB_URL = 'postgresql://vishrutkevadiya@localhost:5432/ticketmanagement_test'

export default async function globalTeardown() {
  // Truncate all tables so the next run starts from a clean state.
  // Order matters: leaf tables first, then parent tables.
  // CASCADE covers FK dependencies; RESTART IDENTITY resets sequences.
  execSync(
    `psql "${TEST_DB_URL}" -c "TRUNCATE TABLE \\"Message\\", \\"KnowledgeDoc\\", \\"Ticket\\", \\"Session\\", \\"User\\" RESTART IDENTITY CASCADE;"`,
    { stdio: 'inherit' },
  )
}
