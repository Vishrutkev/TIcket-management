import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from './prisma'

const isProd = process.env.NODE_ENV === 'production'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // Disable public self-registration — agents are created only by admins via POST /api/users.
  emailAndPassword: { enabled: true, disableSignUp: true },

  trustedOrigins: [process.env.CLIENT_URL || 'http://localhost:5173'],

  user: {
    additionalFields: {
      // input: false ensures clients cannot self-assign a role during signup.
      role: { type: 'string', input: false },
    },
  },

  // Better Auth's built-in rate limiting — second layer behind express-rate-limit.
  // Operates per-path and uses in-process memory by default; switch to
  // "database" or "secondary-storage" in a multi-instance deployment.
  rateLimit: {
    enabled: true,
    window: 60,   // seconds
    max: 10,      // requests per window per IP on auth endpoints
  },

  advanced: {
    // Force HTTPS-only cookies in production. In development, allow http://localhost.
    useSecureCookies: isProd,

    cookies: {
      session_token: {
        attributes: {
          // lax: blocks cross-site POST (CSRF) while allowing top-level GET navigations.
          // Use 'strict' if the app is never accessed via a cross-site redirect.
          sameSite: 'lax',
          httpOnly: true,
          secure: isProd,
        },
      },
    },
  },
})
