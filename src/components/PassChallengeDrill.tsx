import { useState } from 'react'
import type { PracticeSession, PassChallengeRound } from '../types'

interface Props {
  onSave: (s: PracticeSession) => void
  onCancel: () => void
}

const DEFAULT_REPS_GOAL = 50
const DEFAULT_TARGET = 125

function blankRound(): PassChallengeRound {
  return { sideLabel: '', reps: [], serveErrors: 0 }
}

function roundStats(round: PassChallengeRound, repsGoal: number) {
  const count = round.reps.length
  const total = round.reps.reduce((n, r) => n + r, 0)
  const avg = count > 0 ? total / count : 0
  const complete = count >= repsGoal
  return { count, total, avg, complete }
}

export default function PassChallengeDrill({ onSave, onCancel }: Props) {
  const [name, setName] = useState('Pass Challenge')
  const [repsGoal] = useState(DEFAULT_REPS_GOAL)
  const [targetTotal] = useState(DEFAULT_TARGET)
  const [rounds, setRounds] = useState<PassChallengeRound[]>([blankRound()])
  const [roundIdx, setRoundIdx] = useState(0)

  const maxTotal = repsGoal * 3
  const current = rounds[roundIdx]
  const { count, total, avg, complete } = roundStats(current, repsGoal)
  const won = total >= targetTotal

  function updateCurrentRound(fn: (r: PassChallengeRound) => PassChallengeRound) {
    setRounds(prev => prev.map((r, i) => i === roundIdx ? fn(r) : r))
  }

  function logRep(rating: number) {
    if (count >= repsGoal) return
    updateCurrentRound(r => ({ ...r, reps: [...r.reps, rating] }))
  }

  function logServeError() {
    if (count >= repsGoal) return
    updateCurrentRound(r => ({ ...r, serveErrors: r.serveErrors + 1 }))
  }

  function undoLast() {
    updateCurrentRound(r => ({ ...r, reps: r.reps.slice(0, -1) }))
  }

  function setSideLabel(label: string) {
    updateCurrentRound(r => ({ ...r, sideLabel: label }))
  }

  function switchSides() {
    if (rounds.length < 2) {
      setRounds(prev => [...prev, blankRound()])
    }
    setRoundIdx(1)
  }

  function finish() {
    onSave({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: name.trim() || 'Pass Challenge',
      teamLabel: '',
      notes: '',
      scrimmages: [],
      drillType: 'pass_challenge',
      passChallenge: { repsGoal, targetTotal, rounds },
    })
  }

  const barPct = Math.min(100, (total / maxTotal) * 100)
  const targetPct = (targetTotal / maxTotal) * 100

  return (
    <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0 gap-2">
        <button onClick={onCancel} className="tap-btn text-gray-400 text-sm">Cancel</button>
        <input value={name} onChange={e => setName(e.target.value)}
          className="flex-1 bg-transparent text-center text-white font-bold text-sm outline-none truncate px-2" />
        <button onClick={finish} className="tap-btn text-vr-300 font-bold text-sm">End</button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-4 flex flex-col gap-4">
        {/* Round tabs */}
        <div className="flex gap-2">
          {rounds.map((r, i) => {
            const s = roundStats(r, repsGoal)
            return (
              <button key={i} onClick={() => setRoundIdx(i)}
                className={`tap-btn flex-1 py-2 rounded-xl text-xs font-bold border ${
                  i === roundIdx ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-700 border-white/10 text-gray-400'
                }`}>
                Round {i + 1}{s.complete ? (s.total >= targetTotal ? ' ✓' : ' ✗') : ''}
              </button>
            )
          })}
          {rounds.length < 2 && (
            <button onClick={switchSides}
              className="tap-btn flex-1 py-2 rounded-xl text-xs font-bold border border-dashed border-white/20 text-gray-500">
              + Switch Sides
            </button>
          )}
        </div>

        <input
          value={current.sideLabel}
          onChange={e => setSideLabel(e.target.value)}
          placeholder={`Who's receiving this round? (e.g. Black Team)`}
          className="w-full bg-navy-700 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pb-500"
        />

        {/* Progress */}
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-4">
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-white text-3xl font-black leading-none">{count}<span className="text-gray-600 text-lg">/{repsGoal}</span></p>
              <p className="text-gray-500 text-xs mt-0.5">serves received</p>
            </div>
            <div className="text-right">
              <p className={`text-3xl font-black leading-none ${avg >= 2.5 ? 'text-green-400' : 'text-yellow-400'}`}>{avg.toFixed(2)}</p>
              <p className="text-gray-500 text-xs mt-0.5">pass avg</p>
            </div>
          </div>

          <div className="relative h-3 bg-navy-900 rounded-full overflow-hidden mb-1">
            <div className={`h-full rounded-full ${won ? 'bg-green-500' : 'bg-pb-500'}`} style={{ width: `${barPct}%` }} />
            <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" style={{ left: `${targetPct}%` }} />
          </div>
          <p className="text-gray-500 text-[11px] text-center">
            {total} / {maxTotal} points · win line at {targetTotal}
          </p>

          {complete && (
            <div className={`mt-3 rounded-xl py-2.5 text-center font-bold text-sm ${
              won ? 'bg-green-900/40 border border-green-600/50 text-green-300' : 'bg-red-900/30 border border-red-600/40 text-red-300'
            }`}>
              {won ? `🏆 WON — ${total}/${maxTotal} (${avg.toFixed(2)} avg)` : `Fell short — ${total}/${maxTotal} (${avg.toFixed(2)} avg)`}
            </div>
          )}
        </div>

        {/* Entry buttons */}
        <div>
          <p className="text-gray-600 text-[10px] font-bold uppercase tracking-widest mb-1.5 text-center">Tap the pass rating for each serve received</p>
          <div className="grid grid-cols-5 gap-1.5">
            <button onClick={() => logRep(0)} disabled={complete}
              className="tap-btn py-4 rounded-xl text-sm font-black bg-yellow-900/40 border border-yellow-600/50 text-yellow-300 disabled:opacity-30">
              Ace
            </button>
            <button onClick={() => logRep(0)} disabled={complete}
              className="tap-btn py-4 rounded-xl text-lg font-black bg-red-900/40 border border-red-600/50 text-red-300 disabled:opacity-30">
              0
            </button>
            <button onClick={() => logRep(1)} disabled={complete}
              className="tap-btn py-4 rounded-xl text-lg font-black bg-orange-900/40 border border-orange-600/50 text-orange-300 disabled:opacity-30">
              1
            </button>
            <button onClick={() => logRep(2)} disabled={complete}
              className="tap-btn py-4 rounded-xl text-lg font-black bg-cyan-900/40 border border-cyan-600/50 text-cyan-300 disabled:opacity-30">
              2
            </button>
            <button onClick={() => logRep(3)} disabled={complete}
              className="tap-btn py-4 rounded-xl text-lg font-black bg-green-900/40 border border-green-600/50 text-green-300 disabled:opacity-30">
              3
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button onClick={logServeError} disabled={complete}
              className="tap-btn flex-1 py-2.5 rounded-xl text-xs font-bold bg-navy-700 border border-white/10 text-gray-300 disabled:opacity-30">
              Serve Error — doesn't count ({current.serveErrors})
            </button>
            <button onClick={undoLast} disabled={count === 0}
              className="tap-btn px-4 py-2.5 rounded-xl text-xs font-bold bg-navy-700 border border-white/10 text-gray-400 disabled:opacity-30">
              ↩ Undo
            </button>
          </div>
        </div>

        {rounds.length === 2 && roundIdx === 1 && (() => {
          const r0 = roundStats(rounds[0], repsGoal)
          const r1 = roundStats(rounds[1], repsGoal)
          if (!r0.complete || !r1.complete) return null
          const label0 = rounds[0].sideLabel || 'Round 1'
          const label1 = rounds[1].sideLabel || 'Round 2'
          const r0Won = r0.total >= targetTotal
          const r1Won = r1.total >= targetTotal
          let verdict: string
          if (r0Won && !r1Won) verdict = `${label0} wins!`
          else if (r1Won && !r0Won) verdict = `${label1} wins!`
          else if (r0.total === r1.total) verdict = "It's a tie!"
          else verdict = `${r0.total > r1.total ? label0 : label1} wins on total (both ${r0Won && r1Won ? 'hit the target' : 'missed the target'})`
          return (
            <div className="bg-vr-900/30 border border-vr-600/30 rounded-2xl p-4 text-center">
              <p className="text-vr-300 font-bold text-sm">{verdict}</p>
              <p className="text-gray-500 text-xs mt-1">{label0}: {r0.total}/{maxTotal} · {label1}: {r1.total}/{maxTotal}</p>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
