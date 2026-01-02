/**
 * NextAuth Configuration (v5)
 * 
 * Configuration for NextAuth.js v5 authentication.
 * This file exports the auth configuration for use in both
 * the API route handler and server-side session retrieval.
 * 
 * In NextAuth v5, the configuration structure has been updated
 * to use a more streamlined approach with better type safety.
 */

import Credentials from 'next-auth/providers/credentials'
import type { NextAuthConfig } from 'next-auth'

/**
 * NextAuth configuration object
 * 
 * This configuration defines:
 * - Authentication providers (Credentials in this case)
 * - Session strategy (JWT)
 * - Custom pages (login page)
 * - Callbacks for JWT and session handling
 * 
 * Note: We use dynamic import for authenticateUser to avoid loading Prisma
 * in the Edge runtime (middleware). The authorize function is only called
 * during sign-in, not in middleware, so this is safe.
 */
export const authConfig: NextAuthConfig = {
  // Trust the host in development (required for NextAuth v5)
  // This ensures cookies are set correctly
  trustHost: true,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        // Validate that credentials are provided
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Dynamically import authenticateUser to avoid loading Prisma in Edge runtime
        // This function is only called during sign-in, not in middleware
        const { authenticateUser } = await import('@/lib/auth')
        const user = await authenticateUser(credentials.email, credentials.password)
        
        // Return user object if authentication succeeds, null otherwise
        return user ? { id: user.id, email: user.email, name: user.name } : null
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    /**
     * JWT callback - called whenever a JWT is created or updated
     * This allows us to add custom properties to the JWT token
     */
    async jwt({ token, user }) {
      // When a user first signs in, add their information to the token
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    /**
     * Session callback - called whenever a session is checked
     * This allows us to customize the session object returned to the client
     */
    async session({ session, token }) {
      // Add user information from the token to the session
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },
}

