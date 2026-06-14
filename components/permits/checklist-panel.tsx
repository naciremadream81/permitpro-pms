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
  PENDING:        { label: 'Pending',      icon: Clock,          color: 'text-muted' },
  UPLOADED:       { label: 'Uploaded',     icon: AlertCircle,    color: 'text-accent' },
  VERIFIED:       { label: 'Verified',     icon: CheckCircle2,   color: 'text-success' },
  REJECTED:       { label: 'Rejected',     icon: XCircle,        color: 'text-destructive' },
  WAIVED:         { label: 'Waived',       icon: MinusCircle,    color: 'text-warning' },
  NOT_APPLICABLE: { label: 'N/A',          icon: MinusCircle,    color: 'text-border' },
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
      <div className="p-4 text-sm text-muted">Loading checklist…</div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-6 text-center text-muted text-sm border border-dashed border-border rounded-xl">
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
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>Checklist completion</span>
            <span className="font-medium">{completionPct}%</span>
          </div>
          <div className="h-2 bg-surface-inset rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                completionPct === 100 ? 'bg-success' : completionPct >= 50 ? 'bg-accent' : 'bg-warning'
              }`}
              style={{ width: `${completionPct}%` }}
            />
          </div>
        </div>
        {readiness && (
          <span
            className={`text-xs font-medium px-3 py-1 rounded-full ${
              readiness.isReady
                ? 'bg-status-success text-success'
                : 'bg-surface text-destructive'
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
              className="flex items-start gap-2 text-xs text-destructive bg-surface border border-destructive rounded-lg px-3 py-2"
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
              className="flex items-start gap-2 text-xs text-warning bg-surface border border-warning rounded-lg px-3 py-2"
            >
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {w.message}
            </div>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
        {items.map((item) => {
          const cfg = STATUS_CONFIG[item.status]
          const Icon = cfg.icon
          const isExpanded = expandedId === item.id
          const isBlocked = readiness?.blockers.some((b) => b.checklistItemId === item.id)

          return (
            <div key={item.id} className={`${isBlocked ? 'bg-surface' : ''}`}>
              <button
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-inset transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : item.id)}
              >
                <Icon className={`w-4 h-4 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-ink truncate">
                      {item.requirement.documentName}
                    </span>
                    {item.requirement.isMandatoryForSubmission && (
                      <span className="text-xs text-warning bg-status-warning px-1.5 py-0.5 rounded shrink-0">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {item.requirement.documentCategory}
                    {item.document && ` · ${item.document.fileName}`}
                  </div>
                </div>
                <span className={`text-xs font-medium ${cfg.color} shrink-0`}>{cfg.label}</span>
                {isExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5 text-muted shrink-0" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
                )}
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 pt-1 bg-surface-inset border-t border-border space-y-3">
                  {item.requirement.description && (
                    <p className="text-xs text-muted">{item.requirement.description}</p>
                  )}
                  {item.requirement.helpText && (
                    <p className="text-xs text-accent bg-accent-muted px-2 py-1 rounded">
                      💡 {item.requirement.helpText}
                    </p>
                  )}
                  {item.document && (
                    <div className="text-xs text-muted space-y-0.5">
                      <p>
                        <span className="font-medium">File:</span> {item.document.fileName}{' '}
                        {item.document.versionTag && (
                          <span className="text-muted">({item.document.versionTag})</span>
                        )}
                      </p>
                      <p>
                        <span className="font-medium">Uploaded by:</span>{' '}
                        {item.document.uploadedByUser.name}
                      </p>
                      <p>
                        <span className="font-medium">Status:</span>{' '}
                        <span className={item.document.isVerified ? 'text-success' : 'text-warning'}>
                          {item.document.isVerified ? 'Verified' : 'Pending verification'}
                        </span>
                      </p>
                    </div>
                  )}
                  {item.status === 'WAIVED' && item.waiverReason && (
                    <div className="text-xs text-warning bg-surface border border-warning rounded px-2 py-1">
                      <span className="font-medium">Waiver reason:</span> {item.waiverReason}
                    </div>
                  )}
                  {item.notes && (
                    <p className="text-xs text-muted italic">{item.notes}</p>
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
                          className="w-full text-xs border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-warning"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={waiveItem}
                            disabled={waiverReason.length < 10 || saving}
                            className="text-xs bg-warning text-white px-3 py-1 rounded hover:bg-warning disabled:opacity-40 transition-colors"
                          >
                            {saving ? 'Saving…' : 'Confirm Waiver'}
                          </button>
                          <button
                            onClick={() => { setWaiverItemId(null); setWaiverReason('') }}
                            className="text-xs text-muted px-3 py-1 rounded border border-border hover:bg-surface-inset transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setWaiverItemId(item.id)}
                        className="text-xs text-warning hover:text-warning font-medium"
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
