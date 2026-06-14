'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { CheckCircle2, ChevronRight, MessageSquare } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'
import { PageHeader } from '@/components/layout/page-header'
import { StatusBadge } from '@/components/ui/badge'
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
    county?: string
    jurisdiction?: { name: string }
    customer: { name: string }
  }
  comments: Array<{ id: string; isResolved: boolean }>
}

type QueueFilter = 'active' | 'completed' | 'all'

const FILTER_TABS: { value: QueueFilter; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'all', label: 'All' },
]

function daysSince(date: string): number {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

function openCommentCount(assignment: ReviewAssignment): number {
  return assignment.comments.filter((comment) => !comment.isResolved).length
}

function matchesQueueFilter(assignment: ReviewAssignment, filter: QueueFilter): boolean {
  switch (filter) {
    case 'active':
      return assignment.status === 'ASSIGNED' || assignment.status === 'IN_REVIEW'
    case 'completed':
      return assignment.status === 'APPROVED' || assignment.status === 'SENT_BACK'
    case 'all':
      return true
    default: {
      const _exhaustive: never = filter
      return _exhaustive
    }
  }
}

const openLinkClass =
  'inline-flex shrink-0 items-center gap-1 text-sm font-medium text-accent hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'

export default function ReviewQueuePage() {
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<QueueFilter>('active')
  const [openCommentsOnly, setOpenCommentsOnly] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setOpenCommentsOnly(params.get('comments') === 'open')
  }, [])

  useEffect(() => {
    async function fetchQueue() {
      setLoading(true)
      try {
        const res = await fetch('/api/review-queue')
        const json = await res.json()
        setAssignments(json.data ?? [])
      } finally {
        setLoading(false)
      }
    }

    void fetchQueue()
  }, [])

  const activeCount = useMemo(
    () => assignments.filter((assignment) => matchesQueueFilter(assignment, 'active')).length,
    [assignments]
  )

  const filtered = useMemo(() => {
    return assignments.filter((assignment) => {
      if (!matchesQueueFilter(assignment, filterStatus)) return false
      if (openCommentsOnly && openCommentCount(assignment) === 0) return false
      return true
    })
  }, [assignments, filterStatus, openCommentsOnly])

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <PageHeader
          title="Review queue"
          description={
            openCommentsOnly
              ? 'Assignments with unresolved review comments'
              : `${activeCount} active review${activeCount !== 1 ? 's' : ''} awaiting action`
          }
        />

        {openCommentsOnly && (
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2.5 text-sm">
            <span className="flex items-baseline gap-3">
              <span className="border border-status-review px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-status-review">
                Comments
              </span>
              <span className="text-ink">Showing assignments with open comments only</span>
            </span>
            <Link
              href="/review-queue"
              className="text-xs font-bold uppercase tracking-[0.08em] text-accent hover:underline"
            >
              Clear filter
            </Link>
          </div>
        )}

        <div
          role="tablist"
          aria-label="Review queue filters"
          className="flex gap-6 border-b-2 border-ink"
        >
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={filterStatus === tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={cn(
                'border-b-[3px] pb-2 pt-3 text-[13px] font-bold uppercase tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
                filterStatus === tab.value
                  ? 'border-accent text-accent'
                  : 'border-transparent text-muted hover:text-ink'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="py-4 text-sm text-muted" role="status">
            Loading review queue…
          </p>
        ) : filtered.length === 0 ? (
          <div className="border-b border-border py-14 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success opacity-80" aria-hidden />
            <p className="font-bold uppercase tracking-[0.06em] text-ink">Queue is clear</p>
            <p className="mt-1 text-sm text-muted">
              {openCommentsOnly
                ? 'No assignments with open comments in this category.'
                : 'No reviews in this category.'}
            </p>
          </div>
        ) : (
          <div>
            {filtered.map((assignment) => {
              const unresolvedComments = openCommentCount(assignment)
              const age = daysSince(assignment.assignedAt)
              const isOverdue =
                assignment.dueDate != null && new Date(assignment.dueDate) < new Date()

              return (
                <div
                  key={assignment.id}
                  className="grid grid-cols-[64px_1fr_auto] items-center gap-x-4 border-b border-border py-3.5 transition-colors hover:bg-surface-inset md:grid-cols-[80px_1fr_auto] md:gap-x-5"
                >
                  <span
                    className={cn(
                      'text-[26px] font-extrabold leading-none',
                      isOverdue ? 'text-urgent' : 'text-ink'
                    )}
                  >
                    {age}
                    <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                      days assigned
                    </span>
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[15px] font-bold text-ink">
                        {assignment.package.projectName}
                      </span>
                      <StatusBadge status={assignment.status} />
                      {isOverdue && (
                        <span className="border border-urgent px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-urgent">
                          Overdue
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span>{formatPermitType(assignment.package.permitType)}</span>
                      <span aria-hidden>·</span>
                      <span>
                        {assignment.package.jurisdiction?.name ??
                          assignment.package.county ??
                          'No jurisdiction'}
                      </span>
                      <span aria-hidden>·</span>
                      <span>{assignment.package.customer.name}</span>
                      {assignment.dueDate && (
                        <>
                          <span aria-hidden>·</span>
                          <span className={isOverdue ? 'font-semibold text-urgent' : undefined}>
                            Due {formatDate(assignment.dueDate)}
                          </span>
                        </>
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

                  <Link
                    href={`/permits/${assignment.package.id}`}
                    className={openLinkClass}
                    aria-label={`Open ${assignment.package.projectName}`}
                  >
                    Open
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </AppLayout>
  )
}
