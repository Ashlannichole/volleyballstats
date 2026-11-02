import { useState } from 'react'
import type { Player, PlayerStats, SetStats, PracticeSession, SavedLineup } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'
import { passAvg, killPct } from '../utils/statsHelpers'
import { loadLineups } from '../utils/storage'

interface Props {
  players: Player[]
  onSave: (s: PracticeSession) => void
  onCancel: () => void
}

// Binary pass call, stored on the same 0-3 scale the rest of the app uses for
// passAttempts/passRatingTotal so "Pass Avg" reads consistently everywhere.
const GOOD_PASS_RATING = 3
const BAD_PASS_RATING = 0

const COURT_LAYOUT = [
  [3, 2, 1], // front row: P4 P3 P2
  [4, 5, 0], // back row:  P5 P6 P1
]
const POSITION_NUMS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

interface StatCard {
  label: string
  count: number
  onClick: () => void
  style: string
}

type Side = 'A' | 'B'

export default function ThreeBallDrill({ players, onSave, onCancel }: Props) {
  const [name, setName] = useState('3-Ball Scrimmage')
  const [stats, setStats] = useState<SetStats>(() => {
    const s: SetStats = {}
    for (const p of players) s[p.id] = EMPTY_STATS()
    return s
  })
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Which 6 girls are shown on the court grid for this iPad. Not required
  // to be filled before starting — tap any slot anytime to assign/swap.
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null, null, null, null])
  const [pickingSlot, setPickingSlot] = useState<number | null>(null)
  const [showLineupPicker, setShowLineupPicker] = useState(false)
  const [savedLineups] = useState<SavedLineup[]>(loadLineups)

  // Two-coach pairing: 'A' creates and gets a code, 'B' joins with it. Each
  // side tracks only the players they've assigned to their own 6 slots;
  // ending merges both sides' stats into one combined session, same pattern
  // as the paired scrimmage.
  const [showPairPanel, setShowPairPanel] = useState(false)
  const [pairCode, setPairCode] = useState<string | null>(null)
  const [pairSide, setPairSide] = useState<Side | null>(null)
  const [pairStep, setPairStep] = useState<'choose' | 'join'>('choose')
  const [pairJoinInput, setPairJoinInput] = useState('')
  const [pairBusy, setPairBusy] = useState(false)
  const [pairError, setPairError] = useState('')
  const [endingBusy, setEndingBusy] = useState(false)

  const onCourtIds = new Set(slots.filter(Boolean) as string[])
  // Paired mode only tracks this side's own girls — no bench of the other
  // coach's players. Solo mode keeps the full roster reachable as before.
  const bench = pairCode ? [] : players.filter(p => !onCourtIds.has(p.id))
  const benchAlphabetical = [...bench].sort((a, b) => a.name.localeCompare(b.name))

  function assignSlot(slot: number, playerId: string | null) {
    setSlots(prev => {
      const next = [...prev]
      if (playerId) {
        const existing = next.indexOf(playerId)
        if (existing !== -1) next[existing] = next[slot]
      }
      next[slot] = playerId
      return next
    })
    setPickingSlot(null)
  }

  function loadLineup(l: SavedLineup) {
    setSlots([...l.slots])
    setShowLineupPicker(false)
  }

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

  // ── Pairing ──────────────────────────────────────────────────────────────

  async function createPairedSession() {
    setPairBusy(true); setPairError('')
    try {
      const res = await fetch('/api/three-ball-pair?action=create', { method: 'POST' })
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
      const json = await res.json() as { code: string }
      setPairCode(json.code)
      setPairSide('A')
    } catch (e) {
      setPairError(e instanceof Error ? e.message : 'Could not start a paired session.')
    } finally {
      setPairBusy(false)
    }
  }

  async function joinPairedSession() {
    const code = pairJoinInput.trim().toUpperCase()
    if (!code) return
    setPairBusy(true); setPairError('')
    try {
      const res = await fetch('/api/three-ball-pair?action=join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || `HTTP ${res.status}`)
      setPairCode(code)
      setPairSide('B')
    } catch (e) {
      setPairError(e instanceof Error ? e.message : 'Could not join that session.')
    } finally {
      setPairBusy(false)
    }
  }

  function unpair() {
    setPairCode(null); setPairSide(null); setPairStep('choose'); setPairJoinInput(''); setPairError('')
  }

  async function finish() {
    let combined = stats
    if (pairCode && pairSide) {
      // `stats` has a blank placeholder entry for every roster player (not
      // just this side's 6), since it's initialized from the full roster.
      // Narrow to just the players actually on this side's court before
      // pushing/merging — otherwise a blank placeholder for one of the
      // OTHER coach's players would overwrite her real pushed stats below.
      const ownOnCourt = Object.fromEntries(
        Object.entries(stats).filter(([pid]) => onCourtIds.has(pid))
      )
      combined = ownOnCourt
      setEndingBusy(true)
      try {
        await fetch('/api/three-ball-pair?action=push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: pairCode, side: pairSide, stats: ownOnCourt }),
        })
        const res = await fetch(`/api/three-ball-pair?action=pull&code=${pairCode}`)
        if (res.ok) {
          const json = await res.json() as { a: { stats: SetStats } | null; b: { stats: SetStats } | null }
          const other = pairSide === 'A' ? json.b : json.a
          if (other) combined = { ...other.stats, ...ownOnCourt }
        }
      } catch {
        // Offline / other coach hasn't pushed yet — fall back to this side's own stats.
      } finally {
        setEndingBusy(false)
      }
    }
    onSave({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: name.trim() || '3-Ball Scrimmage',
      teamLabel: '',
      notes: '',
      scrimmages: [combined],
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
  const playerById = Object.fromEntries(players.map(p => [p.id, p]))

  return (
    <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0 gap-2">
        <button onClick={onCancel} className="tap-btn text-gray-400 text-sm">Cancel</button>
        <input value={name} onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent text-center text-white font-bold text-sm outline-none truncate px-2" />
        <button onClick={() => setShowPairPanel(true)}
          className={`tap-btn text-xs font-bold px-2 py-1 rounded-lg ${pairCode ? 'bg-vr-700 text-white' : 'bg-navy-600 border border-white/10 text-gray-400'}`}>
          {pairCode ? `🔗 ${pairCode}` : '🔗'}
        </button>
        <button onClick={finish} disabled={endingBusy} className="tap-btn text-vr-300 font-bold text-sm disabled:opacity-50">
          {endingBusy ? 'Ending…' : 'End'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-3 flex flex-col gap-2 pb-8">
        <p className="text-gray-600 text-[11px] text-center -mt-1 mb-1">Tap a player on court, then tap what happened</p>

        <div className="bg-navy-800 border border-white/10 rounded-2xl p-3 mb-1">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px bg-pb-600/40" />
            <span className="text-pb-500/60 text-[10px] font-bold uppercase tracking-widest">Net</span>
            <div className="flex-1 h-px bg-pb-600/40" />
          </div>
          {COURT_LAYOUT.map((row, rowIdx) => (
            <div key={rowIdx} className={`grid grid-cols-3 gap-2 ${rowIdx === 0 ? 'mb-2' : ''}`}>
              {row.map(slotIdx => {
                const pid = slots[slotIdx]
                const p = pid ? playerById[pid] : null
                return (
                  <div key={slotIdx} className="relative">
                    <button
                      onClick={() => p ? setExpandedId(p.id) : setPickingSlot(slotIdx)}
                      className={`tap-btn w-full rounded-xl p-2 min-h-[80px] flex flex-col items-center justify-center border-2 ${
                        p ? 'bg-navy-700 border-vr-500/50' : 'bg-navy-900/60 border-dashed border-white/10'
                      }`}>
                      <span className="text-white/20 text-[10px] mb-1">{POSITION_NUMS[slotIdx]}</span>
                      {p ? (
                        <>
                          <span className="text-pb-400 font-black text-sm">#{p.number}</span>
                          <span className="text-white text-xs font-medium truncate w-full text-center leading-tight mt-0.5">{p.name.split(' ')[0]}</span>
                          <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full text-white mt-0.5 ${POSITION_COLORS[p.position]}`}>
                            {POSITION_LABELS[p.position]}
                          </span>
                        </>
                      ) : (
                        <span className="text-white/20 text-lg">+</span>
                      )}
                    </button>
                    {p && (
                      <button onClick={() => setPickingSlot(slotIdx)}
                        className="tap-btn absolute top-1 right-1 w-5 h-5 rounded-full bg-navy-900/80 border border-white/20 text-gray-400 text-[10px] flex items-center justify-center">
                        ⇄
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          <button onClick={() => setShowLineupPicker(true)}
            className="tap-btn w-full mt-2 text-vr-300 text-xs font-semibold border border-vr-600/40 rounded-xl py-1.5">
            Load Saved Lineup
          </button>
        </div>

        {bench.length > 0 && (
          <>
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest px-1 mt-2">Bench</p>
            {benchAlphabetical.map(p => {
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
          </>
        )}
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

      {pickingSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setPickingSlot(null)}>
          <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto overscroll-y-contain" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-lg">Assign to {POSITION_NUMS[pickingSlot]}</h3>
              <button onClick={() => setPickingSlot(null)} className="text-gray-400 text-2xl tap-btn">×</button>
            </div>
            <button onClick={() => assignSlot(pickingSlot, null)}
              className="tap-btn w-full bg-navy-700 border border-red-500/20 rounded-xl p-3 text-left text-red-400 text-sm mb-2">
              Remove / leave empty
            </button>
            {players.map(p => {
              const isElsewhere = onCourtIds.has(p.id) && slots[pickingSlot!] !== p.id
              return (
                <button key={p.id} onClick={() => assignSlot(pickingSlot!, p.id)}
                  className={`tap-btn w-full border rounded-xl p-3 flex items-center gap-3 mb-1.5 ${
                    slots[pickingSlot!] === p.id ? 'bg-vr-800 border-vr-500' : 'bg-navy-700 border-white/10'
                  }`}>
                  <span className="text-pb-400 font-bold text-base">#{p.number}</span>
                  <span className="text-white font-medium flex-1">{p.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                    {POSITION_LABELS[p.position]}
                  </span>
                  {isElsewhere && (
                    <span className="text-yellow-500 text-xs">{POSITION_NUMS[slots.indexOf(p.id)]}</span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {showLineupPicker && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setShowLineupPicker(false)}>
          <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto overscroll-y-contain" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-lg">Load Saved Lineup</h3>
              <button onClick={() => setShowLineupPicker(false)} className="text-gray-400 text-2xl tap-btn">×</button>
            </div>
            {savedLineups.length === 0 ? (
              <p className="text-gray-500 text-sm">No saved lineups yet — save or import one from the Live tab's Lineup &amp; Rotations panel first.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {savedLineups.map(l => (
                  <button key={l.id} onClick={() => loadLineup(l)}
                    className="tap-btn w-full bg-navy-700 border border-vr-600/40 text-vr-300 text-sm font-semibold rounded-xl p-3 text-left">
                    {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showPairPanel && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setShowPairPanel(false)}>
          <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto overscroll-y-contain" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-lg">Pair With Another iPad</h3>
              <button onClick={() => setShowPairPanel(false)} className="text-gray-400 text-2xl tap-btn">×</button>
            </div>
            <p className="text-gray-500 text-xs mb-3">Each iPad tracks its own 6 girls on the court grid — ending the drill on either iPad merges both sides into one session.</p>
            {!pairCode ? (
              pairStep === 'choose' ? (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={createPairedSession} disabled={pairBusy}
                    className="tap-btn py-3 rounded-xl font-bold text-sm border-2 bg-navy-700 border-white/10 text-gray-300 disabled:opacity-50">
                    Create Session
                  </button>
                  <button onClick={() => { setPairStep('join'); setPairError('') }} disabled={pairBusy}
                    className="tap-btn py-3 rounded-xl font-bold text-sm border-2 bg-navy-700 border-white/10 text-gray-300 disabled:opacity-50">
                    Join Session
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    className="flex-1 bg-navy-700 border border-white/20 rounded-xl px-3 py-3 text-white text-lg tracking-[0.15em] text-center uppercase outline-none focus:border-pb-500"
                    placeholder="CODE" maxLength={8}
                    value={pairJoinInput}
                    onChange={e => setPairJoinInput(e.target.value)}
                  />
                  <button onClick={joinPairedSession} disabled={pairBusy || !pairJoinInput.trim()}
                    className="tap-btn px-5 rounded-xl font-bold text-sm bg-vr-700 text-white disabled:opacity-50">
                    Join
                  </button>
                  <button onClick={() => setPairStep('choose')} className="tap-btn text-gray-500 text-xs px-2">←</button>
                </div>
              )
            ) : (
              <div className="flex items-center gap-2 bg-navy-700 border border-vr-500/40 rounded-xl px-3 py-2.5">
                <span className="text-green-400 text-xs">🔗</span>
                <span className="text-white text-sm font-bold">Paired · code {pairCode}</span>
                <button onClick={unpair} className="tap-btn ml-auto text-gray-500 text-xs underline">Unpair</button>
              </div>
            )}
            {pairError && <p className="text-red-400 text-xs mt-1.5">{pairError}</p>}
            {pairCode && (
              <p className="text-gray-500 text-xs mt-2">
                {pairSide === 'A'
                  ? "Share this code with the other coach's iPad — they tap \"Join Session\" and enter it."
                  : "Joined! When either of you ends the drill, both sides' stats combine into one session."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
