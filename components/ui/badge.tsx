/**
 * Badge Component
 * 
 * A badge component for displaying status indicators and labels.
 * Used throughout the application for status badges, tags, and labels.
 */

import React from 'react'
import { cn, getStatusColor } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline'
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const baseStyles = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
  
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    outline: 'border border-gray-300 text-gray-700',
  }

  return (
    <span
      className={cn(baseStyles, variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}

/**
 * StatusBadge Component
 * 
 * A specialized badge that automatically applies color based on status value.
 */
export function StatusBadge({
  status,
  className,
  ...props
}: { status: string } & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <Badge className={cn(getStatusColor(status), className)} {...props}>
      {status.replace(/([A-Z])/g, ' $1').trim()}
    </Badge>
  )
}

