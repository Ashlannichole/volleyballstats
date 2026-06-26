import { useState } from 'react'
import type { Player, PlayerStats, SetStats, Match, SavedLineup } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'
import { loadLineups, saveLineups } from '../utils/storage'

interface Props {
  players: Player[]
  onSaveMatch: (match: Match) => void
}

const COURT_LAYOUT = [
  [3, 2, 1], // front row: P4 P3 P2
  [4, 5, 0], // back row:  P5 P6 P1
]
const POSITION_NUMS = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6']

interface StatChipDef {
  key: keyof PlayerStats
  label: string
  color: string
  bg: string
  isErrorTrigger?: boolean
}

const CHIP_ROWS: StatChipDef[][] = [
  [
    { key: 'kills',          label: 'KILL', color: 'text-green-300',  bg: 'bg-green-900/40 border-green-600/40' },
    { key: 'attackErrors',   label: 'ERR',  color: 'text-red-300',    bg: 'bg-red-900/40 border-red-600/40',    isErrorTrigger: true },
    { key: 'attackAttempts', label: 'ATT',  color: 'text-pb-300',     bg: 'bg-pb-900/20 border-pb-600/30' },
    { key: 'aces',           label: 'ACE',  color: 'text-yellow-300', bg: 'bg-yellow-900/30 border-yellow-600/30' },
  ],
  [
    { key: 'digs',           label: 'DIG',  color: 'text-cyan-300',   bg: 'bg-cyan-900/30 border-cyan-600/30' },
    { key: 'soloBlocks',     label: 'BS',   color: 'text-vr-300',     bg: 'bg-vr-900/30 border-vr-600/30' },
    { key: 'settingAssists', label: 'AST',  color: 'text-orange-300', bg: 'bg-orange-900/30 border-orange-600/30' },
    { key: 'serveErrors',    label: 'SE',   color: 'text-red-400',    bg: 'bg-red-900/30 border-red-700/30',    isErrorTrigger: true },
  ],
]

const SCORES_OUR_POINT   = new Set<keyof PlayerStats>(['kills', 'aces', 'soloBlocks', 'blockAssists'])
const SCORES_THEIR_POINT = new Set<keyof PlayerStats>(['attackErrors', 'serveErrors'])

interface PendingError {
  playerId: string
  type: 'attack' | 'serve' | 'pass'
}

const ATTACK_ERROR_TYPES = [
  { label: 'Missed Hit',  key: 'atkErrMissed'   as keyof PlayerStats, emoji: '💨' },
  { label: 'Blocked',     key: 'atkErrBlocked'  as keyof PlayerStats, emoji: '🤚' },
  { label: 'Hit Out',     key: 'atkErrOut'      as keyof PlayerStats, emoji: '↗️' },
  { label: 'Into Net',    key: 'atkErrNet'      as keyof PlayerStats, emoji: '🔀' },
]
const SERVE_ERROR_TYPES = [
  { label: 'Missed Serve', key: 'srvErrMissed'  as keyof PlayerStats, emoji: '💨' },
  { label: 'Into Net',     key: 'srvErrNet'     as keyof PlayerStats, emoji: '🔀' },
  { label: 'Long / Out',   key: 'srvErrOut'     as keyof PlayerStats, emoji: '↗️' },
  { label: 'Foot Fault',   key: 'srvErrFoot'    as keyof PlayerStats, emoji: '👟' },
]
const PASS_ZERO_TYPES = [
  { label: 'Shank',       key: 'passZeroShank'    as keyof PlayerStats, emoji: '🙈' },
  { label: 'Server Aced', key: 'passZeroAce'      as keyof PlayerStats, emoji: '🔥' },
  { label: 'Overpass',    key: 'passZeroOverpass' as keyof PlayerStats, emoji: '🔄' },
]

// Snapshot for undo history
interface Snapshot {
  sets: SetStats[]
  ourScore: number
  theirScore: number
  weAreServing: boolean | null
  rotation: (string | null)[]
}

