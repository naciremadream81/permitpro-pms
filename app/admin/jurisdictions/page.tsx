'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, MapPin, CheckCircle2, XCircle, ChevronRight } from 'lucide-react'

interface Jurisdiction {
  id: string
  name: string
  countyCode: string
  state: string
  isActive: boolean
  notes?: string
  _count: { requirements: number; packages: number }
}

export default function JurisdictionsPage() {
  const router = useRouter()
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([])
  const [loading, setLoading] = useState(true)
  const [showInactive, setShowInactive] = useState(false)

  useEffect(() => {
    fetchJurisdictions()
  }, [showInactive])

  async function fetchJurisdictions() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (!showInactive) params.set('isActive', 'true')
      const res = await fetch(`/api/jurisdictions?${params}`)
      const json = await res.json()
      setJurisdictions(json.data ?? [])
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(id: string, current: boolean) {
    await fetch(`/api/jurisdictions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !current }),
    })
    fetchJurisdictions()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Jurisdictions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage counties and their permit document requirements
          </p>
        </div>
        <Link
          href="/admin/jurisdictions/new"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Jurisdiction
        </Link>
      </div>

      {/* Filter */}
      <label className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="rounded"
        />
        Show inactive
      </label>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : jurisdictions.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground/80">
          <MapPin className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No jurisdictions configured</p>
          <p className="text-sm mt-1">Add your first jurisdiction to enable checklist generation.</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">County</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Code</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">State</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Requirements</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Packages</th>
                <th className="text-center px-4 py-3 font-medium text-muted-foreground">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {jurisdictions.map((j) => (
                <tr key={j.id} className="hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{j.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{j.countyCode}</td>
                  <td className="px-4 py-3 text-muted-foreground">{j.state}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {j._count.requirements}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {j._count.packages}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleActive(j.id, j.isActive)}
                      title={j.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {j.isActive ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 inline" />
                      ) : (
                        <XCircle className="w-4 h-4 text-muted-foreground inline" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/jurisdictions/${j.id}`}
                      className="inline-flex items-center gap-1 text-primary hover:text-primary text-sm font-medium"
                    >
                      Manage
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
