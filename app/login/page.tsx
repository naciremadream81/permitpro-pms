/**
 * Login Page
 *
 * Authentication page aligned with PermitPro shell tokens.
 */

'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

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
    <div className="flex min-h-screen flex-col bg-canvas">
      <div className="bg-band px-6 py-5 text-band-foreground">
        <p className="text-2xl font-extrabold uppercase leading-none tracking-tight [font-stretch:115%]">
          Permit<span className="font-light [font-stretch:100%]">Pro</span>
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="border-b-2 border-ink pb-3 text-2xl font-extrabold uppercase tracking-tight text-ink">
              Sign in
            </h1>
            <p className="mt-3 text-sm text-muted">
              Permit coordination and document management
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="border border-destructive px-4 py-3" role="alert">
                <p className="text-sm font-semibold text-destructive">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-ink">
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
                  className="pp-input mt-1"
                  placeholder="you@company.com"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-ink">
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
                  className="pp-input mt-1"
                  placeholder="Enter your password"
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