export default function LiveGame({ players, onSaveMatch }: Props) {
  const [gameStarted, setGameStarted]       = useState(false)
  const [opponent, setOpponent]             = useState('')
  const [ourScore, setOurScore]             = useState(0)
  const [theirScore, setTheirScore]         = useState(0)
  const [ourTimeouts, setOurTimeouts]       = useState(0)
  const [theirTimeouts, setTheirTimeouts]   = useState(0)
  const [weAreServing, setWeAreServing]     = useState<boolean | null>(null)
  const [rotation, setRotation]             = useState<(string | null)[]>([null,null,null,null,null,null])
  const [showRotationEditor, setShowRotationEditor] = useState(false)
  const [assigningSlot, setAssigningSlot]   = useState<number | null>(null)
  const [currentSet, setCurrentSet]         = useState(0)
  const [sets, setSets]                     = useState<SetStats[]>([buildSetStats(players)])
  const [expandedPlayer, setExpandedPlayer] = useState<string | null>(null)
  const [showEndDialog, setShowEndDialog]   = useState(false)
  const [pendingError, setPendingError]     = useState<PendingError | null>(null)
  const [history, setHistory]               = useState<Snapshot[]>([])
  const [rotationToast, setRotationToast]   = useState(false)
  const [subCount, setSubCount]             = useState(0)
  const [showSubAlert, setShowSubAlert]     = useState(false)
  const [subbingOutSlot, setSubbingOutSlot] = useState<number | null>(null)
  // liberoId = who is on court, partnerId = who they replaced (sitting on bench)
  const [liberoPair, setLiberoPair]         = useState<{ liberoId: string; partnerId: string } | null>(null)
  const [liberoToast, setLiberoToast]       = useState(false)

  // Lineup builder (pre-match)
  const [preLineup, setPreLineup]           = useState<(string | null)[]>([null,null,null,null,null,null])
  const [pickingSlot, setPickingSlot]       = useState<number | null>(null)
  const [savedLineups, setSavedLineups]     = useState<SavedLineup[]>(loadLineups)
  const [saveLineupName, setSaveLineupName] = useState('')
  const [showSaveForm, setShowSaveForm]     = useState(false)

  function buildSetStats(ps: Player[]): SetStats {
    const s: SetStats = {}
    for (const p of ps) s[p.id] = EMPTY_STATS()
    return s
  }

  // Save current state before any mutation so we can undo it
  function snapshot() {
    setHistory(prev => [...prev.slice(-19), {
      sets, ourScore, theirScore, weAreServing, rotation
    }])
  }

  function undo() {
    setHistory(prev => {
      if (prev.length === 0) return prev
      const snap = prev[prev.length - 1]
      setSets(snap.sets)
      setOurScore(snap.ourScore)
      setTheirScore(snap.theirScore)
      setWeAreServing(snap.weAreServing)
      setRotation(snap.rotation)
      return prev.slice(0, -1)
    })
  }

  // Clockwise: P2→P1, P3→P2, P4→P3, P5→P4, P6→P5, P1→P6
  function doRotate(currentRotation: (string | null)[]) {
    const n = [...currentRotation]
    n.push(n.shift()!)
    return n
  }

  // After any rotation, if libero lands in P4 (slot 3, front row) swap them out automatically
  function checkLiberoRotation(rot: (string | null)[], pair: typeof liberoPair): (string | null)[] {
    if (!pair) return rot
    if (rot[3] === pair.liberoId) {
      const next = [...rot]
      next[3] = pair.partnerId
      setLiberoToast(true)
      setTimeout(() => setLiberoToast(false), 2500)
      return next
    }
    return rot
  }

  function showRotationToastBriefly() {
    setRotationToast(true)
    setTimeout(() => setRotationToast(false), 2000)
  }

  function adjust(playerId: string, key: keyof PlayerStats, delta: number) {
    snapshot()
    setSets(prev => prev.map((s, i) => {
      if (i !== currentSet) return s
      const ps = { ...s[playerId] }
      const val = Math.max(0, (ps[key] as number) + delta)
      return { ...s, [playerId]: { ...ps, [key]: val } }
    }))

    if (delta > 0) {
      if (SCORES_OUR_POINT.has(key)) {
        setOurScore(s => s + 1)
        // Side-out: we scored while receiving → rotate + take serve
        if (weAreServing === false) {
          setRotation(prev => checkLiberoRotation(doRotate(prev), liberoPair))
          setWeAreServing(true)
          showRotationToastBriefly()
        }
      }
      if (SCORES_THEIR_POINT.has(key)) {
        setTheirScore(s => s + 1)
        if (weAreServing === true) setWeAreServing(false)
      }
    } else if (delta < 0) {
      // Undo score on minus (corrections)
      if (SCORES_OUR_POINT.has(key))   setOurScore(s => Math.max(0, s - 1))
      if (SCORES_THEIR_POINT.has(key)) setTheirScore(s => Math.max(0, s - 1))
    }
  }

  function adjustPass(playerId: string, rating: number, autoScore = true) {
    snapshot()
    setSets(prev => prev.map((s, i) => {
      if (i !== currentSet) return s
      const ps = { ...s[playerId] }
      return { ...s, [playerId]: { ...ps, passRatingTotal: ps.passRatingTotal + rating, passAttempts: ps.passAttempts + 1 } }
    }))
    if (rating === 0 && autoScore) {
      setTheirScore(s => s + 1)
      if (weAreServing === true) setWeAreServing(false)
    }
  }

  function commitError(playerId: string, mainKey: keyof PlayerStats, subKey: keyof PlayerStats) {
    // snapshot is called inside adjust()
    adjust(playerId, mainKey, 1)
    setSets(prev => prev.map((s, i) => {
      if (i !== currentSet) return s
      const ps = { ...s[playerId] }
      return { ...s, [playerId]: { ...ps, [subKey]: (ps[subKey] as number) + 1 } }
    }))
    setPendingError(null)
  }

  function commitPassZero(playerId: string, subKey: keyof PlayerStats) {
    const isOverpass = subKey === 'passZeroOverpass'
    adjustPass(playerId, 0, !isOverpass)
    setSets(prev => prev.map((s, i) => {
      if (i !== currentSet) return s
      const ps = { ...s[playerId] }
      return { ...s, [playerId]: { ...ps, [subKey]: (ps[subKey] as number) + 1 } }
    }))
    setPendingError(null)
  }

  function nextSet() {
    setSets(prev => [...prev, buildSetStats(players)])
    setCurrentSet(c => c + 1)
    setOurTimeouts(0)
    setTheirTimeouts(0)
    setSubCount(0)
    setLiberoPair(null)
  }

  function doSub(outSlot: number, inPlayerId: string) {
    const outPlayerId = rotation[outSlot]
    const outPlayer = players.find(p => p.id === outPlayerId)
    const inPlayer  = players.find(p => p.id === inPlayerId)
    const isLiberoSub = outPlayer?.position === 'libero' || inPlayer?.position === 'libero'

    assignPlayerToSlot(outSlot, inPlayerId)

    // Track libero pair so we can auto-swap them out when they reach P4
    if (inPlayer?.position === 'libero' && outPlayerId) {
      setLiberoPair({ liberoId: inPlayerId, partnerId: outPlayerId })
    } else if (outPlayer?.position === 'libero') {
      // Libero manually sent back to bench — clear the pair
      setLiberoPair(null)
    }

    if (!isLiberoSub) {
      const next = subCount + 1
      setSubCount(next)
      if (next >= 10) setShowSubAlert(true)
    }
    setSubbingOutSlot(null)
  }

  function startGame() {
    if (!opponent.trim() || players.length === 0 || weAreServing === null) return
    setRotation([...preLineup])
    setSets([buildSetStats(players)])
    setHistory([])
    setGameStarted(true)
  }

  function applyLineup(lineup: SavedLineup) {
    setPreLineup([...lineup.slots])
  }

  function saveCurrentLineup() {
    if (!saveLineupName.trim()) return
    const lineup: SavedLineup = {
      id: crypto.randomUUID(),
      name: saveLineupName.trim(),
      slots: [...preLineup],
    }
    const updated = [...savedLineups, lineup]
    setSavedLineups(updated)
    saveLineups(updated)
    setSaveLineupName('')
    setShowSaveForm(false)
  }

  function deleteLineup(id: string) {
    const updated = savedLineups.filter(l => l.id !== id)
    setSavedLineups(updated)
    saveLineups(updated)
  }

  function assignPreSlot(slot: number, playerId: string | null) {
    setPreLineup(prev => {
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

  function assignPlayerToSlot(slot: number, playerId: string | null) {
    setRotation(prev => {
      const next = [...prev]
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
    setOurScore(0); setTheirScore(0)
    setOurTimeouts(0); setTheirTimeouts(0)
    setWeAreServing(null)
    setCurrentSet(0)
    setSets([buildSetStats(players)])
    setRotation([null,null,null,null,null,null])
    setPreLineup([null,null,null,null,null,null])
    setHistory([])
    setSubCount(0)
    setLiberoPair(null)
    setShowEndDialog(false)
  }

  const setStats = sets[currentSet]
  const onCourtIds = new Set(rotation.filter(Boolean) as string[])
  const benchPlayers = players.filter(p => !onCourtIds.has(p.id))

  // ── Pre-match screen ──────────────────────────────────────────────────────
  const preOnCourtIds = new Set(preLineup.filter(Boolean) as string[])
  const preOnCourtCount = preOnCourtIds.size

  if (!gameStarted) {
    return (
      <div className="overflow-y-auto p-4 max-w-lg mx-auto flex flex-col gap-5 pb-8">
        <div className="text-center mt-3">
          <p className="text-vr-400 text-xs font-bold uppercase tracking-widest mb-1">Viking Roots Volleyball</p>
          <h2 className="text-3xl font-bold text-white">New Match</h2>
        </div>

        {players.length === 0 && (
          <p className="text-yellow-400 text-center text-sm bg-yellow-900/20 rounded-xl p-3">
            Add players to your roster first.
          </p>
        )}

        {/* Opponent */}
        <div>
          <label className="block text-gray-300 text-sm mb-1">Opponent</label>
          <input
            className="w-full bg-navy-700 border border-white/20 rounded-xl px-4 py-4 text-white text-xl outline-none focus:border-pb-500"
            placeholder="e.g. Lincoln 14U"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
          />
        </div>

        {/* Who serves first? */}
        <div>
          <label className="block text-gray-300 text-sm mb-2">Who serves first?</label>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setWeAreServing(true)}
              className={`tap-btn py-4 rounded-2xl font-bold text-base border-2 flex flex-col items-center gap-1 transition-colors ${
                weAreServing === true ? 'bg-vr-700 border-vr-400 text-white' : 'bg-navy-700 border-white/10 text-gray-400'
              }`}>
              <span className="text-2xl">🏐</span>
              <span>We Serve</span>
            </button>
            <button onClick={() => setWeAreServing(false)}
              className={`tap-btn py-4 rounded-2xl font-bold text-base border-2 flex flex-col items-center gap-1 transition-colors ${
                weAreServing === false ? 'bg-navy-600 border-gray-400 text-white' : 'bg-navy-700 border-white/10 text-gray-400'
              }`}>
              <span className="text-2xl">🏐</span>
              <span>They Serve</span>
            </button>
          </div>
        </div>

        {/* ── LINEUP BUILDER ─────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-gray-300 text-sm font-medium">
              Starting Lineup <span className="text-gray-500 text-xs">({preOnCourtCount}/6 set)</span>
            </label>
            <button onClick={() => setPreLineup([null,null,null,null,null,null])}
              className="tap-btn text-gray-500 text-xs border border-white/10 px-2 py-1 rounded-lg">
              Clear
            </button>
          </div>

          {/* Saved lineups row */}
          {savedLineups.length > 0 && (
            <div className="mb-3">
              <p className="text-gray-500 text-xs mb-1.5">Saved lineups — tap to load</p>
              <div className="flex flex-wrap gap-2">
                {savedLineups.map(l => (
                  <div key={l.id} className="flex items-center gap-1">
                    <button onClick={() => applyLineup(l)}
                      className="tap-btn bg-navy-700 border border-vr-600/40 text-vr-300 text-xs font-semibold px-3 py-1.5 rounded-xl">
                      {l.name}
                    </button>
                    <button onClick={() => deleteLineup(l.id)}
                      className="tap-btn text-gray-600 text-xs w-5 h-5 flex items-center justify-center rounded-full hover:text-red-400">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Court diagram — 2 rows × 3 cols mirroring actual layout */}
          <div className="bg-navy-800 border border-white/10 rounded-2xl p-3">
            {/* Net */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-px bg-pb-600/40" />
              <span className="text-pb-500/60 text-[10px] font-bold uppercase tracking-widest">Net</span>
              <div className="flex-1 h-px bg-pb-600/40" />
            </div>

            {/* Front row: P4 P3 P2 */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              {[3, 2, 1].map(slotIdx => {
                const pid = preLineup[slotIdx]
                const p = players.find(pl => pl.id === pid)
                const isServer = slotIdx === 0 && weAreServing === true
                return (
                  <button key={slotIdx} onClick={() => setPickingSlot(slotIdx)}
                    className={`tap-btn rounded-xl p-2 min-h-[72px] flex flex-col items-center justify-center border-2 transition-colors ${
                      p ? 'bg-navy-700 border-vr-500/50' : 'bg-navy-900/60 border-dashed border-white/10'
                    } ${isServer ? 'border-yellow-400/70' : ''}`}>
                    <span className="text-white/20 text-[10px] mb-1">P{slotIdx + 1}</span>
                    {p ? (
                      <>
                        <span className="text-pb-400 font-black text-sm">#{p.number}</span>
                        <span className="text-white text-xs font-medium truncate w-full text-center leading-tight mt-0.5">{p.name.split(' ')[0]}</span>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full text-white mt-0.5 ${POSITION_COLORS[p.position]}`}>
                          {POSITION_LABELS[p.position]}
                        </span>
                        {isServer && <span className="text-yellow-400 text-[10px] mt-0.5">server</span>}
                      </>
                    ) : (
                      <span className="text-white/20 text-lg">+</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Back row: P5 P6 P1 */}
            <div className="grid grid-cols-3 gap-2">
              {[4, 5, 0].map(slotIdx => {
                const pid = preLineup[slotIdx]
                const p = players.find(pl => pl.id === pid)
                const isServer = slotIdx === 0 && weAreServing === true
                return (
                  <button key={slotIdx} onClick={() => setPickingSlot(slotIdx)}
                    className={`tap-btn rounded-xl p-2 min-h-[72px] flex flex-col items-center justify-center border-2 transition-colors ${
                      p ? 'bg-navy-700 border-vr-500/50' : 'bg-navy-900/60 border-dashed border-white/10'
                    } ${isServer ? 'border-yellow-400/70' : ''}`}>
                    <span className="text-white/20 text-[10px] mb-1">P{slotIdx + 1}</span>
                    {p ? (
                      <>
                        <span className="text-pb-400 font-black text-sm">#{p.number}</span>
                        <span className="text-white text-xs font-medium truncate w-full text-center leading-tight mt-0.5">{p.name.split(' ')[0]}</span>
                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded-full text-white mt-0.5 ${POSITION_COLORS[p.position]}`}>
                          {POSITION_LABELS[p.position]}
                        </span>
                        {isServer && <span className="text-yellow-400 text-[10px] mt-0.5">server</span>}
                      </>
                    ) : (
                      <span className="text-white/20 text-lg">+</span>
                    )}
                  </button>
                )
              })}
            </div>

            <p className="text-center text-gray-600 text-[10px] mt-2">Tap any slot to assign a player · P1 = server</p>
          </div>

          {/* Save lineup controls */}
          {!showSaveForm ? (
            <button onClick={() => setShowSaveForm(true)}
              className="tap-btn mt-2 w-full border border-white/10 text-gray-400 text-sm py-2 rounded-xl">
              + Save this lineup for later
            </button>
          ) : (
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 bg-navy-700 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pb-500"
                placeholder="Lineup name (e.g. Base Rotation)"
                value={saveLineupName}
                onChange={e => setSaveLineupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveCurrentLineup()}
              />
              <button onClick={saveCurrentLineup}
                className="tap-btn bg-vr-600 text-white text-sm font-bold px-4 rounded-xl">
                Save
              </button>
              <button onClick={() => setShowSaveForm(false)}
                className="tap-btn text-gray-500 text-sm px-2">
                ✕
              </button>
            </div>
          )}
        </div>

        <button
          disabled={!opponent.trim() || players.length === 0 || weAreServing === null}
          onClick={startGame}
          className="tap-btn w-full bg-vr-600 disabled:opacity-40 text-white font-bold py-5 rounded-2xl text-xl"
        >
          Start Match
        </button>

        {/* ── PLAYER PICKER SHEET ──────────────────────────────────────────── */}
        {pickingSlot !== null && (
          <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setPickingSlot(null)}>
            <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-lg">Assign to P{pickingSlot + 1}</h3>
                <button onClick={() => setPickingSlot(null)} className="text-gray-400 text-2xl tap-btn">×</button>
              </div>
              <button onClick={() => assignPreSlot(pickingSlot, null)}
                className="tap-btn w-full bg-navy-700 border border-red-500/20 rounded-xl p-3 text-left text-red-400 text-sm mb-2">
                Remove / leave empty
              </button>
              {players.map(p => {
                const isInLineup = preOnCourtIds.has(p.id) && preLineup[pickingSlot] !== p.id
                return (
                  <button key={p.id} onClick={() => assignPreSlot(pickingSlot, p.id)}
                    className={`tap-btn w-full border rounded-xl p-3 flex items-center gap-3 mb-1.5 ${
                      preLineup[pickingSlot] === p.id ? 'bg-vr-800 border-vr-500' : 'bg-navy-700 border-white/10'
                    }`}>
                    <span className="text-pb-400 font-bold text-base">#{p.number}</span>
                    <span className="text-white font-medium flex-1">{p.name}</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                      {POSITION_LABELS[p.position]}
                    </span>
                    {isInLineup && (
                      <span className="text-yellow-500 text-xs">
                        P{preLineup.indexOf(p.id) + 1}
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

  // ── Live match view ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-navy-900 select-none">

      {/* ── ROTATION TOAST ───────────────────────────────────────────────── */}
      {rotationToast && (
        <div className="absolute top-28 left-1/2 -translate-x-1/2 z-50 bg-vr-600 text-white font-bold px-5 py-2 rounded-full text-sm shadow-lg animate-bounce pointer-events-none">
          ⟳ Rotation! New server in P1
        </div>
      )}
      {liberoToast && (
        <div className="absolute top-40 left-1/2 -translate-x-1/2 z-50 bg-pb-600 text-white font-bold px-5 py-2 rounded-full text-sm shadow-lg animate-bounce pointer-events-none">
          ↕ Libero out — partner back in P4
        </div>
      )}

      {/* ── SCOREBOARD ───────────────────────────────────────────────────── */}
      <div className="bg-navy-800 border-b border-white/10 px-3 py-2 shrink-0">
        <div className="flex items-center gap-2">

          {/* Viking Roots */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-1">
              {weAreServing && <span className="text-sm animate-pulse">🏐</span>}
              <p className={`text-xs font-bold tracking-wide ${weAreServing ? 'text-pb-300' : 'text-pb-400/60'}`}>
                VIKING ROOTS
              </p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <button key={i} onClick={() => setOurTimeouts(t => t === i+1 ? i : i+1)}
                    className={`tap-btn w-3 h-3 rounded-full border ${i < ourTimeouts ? 'bg-vr-500 border-vr-400' : 'bg-transparent border-white/30'}`} />
                ))}
              </div>
              <button onClick={() => setOurScore(s => s + 1)}
                className="tap-btn text-4xl font-black text-white leading-none w-14 text-center">
                {String(ourScore).padStart(2, '0')}
              </button>
              <button onClick={() => setOurScore(s => Math.max(0, s - 1))}
                className="tap-btn text-gray-600 text-xs px-1">−</button>
            </div>
          </div>

          {/* Center */}
          <div className="flex flex-col items-center shrink-0 px-1">
            <div className="flex gap-1 mb-1">
              {sets.map((_, i) => (
                <button key={i} onClick={() => setCurrentSet(i)}
                  className={`tap-btn w-7 h-7 rounded-lg text-xs font-bold ${i === currentSet ? 'bg-vr-600 text-white' : 'bg-navy-600 text-gray-400'}`}>
                  S{i+1}
                </button>
              ))}
              <button onClick={nextSet} className="tap-btn w-7 h-7 rounded-lg text-xs font-bold bg-navy-600 text-gray-400 border border-white/10">+</button>
            </div>
            <span className="text-gray-500 text-base font-bold leading-none">VS</span>
          </div>

          {/* Opponent */}
          <div className="flex-1 flex flex-col items-center">
            <div className="flex items-center gap-1">
              <p className={`text-xs font-bold tracking-wide truncate ${!weAreServing ? 'text-gray-300' : 'text-gray-500'}`}>
                {opponent.toUpperCase()}
              </p>
              {weAreServing === false && <span className="text-sm animate-pulse">🏐</span>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <button onClick={() => setTheirScore(s => Math.max(0, s - 1))}
                className="tap-btn text-gray-600 text-xs px-1">−</button>
              <button onClick={() => setTheirScore(s => s + 1)}
                className="tap-btn text-4xl font-black text-white leading-none w-14 text-center">
                {String(theirScore).padStart(2, '0')}
              </button>
              <div className="flex gap-1">
                {[0,1,2].map(i => (
                  <button key={i} onClick={() => setTheirTimeouts(t => t === i+1 ? i : i+1)}
                    className={`tap-btn w-3 h-3 rounded-full border ${i < theirTimeouts ? 'bg-gray-400 border-gray-300' : 'bg-transparent border-white/30'}`} />
                ))}
              </div>
            </div>
          </div>

          <button onClick={() => setShowEndDialog(true)}
            className="tap-btn bg-green-800 text-white text-xs font-bold px-2 py-2 rounded-lg shrink-0">
            END
          </button>
        </div>
      </div>

      {/* ── SERVE TOGGLE + UNDO + ROTATION ────────────────────────────────── */}
      <div className="bg-navy-800/60 border-b border-white/5 px-3 py-1.5 flex items-center gap-2 shrink-0">
        {/* Serve toggle */}
        <button
          onClick={() => setWeAreServing(s => !s)}
          className={`tap-btn px-3 py-1 rounded-lg text-xs font-bold border ${
            weAreServing ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'
          }`}
        >
          {weAreServing ? '🏐 Our Serve' : '🏐 Their Serve'}
        </button>

        <button onClick={() => { setRotation(prev => checkLiberoRotation(doRotate(prev), liberoPair)) }}
          className="tap-btn bg-navy-600 border border-white/10 px-3 py-1 rounded-lg text-gray-300 text-xs font-bold">
          ⟳ Rotate
        </button>

        <button onClick={() => setShowRotationEditor(r => !r)}
          className={`tap-btn px-3 py-1 rounded-lg text-xs font-bold border ${showRotationEditor ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-300'}`}>
          ✎ Edit
        </button>

        <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${subCount >= 10 ? 'bg-red-900/40 border-red-500/60 text-red-300' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
          Subs {subCount}/12
        </div>

        {/* Undo */}
        <button
          onClick={undo}
          disabled={history.length === 0}
          className="tap-btn ml-auto bg-navy-600 border border-white/10 disabled:opacity-30 px-3 py-1 rounded-lg text-gray-300 text-xs font-bold flex items-center gap-1"
        >
          ↩ Undo
          {history.length > 0 && (
            <span className="bg-vr-600 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* ── AUTO-SCORE LEGEND ─────────────────────────────────────────────── */}
      <div className="bg-navy-900 border-b border-white/5 px-3 py-1 flex items-center gap-3 text-[10px] shrink-0">
        <span className="text-gray-600">Auto:</span>
        <span className="text-green-400">KILL/ACE/BS → +1 us</span>
        <span className="text-red-400">ERR/SE/Pass 0 → +1 them</span>
        <span className="text-vr-400 ml-auto">Side-out → auto rotate</span>
      </div>

      {/* ── COURT GRID ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="grid grid-rows-2 gap-2 mb-2">
          {COURT_LAYOUT.map((row, rowIdx) => (
            <div key={rowIdx} className="grid grid-cols-3 gap-2">
              {row.map((slotIdx) => {
                const playerId = rotation[slotIdx]
                const player = players.find(p => p.id === playerId)
                const ps = playerId ? setStats[playerId] : null
                const posLabel = POSITION_NUMS[slotIdx]
                const isServer = slotIdx === 0 && weAreServing === true
                const isExpanded = expandedPlayer === playerId

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
                    className={`border rounded-2xl overflow-hidden flex flex-col ${
                      isServer
                        ? 'bg-vr-900/60 border-vr-500/60'
                        : isExpanded
                          ? 'bg-navy-700 border-vr-500/40'
                          : 'bg-navy-700 border-white/10'
                    }`}>

                    {/* Card header */}
                    <div className={`flex items-center gap-2 px-2.5 pt-2 pb-1.5 border-b border-white/5 ${isServer ? 'bg-vr-800/40' : ''}`}>
                      <div className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 ${isServer ? 'bg-vr-600 border-vr-400' : 'bg-vr-800 border-vr-500/40'}`}>
                        <span className="text-pb-400 font-black text-sm">#{player.number}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          {isServer && <span className="text-xs">🏐</span>}
                          <p className="text-white font-bold text-sm leading-tight truncate">{player.name}</p>
                        </div>
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[player.position]}`}>
                          {POSITION_LABELS[player.position]}
                        </span>
                      </div>
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        <span className="text-white/20 text-[10px]">{posLabel}</span>
                        <button
                          onClick={() => setSubbingOutSlot(slotIdx)}
                          className="tap-btn bg-pb-700/50 border border-pb-500/40 text-pb-300 text-[10px] font-bold px-2 py-0.5 rounded-lg leading-tight">
                          SUB
                        </button>
                        <button onClick={() => setExpandedPlayer(isExpanded ? null : playerId)}
                          className={`tap-btn text-[10px] ${isExpanded ? 'text-vr-400' : 'text-gray-600'}`}>
                          {isExpanded ? '▲' : '▼'}
                        </button>
                      </div>
                    </div>

                    {/* Stat chips */}
                    <div className="px-2 pt-1.5 pb-1 flex flex-col gap-1">
                      {CHIP_ROWS.map((row, ri) => (
                        <div key={ri} className="grid grid-cols-4 gap-1">
                          {row.map(chip => (
                            <button key={chip.key}
                              onClick={() => {
                                if (chip.isErrorTrigger) {
                                  setPendingError({ playerId, type: chip.key === 'attackErrors' ? 'attack' : 'serve' })
                                } else {
                                  adjust(playerId, chip.key, 1)
                                }
                              }}
                              onContextMenu={e => { e.preventDefault(); adjust(playerId, chip.key, -1) }}
                              className={`tap-btn border rounded-lg py-1 px-0.5 text-center ${chip.bg}`}>
                              <p className={`text-xs font-bold leading-none ${chip.color}`}>{ps[chip.key] as number}</p>
                              <p className="text-white/30 text-[9px] leading-none mt-0.5">{chip.label}</p>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Pass rating */}
                    <div className="px-2 pb-2">
                      <div className="flex items-center gap-1">
                        <span className="text-gray-600 text-[10px] w-6 shrink-0">PA</span>
                        <span className="text-pb-400 text-xs font-bold w-8">
                          {ps.passAttempts > 0 ? (ps.passRatingTotal / ps.passAttempts).toFixed(1) : '—'}
                        </span>
                        <div className="flex gap-1 flex-1">
                          {[0,1,2,3].map(r => (
                            <button key={r}
                              onClick={() => r === 0 ? setPendingError({ playerId, type: 'pass' }) : adjustPass(playerId, r)}
                              className={`tap-btn flex-1 rounded text-xs font-bold py-1 border ${
                                r === 0 ? 'border-red-600/60 bg-red-900/30 text-red-300' :
                                r === 1 ? 'border-orange-700/50 bg-orange-900/20 text-orange-300' :
                                r === 2 ? 'border-yellow-700/50 bg-yellow-900/20 text-yellow-300' :
                                'border-green-700/50 bg-green-900/20 text-green-300'
                              }`}>{r}</button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Expanded extras */}
                    {isExpanded && (
                      <div className="border-t border-white/10 px-2 py-2 bg-navy-800/60">
                        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                          {([
                            { label: 'Atk Att', key: 'attackAttempts' as keyof PlayerStats },
                            { label: 'Srv Att', key: 'serveAttempts'  as keyof PlayerStats },
                            { label: 'Blk Ast', key: 'blockAssists'   as keyof PlayerStats },
                            { label: 'Set Err', key: 'settingErrors'  as keyof PlayerStats },
                          ]).map(({ label, key }) => (
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

                        {/* Error breakdown */}
                        {(ps.attackErrors > 0 || ps.serveErrors > 0 || (ps.passZeroShank + ps.passZeroAce + ps.passZeroOverpass) > 0) && (
                          <div className="bg-navy-900/50 rounded-lg p-2 mb-2">
                            <p className="text-gray-600 text-[10px] font-bold uppercase mb-1">Error Breakdown</p>
                            {ps.attackErrors > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {([['Missed', ps.atkErrMissed], ['Blocked', ps.atkErrBlocked], ['Out', ps.atkErrOut], ['Net', ps.atkErrNet]] as [string,number][])
                                  .filter(([,v]) => v > 0).map(([l,v]) => (
                                  <span key={l} className="text-[10px] bg-red-900/40 text-red-300 px-1.5 py-0.5 rounded">{l}: {v}</span>
                                ))}
                              </div>
                            )}
                            {ps.serveErrors > 0 && (
                              <div className="flex flex-wrap gap-1 mb-1">
                                {([['Missed', ps.srvErrMissed], ['Net', ps.srvErrNet], ['Out', ps.srvErrOut], ['Foot', ps.srvErrFoot]] as [string,number][])
                                  .filter(([,v]) => v > 0).map(([l,v]) => (
                                  <span key={l} className="text-[10px] bg-red-900/30 text-red-400 px-1.5 py-0.5 rounded">{l}: {v}</span>
                                ))}
                              </div>
                            )}
                            {(ps.passZeroShank + ps.passZeroAce + ps.passZeroOverpass) > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {([['Shank', ps.passZeroShank], ['Aced', ps.passZeroAce], ['Overpass', ps.passZeroOverpass]] as [string,number][])
                                  .filter(([,v]) => v > 0).map(([l,v]) => (
                                  <span key={l} className="text-[10px] bg-orange-900/30 text-orange-300 px-1.5 py-0.5 rounded">{l}: {v}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <button onClick={() => {
                          if (ps.passAttempts > 0) {
                            const avg = ps.passRatingTotal / ps.passAttempts
                            setSets(prev => prev.map((s, i) => i !== currentSet ? s : {
                              ...s, [playerId]: { ...s[playerId], passRatingTotal: Math.max(0, ps.passRatingTotal - avg), passAttempts: ps.passAttempts - 1 }
                            }))
                            if (Math.round(avg) === 0) setTheirScore(s => Math.max(0, s - 1))
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

        {/* Bench */}
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
                      {([
                        { key: 'kills' as keyof PlayerStats, label: 'K', color: 'text-green-400' },
                        { key: 'digs'  as keyof PlayerStats, label: 'D', color: 'text-cyan-400' },
                      ]).map(({ key, label, color }) => (
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

      {/* ── ERROR TYPE PICKER ─────────────────────────────────────────────── */}
      {pendingError && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setPendingError(null)}>
          <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-white font-bold text-lg">
                {pendingError.type === 'attack' ? '⚡ Attack Error' : pendingError.type === 'serve' ? '🏐 Serve Error' : '0 Pass — What happened?'}
              </h3>
              <button onClick={() => setPendingError(null)} className="text-gray-500 text-2xl tap-btn">×</button>
            </div>
            <p className="text-gray-500 text-xs mb-4">Select the error type to record the stat + auto-score.</p>
            <div className="grid grid-cols-2 gap-3">
              {(pendingError.type === 'attack' ? ATTACK_ERROR_TYPES : pendingError.type === 'serve' ? SERVE_ERROR_TYPES : PASS_ZERO_TYPES).map(opt => (
                <button key={String(opt.key)}
                  onClick={() => {
                    if (pendingError.type === 'pass') {
                      commitPassZero(pendingError.playerId, opt.key)
                    } else {
                      commitError(pendingError.playerId, pendingError.type === 'attack' ? 'attackErrors' : 'serveErrors', opt.key)
                    }
                  }}
                  className="tap-btn bg-navy-700 border border-red-500/20 hover:border-red-500/50 rounded-2xl p-4 flex flex-col items-center gap-2">
                  <span className="text-3xl">{opt.emoji}</span>
                  <span className="text-white font-semibold text-sm">{opt.label}</span>
                  {opt.key === 'passZeroOverpass' && (
                    <span className="text-gray-500 text-[10px]">no auto-point</span>
                  )}
                </button>
              ))}
            </div>
            <button onClick={() => setPendingError(null)} className="tap-btn w-full mt-4 py-3 rounded-xl border border-white/10 text-gray-500 text-sm">
              Cancel (don't record)
            </button>
          </div>
        </div>
      )}

      {/* ── ROTATION EDITOR ──────────────────────────────────────────────── */}
      {showRotationEditor && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => { setShowRotationEditor(false); setAssigningSlot(null) }}>
          <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-4 max-h-[60vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">
                {assigningSlot !== null ? `Assign player to ${POSITION_NUMS[assigningSlot]}` : 'Rotation / Subs'}
              </h3>
              <button onClick={() => { setShowRotationEditor(false); setAssigningSlot(null) }} className="text-gray-400 text-2xl tap-btn">×</button>
            </div>
            {assigningSlot === null && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {COURT_LAYOUT.flat().map(slotIdx => {
                  const pid = rotation[slotIdx]
                  const p = players.find(pl => pl.id === pid)
                  return (
                    <button key={slotIdx} onClick={() => setAssigningSlot(slotIdx)}
                      className={`tap-btn bg-navy-700 border rounded-xl p-3 text-left ${slotIdx === 0 && weAreServing ? 'border-vr-500/60' : 'border-white/10'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <p className="text-white/30 text-xs">{POSITION_NUMS[slotIdx]}</p>
                        {slotIdx === 0 && weAreServing && <span className="text-xs">🏐</span>}
                      </div>
                      {p ? (
                        <>
                          <p className="text-white font-semibold text-sm truncate">{p.name}</p>
                          <p className="text-pb-400 text-xs">#{p.number}</p>
                        </>
                      ) : <p className="text-white/20 text-sm">— empty —</p>}
                    </button>
                  )
                })}
              </div>
            )}
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

      {/* ── SUB PICKER ───────────────────────────────────────────────────── */}
      {subbingOutSlot !== null && (() => {
        const outPlayer = players.find(p => p.id === rotation[subbingOutSlot])
        const eligible  = players.filter(p => !onCourtIds.has(p.id))
        return (
          <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setSubbingOutSlot(null)}>
            <div className="w-full bg-navy-800 border-t border-white/10 rounded-t-2xl p-4 max-h-[65vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-white font-bold text-lg">Sub In For</h3>
                <button onClick={() => setSubbingOutSlot(null)} className="text-gray-400 text-2xl tap-btn">×</button>
              </div>
              {outPlayer && (
                <div className="flex items-center gap-2 bg-navy-700 rounded-xl px-3 py-2 mb-3">
                  <span className="text-red-400 text-xs font-bold">OUT</span>
                  <span className="text-pb-400 font-bold">#{outPlayer.number}</span>
                  <span className="text-white font-medium">{outPlayer.name}</span>
                  <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[outPlayer.position]}`}>
                    {POSITION_LABELS[outPlayer.position]}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between mb-2">
                <p className="text-gray-500 text-xs">Select player coming IN from bench:</p>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${subCount >= 9 ? 'bg-red-900/50 text-red-300' : 'bg-navy-600 text-gray-400'}`}>
                  {subCount}/12 subs used
                </span>
              </div>

              {eligible.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No bench players available.</p>
              ) : (
                <div className="space-y-2">
                  {eligible.map(p => {
                    const isLibero = p.position === 'libero' || p.position === 'ds'
                    return (
                      <button key={p.id} onClick={() => doSub(subbingOutSlot, p.id)}
                        className="tap-btn w-full bg-navy-700 border border-white/10 hover:border-green-500/50 rounded-xl p-3 flex items-center gap-3">
                        <span className="text-green-400 text-xs font-bold">IN</span>
                        <span className="text-pb-400 font-bold">#{p.number}</span>
                        <span className="text-white font-medium flex-1 text-left">{p.name}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                          {POSITION_LABELS[p.position]}
                        </span>
                        {isLibero && (
                          <span className="text-vr-300 text-[10px] font-bold">FREE</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* ── SUB LIMIT ALERT ──────────────────────────────────────────────── */}
      {showSubAlert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="bg-navy-800 border-2 border-red-500/60 rounded-2xl p-6 w-full max-w-sm text-center">
            <div className="text-5xl mb-3">⚠️</div>
            <h3 className="text-xl font-bold text-white mb-2">Substitution Limit Reached</h3>
            <p className="text-red-300 font-semibold text-lg mb-1">10 subs used — 2 remaining</p>
            <p className="text-gray-400 text-sm mb-5">
              You have 2 substitutions left this set (12 max).
              Libero swaps are still free and unlimited.
            </p>
            <button onClick={() => setShowSubAlert(false)}
              className="tap-btn w-full bg-red-700 text-white font-bold py-3 rounded-xl">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* ── END MATCH ────────────────────────────────────────────────────── */}
      {showEndDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-navy-800 border border-vr-700/50 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-1">End Match?</h3>
            <p className="text-pb-400 text-sm mb-4">Viking Roots {ourScore} – {theirScore} {opponent}</p>
            <p className="text-gray-400 text-sm mb-5">{sets.length} set{sets.length !== 1 ? 's' : ''} tracked.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowEndDialog(false)}
                className="tap-btn flex-1 py-3 rounded-xl border border-white/20 text-gray-300 font-semibold">Keep Playing</button>
              <button onClick={confirmEnd}
                className="tap-btn flex-1 py-3 rounded-xl bg-green-700 text-white font-bold">Save & End</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
