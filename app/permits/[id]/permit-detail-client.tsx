/**
 * Permit Detail Client Component — Phase 2
 *
 * Tabbed layout: Overview | Documents | Tasks | Checklist | Review | Activity
 * Surfaces checklist engine, readiness gate, review workflow, contractor vault.
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChecklistPanel } from '@/components/permits/checklist-panel'
import { VaultPanel } from '@/components/contractors/vault-panel'
import { formatDate, formatDateTime, formatPermitType, cn } from '@/lib/utils'
import Link from 'next/link'
import {
  CheckSquare,
  ClipboardCheck,
  FileText,
  ListTodo,
  Activity,
  Wrench,
  Loader2,
  MessageSquare,
  UserCheck,
  ChevronDown,
  ThumbsUp,
  RotateCcw,
  Download,
  Upload,
} from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────

interface PermitDocument {
  id: string
  fileName: string
  fileType: string
  category: string
  notes: string | null
  versionTag: string | null
  uploadedAt: string
  uploadedByUser: { id: string; name: string; email: string }
  status: string
  isVerified: boolean
  isRequired: boolean
}

interface Task {
  id: string
  name: string
  description: string | null
  status: string
  assignedTo: string | null
  dueDate: string | null
  priority: string | null
  completedAt: string | null
}

interface ActivityLog {
  id: string
  description: string
  createdAt: string
  user: { name: string; email: string } | null
}

interface ReviewAssignment {
  id: string
  reviewerId: string
  reviewer: { id: string; name: string; email: string }
  status: string
  assignedAt: string
  startedAt: string | null
  dueDate: string | null
  completedAt: string | null
  comments: ReviewComment[]
}

interface ReviewComment {
  id: string
  content: string
  isResolved: boolean
  createdAt: string
  author: { id: string; name: string }
  resolvedBy?: { name: string } | null
}

interface PermitData {
  id: string
  projectName: string
  projectAddress: string
  customer: { id: string; name: string }
  contractor: { id: string; companyName: string }
  coordinator: { id: string; name: string; email: string } | null
  jurisdiction: { id: string; name: string } | null
  permitType: string
  permitNumber: string | null
  status: string
  internalStage: string | null
  billingStatus: string
  openedDate: string
  targetIssueDate: string | null
  closedDate: string | null
  lastActivityAt: string | null
  county: string | null
  jurisdictionNotes: string | null
  billingNotes: string | null
  documents: PermitDocument[]
  tasks: Task[]
  activityLogs: ActivityLog[]
}

// ─── Tab definition ─────────────────────────────────────────────────────────

type Tab = 'overview' | 'documents' | 'tasks' | 'checklist' | 'review' | 'contractor' | 'activity'

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'overview',    label: 'Overview',    icon: FileText },
  { id: 'documents',   label: 'Documents',   icon: Upload },
  { id: 'tasks',       label: 'Tasks',       icon: ListTodo },
  { id: 'checklist',   label: 'Checklist',   icon: CheckSquare },
  { id: 'review',      label: 'Review',      icon: ClipboardCheck },
  { id: 'contractor',  label: 'Contractor',  icon: Wrench },
  { id: 'activity',    label: 'Activity',    icon: Activity },
]

// ─── Review Tab ──────────────────────────────────────────────────────────────

function ReviewTab({ packageId, userRole, userId }: { packageId: string; userRole: string; userId: string }) {
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<{ id: string; name: string }[]>([])
  const [assignReviewerId, setAssignReviewerId] = useState('')
  const [assignDueDate, setAssignDueDate] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [commentContent, setCommentContent] = useState<Record<string, string>>({})
  const [sendingComment, setSendingComment] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const reload = useCallback(async () => {
    const res = await fetch(`/api/permits/${packageId}/review`)
    const json = await res.json()
    setAssignments(json.data ?? [])
    setLoading(false)
  }, [packageId])

  useEffect(() => {
    reload()
    fetch('/api/users').then(r => r.json()).then(j => setUsers(j.data ?? []))
  }, [reload])

  async function assign() {
    if (!assignReviewerId) return
    setAssigning(true)
    await fetch(`/api/permits/${packageId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'assign', reviewerId: assignReviewerId, dueDate: assignDueDate || undefined }),
    })
    setAssignReviewerId('')
    setAssignDueDate('')
    setAssigning(false)
    reload()
  }

  async function reviewerAction(assignmentId: string, action: 'start' | 'approve' | 'send_back') {
    setActionLoading(assignmentId + action)
    await fetch(`/api/permits/${packageId}/review`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, assignmentId }),
    })
    setActionLoading(null)
    reload()
  }

  async function postComment(assignmentId: string) {
    const content = commentContent[assignmentId]?.trim()
    if (!content) return
    setSendingComment(assignmentId)
    await fetch(`/api/review-assignments/${assignmentId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    setCommentContent(p => ({ ...p, [assignmentId]: '' }))
    setSendingComment(null)
    reload()
  }

  async function toggleResolve(commentId: string, isResolved: boolean) {
    await fetch(`/api/review-comments/${commentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isResolved: !isResolved }),
    })
    reload()
  }

  const canAssign = userRole === 'admin' || userRole === 'coordinator'
  const isReviewer = userRole === 'reviewer'

  if (loading) return <div className="py-8 text-center text-gray-400 animate-pulse">Loading review…</div>

  return (
    <div className="space-y-5">
      {/* Assign panel (admin/coordinator) */}
      {canAssign && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserCheck className="h-4 w-4" /> Assign Reviewer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Reviewer</label>
                <select
                  value={assignReviewerId}
                  onChange={e => setAssignReviewerId(e.target.value)}
                  className="border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select reviewer…</option>
                  {users.filter(u => u.id !== userId).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Due Date</label>
                <input
                  type="date"
                  value={assignDueDate}
                  onChange={e => setAssignDueDate(e.target.value)}
                  className="border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <Button size="sm" onClick={assign} disabled={assigning || !assignReviewerId}>
                {assigning && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                Assign
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {assignments.length === 0 && (
        <p className="text-sm text-gray-400 italic py-4 text-center">No review assignments yet.</p>
      )}

      {assignments.map(a => {
        const myAssignment = a.reviewerId === userId
        const openComments = a.comments.filter(c => !c.isResolved).length
        return (
          <Card key={a.id} className={cn(a.status === 'SENT_BACK' ? 'border-orange-200' : a.status === 'APPROVED' ? 'border-green-200' : '')}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium text-sm">{a.reviewer.name}</p>
                  <p className="text-xs text-gray-400">{a.reviewer.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {openComments > 0 && (
                    <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {openComments} open
                    </span>
                  )}
                  <StatusBadge status={a.status} />
                </div>
              </div>
              <div className="text-xs text-gray-400 flex gap-3 mt-1">
                <span>Assigned {new Date(a.assignedAt).toLocaleDateString()}</span>
                {a.dueDate && <span>Due {new Date(a.dueDate).toLocaleDateString()}</span>}
                {a.completedAt && <span>Completed {new Date(a.completedAt).toLocaleDateString()}</span>}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Reviewer actions */}
              {myAssignment && a.status === 'ASSIGNED' && (
                <Button size="sm" variant="outline" onClick={() => reviewerAction(a.id, 'start')} disabled={actionLoading === a.id + 'start'}>
                  {actionLoading === a.id + 'start' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Start Review
                </Button>
              )}
              {myAssignment && a.status === 'IN_REVIEW' && (
                <div className="flex gap-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => reviewerAction(a.id, 'approve')} disabled={!!actionLoading}>
                    <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => reviewerAction(a.id, 'send_back')} disabled={!!actionLoading}>
                    <RotateCcw className="h-3.5 w-3.5 mr-1" /> Send Back
                  </Button>
                </div>
              )}

              {/* Comments */}
              {a.comments.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  {a.comments.map(c => (
                    <div key={c.id} className={cn('rounded-lg px-3 py-2 text-sm', c.isResolved ? 'bg-gray-50 opacity-60' : 'bg-yellow-50 border border-yellow-200')}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className={cn(c.isResolved && 'line-through text-gray-400')}>{c.content}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{c.author.name} · {new Date(c.createdAt).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => toggleResolve(c.id, c.isResolved)}
                          className="text-xs text-gray-400 hover:text-blue-600 flex-shrink-0"
                        >
                          {c.isResolved ? 'Reopen' : 'Resolve'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment */}
              {(myAssignment || canAssign) && (a.status === 'ASSIGNED' || a.status === 'IN_REVIEW') && (
                <div className="flex gap-2 items-start border-t pt-3">
                  <textarea
                    rows={1}
                    value={commentContent[a.id] ?? ''}
                    onChange={e => setCommentContent(p => ({ ...p, [a.id]: e.target.value }))}
                    placeholder="Add a review comment…"
                    className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => postComment(a.id)}
                    disabled={sendingComment === a.id || !commentContent[a.id]?.trim()}
                  >
                    {sendingComment === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Post'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ─── Main Client Component ────────────────────────────────────────────────────

interface Props {
  permit: PermitData
  userRole: string
  userId: string
}

const STAGES = ['WaitingOnContractorDocs','WaitingOnCounty','WaitingOnBilling','ReadyToSubmit','ReadyToClose','InProgress']

export function PermitDetailClient({ permit: initialPermit, userRole, userId }: Props) {
  const router = useRouter()
  const [permit, setPermit] = useState(initialPermit)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Document upload state
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({ file: null as File | null, category: 'Application', notes: '', isRequired: false })

  // Task creation state
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTask, setNewTask] = useState({ name: '', description: '', assignedTo: '', dueDate: '', priority: 'medium' as 'low' | 'medium' | 'high' })

  // Document note editing
  const [editingDocNote, setEditingDocNote] = useState<string | null>(null)
  const [docNote, setDocNote] = useState('')

  // ZIP download
  const [downloadingZip, setDownloadingZip] = useState(false)

  // Stage/status update
  const [showStageForm, setShowStageForm] = useState(false)
  const [newStage, setNewStage] = useState(permit.internalStage ?? '')
  const [stageLoading, setStageLoading] = useState(false)
  const [stageError, setStageError] = useState('')

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/permits/${permit.id}`)
    if (!res.ok) return
    const json = await res.json()
    const d = json.data
    setPermit({
      ...d,
      openedDate: new Date(d.openedDate).toISOString(),
      targetIssueDate: d.targetIssueDate ? new Date(d.targetIssueDate).toISOString() : null,
      closedDate: d.closedDate ? new Date(d.closedDate).toISOString() : null,
      lastActivityAt: d.lastActivityAt ? new Date(d.lastActivityAt).toISOString() : null,
      documents: d.documents?.map((doc: PermitDocument) => ({ ...doc, uploadedAt: new Date(doc.uploadedAt).toISOString() })) ?? permit.documents,
      tasks: d.tasks?.map((t: Task) => ({ ...t, dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null })) ?? permit.tasks,
      activityLogs: d.activityLogs?.map((l: ActivityLog) => ({ ...l, createdAt: new Date(l.createdAt).toISOString() })) ?? permit.activityLogs,
    })
    router.refresh()
  }, [permit.id, permit.documents, permit.tasks, permit.activityLogs, router])

  // Generic field save
  async function saveField(field: string) {
    setLoading(true)
    setError('')
    const val = field === 'targetIssueDate' && editValue ? new Date(editValue).toISOString() : (editValue || null)
    const res = await fetch(`/api/permits/${permit.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: val }),
    })
    if (!res.ok) {
      const j = await res.json()
      setError(j.error ?? 'Failed')
    } else {
      await refresh()
      setEditingField(null)
    }
    setLoading(false)
  }

  function startEdit(field: string, val: string | null) {
    setEditingField(field)
    if (field === 'targetIssueDate' && val) {
      const d = new Date(val)
      setEditValue(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`)
    } else {
      setEditValue(val ?? '')
    }
  }

  // Stage update via /api/permits/[id]/status
  async function updateStage() {
    setStageLoading(true)
    setStageError('')
    const res = await fetch(`/api/permits/${permit.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ internalStage: newStage }),
    })
    const json = await res.json()
    if (!res.ok) {
      setStageError(json.blockers ? `Blocked: ${json.blockers.map((b: {message: string}) => b.message).join('; ')}` : (json.error ?? 'Failed'))
      setStageLoading(false)
      return
    }
    setShowStageForm(false)
    setStageLoading(false)
    await refresh()
  }

  // Create task
  async function createTask(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch(`/api/permits/${permit.id}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newTask, dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined }),
    })
    if (res.ok) { await refresh(); setShowTaskForm(false); setNewTask({ name:'', description:'', assignedTo:'', dueDate:'', priority:'medium' }) }
    setLoading(false)
  }

  async function updateTask(taskId: string, updates: Partial<Task>) {
    await fetch(`/api/tasks/${taskId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) })
    await refresh()
  }

  async function uploadDocument(e: React.FormEvent) {
    e.preventDefault()
    if (!uploadForm.file) { setError('Select a file'); return }
    setUploading(true)
    setError('')
    const fd = new FormData()
    fd.append('file', uploadForm.file)
    fd.append('category', uploadForm.category)
    if (uploadForm.notes) fd.append('notes', uploadForm.notes)
    fd.append('isRequired', uploadForm.isRequired.toString())
    const res = await fetch(`/api/permits/${permit.id}/documents`, { method: 'POST', body: fd })
    if (!res.ok) { const j = await res.json(); setError(j.error ?? 'Upload failed') }
    else { await refresh(); setShowUploadForm(false); setUploadForm({ file: null, category: 'Application', notes: '', isRequired: false }) }
    setUploading(false)
  }

  async function saveDocNote(docId: string) {
    setLoading(true)
    await fetch(`/api/documents/${docId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ notes: docNote }) })
    await refresh()
    setEditingDocNote(null)
    setLoading(false)
  }

  async function downloadZip() {
    setDownloadingZip(true)
    try {
      const res = await fetch(`/api/permits/${permit.id}/documents/download-all`)
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const cd = res.headers.get('Content-Disposition')
      a.download = cd?.match(/filename="(.+)"/)?.[1] ?? `permit_${permit.id}.zip`
      document.body.appendChild(a); a.click(); document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch { setError('Failed to download document package') }
    setDownloadingZip(false)
  }

  const isAdmin = userRole === 'admin'
  const canEdit = userRole === 'admin' || userRole === 'coordinator'

  // ── Tab content renders ──────────────────────────────────────────────────

  function renderOverview() {
    function EditableField({ field, label, value, type = 'text', options }: {
      field: string; label: string; value: string | null; type?: string; options?: string[]
    }) {
      const editing = editingField === field
      return (
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
          {editing ? (
            <div className="flex items-center gap-2">
              {options ? (
                <select
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  autoFocus
                  className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {options.map(o => <option key={o} value={o}>{o.replace(/([A-Z])/g,' $1').trim()}</option>)}
                </select>
              ) : (
                <input
                  type={type}
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  autoFocus
                  className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              )}
              <Button size="sm" onClick={() => saveField(field)} disabled={loading}>Save</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <span className="text-sm text-gray-800">{value || <span className="text-gray-400 italic">Not set</span>}</span>
              {canEdit && (
                <button
                  onClick={() => startEdit(field, value)}
                  className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:underline transition-opacity"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="space-y-6">
        {/* Stage change section */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Internal Stage</CardTitle>
              {canEdit && (
                <Button size="sm" variant="outline" onClick={() => setShowStageForm(s => !s)}>
                  <ChevronDown className="h-3.5 w-3.5 mr-1" /> Change Stage
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-800">
                {permit.internalStage?.replace(/([A-Z])/g,' $1').trim() ?? 'Not set'}
              </span>
              {permit.jurisdiction && (
                <Link href={`/admin/jurisdictions/${permit.jurisdiction.id}`} className="text-xs text-blue-600 hover:underline">
                  {permit.jurisdiction.name}
                </Link>
              )}
            </div>
            {showStageForm && (
              <div className="mt-3 flex flex-wrap gap-2 items-end border-t pt-3">
                <select
                  value={newStage}
                  onChange={e => setNewStage(e.target.value)}
                  className="border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— No stage —</option>
                  {STAGES.map(s => <option key={s} value={s}>{s.replace(/([A-Z])/g,' $1').trim()}</option>)}
                </select>
                <Button size="sm" onClick={updateStage} disabled={stageLoading}>
                  {stageLoading && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                  Update
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowStageForm(false); setStageError('') }}>Cancel</Button>
                {stageError && <p className="w-full text-xs text-red-600 mt-1">{stageError}</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Fields grid */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Package Details</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Customer</p>
                <Link href={`/customers/${permit.customer.id}`} className="text-sm text-blue-600 hover:underline">{permit.customer.name}</Link>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Contractor</p>
                <Link href={`/contractors/${permit.contractor.id}`} className="text-sm text-blue-600 hover:underline">{permit.contractor.companyName}</Link>
              </div>
              {permit.coordinator && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Coordinator</p>
                  <p className="text-sm text-gray-800">{permit.coordinator.name}</p>
                </div>
              )}
              <EditableField field="permitType" label="Permit Type" value={formatPermitType(permit.permitType)} options={['Building','Electrical','Plumbing','Mechanical','Roofing','HVAC','Structural','MobileHome','Other']} />
              <EditableField field="permitNumber" label="Permit Number" value={permit.permitNumber} />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
                <div className="flex items-center gap-2 group">
                  <StatusBadge status={permit.status} />
                  {canEdit && <button onClick={() => startEdit('status', permit.status)} className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:underline transition-opacity">Edit</button>}
                </div>
                {editingField === 'status' && (
                  <div className="flex items-center gap-2 mt-2">
                    <select value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {['New','Submitted','InReview','RevisionsNeeded','Approved','Issued','Inspections','FinaledClosed','Canceled'].map(s => <option key={s} value={s}>{s.replace(/([A-Z])/g,' $1').trim()}</option>)}
                    </select>
                    <Button size="sm" onClick={() => saveField('status')} disabled={loading}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Billing Status</p>
                <div className="flex items-center gap-2 group">
                  <StatusBadge status={permit.billingStatus} />
                  {canEdit && <button onClick={() => startEdit('billingStatus', permit.billingStatus)} className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:underline transition-opacity">Edit</button>}
                </div>
                {editingField === 'billingStatus' && (
                  <div className="flex items-center gap-2 mt-2">
                    <select value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus className="flex-1 border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {['NotSent','SentToBilling','Billed','Paid'].map(s => <option key={s} value={s}>{s.replace(/([A-Z])/g,' $1').trim()}</option>)}
                    </select>
                    <Button size="sm" onClick={() => saveField('billingStatus')} disabled={loading}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button>
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Opened</p>
                <p className="text-sm">{formatDate(new Date(permit.openedDate))}</p>
              </div>
              <EditableField field="targetIssueDate" label="Target Issue Date" value={permit.targetIssueDate ? formatDate(new Date(permit.targetIssueDate)) : null} type="date" />
              <EditableField field="county" label="County" value={permit.county} />
            </div>
            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Jurisdiction Notes</p>
                {editingField === 'jurisdictionNotes' ? (
                  <div><textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={3} autoFocus className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-2 mt-2"><Button size="sm" onClick={() => saveField('jurisdictionNotes')} disabled={loading}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button></div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 group">
                    <p className="text-sm text-gray-700 flex-1">{permit.jurisdictionNotes || <span className="italic text-gray-400">No notes</span>}</p>
                    {canEdit && <button onClick={() => startEdit('jurisdictionNotes', permit.jurisdictionNotes)} className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:underline transition-opacity flex-shrink-0">Edit</button>}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Billing Notes</p>
                {editingField === 'billingNotes' ? (
                  <div><textarea value={editValue} onChange={e => setEditValue(e.target.value)} rows={2} autoFocus className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex gap-2 mt-2"><Button size="sm" onClick={() => saveField('billingNotes')} disabled={loading}>Save</Button><Button size="sm" variant="outline" onClick={() => setEditingField(null)}>Cancel</Button></div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 group">
                    <p className="text-sm text-gray-700 flex-1">{permit.billingNotes || <span className="italic text-gray-400">No notes</span>}</p>
                    {canEdit && <button onClick={() => startEdit('billingNotes', permit.billingNotes)} className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:underline transition-opacity flex-shrink-0">Edit</button>}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  function renderDocuments() {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          {permit.documents.length > 0 && (
            <Button size="sm" variant="outline" onClick={downloadZip} disabled={downloadingZip}>
              {downloadingZip ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
              Download All
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setShowUploadForm(s => !s)}>
              <Upload className="h-3.5 w-3.5 mr-1" />
              {showUploadForm ? 'Cancel' : 'Upload'}
            </Button>
          )}
        </div>

        {showUploadForm && (
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={uploadDocument} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                  <input type="file" required onChange={e => setUploadForm(f => ({ ...f, file: e.target.files?.[0] ?? null }))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    <select value={uploadForm.category} onChange={e => setUploadForm(f => ({ ...f, category: e.target.value }))} className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {['Application','Plans','Specifications','Structural','Electrical','Mechanical','Correspondence','Permit','Inspection','Certificate','Other'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <input type="text" value={uploadForm.notes} onChange={e => setUploadForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes…" className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={uploadForm.isRequired} onChange={e => setUploadForm(f => ({ ...f, isRequired: e.target.checked }))} />
                  Required document
                </label>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={uploading}>{uploading ? 'Uploading…' : 'Upload'}</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowUploadForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {permit.documents.length === 0 && <p className="text-sm text-gray-400 italic py-4">No documents uploaded yet.</p>}

        <div className="space-y-2">
          {permit.documents.map(doc => (
            <div key={doc.id} className="border rounded-lg p-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                    <p className="font-medium text-sm truncate">{doc.fileName}</p>
                    <span className="text-xs bg-blue-100 text-blue-800 rounded-full px-2 py-0.5">{doc.category}</span>
                    {doc.versionTag && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{doc.versionTag}</span>}
                    {doc.isRequired && <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">Required</span>}
                  </div>
                  <p className="text-xs text-gray-400">{formatDateTime(new Date(doc.uploadedAt))} · {doc.uploadedByUser.name}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <StatusBadge status={doc.status} />
                  <Link href={`/api/documents/${doc.id}/download`}><Button size="sm" variant="outline"><Download className="h-3.5 w-3.5" /></Button></Link>
                </div>
              </div>
              {/* Notes */}
              {editingDocNote === doc.id ? (
                <div className="mt-2">
                  <textarea value={docNote} onChange={e => setDocNote(e.target.value)} rows={2} autoFocus className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <div className="flex gap-2 mt-1">
                    <Button size="sm" onClick={() => saveDocNote(doc.id)} disabled={loading}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditingDocNote(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="mt-1.5 flex items-start gap-2 group">
                  <p className="text-xs text-gray-500 flex-1">{doc.notes || <span className="italic">No notes</span>}</p>
                  {canEdit && (
                    <button onClick={() => { setEditingDocNote(doc.id); setDocNote(doc.notes ?? '') }} className="opacity-0 group-hover:opacity-100 text-xs text-blue-500 hover:underline transition-opacity flex-shrink-0">
                      {doc.notes ? 'Edit' : 'Add note'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderTasks() {
    return (
      <div className="space-y-4">
        {canEdit && (
          <Button size="sm" onClick={() => setShowTaskForm(s => !s)}>
            {showTaskForm ? 'Cancel' : 'Add Task'}
          </Button>
        )}
        {showTaskForm && (
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={createTask} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
                  <input required type="text" value={newTask.name} onChange={e => setNewTask(t => ({ ...t, name: e.target.value }))} className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Submit application to county" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={newTask.description} onChange={e => setNewTask(t => ({ ...t, description: e.target.value }))} rows={2} className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <input type="text" value={newTask.assignedTo} onChange={e => setNewTask(t => ({ ...t, assignedTo: e.target.value }))} placeholder="Name" className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input type="date" value={newTask.dueDate} onChange={e => setNewTask(t => ({ ...t, dueDate: e.target.value }))} className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select value={newTask.priority} onChange={e => setNewTask(t => ({ ...t, priority: e.target.value as 'low'|'medium'|'high' }))} className="w-full border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={loading}>Create Task</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowTaskForm(false)}>Cancel</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {permit.tasks.length === 0 && !showTaskForm && <p className="text-sm text-gray-400 italic py-4">No tasks yet.</p>}

        <div className="space-y-2">
          {permit.tasks.map(task => (
            <div key={task.id} className="border rounded-lg p-3 flex items-start justify-between gap-3">
              <div className="flex-1">
                <p className="font-medium text-sm">{task.name}</p>
                {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                <div className="flex flex-wrap gap-2 mt-1">
                  {task.assignedTo && <span className="text-xs text-gray-400">→ {task.assignedTo}</span>}
                  {task.dueDate && <span className="text-xs text-gray-400">Due {formatDate(new Date(task.dueDate))}</span>}
                  {task.priority && <span className="text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">{task.priority}</span>}
                </div>
              </div>
              <select
                value={task.status}
                onChange={e => updateTask(task.id, { status: e.target.value })}
                className="border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
              >
                {['NotStarted','InProgress','Waiting','Completed'].map(s => <option key={s} value={s}>{s.replace(/([A-Z])/g,' $1').trim()}</option>)}
              </select>
            </div>
          ))}
        </div>
      </div>
    )
  }

  function renderActivity() {
    return (
      <div className="space-y-2">
        {permit.activityLogs.length === 0 && <p className="text-sm text-gray-400 italic py-4">No activity yet.</p>}
        {permit.activityLogs.map(log => (
          <div key={log.id} className="border-b last:border-0 pb-3 last:pb-0">
            <p className="text-sm text-gray-700">{log.description}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(new Date(log.createdAt))} · {log.user?.name ?? 'System'}</p>
          </div>
        ))}
      </div>
    )
  }

  // ── Layout ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{permit.projectName}</h1>
          {permit.projectAddress && <p className="text-sm text-gray-500 mt-0.5">{permit.projectAddress}</p>}
        </div>
        <div className="flex flex-wrap gap-2 items-center flex-shrink-0">
          <StatusBadge status={permit.status} />
          <StatusBadge status={permit.billingStatus} />
          {permit.internalStage && (
            <span className="text-xs bg-indigo-100 text-indigo-700 rounded-full px-2.5 py-1 font-medium">
              {permit.internalStage.replace(/([A-Z])/g,' $1').trim()}
            </span>
          )}
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      {/* Tabs */}
      <div className="border-b flex gap-0 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors',
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview'   && renderOverview()}
        {activeTab === 'documents'  && renderDocuments()}
        {activeTab === 'tasks'      && renderTasks()}
        {activeTab === 'checklist'  && <ChecklistPanel packageId={permit.id} isAdmin={isAdmin} />}
        {activeTab === 'review'     && <ReviewTab packageId={permit.id} userRole={userRole} userId={userId} />}
        {activeTab === 'contractor' && <VaultPanel contractorId={permit.contractor.id} />}
        {activeTab === 'activity'   && renderActivity()}
      </div>
    </div>
  )
}
