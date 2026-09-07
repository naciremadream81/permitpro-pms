import Link from 'next/link'
import { legalRoutes } from '@/lib/site-config'

const links = [
  { href: legalRoutes.privacy, label: 'Privacy Policy' },
  { href: legalRoutes.terms, label: 'Terms & Conditions' },
  { href: legalRoutes.cookies, label: 'Cookie Policy' },
  { href: legalRoutes.refund, label: 'Refund Policy' },
] as const

interface LegalNavLinksProps {
  className?: string
  linkClassName?: string
  separator?: string
}

export function LegalNavLinks({
  className = '',
  linkClassName = 'underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]',
  separator = ' · ',
}: LegalNavLinksProps) {
  return (
    <nav aria-label="Legal policies" className={className}>
      {links.map((link, index) => (
        <span key={link.href}>
          {index > 0 && <span aria-hidden="true">{separator}</span>}
          <Link href={link.href} className={linkClassName}>
            {link.label}
          </Link>
        </span>
      ))}
    </nav>
  )
}
