import { useState } from 'react'
import type { Player, Match, PracticeSession } from '../types'
import { POSITION_LABELS, POSITION_COLORS } from '../types'
import { computeImpactScores, initialTwoTeams, type PresetTeams } from '../utils/teamSplit'

interface Props {
  players: Player[]
  matches: Match[]
  practices: PracticeSession[]
  presetTeams?: PresetTeams | null
  onSave: (s: PracticeSession) => void
  onCancel: () => void
}

const STREAK_GOAL = 3
const DIG_GOAL = 10

type Action = 'kill' | 'dig' | 'error'

export default function ThreeBeforeTenDrill({ players, matches, practices, presetTeams, onSave, onCancel }: Props) {
  const scores = computeImpactScores(players, matches, practices)
  const [teamA, teamB] = initialTwoTeams(players, scores, presetTeams)

  // Which preset/auto team is hitting first — the other plays defense.
  const [hittingIsA, setHittingIsA] = useState(true)
  const hittingTeam = hittingIsA ? teamA : teamB
  const defenseTeam = hittingIsA ? teamB : teamA

  const [streak, setStreak] = useState(0)
  const [defenseTotal, setDefenseTotal] = useState(0)
  const [history, setHistory] = useState<Action[]>([])

  const winner: 'hitting' | 'defense' | null =
    streak >= STREAK_GOAL ? 'hitting' : defenseTotal >= DIG_GOAL ? 'defense' : null
  const decided = winner !== null

  function playerById(id: string) { return players.find(p => p.id === id) }
  const hittingPlayers = hittingTeam.playerIds.map(playerById).filter((p): p is Player => !!p)
  const defensePlayers = defenseTeam.playerIds.map(playerById).filter((p): p is Player => !!p)

  function logKill() {
    if (decided) return
    setStreak(s => s + 1)
    setHistory(h => [...h, 'kill'])
  }
  function logDig() {
    if (decided) return
    setDefenseTotal(d => d + 1)
    setStreak(0)
    setHistory(h => [...h, 'dig'])
  }
  function logError() {
    if (decided) return
    setStreak(0)
    setHistory(h => [...h, 'error'])
  }
  function undo() {
    if (history.length === 0) return
    const last = history[history.length - 1]
    const prev = history.slice(0, -1)
    if (last === 'kill') {
      setStreak(s => Math.max(0, s - 1))
    } else {
      // Undoing a 'dig' or 'error' that reset the streak — recompute it as
      // the run of 'kill's immediately preceding that event in history.
      if (last === 'dig') setDefenseTotal(d => Math.max(0, d - 1))
      let run = 0
      for (let i = prev.length - 1; i >= 0 && prev[i] === 'kill'; i--) run++
      setStreak(run)
    }
    setHistory(prev)
  }

  function save() {
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: '3 Before 10',
      teamLabel: '',
      notes: '',
      scrimmages: [],
      drillType: 'three_before_ten',
      threeBeforeTen: {
        hittingTeam, defenseTeam,
        streakGoal: STREAK_GOAL, digGoal: DIG_GOAL,
        streak, defenseTotal, winner,
      },
    }
    onSave(session)
  }

  const streakPct = Math.min(100, (streak / STREAK_GOAL) * 100)
  const digPct = Math.min(100, (defenseTotal / DIG_GOAL) * 100)

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <button onClick={onCancel} className="tap-btn text-pb-400 text-sm mb-4 flex items-center gap-1">
        ← Cancel
      </button>

      <h2 className="text-2xl font-bold text-white mb-1">3 Before 10</h2>
      <p className="text-gray-500 text-sm mb-5">
        Hitting lines vs. a full-6 defense with blockers. Hitters win with {STREAK_GOAL} kills in a row; defense wins first with {DIG_GOAL} total digs/blocks. Any dig, block, or hitting error resets the streak.
      </p>

      {/* Side assignment */}
      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Who's Hitting First?</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setHittingIsA(true)}
            className={`tap-btn flex-1 py-2.5 rounded-xl text-sm font-bold border ${hittingIsA ? 'bg-vr-600 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
            {teamA.name}
          </button>
          <button onClick={() => setHittingIsA(false)}
            className={`tap-btn flex-1 py-2.5 rounded-xl text-sm font-bold border ${!hittingIsA ? 'bg-vr-600 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
            {teamB.name}
          </button>
        </div>
        <p className="text-gray-600 text-[10px]">
          {presetTeams && (presetTeams.team1.length > 0 || presetTeams.team2.length > 0)
            ? "Using today's Team 1 / Team 2 split."
            : 'Auto-split by season stats.'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <div className="border border-vr-500/50 bg-vr-900/20 rounded-2xl p-4">
          <p className="text-vr-300 text-xs font-bold uppercase tracking-widest mb-3">Hitting — {hittingTeam.name}</p>
          <div className="flex flex-wrap gap-1.5">
            {hittingPlayers.length === 0 && <p className="text-gray-600 text-xs">No players</p>}
            {hittingPlayers.map(p => (
              <span key={p.id} className="flex items-center gap-1.5 bg-navy-700 border border-white/10 rounded-full pl-1 pr-2.5 py-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>{POSITION_LABELS[p.position]}</span>
                <span className="text-white text-xs font-medium">{p.name}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="border border-cyan-500/50 bg-cyan-900/20 rounded-2xl p-4">
          <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest mb-3">Defense — {defenseTeam.name}</p>
          <div className="flex flex-wrap gap-1.5">
            {defensePlayers.length === 0 && <p className="text-gray-600 text-xs">No players</p>}
            {defensePlayers.map(p => (
              <span key={p.id} className="flex items-center gap-1.5 bg-navy-700 border border-white/10 rounded-full pl-1 pr-2.5 py-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>{POSITION_LABELS[p.position]}</span>
                <span className="text-white text-xs font-medium">{p.name}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Live counters */}
      <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 mb-5">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <p className="text-white text-3xl font-black leading-none">{streak}<span className="text-gray-600 text-lg">/{STREAK_GOAL}</span></p>
            <p className="text-gray-500 text-xs mt-0.5">kill streak</p>
            <div className="h-2 bg-navy-900 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-vr-500 rounded-full" style={{ width: `${streakPct}%` }} />
            </div>
          </div>
          <div>
            <p className="text-cyan-400 text-3xl font-black leading-none">{defenseTotal}<span className="text-gray-600 text-lg">/{DIG_GOAL}</span></p>
            <p className="text-gray-500 text-xs mt-0.5">total digs/blocks</p>
            <div className="h-2 bg-navy-900 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${digPct}%` }} />
            </div>
          </div>
        </div>

        {decided && (
          <div className={`mb-3 rounded-xl py-2.5 text-center font-bold text-sm ${
            winner === 'hitting' ? 'bg-green-900/40 border border-green-600/50 text-green-300' : 'bg-cyan-900/40 border border-cyan-600/50 text-cyan-300'
          }`}>
            {winner === 'hitting' ? `🏆 ${hittingTeam.name} wins! (${STREAK_GOAL} kills in a row)` : `🏆 ${defenseTeam.name} wins! (reached ${DIG_GOAL} digs/blocks)`}
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <button onClick={logKill} disabled={decided}
            className="tap-btn flex-1 py-4 rounded-xl text-sm font-black bg-vr-700 border border-vr-500 text-white disabled:opacity-30">
            Kill
          </button>
          <button onClick={logDig} disabled={decided}
            className="tap-btn flex-1 py-4 rounded-xl text-sm font-black bg-cyan-900/40 border border-cyan-600/50 text-cyan-300 disabled:opacity-30">
            Dig / Block
          </button>
          <button onClick={logError} disabled={decided}
            className="tap-btn flex-1 py-4 rounded-xl text-sm font-black bg-red-900/40 border border-red-600/50 text-red-300 disabled:opacity-30">
            Hit Error
          </button>
        </div>
        <button onClick={undo} disabled={history.length === 0}
          className="tap-btn w-full py-2.5 rounded-xl text-xs font-bold bg-navy-700 border border-white/10 text-gray-400 disabled:opacity-30">
          ↩ Undo
        </button>
      </div>

      <button onClick={save}
        className="tap-btn w-full bg-vr-600 text-white font-bold py-4 rounded-xl text-base">
        Save Drill
      </button>
    </div>
  )
}
