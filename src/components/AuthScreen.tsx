import { useState } from 'react'
import type { Session } from '../utils/auth'
import { saveSession } from '../utils/auth'

interface Props {
  onSignIn: (session: Session) => void
}

type Mode = 'login' | 'register'

export default function AuthScreen({ onSignIn }: Props) {
  const [mode, setMode]               = useState<Mode>('login')
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [confirm, setConfirm]         = useState('')
  const [busy, setBusy]               = useState(false)
  const [error, setError]             = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    if (!password) {
      setError('Enter your password.')
      return
    }
    if (mode === 'register') {
      if (password.length < 6) { setError('Password must be at least 6 characters.'); return }
      if (password !== confirm) { setError("Passwords don't match."); return }
    }

    setBusy(true)
    try {
      const action = mode === 'login' ? 'login' : 'register'
      const res = await fetch(`/api/auth?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong.')
        // If they tried to login but no account exists, nudge them to register
        if (res.status === 401 && data.error?.includes('No account')) {
          setTimeout(() => setMode('register'), 1200)
        }
        return
      }
      const session: Session = { token: data.token, email: data.email }
      saveSession(session)
      onSignIn(session)
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError('')
    setPassword('')
    setConfirm('')
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-vr-800 border border-vr-600/50 flex items-center justify-center text-4xl mx-auto mb-4">
          🏐
        </div>
        <h1 className="text-white font-black text-2xl tracking-tight">Volleyball Stats</h1>
        <p className="text-gray-500 text-sm mt-1">
          {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
        </p>
      </div>

      <div className="w-full max-w-sm">
        {/* Mode toggle */}
        <div className="flex bg-navy-800 border border-white/10 rounded-2xl p-1 mb-5">
          <button
            type="button"
            onClick={() => switchMode('login')}
            className={`tap-btn flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === 'login' ? 'bg-vr-700 text-white shadow' : 'text-gray-500'
            }`}
          >Sign In</button>
          <button
            type="button"
            onClick={() => switchMode('register')}
            className={`tap-btn flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
              mode === 'register' ? 'bg-vr-700 text-white shadow' : 'text-gray-500'
            }`}
          >Create Account</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="coach@example.com"
              autoFocus
              autoComplete="email"
              className="w-full bg-navy-800 border border-white/20 rounded-2xl px-4 py-3.5 text-white text-base placeholder-gray-600 focus:outline-none focus:border-vr-500"
            />
          </div>

          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Min. 6 characters' : '••••••••'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full bg-navy-800 border border-white/20 rounded-2xl px-4 py-3.5 text-white text-base placeholder-gray-600 focus:outline-none focus:border-vr-500"
            />
          </div>

          {mode === 'register' && (
            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full bg-navy-800 border border-white/20 rounded-2xl px-4 py-3.5 text-white text-base placeholder-gray-600 focus:outline-none focus:border-vr-500"
              />
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="tap-btn w-full bg-vr-700 border border-vr-500 rounded-2xl py-4 text-white font-bold text-base disabled:opacity-50 mt-1"
          >
            {busy ? '…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>

          <p className="text-gray-600 text-xs text-center leading-relaxed">
            Your stats are tied to your account and sync across devices.
          </p>
        </form>
      </div>
    </div>
  )
}
