import { useState } from 'react'
import type { Player, PlayerStats, Match, SavedLineup, Position } from '../types'
import { POSITION_LABELS, POSITION_COLORS } from '../types'
import { aggregatePlayerStats } from '../utils/statsHelpers'

interface Props {
  players: Player[]
  matches: Match[]
  slots: (string | null)[]
  onAssign: (slot: number, playerId: string | null) => void
  effectivePositionOf: (p: Player) => Position
  weAreServing?: boolean | null
  savedLineups: SavedLineup[]
  onSaveLineup: (name: string, slots: (string | null)[]) => void
  onDeleteLineup: (id: string) => void
  tournamentName?: string
  onClose: () => void
}

const COURT_LAYOUT = [
  [3, 2, 1], // front row: P4 P3 P2
  [4, 5, 0], // back row:  P5 P6 P1
]
const FRONT_ROW_SLOTS = new Set(COURT_LAYOUT[0])
const POSITION_NUMS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

function getBaseSlot(position: Position, isFrontRow: boolean): number | null {
  if (isFrontRow) {
    switch (position) {
      case 'outside':  return 3
      case 'middle':   return 2
      case 'setter':
      case 'opposite': return 1
      default:         return null
    }
  }
  switch (position) {
    case 'outside':
    case 'ds':        return 5
    case 'middle':
    case 'libero':    return 4
    case 'setter':
    case 'opposite':  return 0
    default:          return null
  }
}

function rotateForward(slots: (string | null)[], steps: number): (string | null)[] {
  let n = [...slots]
  for (let i = 0; i < steps; i++) {
    n = [...n]
    n.push(n.shift()!)
  }
  return n
}

function hitRate(s: PlayerStats) { return s.attackAttempts > 0 ? (s.kills - s.attackErrors) / s.attackAttempts : null }
function serveRate(s: PlayerStats) { return s.serveAttempts > 0 ? s.aces / s.serveAttempts : null }
function passRate(s: PlayerStats) { return s.passAttempts > 0 ? s.passRatingTotal / s.passAttempts : null }

interface RankedRow { player: Player; value: number; display: string }

function rankBy(players: Player[], matches: Match[], metric: (s: PlayerStats) => number | null, fmt: (v: number) => string): RankedRow[] {
  return players
    .map(player => {
      const s = aggregatePlayerStats(player.id, matches)
      const value = metric(s)
      return value === null ? null : { player, value, display: fmt(value) }
    })
    .filter((r): r is RankedRow => r !== null)
    .sort((a, b) => b.value - a.value)
}

