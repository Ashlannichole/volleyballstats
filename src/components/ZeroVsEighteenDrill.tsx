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

const SCORE_GOAL = 25
const ERROR_GOAL = 7

type Action = 'score' | 'error'

export default function ZeroVsEighteenDrill({ players, matches, practices, presetTeams, onSave, onCancel }: Props) {
  const scores = computeImpactScores(players, matches, practices)
  const [teamA, teamB] = initialTwoTeams(players, scores, presetTeams)

  // Which preset/auto team is starting at 0 — the other starts at 18.
  const [zeroIsA, setZeroIsA] = useState(true)
  const zeroTeam = zeroIsA ? teamA : teamB
  const eighteenTeam = zeroIsA ? teamB : teamA

  const [score, setScore] = useState(0)
  const [errors, setErrors] = useState(0)
  const [history, setHistory] = useState<Action[]>([])

  const winner: 'zero' | 'eighteen' | null =
    score >= SCORE_GOAL ? 'zero' : errors >= ERROR_GOAL ? 'eighteen' : null
  const decided = winner !== null

  function playerById(id: string) { return players.find(p => p.id === id) }
  const zeroPlayers = zeroTeam.playerIds.map(playerById).filter((p): p is Player => !!p)
  const eighteenPlayers = eighteenTeam.playerIds.map(playerById).filter((p): p is Player => !!p)

  function logScore() {
    if (decided) return
    setScore(s => s + 1)
    setHistory(h => [...h, 'score'])
  }
  function logError() {
    if (decided) return
    setErrors(e => e + 1)
    setHistory(h => [...h, 'error'])
  }
  function undo() {
    if (history.length === 0) return
    const last = history[history.length - 1]
    if (last === 'score') setScore(s => Math.max(0, s - 1))
    else setErrors(e => Math.max(0, e - 1))
    setHistory(history.slice(0, -1))
  }

  function save() {
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: '0 vs 18',
      teamLabel: '',
      notes: '',
      scrimmages: [],
      drillType: 'zero_vs_eighteen',
      zeroVsEighteen: {
        zeroTeam, eighteenTeam,
        scoreGoal: SCORE_GOAL, errorGoal: ERROR_GOAL,
        score, errors, winner,
      },
    }
    onSave(session)
  }

  const scorePct = Math.min(100, (score / SCORE_GOAL) * 100)
  const errorPct = Math.min(100, (errors / ERROR_GOAL) * 100)

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <button onClick={onCancel} className="tap-btn text-pb-400 text-sm mb-4 flex items-center gap-1">
        ← Cancel
      </button>

      <h2 className="text-2xl font-bold text-white mb-1">0 vs 18</h2>
      <p className="text-gray-500 text-sm mb-5">
        The 0-side scores on everything; the 18-side only scores on the 0-side's errors. 0-side wins by reaching {SCORE_GOAL} before {ERROR_GOAL} errors.
      </p>

      {/* Side assignment */}
      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Who Starts at 0?</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setZeroIsA(true)}
            className={`tap-btn flex-1 py-2.5 rounded-xl text-sm font-bold border ${zeroIsA ? 'bg-vr-600 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
            {teamA.name}
          </button>
          <button onClick={() => setZeroIsA(false)}
            className={`tap-btn flex-1 py-2.5 rounded-xl text-sm font-bold border ${!zeroIsA ? 'bg-vr-600 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
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
          <p className="text-vr-300 text-xs font-bold uppercase tracking-widest mb-3">0-Side — {zeroTeam.name}</p>
          <div className="flex flex-wrap gap-1.5">
            {zeroPlayers.length === 0 && <p className="text-gray-600 text-xs">No players</p>}
            {zeroPlayers.map(p => (
              <span key={p.id} className="flex items-center gap-1.5 bg-navy-700 border border-white/10 rounded-full pl-1 pr-2.5 py-1">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>{POSITION_LABELS[p.position]}</span>
                <span className="text-white text-xs font-medium">{p.name}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="border border-cyan-500/50 bg-cyan-900/20 rounded-2xl p-4">
          <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest mb-3">18-Side — {eighteenTeam.name}</p>
          <div className="flex flex-wrap gap-1.5">
            {eighteenPlayers.length === 0 && <p className="text-gray-600 text-xs">No players</p>}
            {eighteenPlayers.map(p => (
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
            <p className="text-white text-3xl font-black leading-none">{score}<span className="text-gray-600 text-lg">/{SCORE_GOAL}</span></p>
            <p className="text-gray-500 text-xs mt-0.5">0-side points</p>
            <div className="h-2 bg-navy-900 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-vr-500 rounded-full" style={{ width: `${scorePct}%` }} />
            </div>
          </div>
          <div>
            <p className="text-red-400 text-3xl font-black leading-none">{errors}<span className="text-gray-600 text-lg">/{ERROR_GOAL}</span></p>
            <p className="text-gray-500 text-xs mt-0.5">0-side errors</p>
            <div className="h-2 bg-navy-900 rounded-full overflow-hidden mt-2">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${errorPct}%` }} />
            </div>
          </div>
        </div>

        {decided && (
          <div className={`mb-3 rounded-xl py-2.5 text-center font-bold text-sm ${
            winner === 'zero' ? 'bg-green-900/40 border border-green-600/50 text-green-300' : 'bg-red-900/30 border border-red-600/40 text-red-300'
          }`}>
            {winner === 'zero' ? `🏆 ${zeroTeam.name} wins! (reached ${SCORE_GOAL} first)` : `🏆 ${eighteenTeam.name} wins! (0-side hit ${ERROR_GOAL} errors)`}
          </div>
        )}

        <div className="flex gap-2 mb-2">
          <button onClick={logScore} disabled={decided}
            className="tap-btn flex-1 py-4 rounded-xl text-sm font-black bg-vr-700 border border-vr-500 text-white disabled:opacity-30">
            + Point (0-side)
          </button>
          <button onClick={logError} disabled={decided}
            className="tap-btn flex-1 py-4 rounded-xl text-sm font-black bg-red-900/40 border border-red-600/50 text-red-300 disabled:opacity-30">
            + Error (0-side)
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
