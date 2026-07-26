/**
 * Centralized Permission Matrix
 *
 * Single source of truth for what each role can do.
 * All API routes and server components call authorize() rather than
 * scattering role string-comparisons throughout the codebase.
 *
 * Roles:
 *   admin       — full system access, can override readiness gates
 *   coordinator — creates/manages packages and documents
 *   reviewer    — reviews packages, approves or sends back
 */

export type UserRole = 'admin' | 'coordinator' | 'reviewer'

export type Resource =
  | 'package'
  | 'document'
  | 'task'
  | 'checklist'
  | 'review'
  | 'contractor'
  | 'contractor_document'
  | 'customer'
  | 'jurisdiction'
  | 'requirement'
  | 'export_profile'
  | 'user'
  | 'notification'

export type Action =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'upload'           // documents
  | 'verify'           // verify documents
  | 'reject'           // reject documents
  | 'submit_review'    // move package to ready-for-review
  | 'assign_reviewer'  // assign a reviewer to a package
  | 'start_review'     // reviewer begins reviewing
  | 'approve'          // reviewer approves package
  | 'send_back'        // reviewer sends package back with comments
  | 'resolve_comment'  // mark a review comment resolved
  | 'waive_item'       // waive a checklist item (admin only)
  | 'override_readiness' // bypass readiness gate (admin only)
  | 'export'           // generate ZIP export
  | 'bulk'             // bulk operations

type PermissionMatrix = Record<Resource, Partial<Record<Action, UserRole[]>>>

const MATRIX: PermissionMatrix = {
  package: {
    create:            ['admin', 'coordinator'],
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin', 'coordinator'],
    delete:            ['admin'],
    submit_review:     ['admin', 'coordinator'],
    assign_reviewer:   ['admin'],
    export:            ['admin', 'coordinator'],
    bulk:              ['admin', 'coordinator'],
  },
  document: {
    create:            ['admin', 'coordinator'],
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin', 'coordinator'],
    delete:            ['admin', 'coordinator'],
    upload:            ['admin', 'coordinator'],
    verify:            ['admin', 'coordinator', 'reviewer'],
    reject:            ['admin', 'coordinator', 'reviewer'],
    bulk:              ['admin', 'coordinator'],
  },
  task: {
    create:            ['admin', 'coordinator'],
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin', 'coordinator'],
    delete:            ['admin', 'coordinator'],
  },
  checklist: {
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin', 'coordinator'],
    waive_item:        ['admin'],
    override_readiness: ['admin'],
  },
  review: {
    read:              ['admin', 'coordinator', 'reviewer'],
    assign_reviewer:   ['admin'],
    start_review:      ['admin', 'reviewer'],
    approve:           ['admin', 'reviewer'],
    send_back:         ['admin', 'reviewer'],
    resolve_comment:   ['admin', 'coordinator'],
  },
  contractor: {
    create:            ['admin', 'coordinator'],
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin', 'coordinator'],
    delete:            ['admin'],
    bulk:              ['admin'],
  },
  contractor_document: {
    create:            ['admin', 'coordinator'],
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin', 'coordinator'],
    delete:            ['admin'],
    verify:            ['admin', 'coordinator'],
  },
  customer: {
    create:            ['admin', 'coordinator'],
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin', 'coordinator'],
    delete:            ['admin'],
  },
  jurisdiction: {
    create:            ['admin'],
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin'],
    delete:            ['admin'],
  },
  requirement: {
    create:            ['admin'],
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin'],
    delete:            ['admin'],
  },
  export_profile: {
    create:            ['admin'],
    read:              ['admin', 'coordinator'],
    update:            ['admin'],
    delete:            ['admin'],
  },
  user: {
    create:            ['admin'],
    read:              ['admin'],
    update:            ['admin'],
    delete:            ['admin'],
  },
  notification: {
    read:              ['admin', 'coordinator', 'reviewer'],
    update:            ['admin', 'coordinator', 'reviewer'],
    delete:            ['admin'],
  },
}

/**
 * Returns true if the given role is permitted to perform `action` on `resource`.
 *
 * @example
 * if (!can(session.user.role, 'waive_item', 'checklist')) {
 *   return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 * }
 */
export function can(role: string, action: Action, resource: Resource): boolean {
  const allowed = MATRIX[resource]?.[action]
  if (!allowed) return false
  return allowed.includes(role as UserRole)
}

/**
 * Throws a Forbidden error if the role is not permitted.
 * Use in API routes that already have a session.
 */
export function enforce(role: string, action: Action, resource: Resource): void {
  if (!can(role, action, resource)) {
    throw new ForbiddenError(`Role '${role}' cannot '${action}' on '${resource}'`)
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ForbiddenError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Unauthorized') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

/**
 * Normalize legacy role strings to the canonical UserRole union.
 * Unknown roles fail closed — they must not inherit coordinator privileges.
 */
export function normalizeRole(role: string | null | undefined): UserRole {
  if (role === 'admin') return 'admin'
  if (role === 'reviewer') return 'reviewer'
  if (role === 'coordinator' || role === 'user') return 'coordinator'
  throw new ForbiddenError(`Unrecognized role '${role ?? 'none'}'`)
}
