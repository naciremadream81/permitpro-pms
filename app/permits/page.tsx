/**
 * Permits List Page — Phase 2
 *
 * Client-side list with row selection, bulk actions toolbar,
 * and the existing filter/search/pagination UX.
 */

'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatPermitType, cn } from '@/lib/utils'
import Link from 'next/link'
import {
  CheckSquare,
  Square,
  UserCheck,
  Layers,
  ClipboardList,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Permit {
  id: string
  projectName: string
  projectAddress: string | null
  permitType: string
  status: string
  billingStatus: string
  internalStage: string | null
  openedDate: string
  customer: { id: string; name: string }
  contractor: { id: string; companyName: string }
  coordinator: { id: string; name: string } | null
  jurisdiction: { name: string } | null
}

interface User {
  id: string
  name: string
  role: string
}

// ─── Bulk Action Modal ──────────────────────────────────────────────────────

type BulkAction = 'reassign_coordinator' | 'update_stage' | 'add_task' | null

const STAGES = [
  'WaitingOnContractorDocs',
  'WaitingOnCounty',
  'WaitingOnBilling',
  'ReadyToSubmit',
  'ReadyToClose',
  'InProgress',
]

function BulkActionModal({
  action,
  selectedIds,
  coordinators,
  onClose,
  onDone,
}: {
  action: BulkAction
  selectedIds: string[]
  coordinators: User[]
  onClose: () => void
  onDone: () => void
}) {
  const [coordinatorId, setCoordinatorId] = useState('')
  const [stage, setStage] = useState('')
  const [taskName, setTaskName] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!action) return
    setError('')
    setLoading(true)

    let body: Record<string, unknown> = { action, packageIds: selectedIds }
    if (action === 'reassign_coordinator') body = { ...body, coordinatorId }
    if (action === 'update_stage') body = { ...body, stage }
    if (action === 'add_task') body = { ...body, taskName, taskDueDate: taskDueDate || undefined }

    const res = await fetch('/api/permits/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const j = await res.json()
      setError(j.error ?? 'Failed')
      setLoading(false)
      return
    }

    setLoading(false)
    onDone()
  }

  const isValid =
    (action === 'reassign_coordinator' && coordinatorId) ||
    (action === 'update_stage' && stage) ||
    (action === 'add_task' && taskName.trim().length > 0)

  const titles: Record<string, string> = {
    reassign_coordinator: 'Reassign Coordinator',
    update_stage: 'Update Stage',
    add_task: 'Add Task',
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-base font-semibold">{titles[action ?? '']}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          <p className="text-sm text-gray-500">
            Applying to <strong>{selectedIds.length}</strong> package{selectedIds.length !== 1 ? 's' : ''}.
          </p>

          {action === 'reassign_coordinator' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Coordinator</label>
              <select
                value={coordinatorId}
                onChange={e => setCoordinatorId(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select coordinator…</option>
                {coordinators.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          )}

          {action === 'update_stage' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Stage</label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select stage…</option>
                {STAGES.map(s => (
                  <option key={s} value={s}>{s.replace(/([A-Z])/g, ' $1').trim()}</option>
                ))}
              </select>
            </div>
          )}

          {action === 'add_task' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                <input
                  type="text"
                  value={taskName}
                  onChange={e => setTaskName(e.target.value)}
                  placeholder="e.g. Follow up with county"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={e => setTaskDueDate(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={submit} disabled={loading || !isValid}>
            {loading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
            Apply
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Bulk Toolbar ─────────────────────────────────────────────────────────────

function BulkToolbar({
  count,
  onAction,
  onClear,
}: {
  count: number
  onAction: (a: BulkAction) => void
  onClear: () => void
}) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-gray-900 text-white rounded-full px-5 py-3 shadow-xl border border-gray-700">
      <span className="text-sm font-medium">{count} selected</span>
      <div className="h-4 w-px bg-gray-600" />
      <button
        onClick={() => onAction('reassign_coordinator')}
        className="flex items-center gap-1.5 text-sm hover:text-blue-300 transition-colors"
      >
        <UserCheck className="h-4 w-4" /> Reassign
      </button>
      <button
        onClick={() => onAction('update_stage')}
        className="flex items-center gap-1.5 text-sm hover:text-blue-300 transition-colors"
      >
        <Layers className="h-4 w-4" /> Stage
      </button>
      <button
        onClick={() => onAction('add_task')}
        className="flex items-center gap-1.5 text-sm hover:text-blue-300 transition-colors"
      >
        <ClipboardList className="h-4 w-4" /> Add Task
      </button>
      <div className="h-4 w-px bg-gray-600" />
      <button onClick={onClear} className="text-gray-400 hover:text-white transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PermitsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()

  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const permitType = searchParams.get('permitType') ?? ''
  const page = parseInt(searchParams.get('page') ?? '1')

  const [permits, setPermits] = useState<Permit[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState<BulkAction>(null)
  const [coordinators, setCoordinators] = useState<User[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    if (permitType) params.set('permitType', permitType)
    params.set('page', String(page))
    params.set('limit', '20')

    const res = await fetch(`/api/permits?${params}`)
    const json = await res.json()
    setPermits(json.data ?? [])
    setTotal(json.total ?? 0)
    setTotalPages(json.totalPages ?? 1)
    setLoading(false)
    setSelected(new Set())
  }, [search, status, permitType, page])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then(j => setCoordinators((j.data ?? []).filter((u: User) => u.role !== 'reviewer')))
      .catch(() => {/* non-admin sees empty list, modal still shows stage/task */})
  }, [])

  function navigate(params: Record<string, string>) {
    const next = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(params)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    next.delete('page')
    startTransition(() => router.push(`/permits?${next}`))
  }

  // Selection helpers
  const allSelected = permits.length > 0 && permits.every(p => selected.has(p.id))
  const someSelected = permits.some(p => selected.has(p.id))

  function toggleAll() {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(permits.map(p => p.id)))
  }

  function toggleOne(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleBulkDone() {
    setBulkAction(null)
    setSelected(new Set())
    load()
  }

  return (
    <AppLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Permits</h1>
          <Link href="/permits/new">
            <Button>New Permit</Button>
          </Link>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <form
              onSubmit={e => {
                e.preventDefault()
                const fd = new FormData(e.currentTarget)
                navigate({
                  search: fd.get('search') as string ?? '',
                  status: fd.get('status') as string ?? '',
                  permitType: fd.get('permitType') as string ?? '',
                })
              }}
              className="flex flex-wrap gap-2"
            >
              <input
                type="text"
                name="search"
                placeholder="Search project, customer, contractor…"
                defaultValue={search}
                className="flex-1 min-w-48 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select
                name="status"
                defaultValue={status}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {['New','Submitted','InReview','RevisionsNeeded','Approved','Issued','Inspections','FinaledClosed','Canceled'].map(s => (
                  <option key={s} value={s}>{s.replace(/([A-Z])/g, ' $1').trim()}</option>
                ))}
              </select>
              <select
                name="permitType"
                defaultValue={permitType}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                {['NewConstruction','Addition','Remodel','Accessory','Electrical','Plumbing','Mechanical'].map(t => (
                  <option key={t} value={t}>{formatPermitType(t)}</option>
                ))}
              </select>
              <Button type="submit" size="sm">Filter</Button>
              {(search || status || permitType) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate({ search: '', status: '', permitType: '' })}
                >
                  Clear
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {loading ? 'Loading…' : `${total} permit${total !== 1 ? 's' : ''}`}
              </CardTitle>
              {selected.size > 0 && (
                <span className="text-sm text-blue-600 font-medium">{selected.size} selected</span>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 w-8">
                      <button onClick={toggleAll} className="text-gray-400 hover:text-gray-600">
                        {allSelected
                          ? <CheckSquare className="h-4 w-4 text-blue-600" />
                          : someSelected
                          ? <CheckSquare className="h-4 w-4 text-blue-400" />
                          : <Square className="h-4 w-4" />}
                      </button>
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Contractor</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Coordinator</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opened</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                        Loading permits…
                      </td>
                    </tr>
                  )}
                  {!loading && permits.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400">
                        No permits found.
                      </td>
                    </tr>
                  )}
                  {!loading && permits.map(permit => (
                    <tr
                      key={permit.id}
                      className={cn(
                        'hover:bg-gray-50 transition-colors',
                        selected.has(permit.id) && 'bg-blue-50 hover:bg-blue-50'
                      )}
                    >
                      <td className="px-3 py-2">
                        <button onClick={() => toggleOne(permit.id)} className="text-gray-400 hover:text-gray-600">
                          {selected.has(permit.id)
                            ? <CheckSquare className="h-4 w-4 text-blue-600" />
                            : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <Link href={`/permits/${permit.id}`} className="text-blue-600 hover:underline font-medium">
                          {permit.projectName}
                        </Link>
                        {permit.jurisdiction && (
                          <div className="text-xs text-gray-400">{permit.jurisdiction.name}</div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{permit.customer.name}</td>
                      <td className="px-3 py-2 text-gray-700">{permit.contractor.companyName}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{formatPermitType(permit.permitType)}</td>
                      <td className="px-3 py-2"><StatusBadge status={permit.status} /></td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {permit.internalStage?.replace(/([A-Z])/g, ' $1').trim() ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">{permit.coordinator?.name ?? '—'}</td>
                      <td className="px-3 py-2 text-xs text-gray-500">{formatDate(new Date(permit.openedDate))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => navigate({ page: String(page - 1) })}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => navigate({ page: String(page + 1) })}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Floating bulk toolbar */}
      {selected.size > 0 && (
        <BulkToolbar
          count={selected.size}
          onAction={setBulkAction}
          onClear={() => setSelected(new Set())}
        />
      )}

      {/* Bulk action modal */}
      {bulkAction && (
        <BulkActionModal
          action={bulkAction}
          selectedIds={Array.from(selected)}
          coordinators={coordinators}
          onClose={() => setBulkAction(null)}
          onDone={handleBulkDone}
        />
      )}
    </AppLayout>
  )
}
