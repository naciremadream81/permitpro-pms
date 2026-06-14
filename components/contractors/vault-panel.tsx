'use client'

import { useEffect, useState, useRef } from 'react'
import { Upload, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react'

type DocType = 'LICENSE' | 'WORKERS_COMP' | 'LIABILITY' | 'W9' | 'OTHER'
type ExpiryStatus = 'valid' | 'expiring_soon' | 'expired' | 'unknown'

interface VaultDocument {
  id: string
  type: DocType
  documentName: string
  expirationDate?: string
  issueDate?: string
  isVerified: boolean
  isSuperseded: boolean
  uploadedAt: string
  status: string
  expiryStatus: ExpiryStatus
}

const TYPE_LABELS: Record<DocType, string> = {
  LICENSE:      'Contractor License',
  WORKERS_COMP: 'Workers Compensation',
  LIABILITY:    'Liability Insurance',
  W9:           'W-9',
  OTHER:        'Other',
}

const DOC_TYPES: DocType[] = ['LICENSE', 'WORKERS_COMP', 'LIABILITY', 'W9', 'OTHER']

const EXPIRY_CONFIG: Record<ExpiryStatus, { icon: typeof CheckCircle2; label: string; color: string; bg: string }> = {
  valid:         { icon: CheckCircle2,   label: 'Valid',          color: 'text-success',  bg: 'bg-surface border-success' },
  expiring_soon: { icon: AlertTriangle,  label: 'Expiring Soon',  color: 'text-warning', bg: 'bg-surface border-warning' },
  expired:       { icon: XCircle,        label: 'Expired',        color: 'text-destructive',    bg: 'bg-surface border-destructive' },
  unknown:       { icon: Clock,          label: 'No date set',    color: 'text-muted',   bg: 'bg-surface-inset border-border' },
}

interface Props {
  contractorId: string
}

export function VaultPanel({ contractorId }: Props) {
  const [documents, setDocuments] = useState<VaultDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadType, setUploadType] = useState<DocType | null>(null)
  const [uploading, setUploading] = useState(false)
  const [expirationDate, setExpirationDate] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    fetchDocuments()
  }, [contractorId])

  async function fetchDocuments() {
    setLoading(true)
    try {
      const res = await fetch(`/api/contractors/${contractorId}/documents`)
      const json = await res.json()
      setDocuments((json.data ?? []).filter((d: VaultDocument) => !d.isSuperseded))
    } finally {
      setLoading(false)
    }
  }

  async function handleUpload() {
    if (!uploadType || !selectedFile) return
    setUploading(true)

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('type', uploadType)
    formData.append('documentName', selectedFile.name)
    if (expirationDate) formData.append('expirationDate', new Date(expirationDate).toISOString())
    if (issueDate) formData.append('issueDate', new Date(issueDate).toISOString())

    try {
      const res = await fetch(`/api/contractors/${contractorId}/documents`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        setUploadType(null)
        setSelectedFile(null)
        setExpirationDate('')
        setIssueDate('')
        fetchDocuments()
      }
    } finally {
      setUploading(false)
    }
  }

  async function markVerified(docId: string) {
    await fetch(`/api/contractor-documents/${docId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isVerified: true }),
    })
    fetchDocuments()
  }

  // Build vault map: one slot per type
  const vaultMap = DOC_TYPES.reduce((acc, type) => {
    acc[type] = documents.find((d) => d.type === type) ?? null
    return acc
  }, {} as Record<DocType, VaultDocument | null>)

  if (loading) return <div className="p-4 text-sm text-muted">Loading vault…</div>

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {DOC_TYPES.map((type) => {
          const doc = vaultMap[type]
          const expiry = doc?.expiryStatus ?? 'unknown'
          const cfg = EXPIRY_CONFIG[expiry]
          const Icon = cfg.icon

          return (
            <div
              key={type}
              className={`border rounded-xl p-4 space-y-2 ${doc ? cfg.bg : 'bg-surface-inset border-border'}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-ink uppercase tracking-wider">
                    {TYPE_LABELS[type]}
                  </p>
                  {doc ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-xs text-muted truncate">{doc.documentName}</p>
                      {doc.expirationDate && (
                        <p className={`text-xs font-medium ${cfg.color}`}>
                          Expires {new Date(doc.expirationDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-muted mt-1">Not on file</p>
                  )}
                </div>
                <Icon className={`w-5 h-5 shrink-0 ${doc ? cfg.color : 'text-border'}`} />
              </div>

              {doc && !doc.isVerified && (
                <button
                  onClick={() => markVerified(doc.id)}
                  className="text-xs text-accent hover:text-accent-hover font-medium"
                >
                  Mark verified
                </button>
              )}
              {doc?.isVerified && (
                <span className="text-xs text-success font-medium">✓ Verified</span>
              )}

              <button
                onClick={() => setUploadType(type)}
                className="w-full inline-flex items-center justify-center gap-1.5 text-xs text-muted hover:text-ink border border-border rounded-lg px-3 py-1.5 hover:bg-surface transition-colors"
              >
                <Upload className="w-3 h-3" />
                {doc ? 'Upload renewal' : 'Upload'}
              </button>
            </div>
          )
        })}
      </div>

      {/* Upload modal */}
      {uploadType && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-ink max-w-md w-full p-6 space-y-4">
            <h2 className="font-semibold text-ink">
              Upload {TYPE_LABELS[uploadType]}
            </h2>

            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                File <span className="text-destructive">*</span>
              </label>
              <input
                type="file"
                ref={fileRef}
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="w-full text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Issue Date</label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Expiration Date</label>
                <input
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="flex-1 bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
              <button
                onClick={() => { setUploadType(null); setSelectedFile(null) }}
                className="px-4 py-2 rounded-lg text-sm border border-border text-ink hover:bg-surface-inset transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
