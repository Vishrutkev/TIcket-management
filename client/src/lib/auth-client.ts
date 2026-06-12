import { createAuthClient } from 'better-auth/react'
import type { auth } from '../../../server/src/lib/auth'
import { inferAdditionalFields } from 'better-auth/client/plugins'

// Always use the current origin so auth requests go through the Vite proxy
// in dev (no CORS) and stay same-origin in prod.
export const authClient = createAuthClient({
  baseURL: window.location.origin,
  plugins: [inferAdditionalFields<typeof auth>()],
})

export const { signIn, signOut, useSession } = authClient
