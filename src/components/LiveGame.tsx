import { useState } from 'react'
import type { Player, PlayerStats, SetStats, Match } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'

interface StatDef {
  key: keyof PlayerStats
  label: string
  short: string
  color: string
}

const STAT_DEFS: StatDef[] = [
  { key: 'kills',          label: 'Kills',       short: 'K',   color: 'text-green-400' },
  { key: 'attackErrors',   label: 'Atk Err',     short: 'E',   color: 'text-red-400' },
  { key: 'attackAttempts', label: 'Atk Att',     short: 'TA',  color: 'text-blue-300' },
  { key: 'aces',           label: 'Aces',        short: 'A',   color: 'text-yellow-400' },
  { key: 'serveErrors',    label: 'Srv Err',     short: 'SE',  color: 'text-red-400' },
  { key: 'serveAttempts',  label: 'Srv Att',     short: 'SA',  color: 'text-blue-300' },
  { key: 'digs',           label: 'Digs',        short: 'D',   color: 'text-cyan-400' },
  { key: 'soloBlocks',     label: 'Solo Blk',    short: 'BS',  color: 'text-purple-400' },
  { key: 'blockAssists',   label: 'Blk Ast',     short: 'BA',  color: 'text-purple-300' },
  { key: 'settingAssists', label: 'Assists',     short: 'AST', color: 'text-orange-400' },
  { key: 'settingErrors',  label: 'Set Err',     short: 'SE2', color: 'text-red-400' },
]

interface Props {
  players: Player[]
  onSaveMatch: (match: Match) => void
}

