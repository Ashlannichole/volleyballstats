import { useState } from 'react'
import type { Match, Player } from '../types'
import { killPct, passAvg, mergeStats } from '../utils/statsHelpers'
import { EMPTY_STATS } from '../types'
import PracticeSuggestions from './PracticeSuggestions'

import { SEED_MATCHES } from '../utils/seedData'

interface Props {
  matches: Match[]
  players: Player[]
  onDelete: (id: string) => void
  onEdit: (updated: Match) => void
  onLoadDemo: () => void
  onClearDemo: () => void
  isPro?: boolean
  onUpgrade?: () => void
}

export default function MatchHistory({ matches, players, onDelete, onEdit, onLoadDemo, onClearDemo, isPro = false, onUpgrade }: Props) {
  const hasDemoData = matches.some(m => SEED_MATCHES.some(s => s.id === m.id))
  const [expanded, setExpanded] = useState<string | null>(null)
  const [aiMatch, setAiMatch] = useState<Match | null>(null)
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)
  // Draft set scores while editing — array of {our, their} strings for controlled inputs
  const [draftScores, setDraftScores] = useState<{our: string, their: string}[]>([])

  const sorted = [...matches].sort((a, b) => b.date.localeCompare(a.date))

  function totalStats(match: Match, playerId: string) {
    return match.sets.reduce((acc, s) => mergeStats(acc, s[playerId] ?? EMPTY_STATS()), EMPTY_STATS())
  }

  function openEdit(match: Match) {
    const scores = match.setScores
      ? match.setScores.map(s => ({ our: String(s.our), their: String(s.their) }))
      : match.sets.map(() => ({ our: '', their: '' }))
    setDraftScores(scores)
    setEditingMatch(match)
  }

  function saveEdit() {
    if (!editingMatch) return
    const setScores = draftScores.map(d => ({
      our: parseInt(d.our) || 0,
      their: parseInt(d.their) || 0,
    }))
    const setsWon  = setScores.filter(s => s.our > s.their).length
    const setsLost = setScores.filter(s => s.their > s.our).length
    onEdit({ ...editingMatch, setScores, ourScore: String(setsWon), theirScore: String(setsLost) })
    setEditingMatch(null)
  }

  if (aiMatch) {
    return <PracticeSuggestions match={aiMatch} players={players} onBack={() => setAiMatch(null)} />
  }

  if (matches.length === 0) {
    return (
      <div className="p-6 text-center mt-12">
        <p className="text-gray-400 text-lg">No matches saved yet.</p>
        <p className="text-gray-600 text-sm mt-2 mb-8">Complete a match in Live Game to see history here.</p>
        <button onClick={onLoadDemo}
          className="tap-btn bg-vr-700 border border-vr-500/50 text-white font-bold px-6 py-4 rounded-2xl text-base">
          Load Demo Tournament Weekend
        </button>
        <p className="text-gray-600 text-xs mt-3">6 fake matches · 12 players · safely removable</p>
      </div>
    )
  }

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Match History</h2>
        {!hasDemoData ? (
          <button onClick={onLoadDemo}
            className="tap-btn text-xs text-vr-400 border border-vr-600/30 px-3 py-1.5 rounded-xl">
            Load Demo
          </button>
        ) : (
          <button onClick={onClearDemo}
            className="tap-btn text-xs text-gray-500 border border-white/10 px-3 py-1.5 rounded-xl">
            Clear Demo
          </button>
        )}
      </div>
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
              {(() => {
                const w = Number(match.ourScore)
                const l = Number(match.theirScore)
                const isWin = w > l
                const isLoss = l > w
                return (
                  <div className="flex items-center gap-2">
                    <p className="text-white font-bold text-xl">{w}–{l}</p>
                    <span className={`text-sm font-black w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      isWin  ? 'bg-green-800 text-green-300' :
                      isLoss ? 'bg-red-900 text-red-300' :
                               'bg-gray-700 text-gray-400'
                    }`}>
                      {isWin ? 'W' : isLoss ? 'L' : 'T'}
                    </span>
                  </div>
                )
              })()}
              <span className="text-gray-500 text-lg">{expanded === match.id ? '▲' : '▼'}</span>
            </button>

            {expanded === match.id && (
              <div className="border-t border-white/10 p-4">
                {/* Set scores */}
                <div className="flex items-center gap-2 mb-4 flex-wrap">
                  {match.setScores ? match.setScores.map((s, i) => {
                    const weWon = s.our > s.their
                    return (
                      <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-sm font-bold ${
                        weWon ? 'bg-green-900/30 border-green-700/40 text-green-300' : 'bg-red-900/20 border-red-700/30 text-red-300'
                      }`}>
                        <span className="text-gray-500 text-xs font-normal">S{i + 1}</span>
                        {s.our}–{s.their}
                        <span className="text-xs">{weWon ? '✓' : '✗'}</span>
                      </div>
                    )
                  }) : (
                    <p className="text-gray-600 text-xs italic">Set scores not recorded (older match)</p>
                  )}
                  <button
                    onClick={() => openEdit(match)}
                    className="tap-btn ml-auto text-xs text-gray-500 border border-white/10 px-2 py-1 rounded-lg">
                    ✏️ Edit scores
                  </button>
                </div>

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

                {/* Team totals strip */}
                {(() => {
                  const totals = players.reduce((acc, p) => {
                    const s = totalStats(match, p.id)
                    return {
                      kills:        acc.kills        + s.kills,
                      attackErrors: acc.attackErrors + s.attackErrors,
                      serveErrors:  acc.serveErrors  + s.serveErrors,
                      aces:         acc.aces         + s.aces,
                    }
                  }, { kills: 0, attackErrors: 0, serveErrors: 0, aces: 0 })
                  const errors = totals.attackErrors + totals.serveErrors
                  return (
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[
                        { label: 'Team Kills',  value: totals.kills, color: 'text-green-400'  },
                        { label: 'Team Errors', value: errors,       color: 'text-red-400',
                          sub: `${totals.attackErrors} atk · ${totals.serveErrors} srv` },
                        { label: 'Team Aces',   value: totals.aces,  color: 'text-yellow-400' },
                      ].map(({ label, value, color, sub }) => (
                        <div key={label} className="bg-navy-800 border border-white/10 rounded-xl py-2 px-3 text-center">
                          <p className={`text-2xl font-black ${color}`}>{value}</p>
                          <p className="text-gray-500 text-[10px] font-bold uppercase tracking-wide">{label}</p>
                          {sub && <p className="text-gray-600 text-[9px] mt-0.5">{sub}</p>}
                        </div>
                      ))}
                    </div>
                  )
                })()}

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

                <details className="mb-4">
                  <summary className="text-pb-400 text-sm cursor-pointer mb-2">View error &amp; pass breakdown</summary>
                  <div className="space-y-3">
                    {players.map(p => {
                      const s = totalStats(match, p.id)
                      const atkErrs = [
                        { label: 'Missed', val: s.atkErrMissed },
                        { label: 'Blocked', val: s.atkErrBlocked },
                        { label: 'Out', val: s.atkErrOut },
                        { label: 'Net', val: s.atkErrNet },
                      ].filter(x => x.val > 0)
                      const srvErrs = [
                        { label: 'Missed', val: s.srvErrMissed },
                        { label: 'Net', val: s.srvErrNet },
                        { label: 'Long/Out', val: s.srvErrOut },
                        { label: 'Foot Fault', val: s.srvErrFoot },
                      ].filter(x => x.val > 0)
                      const passZeros = [
                        { label: 'Shank', val: s.passZeroShank },
                        { label: 'Aced', val: s.passZeroAce },
                        { label: 'Overpass', val: s.passZeroOverpass },
                      ].filter(x => x.val > 0)
                      if (!atkErrs.length && !srvErrs.length && !passZeros.length) return null
                      return (
                        <div key={p.id} className="bg-navy-800 rounded-xl p-3">
                          <p className="text-white text-xs font-bold mb-2">{p.name}</p>
                          {atkErrs.length > 0 && (
                            <div className="mb-1.5">
                              <p className="text-red-400 text-[10px] font-bold uppercase tracking-wide mb-1">Attack Errors</p>
                              <div className="flex flex-wrap gap-2">
                                {atkErrs.map(({ label, val }) => (
                                  <span key={label} className="text-[11px] bg-red-900/30 border border-red-700/30 rounded-lg px-2 py-0.5 text-red-300">
                                    {label}: <span className="font-bold">{val}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {srvErrs.length > 0 && (
                            <div className="mb-1.5">
                              <p className="text-orange-400 text-[10px] font-bold uppercase tracking-wide mb-1">Serve Errors</p>
                              <div className="flex flex-wrap gap-2">
                                {srvErrs.map(({ label, val }) => (
                                  <span key={label} className="text-[11px] bg-orange-900/30 border border-orange-700/30 rounded-lg px-2 py-0.5 text-orange-300">
                                    {label}: <span className="font-bold">{val}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {passZeros.length > 0 && (
                            <div>
                              <p className="text-yellow-400 text-[10px] font-bold uppercase tracking-wide mb-1">Pass Zeros</p>
                              <div className="flex flex-wrap gap-2">
                                {passZeros.map(({ label, val }) => (
                                  <span key={label} className="text-[11px] bg-yellow-900/20 border border-yellow-700/20 rounded-lg px-2 py-0.5 text-yellow-300">
                                    {label}: <span className="font-bold">{val}</span>
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </details>

                <div className="flex gap-3">
                  <button
                    onClick={() => isPro ? setAiMatch(match) : onUpgrade?.()}
                    className={`tap-btn flex-1 font-semibold py-3 rounded-xl text-sm ${
                      isPro ? 'bg-vr-700 text-white' : 'bg-navy-700 border border-vr-600/40 text-vr-400'
                    }`}
                  >
                    {isPro ? 'AI Practice Suggestions' : '🔒 AI Suggestions (Pro)'}
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

    {/* Edit set scores modal */}
    {editingMatch && (
      <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={() => setEditingMatch(null)}>
        <div className="w-full max-w-lg mx-auto bg-navy-800 rounded-t-3xl p-6 pb-10" onClick={e => e.stopPropagation()}>
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
          <p className="text-white font-bold text-lg mb-1">Edit Set Scores</p>
          <p className="text-gray-500 text-sm mb-5">vs {editingMatch.opponent}</p>
          <div className="space-y-3 mb-6">
            {draftScores.map((s, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-gray-500 text-sm w-12 shrink-0">Set {i + 1}</span>
                <input
                  type="number" min="0" max="99"
                  value={s.our}
                  onChange={e => setDraftScores(prev => prev.map((d, j) => j === i ? { ...d, our: e.target.value } : d))}
                  className="w-16 bg-navy-700 border border-white/20 rounded-xl px-3 py-2 text-white text-center text-lg font-bold outline-none focus:border-vr-500"
                />
                <span className="text-gray-500 font-bold">–</span>
                <input
                  type="number" min="0" max="99"
                  value={s.their}
                  onChange={e => setDraftScores(prev => prev.map((d, j) => j === i ? { ...d, their: e.target.value } : d))}
                  className="w-16 bg-navy-700 border border-white/20 rounded-xl px-3 py-2 text-white text-center text-lg font-bold outline-none focus:border-vr-500"
                />
                {(() => {
                  const our = parseInt(s.our) || 0
                  const their = parseInt(s.their) || 0
                  if (our === their || (!s.our && !s.their)) return <span className="w-8" />
                  return <span className={`text-sm font-bold w-8 ${our > their ? 'text-green-400' : 'text-red-400'}`}>{our > their ? 'W' : 'L'}</span>
                })()}
              </div>
            ))}
          </div>
          <button onClick={saveEdit} className="tap-btn w-full bg-vr-600 text-white font-bold py-4 rounded-xl mb-3">
            Save
          </button>
          <button onClick={() => setEditingMatch(null)} className="tap-btn w-full text-gray-500 py-3 rounded-xl text-sm">
            Cancel
          </button>
        </div>
      </div>
    )}
  )
}
