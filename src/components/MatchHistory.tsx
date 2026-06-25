import { useState } from 'react'
import type { Match, Player } from '../types'
import { killPct, passAvg, mergeStats } from '../utils/statsHelpers'
import { EMPTY_STATS } from '../types'
import PracticeSuggestions from './PracticeSuggestions'

interface Props {
  matches: Match[]
  players: Player[]
  onDelete: (id: string) => void
}

export default function MatchHistory({ matches, players, onDelete }: Props) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const [aiMatch, setAiMatch] = useState<Match | null>(null)

  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date))

  function totalStats(match: Match, playerId: string) {
    return match.sets.reduce((acc, s) => mergeStats(acc, s[playerId] ?? EMPTY_STATS()), EMPTY_STATS())
  }

  if (aiMatch) {
    return <PracticeSuggestions match={aiMatch} players={players} onBack={() => setAiMatch(null)} />
  }

  if (matches.length === 0) {
    return (
      <div className="p-6 text-center mt-12">
        <p className="text-gray-400 text-lg">No matches saved yet.</p>
        <p className="text-gray-600 text-sm mt-2">Complete a match in Live Game to see history here.</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-white mb-6">Match History</h2>
      <div className="space-y-3">
        {sorted.map(match => (
          <div key={match.id} className="bg-navy-700 border border-white/10 rounded-2xl overflow-hidden">
            <button
              className="tap-btn w-full p-4 flex items-center gap-4 text-left"
              onClick={() => setExpanded(expanded === match.id ? null : match.id)}
            >
              <div className="flex-1">
                <p className="text-white font-bold text-lg">{match.opponent}</p>
                <p className="text-gray-400 text-sm">{match.date} · {match.sets.length} set{match.sets.length !== 1 ? 's' : ''}</p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-xl">
                  {match.ourScore || '?'} – {match.theirScore || '?'}
                </p>
              </div>
              <span className="text-gray-500 text-lg">{expanded === match.id ? '▲' : '▼'}</span>
            </button>

            {expanded === match.id && (
              <div className="border-t border-white/10 p-4">
                <div className="overflow-x-auto mb-4">
                  <table className="w-full text-sm min-w-[520px]">
                    <thead>
                      <tr className="text-gray-500 text-xs">
                        <th className="text-left py-1 pr-3">Player</th>
                        <th className="text-center px-2">K</th>
                        <th className="text-center px-2">E</th>
                        <th className="text-center px-2">TA</th>
                        <th className="text-center px-2">K%</th>
                        <th className="text-center px-2">A</th>
                        <th className="text-center px-2">D</th>
                        <th className="text-center px-2">BS</th>
                        <th className="text-center px-2">BA</th>
                        <th className="text-center px-2">Ast</th>
                        <th className="text-center px-2">PA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map(p => {
                        const s = totalStats(match, p.id)
                        return (
                          <tr key={p.id} className="border-t border-white/5">
                            <td className="py-2 pr-3 text-white font-medium truncate max-w-[100px]">{p.name}</td>
                            <td className="text-center px-2 text-green-400 font-semibold">{s.kills}</td>
                            <td className="text-center px-2 text-red-400">{s.attackErrors}</td>
                            <td className="text-center px-2 text-gray-300">{s.attackAttempts}</td>
                            <td className="text-center px-2 text-pb-400">{killPct(s)}</td>
                            <td className="text-center px-2 text-yellow-400">{s.aces}</td>
                            <td className="text-center px-2 text-cyan-400">{s.digs}</td>
                            <td className="text-center px-2 text-vr-400">{s.soloBlocks}</td>
                            <td className="text-center px-2 text-vr-300">{s.blockAssists}</td>
                            <td className="text-center px-2 text-orange-400">{s.settingAssists}</td>
                            <td className="text-center px-2 text-gray-300">{passAvg(s)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <details className="mb-4">
                  <summary className="text-pb-400 text-sm cursor-pointer mb-2">View per-set breakdown</summary>
                  {match.sets.map((setStats, i) => (
                    <div key={i} className="mb-3">
                      <p className="text-gray-400 text-xs font-bold mb-1">Set {i + 1}</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs min-w-[520px]">
                          <thead>
                            <tr className="text-gray-600">
                              <th className="text-left py-0.5 pr-3">Player</th>
                              <th className="text-center px-1">K</th>
                              <th className="text-center px-1">E</th>
                              <th className="text-center px-1">A</th>
                              <th className="text-center px-1">D</th>
                              <th className="text-center px-1">BS</th>
                              <th className="text-center px-1">Ast</th>
                              <th className="text-center px-1">PA</th>
                            </tr>
                          </thead>
                          <tbody>
                            {players.map(p => {
                              const s = setStats[p.id]
                              if (!s) return null
                              return (
                                <tr key={p.id} className="border-t border-white/5">
                                  <td className="py-1 pr-3 text-gray-300 truncate max-w-[100px]">{p.name}</td>
                                  <td className="text-center px-1 text-green-400">{s.kills}</td>
                                  <td className="text-center px-1 text-red-400">{s.attackErrors}</td>
                                  <td className="text-center px-1 text-yellow-400">{s.aces}</td>
                                  <td className="text-center px-1 text-cyan-400">{s.digs}</td>
                                  <td className="text-center px-1 text-vr-400">{s.soloBlocks}</td>
                                  <td className="text-center px-1 text-orange-400">{s.settingAssists}</td>
                                  <td className="text-center px-1 text-gray-300">{passAvg(s)}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </details>

                <div className="flex gap-3">
                  <button
                    onClick={() => setAiMatch(match)}
                    className="tap-btn flex-1 bg-vr-700 text-white font-semibold py-3 rounded-xl text-sm"
                  >
                    AI Practice Suggestions
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this match?')) onDelete(match.id) }}
                    className="tap-btn px-4 py-3 rounded-xl border border-red-500/30 text-red-400 text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
