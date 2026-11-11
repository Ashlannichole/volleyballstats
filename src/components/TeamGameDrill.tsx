import { useState } from 'react'
import type { Player, Match, PracticeSession, TeamGameTeam } from '../types'
import { POSITION_LABELS, POSITION_COLORS } from '../types'
import { autoBalanceTeams, computeImpactScores, initialTwoTeams, type PresetTeams } from '../utils/teamSplit'

interface Props {
  players: Player[]
  matches: Match[]
  practices: PracticeSession[]
  presetTeams?: PresetTeams | null
  onSave: (s: PracticeSession) => void
  onCancel: () => void
}

const TEAM_COLORS = [
  'border-vr-500/50 bg-vr-900/20',
  'border-cyan-500/50 bg-cyan-900/20',
  'border-orange-500/50 bg-orange-900/20',
  'border-pink-500/50 bg-pink-900/20',
]
const TEAM_TEXT = ['text-vr-300', 'text-cyan-300', 'text-orange-300', 'text-pink-300']

export default function TeamGameDrill({ players, matches, practices, presetTeams, onSave, onCancel }: Props) {
  const [drillName, setDrillName] = useState('')
  const [teamCount, setTeamCount] = useState(2)

  const scores = computeImpactScores(players, matches, practices)

  function teamsForCount(count: number): TeamGameTeam[] {
    if (count === 2) return initialTwoTeams(players, scores, presetTeams)
    return autoBalanceTeams(players, count, scores)
  }

  const [teams, setTeams] = useState<TeamGameTeam[]>(() => teamsForCount(teamCount))
  const [winner, setWinner] = useState<number | null>(null)
  const usingPreset = teamCount === 2 && !!presetTeams && (presetTeams.team1.length > 0 || presetTeams.team2.length > 0)

  function selectTeamCount(count: number) {
    setTeamCount(count)
    setTeams(teamsForCount(count))
    setWinner(null)
  }

  function forceAutoBalance() {
    setTeams(autoBalanceTeams(players, teamCount, scores))
    setWinner(null)
  }

  function cyclePlayerTeam(playerId: string) {
    setTeams(prev => {
      const current = prev.findIndex(t => t.playerIds.includes(playerId))
      const next = prev.map(t => ({ ...t, playerIds: t.playerIds.filter(id => id !== playerId) }))
      const target = (current + 1) % prev.length
      next[target].playerIds.push(playerId)
      return next
    })
  }

  function playerById(id: string) {
    return players.find(p => p.id === id)
  }

  function save() {
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: drillName.trim() || 'Team Drill',
      teamLabel: '',
      notes: '',
      scrimmages: [],
      drillType: 'team_game',
      teamGame: { drillName: drillName.trim() || 'Team Drill', teams, winningTeamIndex: winner },
    }
    onSave(session)
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <button onClick={onCancel} className="tap-btn text-pb-400 text-sm mb-4 flex items-center gap-1">
        ← Cancel
      </button>

      <h2 className="text-2xl font-bold text-white mb-1">New Team Drill</h2>
      <p className="text-gray-500 text-sm mb-5">3v3, Queen of the Court, Mini Tournament — split the roster, play it out, then log who won.</p>

      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
        <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 block">Drill Name</label>
        <input
          value={drillName}
          onChange={e => setDrillName(e.target.value)}
          placeholder="e.g. Queen of the Court"
          className="w-full bg-navy-600 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pb-500 mb-4"
        />

        <label className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 block">Number of Teams</label>
        <div className="flex gap-2 mb-4">
          {[2, 3, 4].map(n => (
            <button key={n} onClick={() => selectTeamCount(n)}
              className={`tap-btn flex-1 py-2.5 rounded-xl text-sm font-bold border ${teamCount === n ? 'bg-vr-600 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
              {n}
            </button>
          ))}
        </div>

        <button onClick={forceAutoBalance}
          className="tap-btn w-full border border-vr-500/40 text-vr-300 font-bold py-2.5 rounded-xl text-sm">
          🔀 Auto-Balance Teams
        </button>
        <p className="text-gray-600 text-[10px] mt-2">
          {usingPreset
            ? "Using today's Team 1 / Team 2 split. Tap a girl's name to move her, or Auto-Balance to split by stats instead."
            : 'Balances by season stats (matches + practice). Tap a girl\'s name to move her to the next team.'}
        </p>
      </div>

      <div className={`grid gap-3 mb-4 ${teamCount <= 2 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
        {teams.map((team, i) => (
          <div key={i} className={`border rounded-2xl p-4 ${TEAM_COLORS[i % TEAM_COLORS.length]}`}>
            <p className={`text-xs font-bold uppercase tracking-widest mb-3 ${TEAM_TEXT[i % TEAM_TEXT.length]}`}>
              {team.name} <span className="text-gray-500">· {team.playerIds.length}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {team.playerIds.length === 0 && <p className="text-gray-600 text-xs">No players</p>}
              {team.playerIds.map(id => {
                const p = playerById(id)
                if (!p) return null
                return (
                  <button key={id} onClick={() => cyclePlayerTeam(id)}
                    className="tap-btn flex items-center gap-1.5 bg-navy-700 border border-white/10 rounded-full pl-1 pr-2.5 py-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                      {POSITION_LABELS[p.position]}
                    </span>
                    <span className="text-white text-xs font-medium">{p.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-5">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Who Won?</p>
        <div className="flex flex-wrap gap-2">
          {teams.map((team, i) => (
            <button key={i} onClick={() => setWinner(i)}
              className={`tap-btn px-4 py-2.5 rounded-xl text-sm font-bold border ${winner === i ? 'bg-green-700 border-green-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
              🏆 {team.name}
            </button>
          ))}
          <button onClick={() => setWinner(null)}
            className={`tap-btn px-4 py-2.5 rounded-xl text-sm font-bold border ${winner === null ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
            Tie / No Winner
          </button>
        </div>
      </div>

      <button onClick={save} disabled={teams.every(t => t.playerIds.length === 0)}
        className="tap-btn w-full bg-vr-600 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-base">
        Save Team Drill
      </button>
    </div>
  )
}