export default function LiveGame({ players, onSaveMatch }: Props) {
  const [opponent, setOpponent] = useState('')
  const [currentSet, setCurrentSet] = useState(0)
  const [sets, setSets] = useState<SetStats[]>([buildSetStats(players)])
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [ourScore, setOurScore] = useState('')
  const [theirScore, setTheirScore] = useState('')
  const [gameStarted, setGameStarted] = useState(false)

  function buildSetStats(ps: Player[]): SetStats {
    const s: SetStats = {}
    for (const p of ps) s[p.id] = EMPTY_STATS()
    return s
  }

  function adjust(playerId: string, key: keyof PlayerStats, delta: number) {
    setSets(prev => {
      const next = prev.map((s, i) => {
        if (i !== currentSet) return s
        const ps = { ...s[playerId] }
        const val = Math.max(0, (ps[key] as number) + delta)
        return { ...s, [playerId]: { ...ps, [key]: val } }
      })
      return next
    })
  }

  function adjustPass(playerId: string, rating: number) {
    setSets(prev => prev.map((s, i) => {
      if (i !== currentSet) return s
      const ps = { ...s[playerId] }
      return { ...s, [playerId]: {
        ...ps,
        passRatingTotal: ps.passRatingTotal + rating,
        passAttempts: ps.passAttempts + 1,
      }}
    }))
  }

  function undoPass(playerId: string) {
    setSets(prev => prev.map((s, i) => {
      if (i !== currentSet) return s
      const ps = { ...s[playerId] }
      if (ps.passAttempts === 0) return s
      const avgRating = ps.passRatingTotal / ps.passAttempts
      return { ...s, [playerId]: {
        ...ps,
        passRatingTotal: Math.max(0, ps.passRatingTotal - avgRating),
        passAttempts: ps.passAttempts - 1,
      }}
    }))
  }

  function nextSet() {
    setSets(prev => [...prev, buildSetStats(players)])
    setCurrentSet(c => c + 1)
    setSelectedPlayer(null)
  }

  function startGame() {
    if (!opponent.trim()) return
    setSets([buildSetStats(players)])
    setCurrentSet(0)
    setSelectedPlayer(null)
    setGameStarted(true)
  }

  function confirmSave() {
    const match: Match = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      opponent: opponent.trim(),
      ourScore,
      theirScore,
      sets,
      notes: '',
    }
    onSaveMatch(match)
    setShowSaveDialog(false)
    setGameStarted(false)
    setOpponent('')
    setOurScore('')
    setTheirScore('')
    setSets([buildSetStats(players)])
    setCurrentSet(0)
    setSelectedPlayer(null)
  }

  if (!gameStarted) {
    return (
      <div className="p-6 max-w-md mx-auto flex flex-col gap-6 mt-8">
        <h2 className="text-2xl font-bold text-white text-center">New Match</h2>
        {players.length === 0 && (
          <p className="text-yellow-400 text-center text-sm">Add players to your roster first.</p>
        )}
        <div>
          <label className="block text-gray-300 text-sm mb-1">Opponent</label>
          <input
            className="w-full bg-navy-700 border border-white/20 rounded-xl px-4 py-4 text-white text-xl outline-none focus:border-blue-500"
            placeholder="e.g. Lincoln 14U"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
          />
        </div>
        <button
          disabled={!opponent.trim() || players.length === 0}
          onClick={startGame}
          className="tap-btn w-full bg-blue-600 disabled:opacity-40 text-white font-bold py-5 rounded-2xl text-xl"
        >
          Start Match
        </button>
      </div>
    )
  }

  const setStats = sets[currentSet]
  const player = selectedPlayer ? players.find(p => p.id === selectedPlayer) : null
  const ps = selectedPlayer ? setStats[selectedPlayer] : null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="text-gray-400 text-xs">vs</p>
          <p className="text-white font-bold text-lg leading-tight">{opponent}</p>
        </div>
        <div className="flex gap-1">
          {sets.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentSet(i); setSelectedPlayer(null) }}
              className={`tap-btn w-10 h-10 rounded-xl font-bold text-sm ${
                i === currentSet ? 'bg-blue-600 text-white' : 'bg-navy-600 text-gray-400'
              }`}
            >
              S{i + 1}
            </button>
          ))}
        </div>
        <button onClick={nextSet} className="tap-btn bg-navy-600 border border-white/20 px-3 py-2 rounded-xl text-gray-300 text-sm font-medium">
          +Set
        </button>
        <button onClick={() => setShowSaveDialog(true)} className="tap-btn bg-green-700 text-white px-3 py-2 rounded-xl text-sm font-bold">
          End
        </button>
      </div>

      {/* Player grid */}
      <div className="flex-1 overflow-y-auto p-3">
        {!selectedPlayer ? (
          <>
            <p className="text-gray-500 text-xs text-center mb-3">Tap a player to enter stats</p>
            <div className="grid grid-cols-2 gap-3">
              {players.map(p => {
                const s = setStats[p.id]
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedPlayer(p.id)}
                    className="tap-btn bg-navy-700 border border-white/10 rounded-2xl p-4 text-left"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-white font-bold text-lg">#{p.number}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                        {POSITION_LABELS[p.position]}
                      </span>
                    </div>
                    <p className="text-white font-semibold text-base truncate mb-3">{p.name}</p>
                    <div className="grid grid-cols-4 gap-1 text-center">
                      {[
                        { v: s.kills,    l: 'K' },
                        { v: s.aces,     l: 'A' },
                        { v: s.digs,     l: 'D' },
                        { v: s.soloBlocks + s.blockAssists, l: 'B' },
                      ].map(({ v, l }) => (
                        <div key={l}>
                          <p className="text-white font-bold text-base">{v}</p>
                          <p className="text-gray-500 text-xs">{l}</p>
                        </div>
                      ))}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        ) : player && ps ? (
          <div>
            <button onClick={() => setSelectedPlayer(null)} className="tap-btn text-blue-400 text-sm mb-3 flex items-center gap-1">
              ← All Players
            </button>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-white font-bold text-2xl">#{player.number}</span>
              <span className={`text-sm font-bold px-2 py-1 rounded-full text-white ${POSITION_COLORS[player.position]}`}>
                {POSITION_LABELS[player.position]}
              </span>
              <span className="text-white font-semibold text-xl">{player.name}</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {STAT_DEFS.map(def => (
                <div key={def.key} className="bg-navy-700 border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3">
                  <span className="text-gray-400 text-sm w-20 shrink-0">{def.label}</span>
                  <span className={`font-bold text-xl w-10 text-center ${def.color}`}>
                    {ps[def.key] as number}
                  </span>
                  <div className="flex gap-3 ml-auto">
                    <button
                      onClick={() => adjust(player.id, def.key, -1)}
                      className="tap-btn w-12 h-12 rounded-xl bg-navy-600 border border-white/10 text-white text-2xl font-bold flex items-center justify-center"
                    >
                      −
                    </button>
                    <button
                      onClick={() => adjust(player.id, def.key, 1)}
                      className="tap-btn w-12 h-12 rounded-xl bg-blue-700 text-white text-2xl font-bold flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}

              {/* Pass rating */}
              <div className="bg-navy-700 border border-white/10 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-gray-400 text-sm w-20 shrink-0">Pass Avg</span>
                  <span className="font-bold text-xl text-cyan-400">
                    {ps.passAttempts > 0 ? (ps.passRatingTotal / ps.passAttempts).toFixed(2) : '—'}
                  </span>
                  <span className="text-gray-500 text-sm ml-1">({ps.passAttempts})</span>
                  <button
                    onClick={() => undoPass(player.id)}
                    className="tap-btn ml-auto text-gray-400 text-sm px-3 py-1.5 rounded-lg border border-white/10"
                  >
                    Undo
                  </button>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map(r => (
                    <button
                      key={r}
                      onClick={() => adjustPass(player.id, r)}
                      className={`tap-btn py-4 rounded-xl font-bold text-xl border-2 ${
                        r === 0 ? 'border-red-500/50 bg-red-900/30 text-red-300' :
                        r === 1 ? 'border-orange-500/50 bg-orange-900/30 text-orange-300' :
                        r === 2 ? 'border-yellow-500/50 bg-yellow-900/30 text-yellow-300' :
                        'border-green-500/50 bg-green-900/30 text-green-300'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Save dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-navy-800 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold text-white mb-4">End Match</h3>
            <p className="text-gray-400 text-sm mb-4">Final score vs {opponent}</p>
            <div className="flex gap-3 mb-6">
              <div className="flex-1">
                <label className="text-gray-400 text-xs block mb-1">Our Score</label>
                <input
                  className="w-full bg-navy-600 border border-white/20 rounded-xl px-3 py-3 text-white text-xl text-center outline-none focus:border-blue-500"
                  value={ourScore}
                  onChange={e => setOurScore(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div className="flex items-end pb-3 text-gray-400 text-2xl font-bold">—</div>
              <div className="flex-1">
                <label className="text-gray-400 text-xs block mb-1">Their Score</label>
                <input
                  className="w-full bg-navy-600 border border-white/20 rounded-xl px-3 py-3 text-white text-xl text-center outline-none focus:border-blue-500"
                  value={theirScore}
                  onChange={e => setTheirScore(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSaveDialog(false)} className="tap-btn flex-1 py-3 rounded-xl border border-white/20 text-gray-300 font-semibold">
                Cancel
              </button>
              <button onClick={confirmSave} className="tap-btn flex-1 py-3 rounded-xl bg-green-700 text-white font-bold">
                Save Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
