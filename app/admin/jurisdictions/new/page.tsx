'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'

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
    <AppLayout>
      <div className="mx-auto max-w-lg">
        <h1 className="border-b border-border pb-5 text-[22px] font-semibold tracking-tight text-ink">
          New Jurisdiction
        </h1>

        {error && (
          <div className="mt-4 flex items-center gap-3 border-b border-destructive py-2.5 text-sm">
            <span className="border border-destructive px-2 py-0.5 text-xs font-bold uppercase tracking-[0.1em] text-destructive">
              Error
            </span>
            <span className="text-ink">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.08em] text-muted">
              County Name <span className="text-destructive">*</span>
            </label>
            <input
              name="name"
              required
              placeholder="Hillsborough County"
              className="pp-input"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.08em] text-muted">
              County Code <span className="text-destructive">*</span>
            </label>
            <input
              name="countyCode"
              required
              placeholder="HILLSBOROUGH"
              maxLength={20}
              className="pp-input font-mono"
            />
            <p className="mt-1 text-xs text-muted">Unique identifier. Cannot be changed after creation.</p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.08em] text-muted">
              State
            </label>
            <input
              name="state"
              defaultValue="FL"
              maxLength={2}
              className="pp-input w-24 font-mono uppercase"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.08em] text-muted">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Any notes about this jurisdiction's submission process…"
              className="pp-input"
            />
          </div>

          <div className="flex gap-3 border-t border-border pt-5">
            <Button type="submit" disabled={saving}>
              {saving ? 'Creating…' : 'Create Jurisdiction'}
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </AppLayout>
  )
}
