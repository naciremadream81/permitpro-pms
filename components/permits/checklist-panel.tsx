'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  CheckCircle2,
  Clock,
  XCircle,
  MinusCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
} from 'lucide-react'

type ChecklistItemStatus = 'PENDING' | 'UPLOADED' | 'VERIFIED' | 'REJECTED' | 'WAIVED' | 'NOT_APPLICABLE'

interface ChecklistItem {
  id: string
  status: ChecklistItemStatus
  notes?: string
  waiverReason?: string
  waivedAt?: string
  requirement: {
    documentName: string
    documentCategory: string
    description?: string
    helpText?: string
    isRequired: boolean
    isMandatoryForSubmission: boolean
    order: number
  }
  document?: {
    id: string
    fileName: string
    status: string
    isVerified: boolean
    uploadedAt: string
    versionTag?: string
    uploadedByUser: { name: string }
  } | null
}

interface ReadinessResult {
  isReady: boolean
  blockers: Array<{ type: string; message: string; checklistItemId?: string }>
  warnings: Array<{ type: string; message: string }>
  checklistPct: number
}

interface Props {
  packageId: string
  isAdmin?: boolean
}

const STATUS_CONFIG: Record<ChecklistItemStatus, { label: string; icon: typeof CheckCircle2; color: string }> = {
  PENDING:        { label: 'Pending',      icon: Clock,          color: 'text-gray-400' },
  UPLOADED:       { label: 'Uploaded',     icon: AlertCircle,    color: 'text-blue-500' },
  VERIFIED:       { label: 'Verified',     icon: CheckCircle2,   color: 'text-green-500' },
  REJECTED:       { label: 'Rejected',     icon: XCircle,        color: 'text-red-500' },
  WAIVED:         { label: 'Waived',       icon: MinusCircle,    color: 'text-yellow-500' },
  NOT_APPLICABLE: { label: 'N/A',          icon: MinusCircle,    color: 'text-gray-300' },
}

export function ChecklistPanel({ packageId, isAdmin = false }: Props) {
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [readiness, setReadiness] = useState<ReadinessResult | null>(null)
  const [completionPct, setCompletionPct] = useState(0)
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [waiverItemId, setWaiverItemId] = useState<string | null>(null)
  const [waiverReason, setWaiverReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [checklistRes, readinessRes] = await Promise.all([
        fetch(`/api/permits/${packageId}/checklist`),
        fetch(`/api/permits/${packageId}/readiness`),
      ])
      const [checklistJson, readinessJson] = await Promise.all([
        checklistRes.json(),
        readinessRes.json(),
      ])
      setItems(checklistJson.data ?? [])
      setCompletionPct(checklistJson.completionPct ?? 0)
      setReadiness(readinessJson.data ?? null)
    } finally {
      setLoading(false)
    }
  }, [packageId])

  useEffect(() => { fetchData() }, [fetchData])

  async function waiveItem() {
    if (!waiverItemId || waiverReason.length < 10) return
    setSaving(true)
    try {
      await fetch(`/api/permits/${packageId}/checklist/${waiverItemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'WAIVED', waiverReason }),
      })
      setWaiverItemId(null)
      setWaiverReason('')
      fetchData()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-gray-400">Loading checklist…</div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm border border-dashed border-gray-200 rounded-xl">
        <p className="font-medium">No checklist items</p>
        <p className="mt-1">Link a jurisdiction to this package to auto-generate a checklist.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Progress bar + readiness badge */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Checklist completion</span>
            <span className="font-medium">{completionPct}%</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                completionPct === 100 ? 'bg-green-500' : completionPct >= 50 ? 'bg-blue-500' : 'bg-orange-400'
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
        {readiness && (
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              readiness.isReady
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {readiness.isReady ? 'Ready to submit' : `${readiness.blockers.length} blocker(s)`}
          </span>
        )}
      </div>

      {/* Blockers */}
      {readiness && !readiness.isReady && (
        <div className="space-y-1">
          {readiness.blockers.map((b, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2"
            >
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {b.message}
            </div>
          ))}
        </div>
      )}

      {/* Warnings */}
      {readiness && readiness.warnings.length > 0 && (
        <div className="space-y-1">
          {readiness.warnings.map((w, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-100 rounded-lg px-3 py-2"
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {w.message}
            </div>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
        {items.map((item) => {
          const cfg = STATUS_CONFIG[item.status]
          const Icon = cfg.icon
          const isExpanded = expandedId === item.id
          const isBlocked = readiness?.blockers.some((b) => b.checklistItemId === item.id)

          return (
            <div key={item.id} className={`${isBlocked ? 'bg-red-50/40' : ''}`}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900 truncate">
                      {item.requirement.documentName}
                    </span>
                    {item.requirement.isMandatoryForSubmission && (
                      <span className="text-xs text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded shrink-0">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {item.requirement.documentCategory}
                    {item.document && ` · ${item.document.fileName}`}
                  </div>
                </div>
                <span className={`text-xs font-medium ${cfg.color} shrink-0`}>{cfg.label}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-gray-50 border-t border-gray-100 space-y-3">
                  {item.requirement.description && (
                    <p className="text-xs text-gray-600">{item.requirement.description}</p>
                  )}
                  {item.requirement.helpText && (
                    <p className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      💡 {item.requirement.helpText}
                    </p>
                  )}
                  {item.document && (
                    <div className="text-xs text-gray-600 space-y-0.5">
                      <p>
                        <span className="font-medium">File:</span> {item.document.fileName}{' '}
                        {item.document.versionTag && (
                          <span className="text-gray-400">({item.document.versionTag})</span>
                        )}
                      </p>
                      <p>
                        <span className="font-medium">Uploaded by:</span>{' '}
                        {item.document.uploadedByUser.name}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        <span className={item.document.isVerified ? 'text-green-600' : 'text-orange-600'}>
                          {item.document.isVerified ? 'Verified' : 'Pending verification'}
                        </span>
                      </p>
                    </div>
                  )}
                  {item.status === 'WAIVED' && item.waiverReason && (
                    <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-100 rounded px-2 py-1">
                      <span className="font-medium">Waiver reason:</span> {item.waiverReason}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-xs text-gray-500 italic">{item.notes}</p>
                  )}

                  {/* Admin waiver action */}
                  {isAdmin && item.status !== 'WAIVED' && item.status !== 'VERIFIED' && (
                    waiverItemId === item.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={waiverReason}
                          onChange={(e) => setWaiverReason(e.target.value)}
                          placeholder="Waiver reason (min 10 characters)…"
                          rows={2}
                          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-yellow-400"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={waiveItem}
                            disabled={waiverReason.length < 10 || saving}
                            className="text-xs bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600 disabled:opacity-40 transition-colors"
                          >
                            {saving ? 'Saving…' : 'Confirm Waiver'}
                          </button>
                          <button
                            onClick={() => { setWaiverItemId(null); setWaiverReason('') }}
                            className="text-xs text-gray-500 px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setWaiverItemId(item.id)}
                        className="text-xs text-yellow-600 hover:text-yellow-800 font-medium"
                      >
                        Waive this item…
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
