/**
 * Badge Component
 * 
 * A badge component for displaying status indicators and labels.
 * Used throughout the application for status badges, tags, and labels.
 */

import React from 'react'
import { cn, formatStatus, getStatusColor } from '@/lib/utils'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline'
}

export function Badge({
  className,
  variant = 'default',
  children,
  ...props
}: BadgeProps) {
  const baseStyles =
    'inline-flex items-center px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] leading-none whitespace-nowrap'

  const variants = {
    default: 'bg-status-neutral text-status-neutral-foreground',
    outline: 'border border-border text-muted',
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
      {formatStatus(status)}
    </Badge>
  )
}

