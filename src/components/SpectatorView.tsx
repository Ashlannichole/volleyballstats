import { useState, useEffect, useRef } from 'react'

interface MatchState {
  code: string
  teamName?: string
  opponent: string
  ourScore: number
  theirScore: number
  setNumber: number
  rotation: (string | null)[]
  weAreServing: boolean
  previousSets: { our: number; their: number }[]
  updatedAt: number
  ended?: boolean
  sponsors?: string[]
  timeout?: { team: 'us' | 'them'; takenAt: number } | null
}

const COURT_LAYOUT = [
  [3, 2, 1], // front row (near net): P4 P3 P2
  [4, 5, 0], // back row:             P5 P6 P1
]

function getCode() {
  return new URLSearchParams(window.location.search).get('code') ?? ''
}

export default function SpectatorView() {
  const [state, setState] = useState<MatchState | null>(null)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [sponsorIdx, setSponsorIdx] = useState(0)
  const [now, setNow] = useState(Date.now())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const code = getCode()

  async function fetchState() {
    if (!code) return
    try {
      const res = await fetch(`/api/spectator-get?code=${encodeURIComponent(code)}`)
      if (res.status === 404) { setError('Match not found. The link may have expired.'); return }
      if (!res.ok) { setError('Unable to load match.'); return }
      const data: MatchState = await res.json()
      setState(data)
      setLastUpdate(new Date())
      setError('')
    } catch {
      setError('Connection error — retrying…')
    }
  }

  useEffect(() => {
    if (!code) { setError('No match code in URL.'); return }
    fetchState()
    intervalRef.current = setInterval(fetchState, 5000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [code])

  // Tick every second while a timeout banner is active so it hides at exactly 30s
  const timeoutActive = !!(state?.timeout && (now - state.timeout.takenAt) < 30_000)
  useEffect(() => {
    if (!timeoutActive) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [timeoutActive])

  const sponsors = state?.sponsors ?? []
  useEffect(() => {
    if (sponsors.length <= 1) return
    const t = setInterval(() => setSponsorIdx(i => (i + 1) % sponsors.length), 3000)
    return () => clearInterval(t)
  }, [sponsors.length])

  if (!code || error) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-6 gap-4">
        <div className="text-5xl">🏐</div>
        <p className="text-white font-bold text-lg text-center">Volleyball Stats</p>
        <p className="text-red-400 text-sm text-center">{error || 'No match code provided.'}</p>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-vr-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading live match…</p>
      </div>
    )
  }

  const displayName = state.teamName ?? 'Home Team'
  const secondsSince = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : 0
  const prev = state.previousSets ?? []

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-vr-700 flex items-center justify-center text-xs">🏐</div>
          <span className="text-white font-bold text-sm">{displayName}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {state.ended ? (
            <span className="text-gray-400 text-xs font-bold">FINAL</span>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-green-400 text-xs font-bold">LIVE</span>
            </>
          )}
        </div>
      </div>

      {/* Timeout banner */}
      {timeoutActive && state?.timeout && (
        <div className="bg-yellow-500 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⏸</span>
            <div>
              <p className="text-black font-black text-base leading-tight">TIMEOUT</p>
              <p className="text-black/70 text-sm font-semibold">
                {state.timeout.team === 'us' ? (state.teamName ?? 'Home Team') : state.opponent}
              </p>
            </div>
          </div>
          <div className="text-black/60 text-sm font-bold tabular-nums">
            {Math.max(0, 30 - Math.floor((now - state.timeout.takenAt) / 1000))}s
          </div>
        </div>
      )}

      {/* Previous sets */}
      {prev.length > 0 && (
        <div className="px-4 pt-4">
          <p className="text-gray-600 text-[10px] uppercase tracking-widest text-center mb-2">Previous Sets</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {prev.map((s, i) => {
              const weWon = s.our > s.their
              return (
                <div key={i} className="bg-navy-800 border border-white/10 rounded-xl px-4 py-2 text-center min-w-[100px]">
                  <p className="text-gray-500 text-[10px] font-bold uppercase mb-1">Set {i + 1}</p>
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-center">
                      <p className={`font-black text-lg leading-none ${weWon ? 'text-white' : 'text-gray-500'}`}>{s.our}</p>
                      <p className="text-[9px] text-gray-600 mt-0.5 flex items-center gap-0.5">
                        {displayName.split(' ')[0]} {weWon && <span className="text-vr-400">✓</span>}
                      </p>
                    </div>
                    <span className="text-gray-600 text-sm">–</span>
                    <div className="text-center">
                      <p className={`font-black text-lg leading-none ${!weWon ? 'text-white' : 'text-gray-500'}`}>{s.their}</p>
                      <p className="text-[9px] text-gray-600 mt-0.5 flex items-center gap-0.5">
                        {!weWon && <span className="text-gray-400">✓</span>} {state.opponent.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Scoreboard */}
      <div className="px-4 pt-4 pb-4">
        <p className="text-gray-500 text-xs text-center uppercase tracking-widest mb-3">
          {state.ended ? 'Final Score' : `Set ${state.setNumber}`}
        </p>

        <div className="flex items-center justify-center gap-6">
          {/* Us */}
          <div className="flex-1 text-center">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">{displayName}</p>
            <p className={`text-7xl font-black ${state.weAreServing ? 'text-white' : 'text-gray-500'}`}>
              {state.ourScore}
            </p>
            {state.weAreServing && (
              <p className="text-pb-400 text-xs font-bold mt-1">🏐 Serving</p>
            )}
          </div>

          <div className="text-gray-600 text-3xl font-light">–</div>

          {/* Them */}
          <div className="flex-1 text-center">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">{state.opponent}</p>
            <p className={`text-7xl font-black ${!state.weAreServing ? 'text-white' : 'text-gray-500'}`}>
              {state.theirScore}
            </p>
            {!state.weAreServing && (
              <p className="text-red-400 text-xs font-bold mt-1">🏐 Serving</p>
            )}
          </div>
        </div>
      </div>

      {/* Court rotation */}
      {!state.ended && (
        <div className="px-4 pb-6 flex-1">
          <p className="text-gray-500 text-xs text-center uppercase tracking-widest mb-3">Current Rotation</p>

          <div className="max-w-xs mx-auto bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
            {/* Net bar */}
            <div className="w-full h-1.5 bg-gradient-to-r from-vr-800 via-vr-500 to-vr-800" />

            {COURT_LAYOUT.map((row, rowIdx) => (
              <div key={rowIdx} className={`grid grid-cols-3 gap-2 p-3 ${rowIdx === 0 ? 'border-b border-white/10' : ''}`}>
                {row.map(slotIdx => {
                  const name = state.rotation[slotIdx]
                  const isFrontRow = rowIdx === 0
                  return (
                    <div key={slotIdx}
                      className={`rounded-xl py-3 px-2 text-center ${
                        isFrontRow ? 'bg-vr-900/40 border border-vr-700/30' : 'bg-navy-700/60'
                      }`}>
                      <p className="text-white font-semibold text-sm leading-tight truncate">
                        {name ? name.split(' ')[0] : '—'}
                      </p>
                      <p className="text-gray-600 text-[9px] mt-0.5">P{slotIdx + 1}</p>
                    </div>
                  )
                })}
              </div>
            ))}

          </div>
        </div>
      )}

      {/* Sponsor strip */}
      {(state.sponsors ?? []).length > 0 && (
        <div className="border-t border-white/5 py-3 px-4 text-center">
          <p className="text-gray-600 text-[9px] uppercase tracking-widest mb-1">Thank you to our sponsors</p>
          <p key={sponsorIdx} className="text-gray-400 text-sm font-semibold animate-pulse">
            {(state.sponsors ?? [])[sponsorIdx]}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="py-2 text-center border-t border-white/5">
        <p className="text-gray-700 text-xs">
          {state.ended
            ? 'Match ended'
            : `Updated ${secondsSince < 5 ? 'just now' : `${secondsSince}s ago`}`}
        </p>
      </div>
    </div>
  )
}
