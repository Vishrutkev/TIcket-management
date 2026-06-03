import { createAuthClient } from 'better-auth/react'
import type { auth } from '../../../server/src/lib/auth'
import { InferServerPlugin } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  baseURL: 'http://localhost:3000',
  plugins: [InferServerPlugin<typeof auth>()],
})

export const { signIn, signOut, useSession } = authClient
