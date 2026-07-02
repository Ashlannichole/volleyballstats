import { useState, useEffect, useRef } from 'react'

interface MatchState {
  code: string
  opponent: string
  ourScore: number
  theirScore: number
  setNumber: number
  rotation: (string | null)[]
  weAreServing: boolean
  updatedAt: number
  ended?: boolean
}

const COURT_LAYOUT = [
  [3, 2, 1], // front: P4 P3 P2
  [4, 5, 0], // back:  P5 P6 P1
]

function getCode() {
  const params = new URLSearchParams(window.location.search)
  return params.get('code') ?? ''
}

export default function SpectatorView() {
  const [state, setState] = useState<MatchState | null>(null)
  const [error, setError] = useState('')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
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

  if (!code || error) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center p-6 gap-4">
        <div className="text-5xl">🏐</div>
        <p className="text-white font-bold text-lg text-center">Viking Roots Volleyball</p>
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

  const secondsSince = lastUpdate ? Math.floor((Date.now() - lastUpdate.getTime()) / 1000) : 0

  return (
    <div className="min-h-screen bg-navy-900 flex flex-col">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <circle cx="16" cy="16" r="16" fill="#4a1d8a" />
            <text x="16" y="22" textAnchor="middle" fontSize="18" fill="#87cde3">⚔</text>
          </svg>
          <span className="text-white font-bold text-sm">Viking Roots</span>
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

      {/* Scoreboard */}
      <div className="px-4 pt-6 pb-4">
        <p className="text-gray-500 text-xs text-center uppercase tracking-widest mb-3">Set {state.setNumber}</p>

        <div className="flex items-center justify-center gap-6">
          {/* Us */}
          <div className="flex-1 text-center">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-1">Viking Roots</p>
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
      <div className="px-4 pt-2 pb-6 flex-1">
        <p className="text-gray-500 text-xs text-center uppercase tracking-widest mb-3">Current Rotation</p>

        <div className="max-w-xs mx-auto bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
          {/* Net */}
          <div className="w-full h-1.5 bg-gradient-to-r from-vr-800 via-vr-500 to-vr-800" />

          {COURT_LAYOUT.map((row, rowIdx) => (
            <div key={rowIdx} className={`grid grid-cols-3 gap-2 p-3 ${rowIdx === 0 ? 'border-b border-white/10' : ''}`}>
              {row.map(slotIdx => {
                const name = state.rotation[slotIdx]
                const isBackRow = rowIdx === 1
                return (
                  <div key={slotIdx}
                    className={`rounded-xl py-3 px-2 text-center ${
                      isBackRow ? 'bg-navy-700/60' : 'bg-vr-900/40 border border-vr-700/30'
                    }`}>
                    <p className="text-white font-semibold text-sm leading-tight truncate">
                      {name ? name.split(' ')[0] : '—'}
                    </p>
                    <p className="text-gray-600 text-[9px] mt-0.5">
                      P{slotIdx + 1}
                    </p>
                  </div>
                )
              })}
            </div>
          ))}

          <div className="px-3 pb-2 text-center">
            <p className="text-gray-700 text-[10px]">← Opponent side · Our side →</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="py-3 text-center border-t border-white/5">
        <p className="text-gray-700 text-xs">
          {state.ended
            ? 'Match ended'
            : `Updated ${secondsSince < 5 ? 'just now' : `${secondsSince}s ago`}`}
        </p>
      </div>
    </div>
  )
}
