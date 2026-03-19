'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Clock, CheckCircle2, AlertTriangle, ChevronRight, MessageSquare } from 'lucide-react'

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
  ASSIGNED:   'bg-blue-100 text-blue-700',
  IN_REVIEW:  'bg-purple-100 text-purple-700',
  APPROVED:   'bg-green-100 text-green-700',
  SENT_BACK:  'bg-red-100 text-red-700',
}

function daysSince(date: string) {
  return Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24))
}

export default function ReviewQueuePage() {
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<string>('active')

  useEffect(() => {
    fetchQueue()
  }, [])

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

  const filtered = assignments.filter((a) => {
    if (filterStatus === 'active') return a.status === 'ASSIGNED' || a.status === 'IN_REVIEW'
    if (filterStatus === 'completed') return a.status === 'APPROVED' || a.status === 'SENT_BACK'
    return true
  })

  const activeCount = assignments.filter(
    (a) => a.status === 'ASSIGNED' || a.status === 'IN_REVIEW'
  ).length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Review Queue</h1>
        <p className="text-sm text-gray-500 mt-1">
          {activeCount} active review{activeCount !== 1 ? 's' : ''} awaiting action
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {[
          { value: 'active', label: 'Active' },
          { value: 'completed', label: 'Completed' },
          { value: 'all', label: 'All' },
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilterStatus(tab.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              filterStatus === tab.value
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Queue is clear</p>
          <p className="text-sm mt-1">No reviews in this category.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((assignment) => {
            const openComments = assignment.comments.filter((c) => !c.isResolved).length
            const age = daysSince(assignment.assignedAt)
            const isOverdue =
              assignment.dueDate && new Date(assignment.dueDate) < new Date()

            return (
              <div
                key={assignment.id}
                className={`border rounded-xl p-4 hover:border-gray-300 transition-colors ${
                  isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 truncate">
                        {assignment.package.projectName}
                      </span>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          STATUS_COLOR[assignment.status] ?? 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {assignment.status.replace('_', ' ')}
                      </span>
                      {isOverdue && (
                        <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">
                          Overdue
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      <span>{assignment.package.permitType}</span>
                      <span>·</span>
                      <span>
                        {assignment.package.jurisdiction?.name ?? assignment.package.county ?? 'No jurisdiction'}
                      </span>
                      <span>·</span>
                      <span>{assignment.package.customer.name}</span>
                    </div>

                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Assigned {age}d ago
                      </span>
                      {assignment.dueDate && (
                        <span className={isOverdue ? 'text-red-500' : ''}>
                          Due {new Date(assignment.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {openComments > 0 && (
                        <span className="flex items-center gap-1 text-orange-500">
                          <MessageSquare className="w-3 h-3" />
                          {openComments} open comment{openComments !== 1 ? 's' : ''}
                        </span>
                      )}
                      <span>Reviewer: {assignment.reviewer.name}</span>
                    </div>
                  </div>

                  <Link
                    href={`/permits/${assignment.package.id}`}
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium shrink-0"
                  >
                    Open
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
