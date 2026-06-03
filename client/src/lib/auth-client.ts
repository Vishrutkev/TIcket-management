import { createAuthClient } from 'better-auth/react'
import type { auth } from '../../../server/src/lib/auth'
import { inferAdditionalFields } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  // VITE_API_URL must be set in .env.local (dev) and the production environment.
  // A hardcoded localhost URL would silently call the wrong host in any non-local deployment.
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
  plugins: [inferAdditionalFields<typeof auth>()],
})

export const { signIn, signOut, useSession } = authClient
