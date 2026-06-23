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
    'inline-flex items-center justify-center font-medium tracking-[0.01em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] disabled:opacity-50 disabled:pointer-events-none'

  const variants = {
    default: 'bg-accent text-accent-foreground hover:bg-accent-hover shadow-sm',
    outline: 'border border-border bg-surface text-ink hover:bg-surface-inset shadow-sm',
    ghost: 'text-ink hover:bg-surface-inset',
    destructive: 'bg-destructive text-destructive-foreground hover:opacity-90 shadow-sm',
  }

  const sizes = {
    sm: 'h-8 gap-1.5 rounded-[var(--radius-sm)] px-3 text-[12px]',
    md: 'h-9 gap-2 rounded-[var(--radius-md)] px-4 text-[13px]',
    lg: 'h-10 gap-2 rounded-[var(--radius-md)] px-5 text-[14px]',
  }

  return (
    <button
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    />
  )
}
