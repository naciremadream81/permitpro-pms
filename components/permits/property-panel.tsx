'use client'

/**
 * Property panel — Florida property appraiser parcel lookup for the permit
 * detail page. On-demand: fetches from the statewide cadastral roll in the
 * browser and displays the result; nothing is persisted yet (needs a schema
 * field once Prisma generate works on this host — see design-directions/HANDOFF.md).
 */

import { useState } from 'react'
import { Landmark, Loader2, RefreshCcw, Search } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/utils'
import {
  formatCurrency,
  lookupProperty,
  parcelAtPoint,
  type GeocodeCandidate,
  type PropertyInfo,
} from '@/lib/property'

export function PropertyPanel({ address }: { address: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [property, setProperty] = useState<PropertyInfo | null>(null)
  const [matchedAddress, setMatchedAddress] = useState<string | null>(null)
  const [addressCandidates, setAddressCandidates] = useState<GeocodeCandidate[] | null>(null)
  const [parcelCandidates, setParcelCandidates] = useState<PropertyInfo[] | null>(null)

  function clearChoices() {
    setAddressCandidates(null)
    setParcelCandidates(null)
  }

  async function runLookup() {
    setBusy(true)
    setError(null)
    clearChoices()
    const result = await lookupProperty(address)
    setBusy(false)
    if (!result.ok) {
      setError(result.error)
      return
    }
    if (result.kind === 'parcel') {
      setProperty(result.property)
      setMatchedAddress(result.matchedAddress)
    } else if (result.kind === 'parcels') {
      setParcelCandidates(result.parcels)
    } else {
      setAddressCandidates(result.candidates)
    }
  }

  async function pickAddress(candidate: GeocodeCandidate) {
    setBusy(true)
    setError(null)
    const result = await parcelAtPoint(candidate.x, candidate.y, candidate.address)
    setBusy(false)
    if (result.kind === 'error') {
      setError(result.error)
      return
    }
    if (result.kind === 'none') {
      setError(`No parcel covers “${candidate.address}” in the statewide roll.`)
      return
    }
    setAddressCandidates(null)
    if (result.kind === 'parcel') {
      setProperty(result.property)
      setMatchedAddress(candidate.address)
    } else {
      setParcelCandidates(result.parcels)
    }
  }

  function pickParcel(p: PropertyInfo) {
    setProperty(p)
    setMatchedAddress(null)
    clearChoices()
    setError(null)
  }

  return (
    <Card aria-labelledby="property-heading">
      <CardHeader>
        <div className="flex items-baseline justify-between gap-3">
          <CardTitle id="property-heading">Property — Appraiser Roll</CardTitle>
          {property && (
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">
              Pulled {formatDate(property.fetchedAt)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!property && !addressCandidates && !parcelCandidates && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">
              Pull the parcel record for <b className="font-semibold text-ink">{address}</b> from
              the Florida statewide property appraiser roll — owner, parcel ID, use, year built,
              and just value.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void runLookup()}
              disabled={busy}
              className="gap-2"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <Search className="h-3.5 w-3.5" aria-hidden />
              )}
              {busy ? 'Searching the roll…' : 'Look up property'}
            </Button>
          </div>
        )}

        {error && (
          <p className="mt-3 border border-destructive px-3 py-2 text-sm font-semibold text-destructive" role="alert">
            {error}
          </p>
        )}

        {addressCandidates && (
          <div className="mt-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              {addressCandidates.length} addresses match — pick the right one
            </p>
            <ul className="mt-1 divide-y divide-border border-y border-border">
              {addressCandidates.map((c) => (
                <li key={`${c.x},${c.y}`}>
                  <button
                    type="button"
                    onClick={() => void pickAddress(c)}
                    disabled={busy}
                    className="w-full px-2 py-2.5 text-left text-sm font-semibold text-accent transition-colors hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    {c.address}
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={clearChoices}>
              Cancel
            </Button>
          </div>
        )}

        {parcelCandidates && (
          <div className="mt-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              The map point sits between parcels — pick the right one
            </p>
            <ul className="mt-1 divide-y divide-border border-y border-border">
              {parcelCandidates.map((p) => (
                <li key={p.parcelId}>
                  <button
                    type="button"
                    onClick={() => pickParcel(p)}
                    disabled={busy}
                    className="w-full px-2 py-2.5 text-left transition-colors hover:bg-surface-inset focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  >
                    <span className="block text-sm font-semibold text-accent">
                      {p.siteAddress || '(no site address)'}
                      {p.city && `, ${p.city}`}
                    </span>
                    <span className="block text-xs text-muted">
                      {p.owner} · Parcel {p.parcelId}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="ghost" size="sm" className="mt-2" onClick={clearChoices}>
              Cancel
            </Button>
          </div>
        )}

        {property && (
          <>
            {matchedAddress && (
              <p className="mb-3 text-xs text-muted">Matched “{matchedAddress}”</p>
            )}
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Parcel ID</dt>
                <dd className="text-sm font-semibold text-ink">{property.parcelId}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Owner of record</dt>
                <dd className="text-sm text-ink">{property.owner || '—'}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Site address</dt>
                <dd className="text-sm text-ink">
                  {property.siteAddress}
                  {property.city && `, ${property.city}`}
                  {property.zip && ` ${property.zip}`}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Use</dt>
                <dd className="text-sm text-ink">{property.useLabel}</dd>
              </div>
              {property.yearBuilt && (
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Year built</dt>
                  <dd className="text-sm font-semibold text-ink">{property.yearBuilt}</dd>
                </div>
              )}
              {property.justValue && (
                <div>
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Just value</dt>
                  <dd className="text-sm font-semibold text-ink">{formatCurrency(property.justValue)}</dd>
                </div>
              )}
              {property.legal && (
                <div className="sm:col-span-2">
                  <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Legal description</dt>
                  <dd className="text-sm text-ink">{property.legal}</dd>
                </div>
              )}
            </dl>
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => void runLookup()}
                disabled={busy}
                className="gap-2"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <RefreshCcw className="h-3.5 w-3.5" aria-hidden />
                )}
                Refresh from roll
              </Button>
              <p className="flex items-center gap-1.5 text-[11px] text-muted">
                <Landmark className="h-3 w-3" aria-hidden />
                FL DOR statewide cadastral roll — verify against the county appraiser before submittal.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
