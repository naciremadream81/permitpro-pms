/**
 * Florida parcel lookup — ported from the package-tracking app.
 *
 * Queries the Florida Statewide Cadastral layer (the DOR tax roll assembled
 * from all 67 county property appraisers) published as a public ArcGIS
 * feature service: no API key, CORS-enabled, callable from the browser.
 *
 * The layer rejects WHERE clauses on its address fields, so the lookup is
 * two steps: geocode the address to a point (ArcGIS World Geocoder, tokenless
 * findAddressCandidates), then ask the layer which parcel polygon contains
 * that point.
 */

export interface PropertyInfo {
  parcelId: string
  owner: string
  siteAddress: string
  city: string
  zip: string
  /** DOR use code, e.g. "001" single family. */
  useCode: string
  useLabel: string
  yearBuilt?: number
  /** Just (market) value from the tax roll, in dollars. */
  justValue?: number
  legal?: string
  /** ISO timestamp of when this was fetched. */
  fetchedAt: string
  source: 'fl-statewide-cadastral'
}

const PARCEL_URL =
  'https://services9.arcgis.com/Gh9awoU677aKree0/arcgis/rest/services/Florida_Statewide_Cadastral/FeatureServer/0/query'

const GEOCODE_URL =
  'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates'

/** Common DOR use codes; anything else falls back to the raw code. */
const DOR_USE_LABELS: Record<string, string> = {
  '000': 'Vacant residential',
  '001': 'Single family',
  '002': 'Mobile home',
  '004': 'Condominium',
  '008': 'Multi-family (<10 units)',
  '010': 'Vacant commercial',
  '028': 'Mobile home park',
  '040': 'Vacant industrial',
  '070': 'Vacant institutional',
  '086': 'County property',
  '089': 'Municipal property',
  '099': 'Non-agricultural acreage',
}

export function dorUseLabel(code: string): string {
  const padded = code.trim().padStart(3, '0')
  return DOR_USE_LABELS[padded] ?? `DOR use code ${code.trim()}`
}

interface ParcelAttributes {
  PARCEL_ID?: string
  OWN_NAME?: string
  PHY_ADDR1?: string
  PHY_ADDR2?: string
  PHY_CITY?: string
  PHY_ZIPCD?: number | string
  DOR_UC?: string
  ACT_YR_BLT?: number
  EFF_YR_BLT?: number
  JV?: number
  S_LEGAL?: string
}

export interface GeocodeCandidate {
  address: string
  x: number
  y: number
  score: number
}

export type LookupResult =
  | { ok: true; kind: 'parcel'; property: PropertyInfo; matchedAddress: string }
  | { ok: true; kind: 'addresses'; candidates: GeocodeCandidate[] }
  | { ok: true; kind: 'parcels'; parcels: PropertyInfo[] }
  | { ok: false; error: string }

type ParcelAtPointResult =
  | { kind: 'parcel'; property: PropertyInfo }
  | { kind: 'nearby'; parcels: PropertyInfo[] }
  | { kind: 'none' }
  | { kind: 'error'; error: string }

function toProperty(attrs: ParcelAttributes): PropertyInfo {
  const useCode = String(attrs.DOR_UC ?? '').trim()
  const yearBuilt = attrs.ACT_YR_BLT || attrs.EFF_YR_BLT || undefined
  return {
    parcelId: String(attrs.PARCEL_ID ?? '').trim(),
    owner: String(attrs.OWN_NAME ?? '').trim(),
    siteAddress: [attrs.PHY_ADDR1, attrs.PHY_ADDR2]
      .map((s) => String(s ?? '').trim())
      .filter(Boolean)
      .join(', '),
    city: String(attrs.PHY_CITY ?? '').trim(),
    zip: String(attrs.PHY_ZIPCD ?? '').trim(),
    useCode,
    useLabel: dorUseLabel(useCode),
    yearBuilt: yearBuilt && yearBuilt > 1700 ? yearBuilt : undefined,
    justValue: typeof attrs.JV === 'number' && attrs.JV > 0 ? attrs.JV : undefined,
    legal: String(attrs.S_LEGAL ?? '').trim() || undefined,
    fetchedAt: new Date().toISOString(),
    source: 'fl-statewide-cadastral',
  }
}

async function geocode(address: string): Promise<GeocodeCandidate[] | { error: string }> {
  // Anchor the search to Florida unless the user already did.
  const single = /,\s*fl(orida)?\b/i.test(address) ? address : `${address}, FL`
  const params = new URLSearchParams({
    SingleLine: single,
    sourceCountry: 'USA',
    maxLocations: '4',
    f: 'json',
  })
  let response: Response
  try {
    response = await fetch(`${GEOCODE_URL}?${params.toString()}`)
  } catch {
    return { error: "Couldn't reach the geocoding service. Check your connection and try again." }
  }
  if (!response.ok) {
    return { error: `Geocoding failed (HTTP ${response.status}). Try again in a minute.` }
  }
  const data = (await response.json()) as {
    candidates?: Array<{ address: string; location: { x: number; y: number }; score: number }>
  }
  return (data.candidates ?? [])
    .filter((c) => c.score >= 80 && /, florida,/i.test(c.address))
    .map((c) => ({ address: c.address, x: c.location.x, y: c.location.y, score: c.score }))
}

