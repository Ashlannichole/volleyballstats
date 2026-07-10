import { useState, useRef } from 'react'
import type { Session } from '../utils/auth'
import { saveSession } from '../utils/auth'

interface Props {
  onSignIn: (session: Session) => void
}

type Step = 'email' | 'otp'

export default function AuthScreen({ onSignIn }: Props) {
  const [step, setStep]       = useState<Step>('email')
  const [email, setEmail]     = useState('')
  const [otp, setOtp]         = useState(['', '', '', '', '', ''])
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState('')
  const inputRefs             = useRef<(HTMLInputElement | null)[]>([])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError('Enter a valid email address.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth?action=send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Failed to send code.'); return }
      // Beta mode: server returns token immediately, skip OTP step
      if (data.beta && data.token) {
        const session: Session = { token: data.token, email: data.email }
        saveSession(session)
        onSignIn(session)
        return
      }
      setStep('otp')
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  async function handleVerify(digits = otp) {
    const code = digits.join('')
    if (code.length < 6) return
    setError('')
    setBusy(true)
    try {
      const res = await fetch('/api/auth?action=verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), otp: code }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Invalid code.'); return }
      const session: Session = { token: data.token, email: data.email }
      saveSession(session)
      onSignIn(session)
    } catch {
      setError('Network error. Check your connection.')
    } finally {
      setBusy(false)
    }
  }

  function handleOtpChange(idx: number, val: string) {
    const char = val.replace(/\D/g, '').slice(-1)
    const next = [...otp]
    next[idx] = char
    setOtp(next)
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus()
    }
    if (next.every(d => d !== '')) {
      handleVerify(next)
    }
  }

  function handleOtpKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (pasted.length === 6) {
      const digits = pasted.split('')
      setOtp(digits)
      inputRefs.current[5]?.focus()
      handleVerify(digits)
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-3xl bg-vr-800 border border-vr-600/50 flex items-center justify-center text-4xl mx-auto mb-4">
          🏐
        </div>
        <h1 className="text-white font-black text-2xl tracking-tight">Volleyball Stats</h1>
        <p className="text-gray-500 text-sm mt-1">Sign in to sync your data across devices</p>
      </div>

      <div className="w-full max-w-sm">
        {step === 'email' ? (
          <form onSubmit={handleSend} className="flex flex-col gap-4">
            <div>
              <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-2">
                Email Address
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

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button type="submit" disabled={busy}
              className="tap-btn w-full bg-vr-700 border border-vr-500 rounded-2xl py-4 text-white font-bold text-base disabled:opacity-50">
              {busy ? 'Sending…' : 'Send Sign-In Code'}
            </button>

            <p className="text-gray-600 text-xs text-center leading-relaxed">
              We'll email you a 6-digit code — no password needed.
              Your stats are tied to your email, not your device.
            </p>
          </form>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <p className="text-white font-bold text-base">Check your email</p>
              <p className="text-gray-500 text-sm mt-1">
                We sent a code to <span className="text-pb-400">{email}</span>
              </p>
            </div>

            {/* 6-digit OTP input */}
            <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  autoFocus={i === 0}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  className="w-12 h-14 bg-navy-800 border border-white/20 rounded-xl text-center text-white text-2xl font-black focus:outline-none focus:border-vr-500 caret-transparent"
                />
              ))}
            </div>

            {busy && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-vr-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">Verifying…</p>
              </div>
            )}

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <button
              onClick={() => { setStep('email'); setOtp(['','','','','','']); setError('') }}
              className="tap-btn text-gray-500 text-sm text-center underline underline-offset-2">
              Use a different email
            </button>

            <button
              onClick={() => handleSend({ preventDefault: () => {} } as React.FormEvent)}
              disabled={busy}
              className="tap-btn text-pb-400 text-sm text-center disabled:opacity-40">
              Resend code
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
