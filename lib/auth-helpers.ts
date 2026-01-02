/**
 * Authentication Helper Functions
 * 
 * Utility functions for checking authentication in API routes and server components.
 */

import { getServerSession } from 'next-auth/next'
import { authConfig } from '@/auth.config'

/**
 * Get the current session on the server side
 * Use this in API routes and server components
 */
export async function getSession() {
  return await getServerSession(authConfig)
}

/**
 * Require authentication - throws error if not authenticated
 * Use this in API routes that require authentication
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    throw new Error('Unauthorized')
  }
  return session
}