export default function LineupPlanner({
  players, matches, slots, onAssign, effectivePositionOf, weAreServing,
  savedLineups, onSaveLineup, onDeleteLineup, tournamentName, onClose,
}: Props) {
  const [view, setView] = useState<'rotations' | 'suggestions'>('rotations')
  const [previewStep, setPreviewStep] = useState(0)
  // Defaults to literal serving order rather than base position: base
  // position can show the same visual slot twice (and drop another) for an
  // unconventional lineup — e.g. two outside hitters both in the front row
  // at once — the same collision the main live view's own Base toggle has
  // for a lineup like that. Serving order has no such ambiguity, and is
  // the clearer view for confirming a loaded lineup is right anyway.
  const [showBase, setShowBase] = useState(false)
  const [pickingSlot, setPickingSlot] = useState<number | null>(null)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [saveLineupName, setSaveLineupName] = useState('')

  const tournamentMatches = tournamentName ? matches.filter(m => m.tournament === tournamentName) : []
  const [scope, setScope] = useState<'tournament' | 'season'>(tournamentMatches.length > 0 ? 'tournament' : 'season')
  const scopedMatches = scope === 'tournament' ? tournamentMatches : matches

  const playerById = Object.fromEntries(players.map(p => [p.id, p]))
  const onCourtIds = new Set(slots.filter(Boolean) as string[])
  const emptySlotIdx = slots.findIndex(s => !s)

  const previewSlots = rotateForward(slots, previewStep)

  // Map each visual grid position (0-5, matching COURT_LAYOUT) to the true
  // serving-order slot of the player who'd be standing there, same logic
  // LiveGame uses for its own Base/Rotation toggle.
  const displaySlots: (number | null)[] = [null, null, null, null, null, null]
  if (showBase) {
    previewSlots.forEach((playerId, trueSlot) => {
      if (!playerId) return
      const player = playerById[playerId]
      const base = player ? getBaseSlot(effectivePositionOf(player), FRONT_ROW_SLOTS.has(trueSlot)) : null
      const gridSlot = base !== null ? base : trueSlot
      displaySlots[gridSlot] = trueSlot
    })
  } else {
    for (let i = 0; i < 6; i++) displaySlots[i] = i
  }

  function assignToRealSlot(playerId: string | null) {
    if (pickingSlot === null) return
    onAssign(pickingSlot, playerId)
    setPickingSlot(null)
  }

  function addToEmptySlot(playerId: string) {
    if (emptySlotIdx === -1) return
    onAssign(emptySlotIdx, playerId)
  }

  function saveLineup() {
    if (!saveLineupName.trim()) return
    onSaveLineup(saveLineupName.trim(), slots)
    setSaveLineupName('')
    setShowSaveForm(false)
  }

  const categories: { label: string; metric: (s: PlayerStats) => number | null; fmt: (v: number) => string }[] = [
    { label: 'Best Hitters', metric: hitRate, fmt: v => (v * 100).toFixed(1) + '%' },
    { label: 'Best Servers', metric: serveRate, fmt: v => (v * 100).toFixed(1) + '%' },
    { label: 'Best Passers', metric: passRate, fmt: v => v.toFixed(2) + ' avg' },
    { label: 'Best Diggers', metric: s => s.digs > 0 ? s.digs : null, fmt: v => v + ' digs' },
    { label: 'Best Setters', metric: s => s.settingAssists > 0 ? s.settingAssists : null, fmt: v => v + ' ast' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-navy-900 flex flex-col">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <h2 className="text-white font-bold text-lg">Lineup &amp; Rotations</h2>
        <button onClick={onClose} className="tap-btn text-gray-400 text-2xl leading-none">×</button>
      </div>

      <div className="bg-navy-800 border-b border-white/10 px-3 flex gap-1 shrink-0">
        {(['rotations', 'suggestions'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`tap-btn px-3 py-2 text-sm font-bold border-b-2 ${
              view === v ? 'text-vr-300 border-vr-500' : 'text-gray-500 border-transparent'
            }`}>
            {v === 'rotations' ? 'Rotations' : 'Suggestions'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-3">
        {view === 'rotations' ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setPreviewStep(s => (s + 5) % 6)}
                className="tap-btn bg-navy-700 border border-white/10 rounded-lg px-3 py-1.5 text-gray-300 text-sm font-bold">
                ◀
              </button>
              <div className="text-center">
                <p className="text-white font-bold text-sm">
                  {previewStep === 0 ? 'Current Rotation' : `${previewStep} rotation${previewStep > 1 ? 's' : ''} ahead`}
                </p>
                <p className="text-gray-500 text-[11px]">Tap a player to swap her out</p>
              </div>
              <button onClick={() => setPreviewStep(s => (s + 1) % 6)}
                className="tap-btn bg-navy-700 border border-white/10 rounded-lg px-3 py-1.5 text-gray-300 text-sm font-bold">
                ▶
              </button>
            </div>

            <div className="flex justify-center mb-3">
              <button onClick={() => setShowBase(b => !b)}
                className="tap-btn bg-navy-700 border border-white/10 rounded-full px-3 py-1 text-xs font-bold text-gray-300">
                {showBase ? '⛹ Base Position' : '🔢 Serving Order'} · tap to switch
              </button>
            </div>

            <div className="bg-navy-800 border border-white/10 rounded-2xl p-3 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-px bg-pb-600/40" />
                <span className="text-pb-500/60 text-[10px] font-bold uppercase tracking-widest">Net</span>
                <div className="flex-1 h-px bg-pb-600/40" />
              </div>
              {COURT_LAYOUT.map((row, rowIdx) => (
                <div key={rowIdx} className={`grid grid-cols-3 gap-2 ${rowIdx === 0 ? 'mb-2' : ''}`}>
                  {row.map(gridSlot => {
                    const trueSlot = displaySlots[gridSlot] ?? gridSlot
                    const pid = previewSlots[trueSlot]
                    const p = pid ? playerById[pid] : null
                    const isServer = trueSlot === 0 && previewStep === 0 && weAreServing === true
                    return (
                      <button key={gridSlot}
                        onClick={() => setPickingSlot(trueSlot)}
                        className={`tap-btn rounded-xl p-2 min-h-[76px] flex flex-col items-center justify-center border-2 ${
                          p ? 'bg-navy-700 border-vr-500/50' : 'bg-navy-900/60 border-dashed border-white/10'
                        } ${isServer ? 'border-yellow-400/70' : ''}`}>
                        <span className="text-white/20 text-[10px] mb-1">
                          {showBase ? POSITION_NUMS[trueSlot] : POSITION_NUMS[gridSlot]}
                        </span>
                        {p ? (
                          <>
                            <span className="text-pb-400 font-black text-sm">#{p.number}</span>
                            <span className="text-white text-xs font-medium truncate w-full text-center leading-tight mt-0.5">{p.name.split(' ')[0]}</span>
                            <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full text-white mt-0.5 ${POSITION_COLORS[effectivePositionOf(p)]}`}>
                              {POSITION_LABELS[effectivePositionOf(p)]}
                            </span>
                            {isServer && <span className="text-yellow-400 text-[10px] mt-0.5">serving</span>}
                          </>
                        ) : (
                          <span className="text-white/20 text-lg">+</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>

            {savedLineups.length > 0 && (
              <div className="mb-3">
                <p className="text-gray-500 text-xs mb-1.5">Saved lineups — tap to load</p>
                <div className="flex flex-wrap gap-2">
                  {savedLineups.map(l => (
                    <div key={l.id} className="flex items-center gap-1">
                      <button onClick={() => l.slots.forEach((pid, i) => onAssign(i, pid))}
                        className="tap-btn bg-navy-700 border border-vr-600/40 text-vr-300 text-xs font-semibold px-3 py-1.5 rounded-xl">
                        {l.name}
                      </button>
                      <button onClick={() => onDeleteLineup(l.id)}
                        className="tap-btn text-gray-600 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:text-red-400">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!showSaveForm ? (
              <button onClick={() => setShowSaveForm(true)}
                className="tap-btn w-full border border-white/10 text-gray-400 text-sm py-2 rounded-xl">
                + Save this lineup for later
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  className="flex-1 bg-navy-700 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pb-500"
                  placeholder="Lineup name"
                  value={saveLineupName}
                  onChange={e => setSaveLineupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && saveLineup()}
                  autoFocus
                />
                <button onClick={saveLineup} className="tap-btn bg-vr-600 text-white text-sm font-bold px-4 rounded-xl">
                  Save
                </button>
                <button onClick={() => setShowSaveForm(false)} className="tap-btn text-gray-500 text-sm px-2">✕</button>
              </div>
            )}
          </>
        ) : (
          <>
            {tournamentMatches.length > 0 && (
              <div className="flex justify-center mb-4">
                <div className="bg-navy-800 border border-white/10 rounded-full p-1 flex gap-1">
                  {(['tournament', 'season'] as const).map(s => (
                    <button key={s} onClick={() => setScope(s)}
                      className={`tap-btn px-3 py-1 rounded-full text-xs font-bold ${
                        scope === s ? 'bg-vr-600 text-white' : 'text-gray-400'
                      }`}>
                      {s === 'tournament' ? 'This Tournament' : 'All Season'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {scopedMatches.length === 0 ? (
              <p className="text-gray-500 text-sm text-center mt-8">
                No match stats recorded yet{scope === 'tournament' ? ' for this tournament' : ''} — suggestions will show up once you've played a match.
              </p>
            ) : (
              <div className="space-y-4">
                {categories.map(cat => {
                  const ranked = rankBy(players, scopedMatches, cat.metric, cat.fmt).slice(0, 3)
                  if (ranked.length === 0) return null
                  return (
                    <div key={cat.label} className="bg-navy-800 border border-white/10 rounded-2xl p-3">
                      <p className="text-vr-400 text-xs font-bold uppercase tracking-widest mb-2">{cat.label}</p>
                      <div className="space-y-1.5">
                        {ranked.map((r, i) => (
                          <div key={r.player.id} className="flex items-center gap-2">
                            <span className={`text-xs font-black w-5 text-center ${i === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                              #{i + 1}
                            </span>
                            <span className="text-pb-400 font-bold text-xs">#{r.player.number}</span>
                            <span className="text-white text-sm font-medium flex-1 truncate">{r.player.name}</span>
                            <span className="text-gray-400 text-xs font-semibold">{r.display}</span>
                            {!onCourtIds.has(r.player.id) && emptySlotIdx !== -1 && (
                              <button onClick={() => addToEmptySlot(r.player.id)}
                                className="tap-btn text-vr-400 text-xs font-bold border border-vr-600/40 rounded-lg px-2 py-0.5 shrink-0">
                                + Add
                              </button>
                            )}
                            {onCourtIds.has(r.player.id) && (
                              <span className="text-green-500 text-[10px] shrink-0">on court</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      {pickingSlot !== null && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setPickingSlot(null)}>
          <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto overscroll-y-contain" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-white font-bold text-lg">Assign to {POSITION_NUMS[pickingSlot]}</h3>
              <button onClick={() => setPickingSlot(null)} className="text-gray-400 text-2xl tap-btn">×</button>
            </div>
            <button onClick={() => assignToRealSlot(null)}
              className="tap-btn w-full bg-navy-700 border border-red-500/20 rounded-xl p-3 text-left text-red-400 text-sm mb-2">
              Remove / leave empty
            </button>
            {players.map(p => {
              const isElsewhere = onCourtIds.has(p.id) && slots[pickingSlot!] !== p.id
              return (
                <button key={p.id} onClick={() => assignToRealSlot(p.id)}
                  className={`tap-btn w-full border rounded-xl p-3 flex items-center gap-3 mb-1.5 ${
                    slots[pickingSlot!] === p.id ? 'bg-vr-800 border-vr-500' : 'bg-navy-700 border-white/10'
                  }`}>
                  <span className="text-pb-400 font-bold text-base">#{p.number}</span>
                  <span className="text-white font-medium flex-1">{p.name}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                    {POSITION_LABELS[p.position]}
                  </span>
                  {isElsewhere && (
                    <span className="text-yellow-500 text-xs">
                      {POSITION_NUMS[slots.indexOf(p.id)]}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
