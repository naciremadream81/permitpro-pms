'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function NewJurisdictionPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const form = e.currentTarget
    const data = {
      name: (form.elements.namedItem('name') as HTMLInputElement).value,
      countyCode: (form.elements.namedItem('countyCode') as HTMLInputElement).value,
      state: (form.elements.namedItem('state') as HTMLInputElement).value,
      notes: (form.elements.namedItem('notes') as HTMLTextAreaElement).value || undefined,
    }

    try {
      const res = await fetch('/api/jurisdictions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = await res.json()
        setError(json.error ?? 'Failed to create jurisdiction')
        return
      }

      const json = await res.json()
      router.push(`/admin/jurisdictions/${json.data.id}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-semibold text-foreground mb-6">New Jurisdiction</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            County Name <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            placeholder="Hillsborough County"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            County Code <span className="text-red-500">*</span>
          </label>
          <input
            name="countyCode"
            required
            placeholder="HILLSBOROUGH"
            maxLength={20}
            className="w-full border border-input rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground/80 mt-1">Unique identifier. Cannot be changed after creation.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            State
          </label>
          <input
            name="state"
            defaultValue="FL"
            maxLength={2}
            className="w-24 border border-input rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-1">
            Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Any notes about this jurisdiction's submission process…"
            className="w-full border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Creating…' : 'Create Jurisdiction'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 rounded-lg text-sm font-medium border border-input text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