const OUT_FIELDS =
  'PARCEL_ID,OWN_NAME,PHY_ADDR1,PHY_ADDR2,PHY_CITY,PHY_ZIPCD,DOR_UC,ACT_YR_BLT,EFF_YR_BLT,JV,S_LEGAL'

async function spatialQuery(
  geometry: object,
  geometryType: string
): Promise<PropertyInfo[] | { error: string }> {
  const params = new URLSearchParams({
    geometry: JSON.stringify(geometry),
    geometryType,
    inSR: '4326',
    spatialRel: 'esriSpatialRelIntersects',
    outFields: OUT_FIELDS,
    returnGeometry: 'false',
    // NB: resultRecordCount is rejected on spatial queries by this layer.
    f: 'json',
  })
  let response: Response
  try {
    response = await fetch(`${PARCEL_URL}?${params.toString()}`)
  } catch {
    return { error: "Couldn't reach the Florida parcel service. Check your connection and try again." }
  }
  if (!response.ok) {
    return { error: `The parcel service returned an error (HTTP ${response.status}). Try again in a minute.` }
  }
  const data = (await response.json()) as {
    error?: { message?: string }
    features?: Array<{ attributes: ParcelAttributes }>
  }
  if (data.error) {
    return {
      error: `The parcel service rejected the query${data.error.message ? `: ${data.error.message}` : ''}.`,
    }
  }
  return (data.features ?? []).map((f) => toProperty(f.attributes)).filter((p) => p.parcelId)
}

/**
 * Find the parcel for a geocoded point. Geocoders often snap to the street
 * centerline (right-of-way, no parcel), so when the point itself misses, a
 * ~60m envelope is searched and the house number from the geocoded address
 * is used to pick the right parcel; ambiguous results are returned for the
 * user to choose from.
 */
export async function parcelAtPoint(
  x: number,
  y: number,
  geocodedAddress?: string
): Promise<ParcelAtPointResult> {
  const direct = await spatialQuery({ x, y, spatialReference: { wkid: 4326 } }, 'esriGeometryPoint')
  if ('error' in direct) return { kind: 'error', error: direct.error }
  if (direct.length > 0) return { kind: 'parcel', property: direct[0] }

  const d = 0.0003 // ~30m each way
  const nearby = await spatialQuery(
    { xmin: x - d, ymin: y - d, xmax: x + d, ymax: y + d, spatialReference: { wkid: 4326 } },
    'esriGeometryEnvelope'
  )
  if ('error' in nearby) return { kind: 'error', error: nearby.error }
  if (nearby.length === 0) return { kind: 'none' }

  // Match the house number from the geocoded address against site addresses.
  const houseNumber = geocodedAddress?.match(/^(\d+)\s/)?.[1]
  if (houseNumber) {
    const exact = nearby.filter((p) => p.siteAddress.startsWith(`${houseNumber} `))
    if (exact.length === 1) return { kind: 'parcel', property: exact[0] }
    if (exact.length > 1) return { kind: 'nearby', parcels: exact.slice(0, 6) }
  }

  const withAddress = nearby.filter((p) => p.siteAddress.trim())
  return { kind: 'nearby', parcels: (withAddress.length > 0 ? withAddress : nearby).slice(0, 6) }
}

/**
 * Address → parcel. When the geocoder is confident about one location, the
 * parcel comes back directly; when several plausible addresses match, the
 * candidates are returned so the user can pick.
 */
export async function lookupProperty(address: string): Promise<LookupResult> {
  if (!address.trim()) {
    return { ok: false, error: 'This permit has no project address to look up.' }
  }

  const candidates = await geocode(address)
  if ('error' in candidates) return { ok: false, error: candidates.error }
  if (candidates.length === 0) {
    return {
      ok: false,
      error: `Couldn't locate “${address}” in Florida. Check the spelling, or add the city after a comma.`,
    }
  }

  // One confident hit (or a clear best): go straight to the parcel.
  const [best, second] = candidates
  if (candidates.length === 1 || best.score - (second?.score ?? 0) >= 5) {
    const result = await parcelAtPoint(best.x, best.y, best.address)
    switch (result.kind) {
      case 'parcel':
        return { ok: true, kind: 'parcel', property: result.property, matchedAddress: best.address }
      case 'nearby':
        return { ok: true, kind: 'parcels', parcels: result.parcels }
      case 'error':
        return { ok: false, error: result.error }
      case 'none':
        return {
          ok: false,
          error: `Found the location (“${best.address}”) but no parcel covers it in the statewide roll. New plats can lag the roll by a year.`,
        }
    }
  }

  return { ok: true, kind: 'addresses', candidates }
}

export function formatCurrency(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
}
