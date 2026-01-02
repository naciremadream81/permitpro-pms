/**
 * Authentication Helper Functions
 * 
 * Utility functions for checking authentication in API routes and server components.
 * 
 * Updated for NextAuth v5: Uses the new `auth()` function instead of the deprecated
 * `getServerSession()` from `next-auth/next`.
 */

import { auth } from '@/auth'
import { authConfig } from '@/auth.config'

/**
 * Get the current session on the server side
 * 
 * This function wraps the NextAuth v5 `auth()` function to provide
 * a consistent API for retrieving sessions in API routes and server components.
 * 
 * @returns Promise<Session | null> - The current session or null if not authenticated
 * 
 * @example
 * ```typescript
 * // In an API route
 * const session = await getSession()
 * if (!session) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * }
 * ```
 * 
 * @example
 * ```typescript
 * // In a server component
 * const session = await getSession()
 * if (!session) {
 *   redirect('/login')
 * }
 * ```
 */
export async function getSession() {
  return await auth()
}

/**
 * Require authentication - throws error if not authenticated
 * 
 * This function ensures that a user is authenticated before proceeding.
 * If no session exists, it throws an error that should be caught and
 * handled appropriately (typically returning a 401 Unauthorized response).
 * 
 * @returns Promise<Session> - The current session (guaranteed to be non-null)
 * @throws Error - If the user is not authenticated
 * 
 * @example
 * ```typescript
 * try {
 *   const session = await requireAuth()
 *   // User is authenticated, proceed with request
 * } catch (error) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * }
 * ```
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

