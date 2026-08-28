/**
 * Utility Functions
 * 
 * Common utility functions used throughout the application,
 * including className merging for TailwindCSS and other helpers.
 */

import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merge TailwindCSS class names with proper conflict resolution
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format date to readable string
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format date and time to readable string
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'N/A'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Format file size to human-readable string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get status badge color class
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Permit Status
    New: 'bg-status-neutral text-status-neutral-foreground',
    Submitted: 'bg-status-info text-status-info-foreground',
    InReview: 'bg-status-warning text-status-warning-foreground',
    RevisionsNeeded: 'bg-status-warning text-status-warning-foreground',
    Approved: 'bg-status-success text-status-success-foreground',
    Issued: 'bg-status-success text-status-success-foreground',
    Inspections: 'bg-status-review text-status-review-foreground',
    FinaledClosed: 'bg-status-neutral text-status-neutral-foreground',
    Canceled: 'bg-status-danger text-status-danger-foreground',
    // Billing Status
    NotSent: 'bg-status-neutral text-status-neutral-foreground',
    SentToBilling: 'bg-status-info text-status-info-foreground',
    Billed: 'bg-status-warning text-status-warning-foreground',
    Paid: 'bg-status-success text-status-success-foreground',
    // Document Status
    Pending: 'bg-status-neutral text-status-neutral-foreground',
    Verified: 'bg-status-success text-status-success-foreground',
    Rejected: 'bg-status-danger text-status-danger-foreground',
    // Task Status
    NotStarted: 'bg-status-neutral text-status-neutral-foreground',
    InProgress: 'bg-status-info text-status-info-foreground',
    Waiting: 'bg-status-warning text-status-warning-foreground',
    Completed: 'bg-status-success text-status-success-foreground',
    // Review assignment / user roles (fallback labels)
    ASSIGNED: 'bg-status-info text-status-info-foreground',
    IN_REVIEW: 'bg-status-warning text-status-warning-foreground',
    APPROVED: 'bg-status-success text-status-success-foreground',
    SENT_BACK: 'bg-status-danger text-status-danger-foreground',
    admin: 'bg-status-review text-status-review-foreground',
    coordinator: 'bg-status-info text-status-info-foreground',
    reviewer: 'bg-status-warning text-status-warning-foreground',
  }
  return statusColors[status] ?? 'bg-status-neutral text-status-neutral-foreground'
}

/**
 * Format status for display (convert camelCase to Title Case)
 */
export function formatStatus(status: string): string {
  if (status.includes('_')) {
    return status
      .split('_')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  return status
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Format permit type for display
 * Converts enum values to user-friendly display text
 */
export function formatPermitType(permitType: string): string {
  const typeMap: Record<string, string> = {
    'MobileHome': 'Mobile home',
    // Add other mappings if needed in the future
  }
  return typeMap[permitType] || permitType
}

