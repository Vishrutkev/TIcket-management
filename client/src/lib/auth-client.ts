import { createAuthClient } from 'better-auth/react'
import type { auth } from '../../../server/src/lib/auth'
import { inferAdditionalFields } from 'better-auth/client/plugins'

// Dev:  VITE_API_URL = 'http://localhost:3000' → direct to server, CORS handled by CLIENT_URL
// Prod: VITE_API_URL = '' → fall back to window.location.origin (same origin)
const apiUrl = import.meta.env.VITE_API_URL || window.location.origin

export const authClient = createAuthClient({
  baseURL: apiUrl,
  plugins: [inferAdditionalFields<typeof auth>()],
})

export const { signIn, signOut, useSession } = authClient
