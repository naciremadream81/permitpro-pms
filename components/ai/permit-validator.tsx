'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { SparklesIcon, RefreshCwIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  permitId: string
}

type State = 'idle' | 'loading' | 'done' | 'error'

function MarkdownLine({ line }: { line: string }) {
  // Headings
  if (line.startsWith('## ')) {
    return <h3 className="mt-4 mb-1 text-[13px] font-bold tracking-tight text-ink first:mt-0">{line.slice(3)}</h3>
  }
  // Bullet points — strip leading "- " or "• "
  if (/^[-•]\s/.test(line)) {
    return (
      <li className="ml-4 list-disc text-[13px] leading-relaxed text-ink marker:text-muted">
        {line.replace(/^[-•]\s/, '')}
      </li>
    )
  }
  // Numbered list
  if (/^\d+\.\s/.test(line)) {
    return (
      <li className="ml-4 list-decimal text-[13px] leading-relaxed text-ink marker:text-muted">
        {line.replace(/^\d+\.\s/, '')}
      </li>
    )
  }
  if (line.trim() === '') return <div className="h-1" />
  return <p className="text-[13px] leading-relaxed text-ink">{line}</p>
}

export function PermitValidator({ permitId }: Props) {
  const [state, setState] = useState<State>('idle')
  const [text, setText] = useState('')
  const [open, setOpen] = useState(true)
  const abortRef = useRef<AbortController | null>(null)

  async function runCheck() {
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    setState('loading')
    setText('')
    setOpen(true)

    try {
      const res = await fetch('/api/ai/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ permitId }),
        signal: ctrl.signal,
      })

      if (!res.ok) throw new Error(await res.text())
      if (!res.body) throw new Error('No response body')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const payload = line.slice(6)
          if (payload === '[DONE]') break
          try {
            setText((prev) => prev + JSON.parse(payload))
          } catch {}
        }
      }

      setState('done')
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setState('error')
    }
  }

  return (
    <div className="border border-border bg-surface">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <SparklesIcon className="h-4 w-4 text-accent" aria-hidden />
          <span className="text-[13px] font-semibold tracking-tight text-ink">AI Package Check</span>
          {state === 'loading' && (
            <span className="text-[11px] font-medium text-muted animate-pulse">Reviewing…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {state !== 'idle' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={runCheck}
              disabled={state === 'loading'}
              aria-label="Re-run check"
            >
              <RefreshCwIcon className={cn('h-3.5 w-3.5', state === 'loading' && 'animate-spin')} aria-hidden />
            </Button>
          )}
          {state !== 'idle' && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="text-muted hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
              aria-label={open ? 'Collapse AI check' : 'Expand AI check'}
            >
              {open ? <ChevronUpIcon className="h-4 w-4" /> : <ChevronDownIcon className="h-4 w-4" />}
            </button>
          )}
          {state === 'idle' && (
            <Button size="sm" onClick={runCheck}>
              <SparklesIcon className="h-3.5 w-3.5" aria-hidden />
              Run Check
            </Button>
          )}
        </div>
      </div>

      {/* Body */}
      {state === 'idle' && (
        <div className="px-4 py-5 text-center">
          <p className="text-[13px] text-muted">
            Run an AI review to check this package for missing documents, checklist gaps, and next steps.
          </p>
        </div>
      )}

      {state === 'error' && (
        <div className="px-4 py-3">
          <p className="text-[13px] text-destructive">Review failed. Check that ANTHROPIC_API_KEY or GOOGLE_AI_API_KEY is set, then try again.</p>
        </div>
      )}

      {(state === 'loading' || state === 'done') && open && (
        <div className="px-4 py-4">
          {text ? (
            <ul className="m-0 list-none p-0 space-y-0.5">
              {text.split('\n').map((line, i) => (
                <MarkdownLine key={i} line={line} />
              ))}
            </ul>
          ) : (
            <div className="space-y-2">
              {[70, 55, 85, 60].map((w, i) => (
                <div
                  key={i}
                  className="h-3 animate-pulse rounded-sm bg-surface-inset"
                  style={{ width: `${w}%` }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
