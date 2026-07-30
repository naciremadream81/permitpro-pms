/**
 * Cron — Daily Package Snapshot
 *
 * POST /api/cron/snapshot
 *
 * Protected by a shared secret in the Authorization header.
 * Call via:   Authorization: Bearer <CRON_SECRET>
 *
 * Can be scheduled with Vercel Cron, GitHub Actions, or any external scheduler.
 * Safe to call multiple times per day (upserts on packageId + snapshotDate).
 */

import { timingSafeEqual } from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { runDailySnapshot } from '@/lib/snapshot-job'

function secretsMatch(provided: string, expected: string): boolean {
  const providedBuf = Buffer.from(provided)
  const expectedBuf = Buffer.from(expected)
  if (providedBuf.length !== expectedBuf.length) {
    return false
  }
  return timingSafeEqual(providedBuf, expectedBuf)
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.error('CRON_SECRET is not set — snapshot endpoint is disabled')
    return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 })
  }

  if (!token || !secretsMatch(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runDailySnapshot()
    console.log('Daily snapshot complete:', result)
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error('POST /api/cron/snapshot:', error)
    return NextResponse.json({ error: 'Snapshot job failed' }, { status: 500 })
  }
}
