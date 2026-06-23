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
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap'

  const variants = {
    default: 'bg-status-neutral text-status-neutral-foreground',
    outline: 'border border-border text-muted bg-surface',
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
