import { useState } from 'react'
import type { Player, SetStats, PracticeSession } from '../types'
import { EMPTY_STATS } from '../types'
import { passAvg } from '../utils/statsHelpers'

interface Props {
  players: Player[]
  onSave: (s: PracticeSession) => void
  onCancel: () => void
}

// Binary pass call, stored on the same 0-3 scale the rest of the app uses for
// passAttempts/passRatingTotal so "Pass Avg" reads consistently everywhere.
const GOOD_PASS_RATING = 3
const BAD_PASS_RATING = 0

export default function ThreeBallDrill({ players, onSave, onCancel }: Props) {
  const [name, setName] = useState('3-Ball Scrimmage')
  const [stats, setStats] = useState<SetStats>(() => {
    const s: SetStats = {}
    for (const p of players) s[p.id] = EMPTY_STATS()
    return s
  })

  const alphabetical = [...players].sort((a, b) => a.name.localeCompare(b.name))

  function bumpPass(playerId: string, rating: number) {
    setStats(prev => {
      const ps = prev[playerId] ?? EMPTY_STATS()
      return { ...prev, [playerId]: { ...ps, passRatingTotal: ps.passRatingTotal + rating, passAttempts: ps.passAttempts + 1 } }
    })
  }

  function bumpServe(playerId: string, outcome: 'in' | 'ace' | 'miss') {
    setStats(prev => {
      const ps = prev[playerId] ?? EMPTY_STATS()
      return {
        ...prev,
        [playerId]: {
          ...ps,
          serveAttempts: ps.serveAttempts + 1,
          aces: ps.aces + (outcome === 'ace' ? 1 : 0),
          serveErrors: ps.serveErrors + (outcome === 'miss' ? 1 : 0),
        },
      }
    })
  }

  // Kills/errors are tracked as raw counts, same as the swipe-gesture
  // shortcut in the main live game — not tied to a separate "attempt" tap,
  // to keep this fast. (Attack % won't compute from this drill alone, same
  // tradeoff as the swipe shortcut already has elsewhere in the app.)
  function bumpAttack(playerId: string, outcome: 'kill' | 'error') {
    setStats(prev => {
      const ps = prev[playerId] ?? EMPTY_STATS()
      return {
        ...prev,
        [playerId]: {
          ...ps,
          kills: ps.kills + (outcome === 'kill' ? 1 : 0),
          attackErrors: ps.attackErrors + (outcome === 'error' ? 1 : 0),
        },
      }
    })
  }

  function finish() {
    onSave({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: name.trim() || '3-Ball Scrimmage',
      teamLabel: '',
      notes: '',
      scrimmages: [stats],
      drillType: 'three_ball',
    })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0 gap-2">
        <button onClick={onCancel} className="tap-btn text-gray-400 text-sm">Cancel</button>
        <input value={name} onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent text-center text-white font-bold text-sm outline-none truncate px-2" />
        <button onClick={finish} className="tap-btn text-vr-300 font-bold text-sm">End</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 pb-8">
        {alphabetical.map(p => {
          const ps = stats[p.id] ?? EMPTY_STATS()
          return (
            <div key={p.id} className="bg-navy-800 border border-white/10 rounded-2xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-white font-bold text-sm truncate">#{p.number} {p.name}</p>
                <p className="text-gray-500 text-[11px] shrink-0">
                  {passAvg(ps)} PA · {ps.kills}K {ps.attackErrors}E · {ps.aces}A {ps.serveErrors}SE
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <div className="flex gap-1">
                  <span className="text-gray-600 text-[9px] font-bold uppercase self-center mr-0.5">Pass</span>
                  <button onClick={() => bumpPass(p.id, GOOD_PASS_RATING)}
                    className="tap-btn px-2.5 py-1.5 rounded-lg text-xs font-bold bg-green-900/40 border border-green-600/50 text-green-300">
                    Good
                  </button>
                  <button onClick={() => bumpPass(p.id, BAD_PASS_RATING)}
                    className="tap-btn px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-900/40 border border-red-600/50 text-red-300">
                    Bad
                  </button>
                </div>
                <div className="flex gap-1">
                  <span className="text-gray-600 text-[9px] font-bold uppercase self-center mr-0.5">Serve</span>
                  <button onClick={() => bumpServe(p.id, 'in')}
                    className="tap-btn px-2.5 py-1.5 rounded-lg text-xs font-bold bg-navy-700 border border-white/10 text-gray-300">
                    In
                  </button>
                  <button onClick={() => bumpServe(p.id, 'ace')}
                    className="tap-btn px-2.5 py-1.5 rounded-lg text-xs font-bold bg-yellow-900/40 border border-yellow-600/50 text-yellow-300">
                    Ace
                  </button>
                  <button onClick={() => bumpServe(p.id, 'miss')}
                    className="tap-btn px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-900/40 border border-red-600/50 text-red-300">
                    Miss
                  </button>
                </div>
                <div className="flex gap-1">
                  <span className="text-gray-600 text-[9px] font-bold uppercase self-center mr-0.5">Attack</span>
                  <button onClick={() => bumpAttack(p.id, 'kill')}
                    className="tap-btn px-2.5 py-1.5 rounded-lg text-xs font-bold bg-green-900/40 border border-green-600/50 text-green-300">
                    Kill
                  </button>
                  <button onClick={() => bumpAttack(p.id, 'error')}
                    className="tap-btn px-2.5 py-1.5 rounded-lg text-xs font-bold bg-red-900/40 border border-red-600/50 text-red-300">
                    Error
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
