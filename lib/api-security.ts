/**
 * Shared API security utilities — centralized error handling, upload validation,
 * pagination bounds, and Content-Disposition sanitization.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import path from 'path'
import type { Session } from 'next-auth'
import { ForbiddenError, UnauthorizedError, enforce, normalizeRole } from '@/lib/permissions'
import type { Action, Resource } from '@/lib/permissions'

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50MB
export const MAX_PAGE_LIMIT = 100

const ALLOWED_UPLOAD_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.txt',
])

/**
 * Require that the session's role may perform `action` on `resource`.
 * Throws ForbiddenError when denied.
 */
export function requirePermission(
  session: Session,
  action: Action,
  resource: Resource
): void {
  enforce(normalizeRole(session.user?.role), action, resource)
}

/**
 * Map thrown errors to consistent JSON API responses.
 */
export function handleApiError(
  error: unknown,
  fallbackMessage: string,
  options?: { notFoundMessage?: string }
): NextResponse {
  if (error instanceof UnauthorizedError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: 'Validation error', details: error.flatten() },
      { status: 400 }
    )
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
    return NextResponse.json(
      { error: options?.notFoundMessage ?? 'Not found' },
      { status: 404 }
    )
  }
  console.error(fallbackMessage, error)
  return NextResponse.json({ error: fallbackMessage }, { status: 500 })
}

/**
 * Validate an uploaded file's size, extension, and filename safety.
 */
export function validateUploadedFile(
  file: File
): { ok: true } | { ok: false; error: string } {
  if (file.size > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `File size exceeds maximum of ${MAX_UPLOAD_BYTES / 1024 / 1024}MB` }
  }

  const baseName = path.basename(file.name)
  if (baseName !== file.name || baseName.includes('..')) {
    return { ok: false, error: 'Invalid file name' }
  }

  const ext = path.extname(file.name).toLowerCase()
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    return { ok: false, error: 'File type not allowed' }
  }

  return { ok: true }
}

/**
 * Bound pagination query params to prevent unbounded result sets.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit = 50
): { page: number; limit: number; skip: number } {
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const rawLimit = parseInt(searchParams.get('limit') || String(defaultLimit), 10) || defaultLimit
  const limit = Math.min(MAX_PAGE_LIMIT, Math.max(1, rawLimit))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

/**
 * Sanitize a filename for use in Content-Disposition headers.
 */
export function sanitizeContentDispositionFilename(fileName: string): string {
  return fileName.replace(/["\r\n\\]/g, '_').slice(0, 255)
}
