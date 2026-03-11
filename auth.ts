/**
 * NextAuth Auth Function (v5)
 * 
 * This file exports the `auth()` function and handlers for NextAuth v5.
 * This function replaces the deprecated `getServerSession()` from `next-auth/next`.
 * 
 * The `auth()` function is used to get the current session in:
 * - API routes
 * - Server components
 * - Server actions
 * - Middleware
 * 
 * Usage:
 * ```typescript
 * import { auth } from '@/auth'
 * const session = await auth()
 * ```
 * 
 * The `handlers` object contains GET and POST handlers for the auth API route.
 */

import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

/**
 * NextAuth instance configured with our auth configuration
 * 
 * This is the main entry point for authentication in NextAuth v5.
 * It provides:
 * - `auth()`: Function to get the current session
 * - `signIn()`: Function to sign in a user
 * - `signOut()`: Function to sign out a user
 * - `handlers`: GET and POST handlers for the auth API route
 */
export const { auth, signIn, signOut, handlers } = NextAuth(authConfig)

