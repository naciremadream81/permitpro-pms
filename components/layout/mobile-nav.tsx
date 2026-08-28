'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useNav } from './nav-context'

interface MobileNavProps {
  children: React.ReactNode
}

export function MobileNav({ children }: MobileNavProps) {
  const { mobileOpen, closeMobile } = useNav()
  const panelRef = useRef<HTMLDivElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!mobileOpen) return

    previousFocusRef.current = document.activeElement as HTMLElement
    document.body.style.overflow = 'hidden'

    const panel = panelRef.current
    const focusable = panel?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
    focusable?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMobile()
        return
      }
      if (e.key !== 'Tab' || !panel) return

      const focusables = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return

      const first = focusables[0]
      const last = focusables[focusables.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
      previousFocusRef.current?.focus()
    }
  }, [mobileOpen, closeMobile])

  return (
    <>
      {/* Desktop nav lives in the BandHeader; this renders the drawer only */}
      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="presentation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-ink/40"
            onClick={closeMobile}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className={cn(
              'absolute inset-y-0 left-0 w-60 shadow-lg',
              'motion-safe:transition-transform motion-safe:duration-200'
            )}
          >
            {children}
          </div>
        </div>
      )}
    </>
  )
}
