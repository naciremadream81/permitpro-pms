/**
 * Button Component
 *
 * Token-aligned button with accent-based primary variant.
 */

import React from 'react'
import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
}

export function Button({
  className,
  variant = 'default',
  size = 'md',
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-bold uppercase tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:opacity-50 disabled:pointer-events-none'

  const variants = {
    default: 'bg-accent text-accent-foreground hover:bg-accent-hover',
    outline: 'border border-ink bg-surface text-ink hover:bg-surface-inset',
    ghost: 'text-ink hover:bg-surface-inset',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90',
  }

  const sizes = {
    sm: 'h-8 px-3 text-xs',
    md: 'h-10 px-5 text-[13px]',
    lg: 'h-12 px-7 text-sm',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
