/**
 * Authentication Helper Functions
 *
 * Utility functions for checking authentication and authorization in API routes
 * and server components.
 */

import { auth } from '@/auth'
import { can, enforce, normalizeRole, ForbiddenError, UnauthorizedError } from '@/lib/permissions'
import type { Action, Resource } from '@/lib/permissions'

export async function getSession() {
  return await auth()
}

/**
 * Require authentication. Returns the session or throws UnauthorizedError.
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session) {
    throw new UnauthorizedError()
  }
  return session
}

/**
 * Require admin role.
 */
export async function requireAdmin() {
  const session = await requireAuth()
  if (normalizeRole(session.user?.role) !== 'admin') {
    throw new ForbiddenError('Admin role required')
  }
  return session
}

/**
 * Require coordinator or admin role.
 */
export async function requireCoordinator() {
  const session = await requireAuth()
  const role = normalizeRole(session.user?.role)
  if (role !== 'admin' && role !== 'coordinator') {
    throw new ForbiddenError('Coordinator role required')
  }
  return session
}

/**
 * Require reviewer or admin role.
 */
export async function requireReviewer() {
  const session = await requireAuth()
  const role = normalizeRole(session.user?.role)
  if (role !== 'admin' && role !== 'reviewer') {
    throw new ForbiddenError('Reviewer role required')
  }
  return session
}

/**
 * Require that the authenticated user can perform `action` on `resource`.
 * Throws ForbiddenError if not permitted.
 */
export async function requirePermission(action: Action, resource: Resource) {
  const session = await requireAuth()
  enforce(normalizeRole(session.user?.role), action, resource)
  return session
}

/**
 * Check if current user is admin (no-throw version).
 */
export async function isAdmin(): Promise<boolean> {
  const session = await getSession()
  if (!session?.user?.role) return false
  try {
    return normalizeRole(session.user.role) === 'admin'
  } catch {
    return false
  }
}

/**
 * Check if current user can perform an action (no-throw version).
 */
export async function userCan(action: Action, resource: Resource): Promise<boolean> {
  const session = await getSession()
  if (!session?.user?.role) return false
  try {
    return can(normalizeRole(session.user.role), action, resource)
  } catch {
    return false
  }
}

export { ForbiddenError, UnauthorizedError }
