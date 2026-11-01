import { useState } from 'react'
import type { Player, PlayerStats, SetStats, PracticeSession } from '../types'
import { EMPTY_STATS } from '../types'
import { passAvg, killPct } from '../utils/statsHelpers'

interface Props {
  players: Player[]
  onSave: (s: PracticeSession) => void
  onCancel: () => void
}

// Binary pass call, stored on the same 0-3 scale the rest of the app uses for
// passAttempts/passRatingTotal so "Pass Avg" reads consistently everywhere.
const GOOD_PASS_RATING = 3
const BAD_PASS_RATING = 0

interface StatCard {
  label: string
  count: number
  onClick: () => void
  style: string
}

export default function ThreeBallDrill({ players, onSave, onCancel }: Props) {
  const [name, setName] = useState('3-Ball Scrimmage')
  const [stats, setStats] = useState<SetStats>(() => {
    const s: SetStats = {}
    for (const p of players) s[p.id] = EMPTY_STATS()
    return s
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)

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

  // Every tap counts as an attack attempt (kill and error included), same
  // pattern as serve's In/Ace/Miss, so hitting% is accurate from this drill.
  function bumpAttack(playerId: string, outcome: 'kill' | 'attempt' | 'error') {
    setStats(prev => {
      const ps = prev[playerId] ?? EMPTY_STATS()
      return {
        ...prev,
        [playerId]: {
          ...ps,
          attackAttempts: ps.attackAttempts + 1,
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

  // Every pass tap in this drill is either GOOD_PASS_RATING or
  // BAD_PASS_RATING, so the two tap counts can be recovered from the
  // totals already stored — no extra fields needed.
  function statCards(p: Player, ps: PlayerStats): StatCard[] {
    const goodPasses = ps.passRatingTotal / GOOD_PASS_RATING
    const badPasses = ps.passAttempts - goodPasses
    const serveIn = ps.serveAttempts - ps.aces - ps.serveErrors
    const attackInPlay = ps.attackAttempts - ps.kills - ps.attackErrors
    const green = 'bg-green-900/40 border-green-600/50 text-green-300'
    const red = 'bg-red-900/40 border-red-600/50 text-red-300'
    const yellow = 'bg-yellow-900/40 border-yellow-600/50 text-yellow-300'
    const neutral = 'bg-navy-700 border-white/10 text-gray-300'
    return [
      { label: 'Good Pass',    count: goodPasses,    onClick: () => bumpPass(p.id, GOOD_PASS_RATING), style: green },
      { label: 'Bad Pass',     count: badPasses,      onClick: () => bumpPass(p.id, BAD_PASS_RATING),  style: red },
      { label: 'Serve In',     count: serveIn,        onClick: () => bumpServe(p.id, 'in'),            style: neutral },
      { label: 'Ace',          count: ps.aces,        onClick: () => bumpServe(p.id, 'ace'),           style: yellow },
      { label: 'Serve Error',  count: ps.serveErrors, onClick: () => bumpServe(p.id, 'miss'),          style: red },
      { label: 'Kill',         count: ps.kills,       onClick: () => bumpAttack(p.id, 'kill'),         style: green },
      { label: 'Attack (in play)', count: attackInPlay, onClick: () => bumpAttack(p.id, 'attempt'),    style: neutral },
      { label: 'Hitting Error', count: ps.attackErrors, onClick: () => bumpAttack(p.id, 'error'),      style: red },
    ]
  }

  const expandedPlayer = expandedId ? players.find(p => p.id === expandedId) ?? null : null

  return (
    <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0 gap-2">
        <button onClick={onCancel} className="tap-btn text-gray-400 text-sm">Cancel</button>
        <input value={name} onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent text-center text-white font-bold text-sm outline-none truncate px-2" />
        <button onClick={finish} className="tap-btn text-vr-300 font-bold text-sm">End</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 pb-8">
        <p className="text-gray-600 text-[11px] text-center -mt-1 mb-1">Tap a player, then tap what happened</p>
        {alphabetical.map(p => {
          const ps = stats[p.id] ?? EMPTY_STATS()
          return (
            <button key={p.id} onClick={() => setExpandedId(p.id)}
              className="tap-btn w-full bg-navy-800 border border-white/10 rounded-2xl p-3 text-left flex items-center justify-between gap-2">
              <p className="text-white font-bold text-sm truncate">#{p.number} {p.name}</p>
              <p className="text-gray-500 text-[11px] shrink-0">
                {passAvg(ps)} PA · {ps.kills}K {ps.attackErrors}E {killPct(ps)} · {ps.aces}A {ps.serveErrors}SE
              </p>
            </button>
          )
        })}
      </div>

      {expandedPlayer && (() => {
        const ps = stats[expandedPlayer.id] ?? EMPTY_STATS()
        return (
          <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setExpandedId(null)}>
            <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto overscroll-y-contain" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-lg">#{expandedPlayer.number} {expandedPlayer.name}</h3>
                <button onClick={() => setExpandedId(null)} className="tap-btn text-vr-300 font-bold text-sm">Done</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {statCards(expandedPlayer, ps).map(card => (
                  <button key={card.label} onClick={card.onClick}
                    className={`tap-btn rounded-xl p-3 border text-left ${card.style}`}>
                    <p className="font-bold text-sm">{card.label}</p>
                    <p className="text-2xl font-black">{card.count}</p>
                  </button>
                ))}
              </div>
              <p className="text-gray-600 text-[10px] mt-3 text-center">
                Serve In, Ace and Serve Error all count as a serve attempt. Kill, Attack (in play) and Hitting Error all count as an attack.
              </p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
