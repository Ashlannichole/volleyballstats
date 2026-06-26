import { useState } from 'react'
import type { Player, PlayerStats, SetStats, Match } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'

interface Props {
  players: Player[]
  onSaveMatch: (match: Match) => void
}

// The 6 court positions, laid out as the team sees the court (front row L→R, back row L→R)
// [4][3][2]
// [5][6][1]
const COURT_LAYOUT = [
  [3, 2, 1], // front row: positions 4, 3, 2 (index 3,2,1)
  [4, 5, 0], // back row: positions 5, 6, 1 (index 4,5,0)
]
const POSITION_NUMS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

interface StatChipDef {
  key: keyof PlayerStats
  label: string
  color: string
  bg: string
}

const CHIP_ROWS: StatChipDef[][] = [
  [
    { key: 'kills',          label: 'KILL', color: 'text-green-300',  bg: 'bg-green-900/40 border-green-600/40' },
    { key: 'attackErrors',   label: 'ERR',  color: 'text-red-300',    bg: 'bg-red-900/40 border-red-600/40' },
    { key: 'attackAttempts', label: 'ATT',  color: 'text-pb-300',     bg: 'bg-pb-900/20 border-pb-600/30' },
    { key: 'aces',           label: 'ACE',  color: 'text-yellow-300', bg: 'bg-yellow-900/30 border-yellow-600/30' },
  ],
  [
    { key: 'digs',           label: 'DIG',  color: 'text-cyan-300',   bg: 'bg-cyan-900/30 border-cyan-600/30' },
    { key: 'soloBlocks',     label: 'BS',   color: 'text-vr-300',     bg: 'bg-vr-900/30 border-vr-600/30' },
    { key: 'settingAssists', label: 'AST',  color: 'text-orange-300', bg: 'bg-orange-900/30 border-orange-600/30' },
    { key: 'serveErrors',    label: 'SE',   color: 'text-red-400',    bg: 'bg-red-900/30 border-red-700/30' },
  ],
]

