'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, MessageSquare } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn, formatDate, formatPermitType } from '@/lib/utils'

interface ReviewAssignment {
  id: string
  status: string
  assignedAt: string
  startedAt?: string
  dueDate?: string
  completedAt?: string
  reviewer: { id: string; name: string; email: string }
  package: {
    id: string
    projectName: string
    projectAddress: string
    permitType: string
    status: string
    internalStage?: string | null
    county?: string
    jurisdiction?: { name: string }
    customer: { name: string }
  }
  comments: Array<{ id: string; isResolved: boolean }>
}

interface ReadyPackage {
  id: string
  projectName: string
  permitType: string
  status: string
  internalStage?: string | null
  county?: string | null
  jurisdiction?: { name: string } | null
  customer?: { name: string }
}

type Lane = 'in_review' | 'ready_to_submit' | 'sent_back' | 'completed' | 'all'

const LANE_TABS: { value: Lane; label: string }[] = [
  { value: 'in_review', label: 'In review' },
  { value: 'ready_to_submit', label: 'Ready to submit' },
  { value: 'sent_back', label: 'Sent back' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
]

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

function openCommentCount(assignment: ReviewAssignment): number {
  return assignment.comments.filter((comment) => !comment.isResolved).length
}

function matchesLane(assignment: ReviewAssignment, lane: Lane): boolean {
  switch (lane) {
    case 'in_review':
      return assignment.status === 'ASSIGNED' || assignment.status === 'IN_REVIEW'
    case 'sent_back':
      return assignment.status === 'SENT_BACK'
    case 'completed':
      return assignment.status === 'APPROVED' || assignment.status === 'SENT_BACK'
    case 'all':
      return true
    case 'ready_to_submit':
      return false // ready-to-submit is sourced from packages, not assignments
  }
}

const openLinkClass =
  'inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export default function ReviewQueuePage() {
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([])
  const [readyPackages, setReadyPackages] = useState<ReadyPackage[]>([])
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [lane, setLane] = useState<Lane>('in_review')
  const [busyId, setBusyId] = useState<string | null>(null)

  const canReviewAct = role === 'admin' || role === 'reviewer'
  const canSubmit = role === 'admin' || role === 'coordinator' || role === 'user'

  async function refresh() {
    const [aRes, pRes] = await Promise.all([
      fetch('/api/review-queue', { credentials: 'include' }),
      fetch('/api/permits?internalStage=ReadyToSubmit&limit=100', { credentials: 'include' }),
    ])
    const aJson = aRes.ok ? await aRes.json() : { data: [] }
    const pJson = pRes.ok ? await pRes.json() : { data: [] }
    setAssignments(aJson.data ?? [])
    setReadyPackages(pJson.data ?? [])
  }

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setRole(s?.user?.role ?? ''))
      .catch(() => {})
    void (async () => {
      setLoading(true)
      try {
        await refresh()
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const inReviewCount = useMemo(
    () => assignments.filter((a) => matchesLane(a, 'in_review')).length,
    [assignments]
  )

  const filtered = useMemo(
    () => assignments.filter((a) => matchesLane(a, lane)),
    [assignments, lane]
  )

  async function reviewAction(packageId: string, action: 'start' | 'approve' | 'send_back') {
    let note: string | undefined
    if (action === 'send_back') {
      note = window.prompt('Reason for sending this package back (required, min 5 chars):') ?? undefined
      if (!note || note.trim().length < 5) return
    }
    setBusyId(packageId)
    try {
      const res = await fetch(`/api/permits/${packageId}/review`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, note }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || `Failed to ${action.replace('_', ' ')}`)
        return
      }
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function submitToCounty(packageId: string) {
    setBusyId(packageId)
    try {
      const res = await fetch(`/api/permits/${packageId}/submit`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        alert(j.error || 'Failed to submit to county')
        return
      }
      await refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Review queue"
          description={`${inReviewCount} in review · ${readyPackages.length} ready to submit`}
        />

        <div role="tablist" aria-label="Review queue lanes" className="flex flex-wrap gap-6 border-b-2 border-ink">
          {LANE_TABS.map((tab) => {
            const count =
              tab.value === 'ready_to_submit'
                ? readyPackages.length
                : assignments.filter((a) => matchesLane(a, tab.value)).length
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={lane === tab.value}
                onClick={() => setLane(tab.value)}
                className={cn(
                  'border-b-[3px] pb-2 pt-3 text-[13px] font-bold uppercase tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                  lane === tab.value ? 'border-accent text-accent' : 'border-transparent text-muted hover:text-ink'
                )}
              >
                {tab.label}
                {count > 0 && <span className="ml-1.5 text-muted">{count}</span>}
              </button>
            )
          })}
        </div>

        {loading ? (
          <p className="py-4 text-sm text-muted" role="status">Loading review queue…</p>
        ) : lane === 'ready_to_submit' ? (
          /* ── Ready to Submit lane (package-sourced) ── */
          readyPackages.length === 0 ? (
            <EmptyLane label="Nothing ready to submit" hint="Packages appear here once their review is approved." />
          ) : (
            <div>
              {readyPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className="grid grid-cols-[1fr_auto] items-center gap-x-4 border-b border-border py-3.5 transition-colors hover:bg-surface-inset"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-bold text-ink">{pkg.projectName}</span>
                      <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-medium text-success">Ready to submit</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-muted">
                      <span>{formatPermitType(pkg.permitType)}</span>
                      <span aria-hidden>·</span>
                      <span>{pkg.jurisdiction?.name ?? pkg.county ?? 'No jurisdiction'}</span>
                      {pkg.customer && <><span aria-hidden>·</span><span>{pkg.customer.name}</span></>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {canSubmit && (
                      <Button size="sm" onClick={() => submitToCounty(pkg.id)} disabled={busyId === pkg.id}>
                        {busyId === pkg.id ? 'Submitting…' : 'Submit to county'}
                      </Button>
                    )}
                    <Link href={`/permits/${pkg.id}`} className={openLinkClass} aria-label={`Open ${pkg.projectName}`}>
                      Open <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filtered.length === 0 ? (
          <EmptyLane label="Queue is clear" hint="No reviews in this lane." />
        ) : (
          <div>
            {filtered.map((assignment) => {
              const unresolvedComments = openCommentCount(assignment)
              const age = daysSince(assignment.assignedAt)
              const isOverdue = assignment.dueDate != null && new Date(assignment.dueDate) < new Date()
              const pkgId = assignment.package.id
              const isActive = assignment.status === 'ASSIGNED' || assignment.status === 'IN_REVIEW'

              return (
                <div
                  key={assignment.id}
                  className="grid grid-cols-[64px_1fr_auto] items-center gap-x-4 border-b border-border py-3.5 transition-colors hover:bg-surface-inset md:grid-cols-[80px_1fr_auto] md:gap-x-5"
                >
                  <span className={cn('text-[26px] font-extrabold leading-none', isOverdue ? 'text-urgent' : 'text-ink')}>
                    {age}
                    <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">days assigned</span>
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-bold text-ink">{assignment.package.projectName}</span>
                      <StatusBadge status={assignment.status} />
                      {isOverdue && (
                        <span className="border border-urgent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-urgent">Overdue</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span>{formatPermitType(assignment.package.permitType)}</span>
                      <span aria-hidden>·</span>
                      <span>{assignment.package.jurisdiction?.name ?? assignment.package.county ?? 'No jurisdiction'}</span>
                      <span aria-hidden>·</span>
                      <span>{assignment.package.customer.name}</span>
                      {assignment.dueDate && (
                        <><span aria-hidden>·</span><span className={isOverdue ? 'font-semibold text-urgent' : undefined}>Due {formatDate(assignment.dueDate)}</span></>
                      )}
                      {unresolvedComments > 0 && (
                        <span className="inline-flex items-center gap-1 font-semibold text-warning">
                          <MessageSquare className="h-3 w-3" aria-hidden />
                          {unresolvedComments} open comment{unresolvedComments !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span>Reviewer: {assignment.reviewer.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive && canReviewAct && (
                      <>
                        {assignment.status === 'ASSIGNED' && (
                          <Button size="sm" variant="outline" onClick={() => reviewAction(pkgId, 'start')} disabled={busyId === pkgId}>Start</Button>
                        )}
                        {assignment.status === 'IN_REVIEW' && (
                          <Button size="sm" onClick={() => reviewAction(pkgId, 'approve')} disabled={busyId === pkgId}>Approve</Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => reviewAction(pkgId, 'send_back')} disabled={busyId === pkgId}>Send back</Button>
                      </>
                    )}
                    <Link href={`/permits/${pkgId}`} className={openLinkClass} aria-label={`Open ${assignment.package.projectName}`}>
                      Open <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}

function EmptyLane({ label, hint }: { label: string; hint: string }) {
  return (
    <div className="border-b border-border py-14 text-center">
      <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success opacity-80" aria-hidden />
      <p className="font-bold uppercase tracking-[0.06em] text-ink">{label}</p>
      <p className="mt-1 text-sm text-muted">{hint}</p>
    </div>
  )
}
