'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { TrendingUp, Lock, AlertTriangle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-profit/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <TrendingUp className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">FIP</h1>
          <p className="text-text-secondary mt-1 text-sm">Friends Investment Pool</p>
        </div>

        {/* Login Card */}
        <div className="bg-surface-card border border-surface-border rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="w-4 h-4 text-text-secondary" />
            <h2 className="text-lg font-semibold text-text-primary">Member Login</h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-4 py-3
                           text-text-primary placeholder-text-muted text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                           transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-surface-elevated border border-surface-border rounded-xl px-4 py-3
                           text-text-primary placeholder-text-muted text-sm
                           focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
                           transition-colors"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 text-loss text-sm bg-loss-muted border border-loss/20 rounded-xl px-4 py-3">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-hover disabled:opacity-60 disabled:cursor-not-allowed
                         text-white font-semibold rounded-xl px-4 py-3 text-sm
                         transition-all duration-200 shadow-lg shadow-primary/20
                         flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 bg-warning/5 border border-warning/20 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="text-xs text-text-secondary space-y-1">
              <p className="font-medium text-warning">Private & Invite-Only</p>
              <p>This is a private investment group among friends. No guaranteed returns. Investments are subject to market risk. This is not a registered financial institution.</p>
            </div>
          </div>
        </div>

        <p className="text-center text-text-muted text-xs mt-4">
          Access is by invitation only. Contact your administrator.
        </p>
      </div>
    </div>
  )
}