export default function LiveGame({ players, onSaveMatch }: Props) {
  const [gameStarted, setGameStarted] = useState(false)
  const [opponent, setOpponent] = useState('')

  // Score & timeouts (live during match)
  const [ourScore, setOurScore] = useState(0)
  const [theirScore, setTheirScore] = useState(0)
  const [ourTimeouts, setOurTimeouts] = useState(0)
  const [theirTimeouts, setTheirTimeouts] = useState(0)

  // Rotation: array of 6 player IDs (index = court slot), null = empty
  const [rotation, setRotation] = useState<(string | null)[]>([null, null, null, null, null, null])
  const [showRotationEditor, setShowRotationEditor] = useState(false)
  const [assigningSlot, setAssigningSlot] = useState<number | null>(null)

  // Per-set stats
  const [currentSet, setCurrentSet] = useState(0)
  const [sets, setSets] = useState<SetStats[]>([buildSetStats(players)])

  // Expanded player card for full stat entry
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)

  const [showEndDialog, setShowEndDialog] = useState(false)

  function buildSetStats(ps: Player[]): SetStats {
    const s: SetStats = {}
    for (const p of ps) s[p.id] = EMPTY_STATS()
    return s
  }

  function adjust(playerId: string, key: keyof PlayerStats, delta: number) {
    setSets(prev => prev.map((s, i) => {
      if (i !== currentSet) return s
      const ps = { ...s[playerId] }
      const val = Math.max(0, (ps[key] as number) + delta)
      return { ...s, [playerId]: { ...ps, [key]: val } }
    }))
  }

  function adjustPass(playerId: string, rating: number) {
    setSets(prev => prev.map((s, i) => {
      if (i !== currentSet) return s
      const ps = { ...s[playerId] }
      return { ...s, [playerId]: { ...ps, passRatingTotal: ps.passRatingTotal + rating, passAttempts: ps.passAttempts + 1 } }
    }))
  }

  function nextSet() {
    setSets(prev => [...prev, buildSetStats(players)])
    setCurrentSet(c => c + 1)
    setOurTimeouts(0)
    setTheirTimeouts(0)
  }

  function startGame() {
    if (!opponent.trim() || players.length === 0) return
    // Auto-fill rotation with first 6 players
    const initial: (string | null)[] = [...players.slice(0, 6).map(p => p.id)]
    while (initial.length < 6) initial.push(null)
    setRotation(initial)
    setSets([buildSetStats(players)])
    setGameStarted(true)
  }

  function rotateForward() {
    setRotation(prev => {
      const next = [...prev]
      const last = next.pop()!
      next.unshift(last)
      return next
    })
  }

  function rotateBack() {
    setRotation(prev => {
      const next = [...prev]
      const first = next.shift()!
      next.push(first)
      return next
    })
  }

  function assignPlayerToSlot(slot: number, playerId: string | null) {
    setRotation(prev => {
      const next = [...prev]
      // If player already in another slot, swap
      if (playerId) {
        const existing = next.indexOf(playerId)
        if (existing !== -1) next[existing] = next[slot]
      }
      next[slot] = playerId
      return next
    })
    setAssigningSlot(null)
  }

  function confirmEnd() {
    const match: Match = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      opponent: opponent.trim(),
      ourScore: String(ourScore),
      theirScore: String(theirScore),
      sets,
      notes: '',
    }
    onSaveMatch(match)
    setGameStarted(false)
    setOpponent('')
    setOurScore(0)
    setTheirScore(0)
    setOurTimeouts(0)
    setTheirTimeouts(0)
    setCurrentSet(0)
    setSets([buildSetStats(players)])
    setRotation([null, null, null, null, null, null])
    setShowEndDialog(false)
  }

  const setStats = sets[currentSet]

  // Bench = players not in rotation
  const onCourtIds = new Set(rotation.filter(Boolean) as string[])
  const benchPlayers = players.filter(p => !onCourtIds.has(p.id))

  // ── Pre-match screen ──────────────────────────────────────────────────────
  if (!gameStarted) {
    return (
      <div className="p-6 max-w-md mx-auto flex flex-col gap-5 mt-6">
        <div className="text-center">
          <p className="text-vr-400 text-xs font-bold uppercase tracking-widest mb-1">Viking Roots Volleyball</p>
          <h2 className="text-3xl font-bold text-white">New Match</h2>
        </div>
        {players.length === 0 && (
          <p className="text-yellow-400 text-center text-sm bg-yellow-900/20 rounded-xl p-3">
            Add players to your roster first.
          </p>
        )}
        <div>
          <label className="block text-gray-300 text-sm mb-1">Opponent</label>
          <input
            className="w-full bg-navy-700 border border-white/20 rounded-xl px-4 py-4 text-white text-xl outline-none focus:border-pb-500"
            placeholder="e.g. Lincoln 14U"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
          />
        </div>
        <button
          disabled={!opponent.trim() || players.length === 0}
          onClick={startGame}
          className="tap-btn w-full bg-vr-600 disabled:opacity-40 text-white font-bold py-5 rounded-2xl text-xl"
        >
          Start Match
        </button>
      </div>
    )
  }

  // ── Live match view ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-navy-900 select-none">

      {/* ── SCOREBOARD ─────────────────────────────────────────────────────── */}
      <div className="bg-navy-800 border-b border-white/10 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">

          {/* Viking Roots side */}
          <div className="flex-1 flex flex-col items-center">
            <p className="text-pb-400 text-xs font-bold tracking-wide truncate">VIKING ROOTS</p>
            <div className="flex items-center gap-2 mt-0.5">
              {/* Timeouts */}
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <button key={i} onClick={() => setOurTimeouts(t => t === i + 1 ? i : i + 1)}
                    className={`tap-btn w-3 h-3 rounded-full border ${i < ourTimeouts ? 'bg-vr-500 border-vr-400' : 'bg-transparent border-white/30'}`}
                  />
                ))}
              </div>
              {/* Score */}
              <button onClick={() => setOurScore(s => s + 1)}
                className="tap-btn text-4xl font-black text-white leading-none w-14 text-center">
                {String(ourScore).padStart(2, '0')}
              </button>
              <button onClick={() => setOurScore(s => Math.max(0, s - 1))}
                className="tap-btn text-gray-600 text-xs px-1 py-1">−</button>
            </div>
          </div>

          {/* Center info */}
          <div className="flex flex-col items-center shrink-0 px-1">
            <div className="flex gap-1 mb-1">
              {sets.map((_, i) => (
                <button key={i} onClick={() => setCurrentSet(i)}
                  className={`tap-btn w-7 h-7 rounded-lg text-xs font-bold ${i === currentSet ? 'bg-vr-600 text-white' : 'bg-navy-600 text-gray-400'}`}>
                  S{i+1}
                </button>
              ))}
              <button onClick={nextSet} className="tap-btn w-7 h-7 rounded-lg text-xs font-bold bg-navy-600 text-gray-400 border border-white/10">
                +
              </button>
            </div>
            <span className="text-gray-500 text-lg font-bold leading-none">VS</span>
          </div>

          {/* Opponent side */}
          <div className="flex-1 flex flex-col items-center">
            <p className="text-gray-400 text-xs font-bold tracking-wide truncate">{opponent.toUpperCase()}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <button onClick={() => setTheirScore(s => Math.max(0, s - 1))}
                className="tap-btn text-gray-600 text-xs px-1 py-1">−</button>
              <button onClick={() => setTheirScore(s => s + 1)}
                className="tap-btn text-4xl font-black text-white leading-none w-14 text-center">
                {String(theirScore).padStart(2, '0')}
              </button>
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <button key={i} onClick={() => setTheirTimeouts(t => t === i + 1 ? i : i + 1)}
                    className={`tap-btn w-3 h-3 rounded-full border ${i < theirTimeouts ? 'bg-gray-400 border-gray-300' : 'bg-transparent border-white/30'}`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* End button */}
          <button onClick={() => setShowEndDialog(true)}
            className="tap-btn bg-green-800 text-white text-xs font-bold px-2 py-2 rounded-lg leading-tight shrink-0">
            END
          </button>
        </div>
      </div>

      {/* ── ROTATION CONTROLS ──────────────────────────────────────────────── */}
      <div className="bg-navy-800/60 border-b border-white/5 px-3 py-1.5 flex items-center gap-2 shrink-0">
        <button onClick={rotateBack}
          className="tap-btn bg-navy-600 border border-white/10 px-3 py-1 rounded-lg text-gray-300 text-xs font-bold">
          ← Rotate
        </button>
        <button onClick={rotateForward}
          className="tap-btn bg-navy-600 border border-white/10 px-3 py-1 rounded-lg text-gray-300 text-xs font-bold">
          Rotate →
        </button>
        <button onClick={() => setShowRotationEditor(r => !r)}
          className={`tap-btn px-3 py-1 rounded-lg text-xs font-bold border ${showRotationEditor ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-300'}`}>
          Sub / Edit
        </button>
        <span className="ml-auto text-gray-600 text-xs">Set {currentSet + 1}</span>
      </div>

      {/* ── COURT GRID ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* 2×3 court grid */}
        <div className="grid grid-rows-2 gap-2 mb-2" style={{ gridTemplateRows: '1fr 1fr' }}>
          {COURT_LAYOUT.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 gap-2">
              {row.map((slotIdx) => {
                const playerId = rotation[slotIdx]
                const player = players.find(p => p.id === playerId)
                const ps = playerId ? setStats[playerId] : null
                const posLabel = POSITION_NUMS[slotIdx]
                const isExpanded = expandedPlayer === playerId

                // Empty slot
                if (!playerId || !player || !ps) {
                  return (
                    <button key={slotIdx}
                      onClick={() => { setAssigningSlot(slotIdx); setShowRotationEditor(true) }}
                      className="tap-btn bg-navy-800/60 border-2 border-dashed border-white/10 rounded-2xl p-3 flex flex-col items-center justify-center min-h-[160px]">
                      <span className="text-white/20 text-2xl mb-1">+</span>
                      <span className="text-white/20 text-xs">{posLabel}</span>
                    </button>
                  )
                }

                return (
                  <div key={slotIdx}
                    className={`bg-navy-700 border rounded-2xl overflow-hidden flex flex-col ${isExpanded ? 'border-vr-500/60' : 'border-white/10'}`}>

                    {/* Card header */}
                    <div className={`flex items-center gap-2 px-2.5 pt-2 pb-1.5 border-b border-white/5`}>
                      <div className="w-8 h-8 rounded-full bg-vr-800 border border-vr-500/40 flex items-center justify-center shrink-0">
                        <span className="text-pb-400 font-black text-sm">#{player.number}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-bold text-sm leading-tight truncate">{player.name}</p>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[player.position]}`}>
                          {POSITION_LABELS[player.position]}
                        </span>
                      </div>
                      <div className="flex flex-col items-center shrink-0">
                        <span className="text-white/20 text-xs">{posLabel}</span>
                        <button onClick={() => setExpandedPlayer(isExpanded ? null : playerId)}
                          className={`tap-btn text-xs mt-0.5 ${isExpanded ? 'text-vr-400' : 'text-gray-600'}`}>
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Stat chips — 2 rows */}
                    <div className="px-2 pt-1.5 pb-1 flex flex-col gap-1">
                      {CHIP_ROWS.map((row, ri) => (
                        <div key={ri} className="grid grid-cols-4 gap-1">
                          {row.map(chip => (
                            <button key={chip.key}
                              onClick={() => adjust(playerId, chip.key, 1)}
                              onContextMenu={e => { e.preventDefault(); adjust(playerId, chip.key, -1) }}
                              className={`tap-btn border rounded-lg py-1 px-0.5 text-center ${chip.bg}`}>
                              <p className={`text-xs font-bold leading-none ${chip.color}`}>
                                {ps[chip.key] as number}
                              </p>
                              <p className="text-white/30 text-[9px] leading-none mt-0.5">{chip.label}</p>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Pass rating (always visible, compact) */}
                    <div className="px-2 pb-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 text-[10px] w-6 shrink-0">PA</span>
                        <span className="text-pb-400 text-xs font-bold w-8">
                          {ps.passAttempts > 0 ? (ps.passRatingTotal / ps.passAttempts).toFixed(1) : '—'}
                        </span>
                        <div className="flex gap-1 flex-1">
                          {[0,1,2,3].map(r => (
                            <button key={r} onClick={() => adjustPass(playerId, r)}
                              className={`tap-btn flex-1 rounded text-xs font-bold py-1 border ${
                                r === 0 ? 'border-red-700/50 bg-red-900/20 text-red-300' :
                                r === 1 ? 'border-orange-700/50 bg-orange-900/20 text-orange-300' :
                                r === 2 ? 'border-yellow-700/50 bg-yellow-900/20 text-yellow-300' :
                                'border-green-700/50 bg-green-900/20 text-green-300'
                              }`}>
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Expanded: extra stats + undo */}
                    {isExpanded && (
                      <div className="border-t border-white/10 px-2 py-2 bg-navy-800/60">
                        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                          {[
                            { label: 'Atk Att',   key: 'attackAttempts' as keyof PlayerStats },
                            { label: 'Srv Att',   key: 'serveAttempts'  as keyof PlayerStats },
                            { label: 'Blk Ast',   key: 'blockAssists'   as keyof PlayerStats },
                            { label: 'Set Err',   key: 'settingErrors'  as keyof PlayerStats },
                          ].map(({ label, key }) => (
                            <div key={key} className="flex items-center justify-between bg-navy-700 rounded-lg px-2 py-1">
                              <span className="text-gray-500">{label}</span>
                              <div className="flex items-center gap-1.5">
                                <button onClick={() => adjust(playerId, key, -1)} className="tap-btn text-gray-500 w-5 h-5 flex items-center justify-center rounded bg-navy-600 text-xs">−</button>
                                <span className="text-white font-bold w-5 text-center">{ps[key] as number}</span>
                                <button onClick={() => adjust(playerId, key, 1)}  className="tap-btn text-white w-5 h-5 flex items-center justify-center rounded bg-vr-700 text-xs">+</button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => {
                          if (ps.passAttempts > 0) {
                            const avg = ps.passRatingTotal / ps.passAttempts
                            setSets(prev => prev.map((s, i) => i !== currentSet ? s : {
                              ...s, [playerId]: { ...s[playerId], passRatingTotal: Math.max(0, ps.passRatingTotal - avg), passAttempts: ps.passAttempts - 1 }
                            }))
                          }
                        }} className="tap-btn w-full text-center text-gray-500 text-xs border border-white/10 rounded-lg py-1">
                          Undo last pass
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        {/* ── BENCH ──────────────────────────────────────────────────────── */}
        {benchPlayers.length > 0 && (
          <div className="mt-1">
            <p className="text-gray-600 text-xs font-bold uppercase tracking-widest mb-1.5 px-1">Bench</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {benchPlayers.map(p => {
                const ps = setStats[p.id]
                return (
                  <div key={p.id} className="bg-navy-800 border border-white/10 rounded-xl p-2.5 shrink-0 w-32">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-pb-400 font-bold text-sm">#{p.number}</span>
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                        {POSITION_LABELS[p.position]}
                      </span>
                    </div>
                    <p className="text-white text-xs font-medium truncate mb-2">{p.name}</p>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { key: 'kills' as keyof PlayerStats,  label: 'K', color: 'text-green-400' },
                        { key: 'digs'  as keyof PlayerStats,  label: 'D', color: 'text-cyan-400' },
                      ].map(({ key, label, color }) => (
                        <button key={key} onClick={() => adjust(p.id, key, 1)}
                          className="tap-btn bg-navy-700 border border-white/10 rounded-lg py-1 text-center">
                          <p className={`font-bold text-sm ${color}`}>{ps ? ps[key] as number : 0}</p>
                          <p className="text-gray-600 text-[9px]">{label}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── ROTATION EDITOR SHEET ──────────────────────────────────────────── */}
      {showRotationEditor && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => { setShowRotationEditor(false); setAssigningSlot(null) }}>
          <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">
                {assigningSlot !== null ? `Assign player to ${POSITION_NUMS[assigningSlot]}` : 'Rotation / Subs'}
              </h3>
              <button onClick={() => { setShowRotationEditor(false); setAssigningSlot(null) }}
                className="text-gray-400 text-2xl leading-none tap-btn">×</button>
            </div>

            {/* Court slots */}
            {assigningSlot === null && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {COURT_LAYOUT.flat().map(slotIdx => {
                  const pid = rotation[slotIdx]
                  const p = players.find(pl => pl.id === pid)
                  return (
                    <button key={slotIdx} onClick={() => setAssigningSlot(slotIdx)}
                      className="tap-btn bg-navy-700 border border-white/10 rounded-xl p-3 text-left">
                      <p className="text-white/30 text-xs mb-1">{POSITION_NUMS[slotIdx]}</p>
                      {p ? (
                        <>
                          <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                          <p className="text-pb-400 text-xs">#{p.number}</p>
                        </>
                      ) : (
                        <p className="text-white/20 text-sm">— empty —</p>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Player list to assign */}
            {assigningSlot !== null && (
              <div className="space-y-2">
                <button onClick={() => assignPlayerToSlot(assigningSlot, null)}
                  className="tap-btn w-full bg-navy-700 border border-red-500/20 rounded-xl p-3 text-left text-red-400 text-sm">
                  Remove player from this slot
                </button>
                {players.map(p => (
                  <button key={p.id} onClick={() => assignPlayerToSlot(assigningSlot, p.id)}
                    className={`tap-btn w-full bg-navy-700 border rounded-xl p-3 flex items-center gap-3 ${rotation[assigningSlot] === p.id ? 'border-vr-500' : 'border-white/10'}`}>
                    <span className="text-pb-400 font-bold">#{p.number}</span>
                    <span className="text-white font-medium">{p.name}</span>
                    <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                      {POSITION_LABELS[p.position]}
                    </span>
                    {onCourtIds.has(p.id) && rotation[assigningSlot] !== p.id && (
                      <span className="text-yellow-500 text-xs">on court</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── END MATCH DIALOG ───────────────────────────────────────────────── */}
      {showEndDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-navy-800 border border-vr-700/50 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-1">End Match?</h3>
            <p className="text-pb-400 text-sm mb-4">Viking Roots {ourScore} – {theirScore} {opponent}</p>
            <p className="text-gray-400 text-sm mb-5">
              {sets.length} set{sets.length !== 1 ? 's' : ''} tracked. Stats will be saved to match history.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndDialog(false)}
                className="tap-btn flex-1 py-3 rounded-xl border border-white/20 text-gray-300 font-semibold">
                Keep Playing
              </button>
              <button onClick={confirmEnd}
                className="tap-btn flex-1 py-3 rounded-xl bg-green-700 text-white font-bold">
                Save & End
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
