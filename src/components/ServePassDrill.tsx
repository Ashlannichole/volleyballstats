import { useEffect, useRef, useState } from 'react'
import type { Player, PlayerStats, SetStats, PracticeSession } from '../types'
import { EMPTY_STATS } from '../types'

type Role = 'servers' | 'passers'
type Mode = 'solo' | Role

interface Props {
  players: Player[]
  onSave: (s: PracticeSession) => void
  onCancel: () => void
}

function blankSet(players: Player[]): SetStats {
  const s: SetStats = {}
  for (const p of players) s[p.id] = EMPTY_STATS()
  return s
}

// Copies just one role's fields from `source` onto `target` — used to fold the
// other iPad's latest pushed numbers into the combined session at save time.
function applyRoleFields(target: PlayerStats, source: PlayerStats, role: Role): PlayerStats {
  return role === 'servers'
    ? { ...target, aces: source.aces, serveErrors: source.serveErrors, serveAttempts: source.serveAttempts }
    : { ...target, passRatingTotal: source.passRatingTotal, passAttempts: source.passAttempts }
}

function mergeRemote(base: SetStats, remote: SetStats | null, remoteRole: Role): SetStats {
  if (!remote) return base
  const next = { ...base }
  for (const [pid, ps] of Object.entries(remote)) {
    next[pid] = applyRoleFields(next[pid] ?? EMPTY_STATS(), ps, remoteRole)
  }
  return next
}

const PASS_RATINGS = [
  { value: 0, label: '0', color: 'bg-red-900/40 border-red-600/50 text-red-300' },
  { value: 1, label: '1', color: 'bg-orange-900/40 border-orange-600/50 text-orange-300' },
  { value: 2, label: '2', color: 'bg-cyan-900/40 border-cyan-600/50 text-cyan-300' },
  { value: 3, label: '3', color: 'bg-green-900/40 border-green-600/50 text-green-300' },
]

