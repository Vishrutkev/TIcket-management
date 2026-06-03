import { defineConfig, devices } from '@playwright/test'
import path from 'path'

const isCI = !!process.env.CI

const TEST_SERVER_PORT = 3001
const TEST_CLIENT_PORT = 5174
const TEST_DB_URL = 'postgresql://vishrutkevadiya@localhost:5432/ticketmanagement_test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: [['html', { open: 'never' }]],

  use: {
    baseURL: `http://localhost:${TEST_CLIENT_PORT}`,
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',

  webServer: [
    {
      command: `npx tsx src/index.ts`,
      cwd: path.join(__dirname, 'server'),
      url: `http://localhost:${TEST_SERVER_PORT}/api/health`,
      reuseExistingServer: !isCI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        DATABASE_URL: TEST_DB_URL,
        PORT: String(TEST_SERVER_PORT),
        CLIENT_URL: `http://localhost:${TEST_CLIENT_PORT}`,
        NODE_ENV: 'test',
        BETTER_AUTH_SECRET: 'playwright-test-secret-not-for-production-use',
        BETTER_AUTH_URL: `http://localhost:${TEST_SERVER_PORT}`,
        SEED_ADMIN_EMAIL: 'admin@example.com',
        SEED_ADMIN_PASSWORD: 'password123',
        SEED_AGENT_EMAIL: 'agent@example.com',
        SEED_AGENT_PASSWORD: 'password123',
      },
    },
    {
      command: `npx vite --port ${TEST_CLIENT_PORT}`,
      cwd: path.join(__dirname, 'client'),
      url: `http://localhost:${TEST_CLIENT_PORT}`,
      reuseExistingServer: !isCI,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        VITE_API_URL: `http://localhost:${TEST_SERVER_PORT}`,
      },
    },
  ],
})
