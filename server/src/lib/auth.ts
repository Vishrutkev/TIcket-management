import { betterAuth } from 'better-auth'
import { prismaAdapter } from 'better-auth/adapters/prisma'
import prisma from './prisma'

const isProd = process.env.NODE_ENV === 'production'

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: 'postgresql' }),

  // Public self-registration disabled in production — agents are created only by admins via POST /api/users.
  emailAndPassword: { enabled: true, disableSignUp: isProd },

  trustedOrigins: [process.env.CLIENT_URL || 'http://localhost:5173'],

  user: {
    additionalFields: {
      // input: false ensures clients cannot self-assign a role during signup.
      role: { type: 'string', input: false },
    },
  },

  rateLimit: {
    enabled: isProd,
    window: 15 * 60 * 1000,
    max: 20,
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
