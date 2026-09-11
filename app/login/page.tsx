/**
 * Login Page
 *
 * Authentication page for users to sign in to the permit management system.
 * Uses NextAuth credentials provider for authentication.
 */

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { LegalNavLinks } from '@/components/legal/legal-nav-links'
import { siteConfig } from '@/lib/site-config'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid email or password')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <a href="#login-main" className="pp-skip-link">
        Skip to sign in form
      </a>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div id="login-main" className="w-full max-w-md space-y-8" tabIndex={-1}>
          <div>
            <h1 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              {siteConfig.productName}
            </h1>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to your account
            </p>
          </div>
          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>
            {error && (
              <div className="rounded-md bg-red-50 p-4" role="alert" aria-live="polite">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <div className="space-y-4 rounded-md shadow-sm">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-700 sm:text-sm"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? 'Signing in…' : 'Sign in to PermitPro'}
              </Button>
            </div>

            {siteConfig.showDemoCredentials && (
              <div className="rounded-md bg-blue-50 p-4" role="note">
                <p className="text-xs text-blue-900">
                  <strong>Development demo only:</strong> Admin admin@permitco.com /
                  admin123 · User user@permitco.com / user123
                </p>
              </div>
            )}
          </form>
        </div>
      </div>

      <footer className="border-t border-gray-200 bg-white px-4 py-6 text-center text-xs text-gray-600">
        <p className="font-medium text-gray-900">{siteConfig.legalName}</p>
        <p className="mt-1">{siteConfig.address}</p>
        <p className="mt-2">
          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className="underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            {siteConfig.supportEmail}
          </a>
          {' · '}
          <a
            href={`tel:${siteConfig.phone.replace(/\D/g, '')}`}
            className="underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
          >
            {siteConfig.phone}
          </a>
        </p>
        <p className="mt-3">
          © {siteConfig.copyrightYear} {siteConfig.legalName}. All rights reserved.
        </p>
        <LegalNavLinks
          className="mt-3"
          linkClassName="text-gray-600 underline-offset-2 hover:text-gray-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-700"
        />
      </footer>
    </div>
  )
}
