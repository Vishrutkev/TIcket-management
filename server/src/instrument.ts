import { config } from 'dotenv'
import * as Sentry from '@sentry/node'

// Load .env before reading any env vars — tsx watch does not load .env automatically
config()

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  enabled: !!process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  integrations: [
    Sentry.expressIntegration(),
  ],
})
