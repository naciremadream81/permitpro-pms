/**
 * Attention alert chips — tokenized surfaces for dashboard-style urgency cues.
 */

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AttentionAlertTone = 'critical' | 'warning' | 'review'

const toneStyles: Record<AttentionAlertTone, string> = {
  critical: 'border-destructive/30 bg-destructive/10 text-destructive',
  warning: 'border-warning/30 bg-warning/10 text-warning',
  review: 'border-review/30 bg-review/10 text-review',
}

export type AttentionAlertItem = {
  href: string
  icon: LucideIcon
  tone: AttentionAlertTone
  label: string
  sub: string
}

export function AttentionAlertChip({
  href,
  icon: Icon,
  tone,
  label,
  sub,
}: AttentionAlertItem) {
  return (
    <Link
      href={href}
      aria-label={`${label}. ${sub}`}
      className={cn(
        'flex min-w-52 flex-1 items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        toneStyles[tone]
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" aria-hidden />
      <div className="min-w-0">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs opacity-80">{sub}</div>
      </div>
      <ChevronRight className="ml-auto h-4 w-4 flex-shrink-0 opacity-60" aria-hidden />
    </Link>
  )
}

export function AttentionAlertsPanel({ alerts }: { alerts: AttentionAlertItem[] }) {
  if (alerts.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border bg-surface-inset px-4 py-3" role="status">
        <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-success" aria-hidden />
        <p className="text-sm text-muted">
          No urgent alerts — stalled packages, compliance expirations, and open review comments are clear.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-3">
      {alerts.map((alert) => (
        <AttentionAlertChip key={alert.href + alert.label} {...alert} />
      ))}
    </div>
  )
}
