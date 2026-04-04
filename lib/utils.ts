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
/**
 * Status chip colors — opacity backgrounds + contrasting text for light/dark.
 */
export function getStatusColor(status: string): string {
  const statusColors: Record<string, string> = {
    // Permit Status
    New: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
    Submitted: "bg-blue-500/15 text-blue-800 dark:text-blue-200",
    InReview: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
    RevisionsNeeded: "bg-orange-500/15 text-orange-900 dark:text-orange-200",
    Approved: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
    Issued: "bg-teal-500/15 text-teal-900 dark:text-teal-200",
    Inspections: "bg-violet-500/15 text-violet-900 dark:text-violet-200",
    FinaledClosed: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
    Canceled: "bg-red-500/15 text-red-800 dark:text-red-200",
    // Billing Status
    NotSent: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
    SentToBilling: "bg-blue-500/15 text-blue-800 dark:text-blue-200",
    Billed: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
    Paid: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
    // Document Status
    Pending: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
    Verified: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
    Rejected: "bg-red-500/15 text-red-800 dark:text-red-200",
    // Task Status
    NotStarted: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
    InProgress: "bg-blue-500/15 text-blue-800 dark:text-blue-200",
    Waiting: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
    Completed: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
    // Roles
    admin: "bg-violet-500/15 text-violet-900 dark:text-violet-200",
    coordinator: "bg-blue-500/15 text-blue-800 dark:text-blue-200",
    reviewer: "bg-teal-500/15 text-teal-900 dark:text-teal-200",
    user: "bg-slate-500/15 text-slate-800 dark:text-slate-200",
  };
  return statusColors[status] || "bg-muted text-muted-foreground";
}

/**
 * Format status for display (convert camelCase to Title Case)
 */
export function formatStatus(status: string): string {
  return status
    .replace(/([A-Z])/g, ' $1')
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
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

