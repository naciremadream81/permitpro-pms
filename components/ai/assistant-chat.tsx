'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { SparklesIcon, XIcon, SendIcon, GlobeIcon, RotateCcwIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  role: 'user' | 'assistant'
  content: string
  /** true while streaming */
  streaming?: boolean
}

function MessageBubble({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user'
  return (
    <div className={cn('flex gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center bg-accent text-accent-foreground">
          <SparklesIcon className="h-3.5 w-3.5" aria-hidden />
        </div>
      )}
      <div
        className={cn(
          'max-w-[82%] rounded-none px-3 py-2 text-[13px] leading-relaxed',
          isUser
            ? 'bg-accent text-accent-foreground'
            : 'border border-border bg-surface text-ink'
        )}
      >
        {msg.content || (
          <span className="inline-flex gap-1">
            <span className="animate-bounce [animation-delay:0ms]">·</span>
            <span className="animate-bounce [animation-delay:150ms]">·</span>
            <span className="animate-bounce [animation-delay:300ms]">·</span>
          </span>
        )}
      </div>
    </div>
  )
}

export function AssistantChat() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [webSearch, setWebSearch] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = useCallback(async () => {
    const text = input.trim()
    if (!text || busy) return

    const userMsg: Message = { role: 'user', content: text }
    const outgoing = [...messages, userMsg]
    setMessages([...outgoing, { role: 'assistant', content: '', streaming: true }])
    setInput('')
    setBusy(true)

    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: outgoing.map((m) => ({ role: m.role, content: m.content })),
          useWebSearch: webSearch,
        }),
        signal: ctrl.signal,
      })

      if (!res.ok || !res.body) throw new Error('Request failed')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let accumulated = ''

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
            accumulated += JSON.parse(payload)
            setMessages((prev) => {
              const updated = [...prev]
              updated[updated.length - 1] = {
                role: 'assistant',
                content: accumulated,
                streaming: true,
              }
              return updated
            })
          } catch {}
        }
      }

      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = { role: 'assistant', content: accumulated }
        return updated
      })
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: 'Sorry, something went wrong. Please try again.',
        }
        return updated
      })
    } finally {
      setBusy(false)
    }
  }, [input, busy, messages, webSearch])

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void send()
    }
  }

  function clearChat() {
    abortRef.current?.abort()
    setMessages([])
    setBusy(false)
    setInput('')
  }

  return (
    <>
      {/* Floating trigger */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open PermitPro Assistant'}
        aria-expanded={open}
        className={cn(
          'fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center bg-accent text-accent-foreground shadow-lg transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)]',
          open && 'rotate-90'
        )}
      >
        {open ? <XIcon className="h-5 w-5" /> : <SparklesIcon className="h-5 w-5" />}
      </button>

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="PermitPro Assistant"
          aria-modal="false"
          className="fixed bottom-20 right-5 z-40 flex w-[360px] flex-col border border-border bg-surface shadow-xl"
          style={{ height: '480px' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border bg-band px-3 py-2.5">
            <div className="flex items-center gap-2">
              <SparklesIcon className="h-4 w-4 text-band-foreground" aria-hidden />
              <span className="text-[13px] font-semibold text-band-foreground">PermitPro Assistant</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={clearChat}
                title="Clear conversation"
                className="flex h-7 w-7 items-center justify-center text-band-dim hover:text-band-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                aria-label="Clear conversation"
              >
                <RotateCcwIcon className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center text-band-dim hover:text-band-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                aria-label="Close assistant"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="space-y-2 pt-2">
                <p className="text-center text-[12px] text-muted">Ask me anything about PermitPro or finding permit forms.</p>
                {[
                  'Where do I upload documents?',
                  'How do I assign a reviewer?',
                  'Find the Broward County building permit application',
                ].map((hint) => (
                  <button
                    key={hint}
                    type="button"
                    onClick={() => { setInput(hint); inputRef.current?.focus() }}
                    className="w-full border border-border bg-surface px-3 py-2 text-left text-[12px] text-muted hover:bg-surface-inset hover:text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
                  >
                    {hint}
                  </button>
                ))}
              </div>
            )}
            {messages.map((msg, i) => (
              <MessageBubble key={i} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border px-3 py-2.5">
            {/* Web search toggle */}
            <div className="mb-2 flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={webSearch}
                onClick={() => setWebSearch((s) => !s)}
                className={cn(
                  'flex items-center gap-1.5 px-2 py-1 text-[11px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]',
                  webSearch
                    ? 'bg-accent text-accent-foreground'
                    : 'border border-border bg-surface text-muted hover:text-ink'
                )}
              >
                <GlobeIcon className="h-3 w-3" aria-hidden />
                Web search {webSearch ? 'on' : 'off'}
              </button>
              {webSearch && (
                <span className="text-[11px] text-muted">for finding forms online</span>
              )}
            </div>

            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKey}
                rows={1}
                placeholder="Ask a question…"
                disabled={busy}
                className="flex-1 resize-none border border-border bg-canvas px-2.5 py-2 text-[13px] text-ink placeholder:text-muted focus:outline-none focus:border-accent disabled:opacity-50"
                style={{ minHeight: '36px', maxHeight: '100px' }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center bg-accent text-accent-foreground hover:bg-accent-hover disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]"
              >
                <SendIcon className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
