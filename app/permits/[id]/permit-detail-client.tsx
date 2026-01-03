/**
 * Permit Detail Client Component
 * 
 * Interactive client component for the permit detail page.
 * Handles all editing, task creation, document management, and real-time updates.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatDate, formatDateTime, formatPermitType } from '@/lib/utils'
import Link from 'next/link'

// Types
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

interface PermitData {
  id: string
  projectName: string
  projectAddress: string
  customer: { id: string; name: string }
  contractor: { id: string; companyName: string }
  permitType: string
  permitNumber: string | null
  status: string
  internalStage: string | null
  billingStatus: string
  openedDate: string
  targetIssueDate: string | null
  closedDate: string | null
  county: string | null
  jurisdictionNotes: string | null
  billingNotes: string | null
  documents: PermitDocument[]
  tasks: Task[]
  activityLogs: ActivityLog[]
}

interface PermitDetailClientProps {
  permit: PermitData
}

export function PermitDetailClient({ permit: initialPermit }: PermitDetailClientProps) {
  const router = useRouter()
  const [permit, setPermit] = useState(initialPermit)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Task creation state
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [newTask, setNewTask] = useState({
    name: '',
    description: '',
    assignedTo: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  })

  // Document editing state
  const [editingDocument, setEditingDocument] = useState<string | null>(null)
  const [documentNotes, setDocumentNotes] = useState<Record<string, string>>({})
  
  // File upload state
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    file: null as File | null,
    category: 'Application',
    notes: '',
    isRequired: false,
  })
  
  // ZIP download state
  const [downloadingZip, setDownloadingZip] = useState(false)

  // Refresh permit data
  const refreshPermit = async () => {
    try {
      const response = await fetch(`/api/permits/${permit.id}`, {
        credentials: 'include', // Include cookies for authentication
      })
      if (response.ok) {
        const data = await response.json()
        const updatedPermit = {
          ...data.data,
          openedDate: new Date(data.data.openedDate).toISOString(),
          targetIssueDate: data.data.targetIssueDate ? new Date(data.data.targetIssueDate).toISOString() : null,
          closedDate: data.data.closedDate ? new Date(data.data.closedDate).toISOString() : null,
          documents: data.data.documents.map((doc: any) => ({
            ...doc,
            uploadedAt: new Date(doc.uploadedAt).toISOString(),
            createdAt: new Date(doc.createdAt).toISOString(),
            updatedAt: new Date(doc.updatedAt).toISOString(),
          })),
          tasks: data.data.tasks.map((task: any) => ({
            ...task,
            dueDate: task.dueDate ? new Date(task.dueDate).toISOString() : null,
            completedAt: task.completedAt ? new Date(task.completedAt).toISOString() : null,
            createdAt: new Date(task.createdAt).toISOString(),
            updatedAt: new Date(task.updatedAt).toISOString(),
          })),
          activityLogs: data.data.activityLogs.map((log: any) => ({
            ...log,
            createdAt: new Date(log.createdAt).toISOString(),
          })),
        }
        setPermit(updatedPermit)
        router.refresh()
      }
    } catch (err) {
      console.error('Error refreshing permit:', err)
    }
  }

  // Start editing a field
  const startEdit = (field: string, currentValue: string | null) => {
    setEditingField(field)
    
    // Convert ISO date strings to YYYY-MM-DD format for HTML date inputs
    if (field === 'targetIssueDate' && currentValue) {
      // Parse ISO string and format as YYYY-MM-DD for date input
      const date = new Date(currentValue)
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      setEditValue(`${year}-${month}-${day}`)
    } else {
      setEditValue(currentValue || '')
    }
  }

  // Cancel editing
  const cancelEdit = () => {
    setEditingField(null)
    setEditValue('')
  }

  // Save field edit
  const saveField = async (field: string) => {
    setLoading(true)
    setError('')

    try {
      const updateData: any = {}
      
      // Handle different field types
      if (field === 'targetIssueDate') {
        updateData[field] = editValue ? new Date(editValue).toISOString() : null
      } else {
        updateData[field] = editValue || null
      }

      const response = await fetch(`/api/permits/${permit.id}`, {
        method: 'PATCH',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update permit')
      }

      await refreshPermit()
      setEditingField(null)
      setEditValue('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update permit')
    } finally {
      setLoading(false)
    }
  }

  // Create new task
  const createTask = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const taskData: any = {
        name: newTask.name,
        description: newTask.description || undefined,
        assignedTo: newTask.assignedTo || undefined,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : undefined,
        priority: newTask.priority,
      }

      const response = await fetch(`/api/permits/${permit.id}/tasks`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(taskData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create task')
      }

      await refreshPermit()
      setShowTaskForm(false)
      setNewTask({
        name: '',
        description: '',
        assignedTo: '',
        dueDate: '',
        priority: 'medium',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  // Update task
  const updateTask = async (taskId: string, updates: Partial<Task>) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        await refreshPermit()
      }
    } catch (err) {
      console.error('Error updating task:', err)
    }
  }

  // Update document notes
  const updateDocumentNotes = async (documentId: string, notes: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PATCH',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notes }),
      })

      if (response.ok) {
        await refreshPermit()
        setEditingDocument(null)
        setDocumentNotes({ ...documentNotes, [documentId]: notes })
      }
    } catch (err) {
      console.error('Error updating document notes:', err)
    } finally {
      setLoading(false)
    }
  }

  // Upload document
  const uploadDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Upload form submitted', { file: uploadForm.file, category: uploadForm.category })
    
    if (!uploadForm.file) {
      setError('Please select a file to upload')
      return
    }

    setUploading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', uploadForm.file)
      formData.append('category', uploadForm.category)
      if (uploadForm.notes) {
        formData.append('notes', uploadForm.notes)
      }
      formData.append('isRequired', uploadForm.isRequired.toString())

      console.log('Sending upload request to:', `/api/permits/${permit.id}/documents`)
      
      const response = await fetch(`/api/permits/${permit.id}/documents`, {
        method: 'POST',
        credentials: 'include', // Include cookies for authentication
        body: formData,
        // Note: Do NOT set Content-Type header when using FormData
        // The browser will automatically set it with the correct boundary
      })

      console.log('Upload response status:', response.status)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Upload error:', errorData)
        
        // If unauthorized, suggest refreshing the page or logging in again
        if (response.status === 401) {
          throw new Error('Your session has expired. Please refresh the page and try again.')
        }
        
        throw new Error(errorData.error || 'Failed to upload document')
      }

      const result = await response.json()
      console.log('Upload successful:', result)

      // Show success message
      setUploadSuccess(true)
      setError('') // Clear any previous errors
      
      // Reset form
      setUploadForm({
        file: null,
        category: 'Application',
        notes: '',
        isRequired: false,
      })
      
      // Refresh permit data
      await refreshPermit()
      
      // Hide form and success message after a delay
      setTimeout(() => {
        setShowUploadForm(false)
        setUploadSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Upload error:', err)
      setError(err instanceof Error ? err.message : 'Failed to upload document')
    } finally {
      setUploading(false)
    }
  }

  // Initialize document notes from permit data
  useEffect(() => {
    const notes: Record<string, string> = {}
    permit.documents.forEach(doc => {
      if (doc.notes) {
        notes[doc.id] = doc.notes
      }
    })
    setDocumentNotes(notes)
  }, [permit.documents])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{permit.projectName}</h1>
          <p className="text-gray-600">{permit.projectAddress}</p>
        </div>
        <div className="flex gap-2">
          <StatusBadge status={permit.status} />
          <StatusBadge status={permit.billingStatus} />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Overview - Editable */}
      <Card>
        <CardHeader>
          <CardTitle>Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Customer</p>
              <Link href={`/customers/${permit.customer.id}`} className="text-blue-600 hover:underline">
                {permit.customer.name}
              </Link>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Contractor</p>
              <Link href={`/contractors/${permit.contractor.id}`} className="text-blue-600 hover:underline">
                {permit.contractor.companyName}
              </Link>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Permit Type</p>
              {editingField === 'permitType' ? (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  >
                    <option value="Building">Building</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Plumbing">Plumbing</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Roofing">Roofing</option>
                    <option value="HVAC">HVAC</option>
                    <option value="Structural">Structural</option>
                    <option value="MobileHome">Mobile home</option>
                    <option value="Other">Other</option>
                  </select>
                  <Button size="sm" onClick={() => saveField('permitType')} disabled={loading}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{formatPermitType(permit.permitType)}</p>
                  <Button size="sm" variant="ghost" onClick={() => startEdit('permitType', permit.permitType)}>Edit</Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Permit Number</p>
              {editingField === 'permitNumber' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('permitNumber')} disabled={loading}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{permit.permitNumber || 'Not assigned'}</p>
                  <Button size="sm" variant="ghost" onClick={() => startEdit('permitNumber', permit.permitNumber)}>Edit</Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              {editingField === 'status' ? (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  >
                    <option value="New">New</option>
                    <option value="Submitted">Submitted</option>
                    <option value="InReview">In Review</option>
                    <option value="RevisionsNeeded">Revisions Needed</option>
                    <option value="Approved">Approved</option>
                    <option value="Issued">Issued</option>
                    <option value="Inspections">Inspections</option>
                    <option value="FinaledClosed">Finaled/Closed</option>
                    <option value="Canceled">Canceled</option>
                  </select>
                  <Button size="sm" onClick={() => saveField('status')} disabled={loading}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <StatusBadge status={permit.status} />
                  <Button size="sm" variant="ghost" onClick={() => startEdit('status', permit.status)}>Edit</Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Billing Status</p>
              {editingField === 'billingStatus' ? (
                <div className="flex items-center gap-2 mt-1">
                  <select
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  >
                    <option value="NotSent">Not Sent</option>
                    <option value="SentToBilling">Sent to Billing</option>
                    <option value="Billed">Billed</option>
                    <option value="Paid">Paid</option>
                  </select>
                  <Button size="sm" onClick={() => saveField('billingStatus')} disabled={loading}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <StatusBadge status={permit.billingStatus} />
                  <Button size="sm" variant="ghost" onClick={() => startEdit('billingStatus', permit.billingStatus)}>Edit</Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Opened Date</p>
              <p className="text-sm">{formatDate(new Date(permit.openedDate))}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Target Issue Date</p>
              {editingField === 'targetIssueDate' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="date"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('targetIssueDate')} disabled={loading}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{permit.targetIssueDate ? formatDate(new Date(permit.targetIssueDate)) : 'Not set'}</p>
                  <Button size="sm" variant="ghost" onClick={() => startEdit('targetIssueDate', permit.targetIssueDate || '')}>Edit</Button>
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">County</p>
              {editingField === 'county' ? (
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    autoFocus
                  />
                  <Button size="sm" onClick={() => saveField('county')} disabled={loading}>Save</Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-sm">{permit.county || 'Not set'}</p>
                  <Button size="sm" variant="ghost" onClick={() => startEdit('county', permit.county)}>Edit</Button>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-500">Jurisdiction Notes</p>
              {editingField === 'jurisdictionNotes' ? (
                <div className="mt-1">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => saveField('jurisdictionNotes')} disabled={loading}>Save</Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-sm flex-1">{permit.jurisdictionNotes || 'No notes'}</p>
                  <Button size="sm" variant="ghost" onClick={() => startEdit('jurisdictionNotes', permit.jurisdictionNotes)}>Edit</Button>
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-medium text-gray-500">Billing Notes</p>
              {editingField === 'billingNotes' ? (
                <div className="mt-1">
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex gap-2 mt-2">
                    <Button size="sm" onClick={() => saveField('billingNotes')} disabled={loading}>Save</Button>
                    <Button size="sm" variant="outline" onClick={cancelEdit}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-sm flex-1">{permit.billingNotes || 'No notes'}</p>
                  <Button size="sm" variant="ghost" onClick={() => startEdit('billingNotes', permit.billingNotes)}>Edit</Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tasks - With Add Functionality */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Tasks</CardTitle>
          <Button size="sm" onClick={() => setShowTaskForm(!showTaskForm)}>
            {showTaskForm ? 'Cancel' : 'Add Task'}
          </Button>
        </CardHeader>
        <CardContent>
          {/* Add Task Form */}
          {showTaskForm && (
            <form onSubmit={createTask} className="mb-4 p-4 border rounded-md bg-gray-50">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
                  <input
                    type="text"
                    required
                    value={newTask.name}
                    onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    placeholder="e.g., Submit application to county"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Task details..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <input
                      type="text"
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({ ...newTask, assignedTo: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Name or email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as 'low' | 'medium' | 'high' })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={loading}>
                    {loading ? 'Creating...' : 'Create Task'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowTaskForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}

          {/* Tasks List */}
          {permit.tasks.length > 0 ? (
            <div className="space-y-2">
              {permit.tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between border-b pb-2">
                  <div className="flex-1">
                    <p className="font-medium">{task.name}</p>
                    {task.description && (
                      <p className="text-sm text-gray-600">{task.description}</p>
                    )}
                    {task.assignedTo && (
                      <p className="text-xs text-gray-500">Assigned to: {task.assignedTo}</p>
                    )}
                    {task.priority && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        {task.priority} priority
                      </span>
                    )}
                  </div>
                  <div className="text-right flex items-center gap-3">
                    <div>
                      <StatusBadge status={task.status} />
                      {task.dueDate && (
                        <p className="text-xs text-gray-500 mt-1">
                          Due: {formatDate(new Date(task.dueDate))}
                        </p>
                      )}
                    </div>
                    <select
                      value={task.status}
                      onChange={(e) => updateTask(task.id, { status: e.target.value as any })}
                      className="text-sm rounded-md border border-gray-300 px-2 py-1"
                    >
                      <option value="NotStarted">Not Started</option>
                      <option value="InProgress">In Progress</option>
                      <option value="Waiting">Waiting</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No tasks. Click "Add Task" to create one.</p>
          )}
        </CardContent>
      </Card>

      {/* Documents - With Notes/Labels */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Documents ({permit.documents.length})</CardTitle>
          <div className="flex gap-2">
            {permit.documents.length > 0 && (
              <Button 
                size="sm" 
                variant="default"
                disabled={downloadingZip}
                onClick={async () => {
                  setDownloadingZip(true)
                  try {
                    // Fetch the ZIP file as a blob
                    const response = await fetch(`/api/permits/${permit.id}/documents/download-all`, {
                      credentials: 'include', // Include cookies for authentication
                    })
                    
                    if (!response.ok) {
                      throw new Error('Failed to download ZIP file')
                    }
                    
                    // Get the blob from the response
                    const blob = await response.blob()
                    
                    // Create a temporary URL for the blob
                    const url = window.URL.createObjectURL(blob)
                    
                    // Create a temporary anchor element and trigger download
                    const link = document.createElement('a')
                    link.href = url
                    
                    // Extract filename from Content-Disposition header or use default
                    const contentDisposition = response.headers.get('Content-Disposition')
                    const filenameMatch = contentDisposition?.match(/filename="(.+)"/)
                    const filename = filenameMatch ? filenameMatch[1] : `permit_${permit.id}_documents.zip`
                    link.download = filename
                    
                    // Append to body, click, and remove
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                    
                    // Clean up the blob URL
                    window.URL.revokeObjectURL(url)
                  } catch (error) {
                    console.error('Error downloading ZIP:', error)
                    setError('Failed to download document package')
                  } finally {
                    // Reset loading state - component is still mounted since we didn't navigate
                    setDownloadingZip(false)
                  }
                }}
              >
                {downloadingZip ? 'Creating ZIP...' : 'Download All as ZIP'}
              </Button>
            )}
            <Button size="sm" onClick={() => setShowUploadForm(!showUploadForm)}>
              {showUploadForm ? 'Cancel' : 'Upload Document'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Upload Document Form */}
          {showUploadForm && (
            <form onSubmit={uploadDocument} className="mb-4 p-4 border rounded-md bg-gray-50">
              {error && (
                <div className="mb-3 rounded-md bg-red-50 p-3">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              {uploadSuccess && (
                <div className="mb-3 rounded-md bg-green-50 p-3">
                  <p className="text-sm text-green-800">Document uploaded successfully!</p>
                </div>
              )}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null
                      console.log('File selected:', file?.name)
                      setUploadForm({ ...uploadForm, file })
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                  <select
                    required
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({ ...uploadForm, category: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="Application">Application</option>
                    <option value="Plans">Plans</option>
                    <option value="Specifications">Specifications</option>
                    <option value="Correspondence">Correspondence</option>
                    <option value="Permit">Permit</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Certificate">Certificate</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes/Labels</label>
                  <textarea
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm({ ...uploadForm, notes: e.target.value })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                    rows={2}
                    placeholder="Add notes or labels for this document..."
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={uploadForm.isRequired}
                      onChange={(e) => setUploadForm({ ...uploadForm, isRequired: e.target.checked })}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Required Document</span>
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={uploading}>
                    {uploading ? 'Uploading...' : 'Upload Document'}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowUploadForm(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </form>
          )}
          {permit.documents.length > 0 ? (
            <div className="space-y-3">
              {permit.documents.map((doc) => (
                <div key={doc.id} className="border rounded-md p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium">{doc.fileName}</p>
                        <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          {doc.category}
                        </span>
                        {doc.versionTag && (
                          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {doc.versionTag}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(new Date(doc.uploadedAt))} • {doc.uploadedByUser.name}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <StatusBadge status={doc.status} />
                      <Link href={`/api/documents/${doc.id}/download`}>
                        <Button variant="outline" size="sm">Download</Button>
                      </Link>
                    </div>
                  </div>
                  
                  {/* Document Notes */}
                  <div className="mt-2">
                    {editingDocument === doc.id ? (
                      <div>
                        <textarea
                          value={documentNotes[doc.id] || doc.notes || ''}
                          onChange={(e) => setDocumentNotes({ ...documentNotes, [doc.id]: e.target.value })}
                          className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
                          rows={2}
                          placeholder="Add notes or labels for this document..."
                          autoFocus
                        />
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => updateDocumentNotes(doc.id, documentNotes[doc.id] || '')}
                            disabled={loading}
                          >
                            Save Notes
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditingDocument(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <p className="text-sm text-gray-600 flex-1">
                          {doc.notes || <span className="text-gray-400 italic">No notes</span>}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingDocument(doc.id)
                            setDocumentNotes({ ...documentNotes, [doc.id]: doc.notes || '' })
                          }}
                        >
                          {doc.notes ? 'Edit Notes' : 'Add Notes'}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No documents uploaded yet</p>
          )}
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {permit.activityLogs.map((log) => (
              <div key={log.id} className="border-b pb-2">
                <p className="text-sm">{log.description}</p>
                <p className="text-xs text-gray-500">
                  {formatDateTime(new Date(log.createdAt))} • {log.user?.name || 'System'}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

