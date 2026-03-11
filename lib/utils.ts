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
    'New': 'bg-gray-100 text-gray-800',
    'Submitted': 'bg-blue-100 text-blue-800',
    'InReview': 'bg-yellow-100 text-yellow-800',
    'RevisionsNeeded': 'bg-orange-100 text-orange-800',
    'Approved': 'bg-green-100 text-green-800',
    'Issued': 'bg-green-200 text-green-900',
    'Inspections': 'bg-purple-100 text-purple-800',
    'FinaledClosed': 'bg-gray-200 text-gray-900',
    'Canceled': 'bg-red-100 text-red-800',
    // Billing Status
    'NotSent': 'bg-gray-100 text-gray-800',
    'SentToBilling': 'bg-blue-100 text-blue-800',
    'Billed': 'bg-yellow-100 text-yellow-800',
    'Paid': 'bg-green-100 text-green-800',
    // Document Status
    'Pending': 'bg-gray-100 text-gray-800',
    'Verified': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    // Task Status
    'NotStarted': 'bg-gray-100 text-gray-800',
    'InProgress': 'bg-blue-100 text-blue-800',
    'Waiting': 'bg-yellow-100 text-yellow-800',
    'Completed': 'bg-green-100 text-green-800',
  }
  return statusColors[status] || 'bg-gray-100 text-gray-800'
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

