'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, CheckCircle2, ChevronRight, MessageSquare } from 'lucide-react'
import { AppLayout } from '@/components/layout/app-layout'

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

const STATUS_COLOR: Record<string, string> = {
  ASSIGNED: 'bg-blue-100 text-blue-800',
  IN_REVIEW: 'bg-purple-100 text-purple-800',
  APPROVED: 'bg-green-100 text-green-800',
  SENT_BACK: 'bg-red-100 text-red-800',
}

const FILTER_TABS = [
  { value: 'active', label: 'Active reviews' },
  { value: 'completed', label: 'Completed reviews' },
  { value: 'all', label: 'All reviews' },
] as const

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

export default function ReviewQueuePage() {
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('active')

  useEffect(() => {
    fetchQueue()
  }, [])

  async function fetchQueue() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/review-queue')
      if (!res.ok) throw new Error('Unable to load reviews. Please try again.')
      const json = await res.json()
      setAssignments(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load reviews.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = assignments.filter((a) => {
    if (filterStatus === 'active') return a.status === 'ASSIGNED' || a.status === 'IN_REVIEW'
    if (filterStatus === 'completed') return a.status === 'APPROVED' || a.status === 'SENT_BACK'
    return true
  })

  const activeCount = assignments.filter(
    (a) => a.status === 'ASSIGNED' || a.status === 'IN_REVIEW'
  ).length

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Review Queue</h1>
          <p className="mt-1 text-sm text-muted">
            {activeCount} active review{activeCount !== 1 ? 's' : ''} awaiting action
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter reviews by status"
          className="flex gap-1 border-b border-border"
        >
          {FILTER_TABS.map((tab) => {
            const selected = filterStatus === tab.value
            return (
              <button
                key={tab.value}
                type="button"
                role="tab"
                id={`review-tab-${tab.value}`}
                aria-selected={selected}
                aria-controls="review-queue-panel"
                onClick={() => setFilterStatus(tab.value)}
                className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${
                  selected
                    ? 'border-[var(--focus-ring)] text-[var(--focus-ring)]'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>

        <div
          id="review-queue-panel"
          role="tabpanel"
          aria-labelledby={`review-tab-${filterStatus}`}
        >
          {loading ? (
            <div className="text-sm text-muted" aria-live="polite">Loading review queue…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted">
              <CheckCircle2 className="mx-auto mb-3 h-10 w-10 opacity-30" aria-hidden />
              <p className="font-medium text-ink">Queue is clear</p>
              <p className="mt-1 text-sm">No reviews in this category.</p>
            </div>
          ) : (
            <ul className="m-0 list-none space-y-3 p-0">
              {filtered.map((assignment) => {
                const openComments = assignment.comments.filter((c) => !c.isResolved).length
                const age = daysSince(assignment.assignedAt)
                const isOverdue =
                  assignment.dueDate && new Date(assignment.dueDate) < new Date()

                return (
                  <li
                    key={assignment.id}
                    className={`rounded-xl border p-4 transition-colors ${
                      isOverdue
                        ? 'border-red-200 bg-red-50/30'
                        : 'border-border bg-surface hover:border-muted'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium text-ink">
                            {assignment.package.projectName}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              STATUS_COLOR[assignment.status] ?? 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {assignment.status.replace('_', ' ')}
                          </span>
                          {isOverdue && (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                              Overdue
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted">
                          <span>{assignment.package.permitType}</span>
                          <span aria-hidden>·</span>
                          <span>
                            {assignment.package.jurisdiction?.name ??
                              assignment.package.county ??
                              'No jurisdiction'}
                          </span>
                          <span aria-hidden>·</span>
                          <span>{assignment.package.customer.name}</span>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden />
                            Assigned {age}d ago
                          </span>
                          {assignment.dueDate && (
                            <span className={isOverdue ? 'text-red-600' : ''}>
                              Due {new Date(assignment.dueDate).toLocaleDateString()}
                            </span>
                          )}
                          {openComments > 0 && (
                            <span className="flex items-center gap-1 text-[var(--warning)]">
                              <MessageSquare className="h-3 w-3" aria-hidden />
                              {openComments} open comment{openComments !== 1 ? 's' : ''}
                            </span>
                          )}
                          <span>Reviewer: {assignment.reviewer.name}</span>
                        </div>
                      </div>

                      <Link
                        href={`/permits/${assignment.package.id}`}
                        className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-[var(--focus-ring)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                      >
                        Open permit package
                        <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </AppLayout>
  )
}
