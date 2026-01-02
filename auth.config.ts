/**
 * NextAuth Configuration
 * 
 * Configuration for NextAuth.js authentication.
 * This file exports the auth configuration separately for use in both
 * the API route handler and server-side session retrieval.
 */

import CredentialsProvider from 'next-auth/providers/credentials'
import { authenticateUser } from '@/lib/auth'

export const authConfig = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const user = await authenticateUser(credentials.email, credentials.password)
        return user ? { id: user.id, email: user.email, name: user.name } : null
      },
    }),
  ],
  session: {
    strategy: 'jwt' as const,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
      }
      return session
    },
  },
}