export default function ServePassDrill({ players, onSave, onCancel }: Props) {
  const [screen, setScreen] = useState<'setup' | 'drill'>('setup')
  const [setupStep, setSetupStep] = useState<'choose' | 'create-role' | 'waiting' | 'join'>('choose')
  const [mode, setMode] = useState<Mode>('solo')
  const [code, setCode] = useState<string | null>(null)
  const [joinInput, setJoinInput] = useState('')
  const [setupError, setSetupError] = useState('')
  const [busy, setBusy] = useState(false)
  const [name, setName] = useState('Serve & Pass Drill')

  const [stats, setStats] = useState<SetStats>(() => blankSet(players))
  const [remoteOther, setRemoteOther] = useState<SetStats | null>(null)
  const [panel, setPanel] = useState<Role>('servers') // which panel is shown in solo mode

  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Pairing setup ──────────────────────────────────────────────────────────

  async function createSession(role: Role) {
    setBusy(true); setSetupError('')
    try {
      const res = await fetch('/api/drill-session?action=create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
      const json = await res.json() as { code: string }
      setCode(json.code)
      setMode(role)
      setSetupStep('waiting')
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : 'Could not start a paired session.')
    } finally {
      setBusy(false)
    }
  }

  async function joinSession() {
    const c = joinInput.trim().toUpperCase()
    if (!c) return
    setBusy(true); setSetupError('')
    try {
      const res = await fetch('/api/drill-session?action=join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: c }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `HTTP ${res.status}`)
      const json = await res.json() as { role: Role }
      setCode(c)
      setMode(json.role)
      setScreen('drill')
      setPanel(json.role)
    } catch (e) {
      setSetupError(e instanceof Error ? e.message : 'Could not join that session.')
    } finally {
      setBusy(false)
    }
  }

  function startSolo() {
    setMode('solo')
    setCode(null)
    setScreen('drill')
  }

  function startAfterCreate() {
    setScreen('drill')
    if (mode !== 'solo') setPanel(mode)
  }

  // ── Live sync (paired only) ─────────────────────────────────────────────────

  function pushStats(updated: SetStats) {
    if (mode === 'solo' || !code) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      fetch('/api/drill-session?action=push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, role: mode, stats: updated }),
      }).catch(() => {})
    }, 150)
  }

  useEffect(() => {
    if (mode === 'solo' || !code || screen !== 'drill') return
    const otherRole: Role = mode === 'servers' ? 'passers' : 'servers'
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch(`/api/drill-session?action=pull&code=${code}`)
        if (!res.ok) return
        const json = await res.json() as Record<Role, { stats: SetStats } | null>
        const entry = json[otherRole]
        if (!cancelled && entry) setRemoteOther(entry.stats)
      } catch { /* offline/flaky gym wifi — just try again next tick */ }
    }
    poll()
    const id = setInterval(poll, 4000)
    return () => { cancelled = true; clearInterval(id) }
  }, [mode, code, screen])

  // ── Recording taps ──────────────────────────────────────────────────────────

  function bumpServe(playerId: string, outcome: 'ace' | 'in' | 'error') {
    setStats(prev => {
      const ps = prev[playerId] ?? EMPTY_STATS()
      const updated: SetStats = {
        ...prev,
        [playerId]: {
          ...ps,
          serveAttempts: ps.serveAttempts + 1,
          aces: ps.aces + (outcome === 'ace' ? 1 : 0),
          serveErrors: ps.serveErrors + (outcome === 'error' ? 1 : 0),
        },
      }
      pushStats(updated)
      return updated
    })
  }

  function bumpPass(playerId: string, rating: number) {
    setStats(prev => {
      const ps = prev[playerId] ?? EMPTY_STATS()
      const updated: SetStats = {
        ...prev,
        [playerId]: {
          ...ps,
          passRatingTotal: ps.passRatingTotal + rating,
          passAttempts: ps.passAttempts + 1,
        },
      }
      pushStats(updated)
      return updated
    })
  }

  // ── Finish ──────────────────────────────────────────────────────────────────

  function finish() {
    let combined = stats
    if (mode !== 'solo') {
      const otherRole: Role = mode === 'servers' ? 'passers' : 'servers'
      combined = mergeRemote(stats, remoteOther, otherRole)
    }
    onSave({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: name.trim() || 'Serve & Pass Drill',
      teamLabel: '',
      notes: '',
      scrimmages: [combined],
      drillType: 'serve_pass',
    })
  }

  // ── Setup screen ──────────────────────────────────────────────────────────

  if (screen === 'setup') {
    return (
      <div className="overflow-y-auto p-4 max-w-lg mx-auto flex flex-col gap-5 pb-8">
        <div className="text-center mt-3">
          <p className="text-vr-400 text-xs font-bold uppercase tracking-widest mb-1">Practice Drill</p>
          <h2 className="text-3xl font-bold text-white">Serve & Pass</h2>
        </div>

        {players.length === 0 && (
          <p className="text-yellow-400 text-center text-sm bg-yellow-900/20 rounded-xl p-3">
            Add players to your roster first.
          </p>
        )}

        <div>
          <label className="block text-gray-300 text-sm mb-1">Session Name</label>
          <input
            className="w-full bg-navy-700 border border-white/20 rounded-xl px-4 py-4 text-white text-xl outline-none focus:border-pb-500"
            placeholder="e.g. Tough-serve drill"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>

        {setupStep === 'choose' && (
          <div className="flex flex-col gap-3">
            <button onClick={startSolo}
              className="tap-btn w-full bg-vr-600 text-white font-bold py-4 rounded-xl text-base">
              Track Both on This iPad (Solo)
            </button>
            <div className="text-center text-gray-600 text-xs">— or use two iPads —</div>
            <button onClick={() => setSetupStep('create-role')}
              className="tap-btn w-full bg-navy-700 border border-white/20 text-white font-bold py-4 rounded-xl text-base">
              Create a Paired Session
            </button>
            <button onClick={() => { setSetupStep('join'); setSetupError('') }}
              className="tap-btn w-full bg-navy-700 border border-white/20 text-white font-bold py-4 rounded-xl text-base">
              Join a Paired Session
            </button>
          </div>
        )}

        {setupStep === 'create-role' && (
          <div className="flex flex-col gap-3">
            <p className="text-gray-400 text-sm">What will <strong>this</strong> iPad track? The other iPad will automatically get the other role when it joins with the code.</p>
            <button disabled={busy} onClick={() => createSession('servers')}
              className="tap-btn w-full bg-navy-700 border border-white/20 text-white font-bold py-4 rounded-xl text-base disabled:opacity-50">
              This iPad Tracks Servers 🎾
            </button>
            <button disabled={busy} onClick={() => createSession('passers')}
              className="tap-btn w-full bg-navy-700 border border-white/20 text-white font-bold py-4 rounded-xl text-base disabled:opacity-50">
              This iPad Tracks Passers 🙌
            </button>
            {setupError && <p className="text-red-400 text-sm text-center">{setupError}</p>}
            <button onClick={() => setSetupStep('choose')} className="tap-btn text-gray-500 text-sm">← Back</button>
          </div>
        )}

        {setupStep === 'waiting' && code && (
          <div className="flex flex-col items-center gap-4 bg-navy-700 border border-vr-600/40 rounded-2xl p-6">
            <p className="text-gray-400 text-sm text-center">Enter this code on the other iPad</p>
            <p className="text-5xl font-black tracking-[0.2em] text-vr-300">{code}</p>
            <p className="text-gray-500 text-xs text-center">
              This iPad is tracking <strong>{mode === 'servers' ? 'Servers' : 'Passers'}</strong>. The other iPad will get{' '}
              <strong>{mode === 'servers' ? 'Passers' : 'Servers'}</strong> automatically.
            </p>
            <button onClick={startAfterCreate}
              className="tap-btn w-full bg-vr-600 text-white font-bold py-3.5 rounded-xl text-base">
              Start Tracking →
            </button>
            <p className="text-gray-600 text-[10px] text-center">You don't need to wait — start whenever you're ready, the other iPad can join mid-drill.</p>
          </div>
        )}

        {setupStep === 'join' && (
          <div className="flex flex-col gap-3">
            <label className="block text-gray-300 text-sm mb-1">Code from the other iPad</label>
            <input
              className="w-full bg-navy-700 border border-white/20 rounded-xl px-4 py-4 text-white text-2xl tracking-[0.2em] text-center uppercase outline-none focus:border-pb-500"
              placeholder="ABCDE"
              maxLength={8}
              value={joinInput}
              onChange={e => setJoinInput(e.target.value)}
            />
            {setupError && <p className="text-red-400 text-sm text-center">{setupError}</p>}
            <button disabled={busy || !joinInput.trim()} onClick={joinSession}
              className="tap-btn w-full bg-vr-600 text-white font-bold py-4 rounded-xl text-base disabled:opacity-50">
              Join
            </button>
            <button onClick={() => setSetupStep('choose')} className="tap-btn text-gray-500 text-sm">← Back</button>
          </div>
        )}
      </div>
    )
  }

  // ── Drill screen ──────────────────────────────────────────────────────────

  const showPanel: Role = mode === 'solo' ? panel : mode

  const otherRepCount = (() => {
    if (mode === 'solo' || !remoteOther) return null
    const otherRole: Role = mode === 'servers' ? 'passers' : 'servers'
    return Object.values(remoteOther).reduce(
      (n, ps) => n + (otherRole === 'servers' ? ps.serveAttempts : ps.passAttempts), 0
    )
  })()

  return (
    <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0 gap-2">
        <button onClick={onCancel} className="tap-btn text-gray-400 text-sm">Cancel</button>
        <p className="flex-1 text-center text-white font-bold text-sm truncate px-2">{name}</p>
        <button onClick={finish} className="tap-btn text-vr-300 font-bold text-sm">End</button>
      </div>

      {mode !== 'solo' && (
        <div className="px-4 py-2 bg-navy-800/60 border-b border-white/5 flex items-center justify-between shrink-0">
          <span className="text-gray-500 text-xs">
            🔗 Code <strong className="text-gray-300">{code}</strong> · tracking {mode === 'servers' ? 'Servers' : 'Passers'}
          </span>
          <span className="text-gray-500 text-xs">
            {otherRepCount !== null ? `${mode === 'servers' ? 'Passers' : 'Servers'}: ${otherRepCount} reps` : 'waiting for other iPad…'}
          </span>
        </div>
      )}

      {mode === 'solo' && (
        <div className="flex shrink-0 border-b border-white/10">
          {(['servers', 'passers'] as Role[]).map(r => (
            <button key={r} onClick={() => setPanel(r)}
              className={`tap-btn flex-1 py-3 text-sm font-bold ${panel === r ? 'text-vr-300 border-b-2 border-vr-500' : 'text-gray-500'}`}>
              {r === 'servers' ? '🎾 Servers' : '🙌 Passers'}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 pb-8">
        {showPanel === 'servers' ? (
          players.map(p => {
            const ps = stats[p.id] ?? EMPTY_STATS()
            const pct = ps.serveAttempts > 0 ? Math.round(((ps.serveAttempts - ps.serveErrors) / ps.serveAttempts) * 100) : null
            return (
              <div key={p.id} className="bg-navy-800 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">#{p.number} {p.name}</p>
                  <p className="text-gray-500 text-xs">
                    {ps.serveAttempts} srv · {ps.aces} ace{ps.aces === 1 ? '' : 's'} · {ps.serveErrors} err
                    {pct !== null && ` · ${pct}%`}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button onClick={() => bumpServe(p.id, 'ace')}
                    className="tap-btn px-3 py-2.5 rounded-xl text-xs font-bold bg-yellow-900/40 border border-yellow-600/50 text-yellow-300">
                    Ace
                  </button>
                  <button onClick={() => bumpServe(p.id, 'in')}
                    className="tap-btn px-3 py-2.5 rounded-xl text-xs font-bold bg-navy-700 border border-white/10 text-gray-300">
                    In
                  </button>
                  <button onClick={() => bumpServe(p.id, 'error')}
                    className="tap-btn px-3 py-2.5 rounded-xl text-xs font-bold bg-red-900/40 border border-red-600/50 text-red-300">
                    Err
                  </button>
                </div>
              </div>
            )
          })
        ) : (
          players.map(p => {
            const ps = stats[p.id] ?? EMPTY_STATS()
            const avg = ps.passAttempts > 0 ? (ps.passRatingTotal / ps.passAttempts).toFixed(1) : '—'
            return (
              <div key={p.id} className="bg-navy-800 border border-white/10 rounded-2xl p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">#{p.number} {p.name}</p>
                  <p className="text-gray-500 text-xs">{avg} avg · {ps.passAttempts} pass{ps.passAttempts === 1 ? '' : 'es'}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  {PASS_RATINGS.map(r => (
                    <button key={r.value} onClick={() => bumpPass(p.id, r.value)}
                      className={`tap-btn w-9 h-9 rounded-xl text-sm font-black border ${r.color}`}>
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
