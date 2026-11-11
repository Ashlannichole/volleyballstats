import { useState } from 'react'
import type { Player, PlayerStats, SetStats, PracticeSession, Match, PassChallengeRound } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'
import { mergeStats, killPct, passAvg } from '../utils/statsHelpers'
import LiveGame from './LiveGame'
import ServePassDrill from './ServePassDrill'
import ThreeBallDrill from './ThreeBallDrill'
import PassChallengeDrill from './PassChallengeDrill'
import TeamGameDrill from './TeamGameDrill'
import ThreeBeforeTenDrill from './ThreeBeforeTenDrill'
import ServersVsPassersDrill from './ServersVsPassersDrill'
import PressureServeReceiveDrill from './PressureServeReceiveDrill'
import type { PresetTeams } from '../utils/teamSplit'

function roundStats(round: PassChallengeRound, repsGoal: number) {
  const count = round.reps.length
  const total = round.reps.reduce((n, r) => n + r, 0)
  const avg = count > 0 ? total / count : 0
  return { count, total, avg, complete: count >= repsGoal }
}

interface Props {
  players: Player[]
  matches: Match[]
  sessions: PracticeSession[]
  onSave: (s: PracticeSession) => void
  onDelete: (id: string) => void
}

function totalStats(session: PracticeSession, playerId: string): PlayerStats {
  return session.scrimmages.reduce(
    (acc, s) => s[playerId] ? mergeStats(acc, s[playerId]) : acc,
    EMPTY_STATS()
  )
}

// Roster players plus any stand-in guests (e.g. a coach who filled in) saved
// on this specific session — so a session's history still shows her name
// after she's no longer part of `players`.
function sessionPlayers(session: PracticeSession, rosterPlayers: Player[]): Player[] {
  if (!session.guestPlayers || session.guestPlayers.length === 0) return rosterPlayers
  const guests: Player[] = session.guestPlayers.map(g => ({ id: g.id, name: g.name, number: 0, position: 'coach' }))
  return [...rosterPlayers, ...guests]
}

function drillSubtitle(session: PracticeSession): string {
  if (session.drillType === 'serve_pass') return 'Serve & Pass drill'
  if (session.drillType === 'three_ball') return '3-Ball Scrimmage drill'
  if (session.drillType === 'pass_challenge') return 'Pass Challenge drill'
  if (session.drillType === 'team_game') return session.teamGame?.drillName || 'Team Drill'
  if (session.drillType === 'zero_vs_eighteen') return '0 vs 18 drill'
  if (session.drillType === 'three_before_ten') return '3 Before 10 drill'
  if (session.drillType === 'servers_vs_passers') return 'Servers vs Passers drill'
  if (session.drillType === 'pressure_serve_receive') return 'Pressure Serve Receive drill'
  return `${session.scrimmages.length} set${session.scrimmages.length !== 1 ? 's' : ''}`
}

// ── Session detail view ────────────────────────────────────────────────────
function SessionDetail({
  session, players, onBack, onDelete,
}: {
  session: PracticeSession
  players: Player[]
  onBack: () => void
  onDelete: () => void
}) {
  const [scrimmageIdx, setScrimmageIdx] = useState<number | null>(null)
  const allPlayers = sessionPlayers(session, players)

  const displayPlayers = allPlayers.filter(p =>
    session.scrimmages.some(s => s[p.id] && (
      s[p.id].kills + s[p.id].digs + s[p.id].attackAttempts + s[p.id].attackErrors +
      s[p.id].aces + s[p.id].settingAssists + s[p.id].passAttempts +
      s[p.id].serveAttempts > 0
    ))
  )

  const ranked = [...displayPlayers].sort((a, b) => {
    const sa = totalStats(session, a.id)
    const sb = totalStats(session, b.id)
    return (sb.kills + sb.aces + sb.soloBlocks) - (sa.kills + sa.aces + sa.soloBlocks)
  })

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <button onClick={onBack} className="tap-btn text-pb-400 text-sm mb-4 flex items-center gap-1">
        ← Practice Sessions
      </button>
      <h2 className="text-2xl font-bold text-white mb-0.5">{session.name}</h2>
      <div className="flex items-center gap-2 flex-wrap mb-1">
        <p className="text-gray-500 text-sm">
          {session.date} · {drillSubtitle(session)}
        </p>
        {session.teamLabel && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-vr-800 border border-vr-500/40 text-vr-300">
            Team {session.teamLabel}
          </span>
        )}
      </div>
      {session.notes && <p className="text-gray-400 text-sm italic mb-4">"{session.notes}"</p>}

      {/* Set selector */}
      {session.scrimmages.length > 1 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button onClick={() => setScrimmageIdx(null)}
            className={`tap-btn px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${scrimmageIdx === null ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-700 border-white/10 text-gray-400'}`}>
            All Combined
          </button>
          {session.scrimmages.map((_, i) => (
            <button key={i} onClick={() => setScrimmageIdx(i)}
              className={`tap-btn px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${scrimmageIdx === i ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-700 border-white/10 text-gray-400'}`}>
              Set {i + 1}
            </button>
          ))}
        </div>
      )}

      {session.drillType === 'team_game' && session.teamGame ? (
        /* Team drill: just the teams and who won, no per-player stats */
        <div className="space-y-3 mb-5">
          <div className={`grid gap-3 ${session.teamGame.teams.length <= 2 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
            {session.teamGame.teams.map((team, i) => {
              const won = session.teamGame!.winningTeamIndex === i
              return (
                <div key={i} className={`border rounded-2xl p-4 ${won ? 'border-green-500/50 bg-green-900/15' : 'border-white/10 bg-navy-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-bold text-sm">{team.name}</p>
                    {won && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 border border-green-600/50 text-green-300">🏆 WON</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {team.playerIds.map(id => {
                      const p = allPlayers.find(pl => pl.id === id)
                      return p ? (
                        <span key={id} className="bg-navy-700 border border-white/10 rounded-full px-2.5 py-1 text-white text-xs">{p.name}</span>
                      ) : null
                    })}
                  </div>
                </div>
              )
            })}
          </div>
          {session.teamGame.winningTeamIndex === null && (
            <p className="text-gray-500 text-xs text-center">No winner recorded for this drill.</p>
          )}
        </div>
      ) : session.drillType === 'zero_vs_eighteen' && session.zeroVsEighteen ? (
        /* 0 vs 18: team score/error race, plus the 0-side's real per-player stats */
        (() => {
          const zve = session.zeroVsEighteen!
          return (
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`border rounded-2xl p-4 ${zve.winner === 'zero' ? 'border-green-500/50 bg-green-900/15' : 'border-white/10 bg-navy-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-bold text-sm">0-Side — {zve.zeroTeam.name}</p>
                    {zve.winner === 'zero' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 border border-green-600/50 text-green-300">🏆 WON</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {zve.zeroTeam.playerIds.map(id => {
                      const p = allPlayers.find(pl => pl.id === id)
                      return p ? <span key={id} className="bg-navy-700 border border-white/10 rounded-full px-2.5 py-1 text-white text-xs">{p.name}</span> : null
                    })}
                  </div>
                </div>
                <div className={`border rounded-2xl p-4 ${zve.winner === 'eighteen' ? 'border-green-500/50 bg-green-900/15' : 'border-white/10 bg-navy-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-bold text-sm">18-Side — {zve.eighteenTeam.name}</p>
                    {zve.winner === 'eighteen' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 border border-green-600/50 text-green-300">🏆 WON</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {zve.eighteenTeam.playerIds.map(id => {
                      const p = allPlayers.find(pl => pl.id === id)
                      return p ? <span key={id} className="bg-navy-700 border border-white/10 rounded-full px-2.5 py-1 text-white text-xs">{p.name}</span> : null
                    })}
                  </div>
                </div>
              </div>
              <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 flex items-center justify-around text-center">
                <div>
                  <p className="text-white text-2xl font-black leading-none">{zve.score}<span className="text-gray-600 text-base">/{zve.scoreGoal}</span></p>
                  <p className="text-gray-500 text-[11px] mt-0.5">0-side points</p>
                </div>
                <div>
                  <p className="text-red-400 text-2xl font-black leading-none">{zve.errors}<span className="text-gray-600 text-base">/{zve.errorGoal}</span></p>
                  <p className="text-gray-500 text-[11px] mt-0.5">0-side errors</p>
                </div>
              </div>
              {zve.winner === null && <p className="text-gray-500 text-xs text-center">No winner recorded for this drill.</p>}
              {displayPlayers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[500px]">
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
                        <th className="text-center px-2">Ast</th>
                        <th className="text-center px-2">PA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayPlayers.map(p => {
                        const s = totalStats(session, p.id)
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
                            <td className="text-center px-2 text-orange-400">{s.settingAssists}</td>
                            <td className="text-center px-2 text-gray-300">{passAvg(s)}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )
        })()
      ) : session.drillType === 'three_before_ten' && session.threeBeforeTen ? (
        /* 3 Before 10: team-total streak/dig race, no per-player stats */
        (() => {
          const tbt = session.threeBeforeTen!
          return (
            <div className="space-y-3 mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`border rounded-2xl p-4 ${tbt.winner === 'hitting' ? 'border-green-500/50 bg-green-900/15' : 'border-white/10 bg-navy-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-bold text-sm">Hitting — {tbt.hittingTeam.name}</p>
                    {tbt.winner === 'hitting' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 border border-green-600/50 text-green-300">🏆 WON</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tbt.hittingTeam.playerIds.map(id => {
                      const p = allPlayers.find(pl => pl.id === id)
                      return p ? <span key={id} className="bg-navy-700 border border-white/10 rounded-full px-2.5 py-1 text-white text-xs">{p.name}</span> : null
                    })}
                  </div>
                </div>
                <div className={`border rounded-2xl p-4 ${tbt.winner === 'defense' ? 'border-green-500/50 bg-green-900/15' : 'border-white/10 bg-navy-800'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-white font-bold text-sm">Defense — {tbt.defenseTeam.name}</p>
                    {tbt.winner === 'defense' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 border border-green-600/50 text-green-300">🏆 WON</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {tbt.defenseTeam.playerIds.map(id => {
                      const p = allPlayers.find(pl => pl.id === id)
                      return p ? <span key={id} className="bg-navy-700 border border-white/10 rounded-full px-2.5 py-1 text-white text-xs">{p.name}</span> : null
                    })}
                  </div>
                </div>
              </div>
              <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 flex items-center justify-around text-center">
                <div>
                  <p className="text-white text-2xl font-black leading-none">{tbt.streak}<span className="text-gray-600 text-base">/{tbt.streakGoal}</span></p>
                  <p className="text-gray-500 text-[11px] mt-0.5">kill streak</p>
                </div>
                <div>
                  <p className="text-cyan-400 text-2xl font-black leading-none">{tbt.defenseTotal}<span className="text-gray-600 text-base">/{tbt.digGoal}</span></p>
                  <p className="text-gray-500 text-[11px] mt-0.5">total digs/blocks</p>
                </div>
              </div>
              {tbt.winner === null && <p className="text-gray-500 text-xs text-center">No winner recorded for this drill.</p>}
            </div>
          )
        })()
      ) : session.drillType === 'pass_challenge' && session.passChallenge ? (
        /* Pass Challenge drill: a serving-side total/average per round, no per-player breakdown */
        <div className="space-y-3 mb-5">
          {session.passChallenge.rounds.map((r, i) => {
            const { count, total, avg, complete } = roundStats(r, session.passChallenge!.repsGoal)
            const maxTotal = session.passChallenge!.repsGoal * 3
            const won = total >= session.passChallenge!.targetTotal
            return (
              <div key={i} className="bg-navy-800 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-bold text-sm">{r.sideLabel || `Round ${i + 1}`}</p>
                  {complete && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${won ? 'bg-green-900/40 border border-green-600/50 text-green-300' : 'bg-red-900/30 border border-red-600/40 text-red-300'}`}>
                      {won ? '🏆 WON' : 'FELL SHORT'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-white text-2xl font-black leading-none">{total}<span className="text-gray-600 text-base">/{maxTotal}</span></p>
                    <p className="text-gray-500 text-[11px] mt-0.5">{count}/{session.passChallenge!.repsGoal} serves</p>
                  </div>
                  <div>
                    <p className={`text-2xl font-black leading-none ${avg >= 2.5 ? 'text-green-400' : 'text-yellow-400'}`}>{avg.toFixed(2)}</p>
                    <p className="text-gray-500 text-[11px] mt-0.5">pass avg</p>
                  </div>
                  {r.serveErrors > 0 && (
                    <div>
                      <p className="text-red-400 text-2xl font-black leading-none">{r.serveErrors}</p>
                      <p className="text-gray-500 text-[11px] mt-0.5">re-served</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
          <p className="text-gray-600 text-[10px] text-center">
            Target: {session.passChallenge.targetTotal}/{session.passChallenge.repsGoal * 3} points ({(session.passChallenge.targetTotal / session.passChallenge.repsGoal).toFixed(1)} avg) across {session.passChallenge.repsGoal} serves to win
          </p>
        </div>
      ) : session.drillType === 'servers_vs_passers' && session.serversVsPassers ? (
        /* Servers vs Passers: team score/winner banner, then the same per-player serve/pass table */
        (() => {
          const svp = session.serversVsPassers!
          return (
            <div className="mb-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div className={`border rounded-2xl p-4 ${svp.winner === 'servers' ? 'border-green-500/50 bg-green-900/15' : 'border-white/10 bg-navy-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-bold text-sm">Serving — {svp.serverTeam.name}</p>
                    {svp.winner === 'servers' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 border border-green-600/50 text-green-300">🏆 WON</span>}
                  </div>
                  <p className="text-vr-300 text-2xl font-black">{svp.serverScore}</p>
                </div>
                <div className={`border rounded-2xl p-4 ${svp.winner === 'passers' ? 'border-green-500/50 bg-green-900/15' : 'border-white/10 bg-navy-800'}`}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-white font-bold text-sm">Passing — {svp.passerTeam.name}</p>
                    {svp.winner === 'passers' && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-900/40 border border-green-600/50 text-green-300">🏆 WON</span>}
                  </div>
                  <p className="text-cyan-300 text-2xl font-black">{svp.passerScore}</p>
                </div>
              </div>
              {svp.winner === null && <p className="text-gray-500 text-xs text-center mb-3">No winner recorded for this drill.</p>}
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[440px]">
                  <thead>
                    <tr className="text-gray-500 text-xs">
                      <th className="text-left py-1 pr-3">Player</th>
                      <th className="text-center px-2">Srv Att</th>
                      <th className="text-center px-2">Ace</th>
                      <th className="text-center px-2">Err</th>
                      <th className="text-center px-2">Srv%</th>
                      <th className="text-center px-2">Pass Att</th>
                      <th className="text-center px-2">Pass Avg</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayPlayers.map(p => {
                      const s = totalStats(session, p.id)
                      const srvPct = s.serveAttempts > 0
                        ? Math.round(((s.serveAttempts - s.serveErrors) / s.serveAttempts) * 100) + '%'
                        : '—'
                      return (
                        <tr key={p.id} className="border-t border-white/5">
                          <td className="py-2 pr-3 text-white font-medium truncate max-w-[100px]">{p.name}</td>
                          <td className="text-center px-2 text-gray-300">{s.serveAttempts}</td>
                          <td className="text-center px-2 text-yellow-400">{s.aces}</td>
                          <td className="text-center px-2 text-red-400">{s.serveErrors}</td>
                          <td className="text-center px-2 text-pb-400">{srvPct}</td>
                          <td className="text-center px-2 text-gray-300">{s.passAttempts}</td>
                          <td className="text-center px-2 text-cyan-400">{passAvg(s)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })()
      ) : session.drillType === 'serve_pass' || session.drillType === 'pressure_serve_receive' ? (
        /* Serve & Pass / Pressure Serve Receive: dedicated table — kills/digs/attacks don't apply */
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-sm min-w-[440px]">
            <thead>
              <tr className="text-gray-500 text-xs">
                <th className="text-left py-1 pr-3">Player</th>
                <th className="text-center px-2">Srv Att</th>
                <th className="text-center px-2">Ace</th>
                <th className="text-center px-2">Err</th>
                <th className="text-center px-2">Srv%</th>
                <th className="text-center px-2">Pass Att</th>
                <th className="text-center px-2">Pass Avg</th>
              </tr>
            </thead>
            <tbody>
              {displayPlayers.map(p => {
                const s = scrimmageIdx !== null
                  ? (session.scrimmages[scrimmageIdx][p.id] ?? EMPTY_STATS())
                  : totalStats(session, p.id)
                const srvPct = s.serveAttempts > 0
                  ? Math.round(((s.serveAttempts - s.serveErrors) / s.serveAttempts) * 100) + '%'
                  : '—'
                return (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="py-2 pr-3 text-white font-medium truncate max-w-[100px]">{p.name}</td>
                    <td className="text-center px-2 text-gray-300">{s.serveAttempts}</td>
                    <td className="text-center px-2 text-yellow-400">{s.aces}</td>
                    <td className="text-center px-2 text-red-400">{s.serveErrors}</td>
                    <td className="text-center px-2 text-pb-400">{srvPct}</td>
                    <td className="text-center px-2 text-gray-300">{s.passAttempts}</td>
                    <td className="text-center px-2 text-cyan-400">{passAvg(s)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : session.drillType === 'three_ball' ? (
        /* 3-Ball Scrimmage drill: kills/errors + serve + pass, no digs/blocks/sets */
        <div className="overflow-x-auto mb-5">
          <table className="w-full text-sm min-w-[520px]">
            <thead>
              <tr className="text-gray-500 text-xs">
                <th className="text-left py-1 pr-3">Player</th>
                <th className="text-center px-2">K</th>
                <th className="text-center px-2">Err</th>
                <th className="text-center px-2">Hit%</th>
                <th className="text-center px-2">Srv Att</th>
                <th className="text-center px-2">Ace</th>
                <th className="text-center px-2">Srv Err</th>
                <th className="text-center px-2">Pass Att</th>
                <th className="text-center px-2">Pass Avg</th>
              </tr>
            </thead>
            <tbody>
              {displayPlayers.map(p => {
                const s = scrimmageIdx !== null
                  ? (session.scrimmages[scrimmageIdx][p.id] ?? EMPTY_STATS())
                  : totalStats(session, p.id)
                return (
                  <tr key={p.id} className="border-t border-white/5">
                    <td className="py-2 pr-3 text-white font-medium truncate max-w-[100px]">{p.name}</td>
                    <td className="text-center px-2 text-green-400 font-semibold">{s.kills}</td>
                    <td className="text-center px-2 text-red-400">{s.attackErrors}</td>
                    <td className="text-center px-2 text-pb-400">{killPct(s)}</td>
                    <td className="text-center px-2 text-gray-300">{s.serveAttempts}</td>
                    <td className="text-center px-2 text-yellow-400">{s.aces}</td>
                    <td className="text-center px-2 text-red-400">{s.serveErrors}</td>
                    <td className="text-center px-2 text-gray-300">{s.passAttempts}</td>
                    <td className="text-center px-2 text-cyan-400">{passAvg(s)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Performance ranking */}
          {scrimmageIdx === null && ranked.length > 0 && (
            <div className="bg-vr-900/30 border border-vr-600/30 rounded-2xl p-4 mb-5">
              <p className="text-vr-400 text-xs font-bold uppercase tracking-widest mb-3">⭐ Performance Ranking</p>
              <div className="space-y-2">
                {ranked.map((p, i) => {
                  const s = totalStats(session, p.id)
                  const score = s.kills + s.aces + s.soloBlocks
                  const errs  = s.attackErrors + s.serveErrors
                  return (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className={`text-xs font-black w-6 text-center ${i === 0 ? 'text-yellow-400' : i === 1 ? 'text-gray-300' : i === 2 ? 'text-orange-400' : 'text-gray-600'}`}>
                        #{i + 1}
                      </span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white shrink-0 ${POSITION_COLORS[p.position]}`}>
                        {POSITION_LABELS[p.position]}
                      </span>
                      <span className="text-white font-medium flex-1 truncate">{p.name}</span>
                      <span className="text-green-400 text-xs font-bold">{score} pts</span>
                      {errs > 0 && <span className="text-red-400 text-xs">{errs} err</span>}
                      {s.passAttempts >= 5 && <span className="text-cyan-400 text-xs">{(s.passRatingTotal / s.passAttempts).toFixed(1)} PA</span>}
                    </div>
                  )
                })}
              </div>
              <p className="text-gray-600 text-[10px] mt-3">Points = kills + aces + solo blocks</p>
            </div>
          )}

          {/* Stat table */}
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-sm min-w-[500px]">
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
                  <th className="text-center px-2">Ast</th>
                  <th className="text-center px-2">PA</th>
                </tr>
              </thead>
              <tbody>
                {displayPlayers.map(p => {
                  const s = scrimmageIdx !== null
                    ? (session.scrimmages[scrimmageIdx][p.id] ?? EMPTY_STATS())
                    : totalStats(session, p.id)
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
                      <td className="text-center px-2 text-orange-400">{s.settingAssists}</td>
                      <td className="text-center px-2 text-gray-300">{passAvg(s)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <button onClick={() => { if (confirm('Delete this practice session?')) onDelete() }}
        className="tap-btn w-full border border-red-500/30 text-red-400 py-3 rounded-xl text-sm">
        Delete Session
      </button>
    </div>
  )
}

// ── Main Practice component ────────────────────────────────────────────────
export default function Practice({ players, matches, sessions, onSave, onDelete }: Props) {
  const [detail, setDetail] = useState<PracticeSession | null>(null)
  const [scrimmageActive, setScrimmageActive] = useState(false)
  const [drillActive, setDrillActive] = useState(false)
  const [threeBallActive, setThreeBallActive] = useState(false)
  const [passChallengeActive, setPassChallengeActive] = useState(false)
  const [teamGameActive, setTeamGameActive] = useState(false)
  const [zeroVsEighteenActive, setZeroVsEighteenActive] = useState(false)
  const [threeBeforeTenActive, setThreeBeforeTenActive] = useState(false)
  const [serversVsPassersActive, setServersVsPassersActive] = useState(false)
  const [pressureServeReceiveActive, setPressureServeReceiveActive] = useState(false)

  // Who's actually here today — defaults to the whole roster, uncheck anyone
  // absent. A coach stepping in gets added as a one-off guest for just this
  // visit (not saved to the permanent roster).
  const [absentIds, setAbsentIds] = useState<Set<string>>(new Set())
  const [guests, setGuests] = useState<Player[]>([])
  const [guestName, setGuestName] = useState('')

  // Optional Team 1 / Team 2 split for the whole practice, set once up front
  // so starting a team-vs-team drill doesn't mean re-splitting the roster
  // every time. Cycles none → team1 → team2 → none per tap.
  const [teamAssign, setTeamAssign] = useState<Record<string, 'team1' | 'team2'>>({})

  const todaysRoster = [...players.filter(p => !absentIds.has(p.id)), ...guests]

  function cycleTeamAssign(id: string) {
    setTeamAssign(prev => {
      const current = prev[id]
      const next = { ...prev }
      if (!current) next[id] = 'team1'
      else if (current === 'team1') next[id] = 'team2'
      else delete next[id]
      return next
    })
  }

  const presetTeams: PresetTeams = {
    team1: todaysRoster.filter(p => teamAssign[p.id] === 'team1').map(p => p.id),
    team2: todaysRoster.filter(p => teamAssign[p.id] === 'team2').map(p => p.id),
  }
  const hasPresetTeams = presetTeams.team1.length > 0 || presetTeams.team2.length > 0

  // 0 vs 18 is run on the real rotation/stat engine (LiveGame), tracking the
  // 0-side's actual per-player stats. If today's Team 1/Team 2 split is set,
  // the coach picks which one is the 0-side; otherwise it's just everyone
  // present, same as a normal Scrimmage.
  const [zveZeroIsTeam1, setZveZeroIsTeam1] = useState(true)
  const zveZeroIds = hasPresetTeams ? (zveZeroIsTeam1 ? presetTeams.team1 : presetTeams.team2) : todaysRoster.map(p => p.id)
  const zveEighteenIds = hasPresetTeams ? (zveZeroIsTeam1 ? presetTeams.team2 : presetTeams.team1) : []
  const zveZeroRoster = todaysRoster.filter(p => zveZeroIds.includes(p.id))
  const zveZeroTeam = { name: hasPresetTeams ? (zveZeroIsTeam1 ? 'Team 1' : 'Team 2') : '0-Side', playerIds: zveZeroIds }
  const zveEighteenTeam = { name: hasPresetTeams ? (zveZeroIsTeam1 ? 'Team 2' : 'Team 1') : '18-Side', playerIds: zveEighteenIds }

  function toggleAbsent(id: string) {
    setAbsentIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addGuest() {
    const name = guestName.trim()
    if (!name) return
    setGuests(prev => [...prev, { id: crypto.randomUUID(), name, number: 0, position: 'coach' }])
    setGuestName('')
  }

  function removeGuest(id: string) {
    setGuests(prev => prev.filter(g => g.id !== id))
  }

  // Stamps today's guests onto a saved session so her name still resolves
  // once this visit's `guests` state resets.
  function tagGuests(session: PracticeSession): PracticeSession {
    if (guests.length === 0) return session
    return { ...session, guestPlayers: guests.map(g => ({ id: g.id, name: g.name })) }
  }

  function handleSavePractice(session: PracticeSession) {
    onSave(tagGuests(session))
    setScrimmageActive(false)
  }

  function handleSaveDrill(session: PracticeSession) {
    onSave(tagGuests(session))
    setDrillActive(false)
  }

  function handleSaveThreeBall(session: PracticeSession) {
    onSave(tagGuests(session))
    setThreeBallActive(false)
  }

  function handleSavePassChallenge(session: PracticeSession) {
    onSave(session)
    setPassChallengeActive(false)
  }

  function handleSaveTeamGame(session: PracticeSession) {
    onSave(tagGuests(session))
    setTeamGameActive(false)
  }

  function handleSaveZeroVsEighteen(session: PracticeSession) {
    onSave(tagGuests(session))
    setZeroVsEighteenActive(false)
  }

  function handleSaveThreeBeforeTen(session: PracticeSession) {
    onSave(tagGuests(session))
    setThreeBeforeTenActive(false)
  }

  function handleSaveServersVsPassers(session: PracticeSession) {
    onSave(tagGuests(session))
    setServersVsPassersActive(false)
  }

  function handleSavePressureServeReceive(session: PracticeSession) {
    onSave(tagGuests(session))
    setPressureServeReceiveActive(false)
  }

  // ── Session detail ────────────────────────────────────────────────────
  if (detail) {
    return (
      <SessionDetail
        session={detail}
        players={players}
        onBack={() => setDetail(null)}
        onDelete={() => { onDelete(detail.id); setDetail(null) }}
      />
    )
  }

  // ── Live scrimmage — full court UI via LiveGame ───────────────────────
  if (scrimmageActive) {
    return (
      <div className="h-full flex flex-col">
        <LiveGame
          players={todaysRoster}
          onSaveMatch={(_: Match) => {}}
          practiceMode={true}
          onSavePractice={handleSavePractice}
        />
      </div>
    )
  }

  // ── Serve & Pass drill ─────────────────────────────────────────────────
  if (drillActive) {
    return (
      <ServePassDrill
        players={todaysRoster}
        onSave={handleSaveDrill}
        onCancel={() => setDrillActive(false)}
      />
    )
  }

  // ── 3-Ball Scrimmage drill ─────────────────────────────────────────────
  if (threeBallActive) {
    return (
      <ThreeBallDrill
        players={todaysRoster}
        onSave={handleSaveThreeBall}
        onCancel={() => setThreeBallActive(false)}
      />
    )
  }

  // ── Pass Challenge drill ────────────────────────────────────────────────
  if (passChallengeActive) {
    return (
      <PassChallengeDrill
        onSave={handleSavePassChallenge}
        onCancel={() => setPassChallengeActive(false)}
      />
    )
  }

  // ── Team drill (3v3, Queen of the Court, etc.) ──────────────────────────
  if (teamGameActive) {
    return (
      <TeamGameDrill
        players={todaysRoster}
        matches={matches}
        practices={sessions}
        presetTeams={presetTeams}
        onSave={handleSaveTeamGame}
        onCancel={() => setTeamGameActive(false)}
      />
    )
  }

  // ── 0 vs 18 — real rotations/stats via LiveGame, with 0-vs-18 scoring ─────
  if (zeroVsEighteenActive) {
    return (
      <div className="h-full flex flex-col">
        <LiveGame
          players={zveZeroRoster}
          onSaveMatch={(_: Match) => {}}
          practiceMode={true}
          onSavePractice={handleSaveZeroVsEighteen}
          zeroVsEighteen={true}
          zveZeroTeam={zveZeroTeam}
          zveEighteenTeam={zveEighteenTeam}
          celebrationAnimations={false}
        />
      </div>
    )
  }

  // ── 3 Before 10 ──────────────────────────────────────────────────────────
  if (threeBeforeTenActive) {
    return (
      <ThreeBeforeTenDrill
        players={todaysRoster}
        matches={matches}
        practices={sessions}
        presetTeams={presetTeams}
        onSave={handleSaveThreeBeforeTen}
        onCancel={() => setThreeBeforeTenActive(false)}
      />
    )
  }

  // ── Servers vs Passers ───────────────────────────────────────────────────
  if (serversVsPassersActive) {
    return (
      <ServersVsPassersDrill
        players={todaysRoster}
        matches={matches}
        practices={sessions}
        presetTeams={presetTeams}
        onSave={handleSaveServersVsPassers}
        onCancel={() => setServersVsPassersActive(false)}
      />
    )
  }

  // ── Pressure Serve Receive (Danger) ──────────────────────────────────────
  if (pressureServeReceiveActive) {
    return (
      <PressureServeReceiveDrill
        players={todaysRoster}
        onSave={handleSavePressureServeReceive}
        onCancel={() => setPressureServeReceiveActive(false)}
      />
    )
  }

  // ── Session list / setup ──────────────────────────────────────────────
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="text-2xl font-bold text-white">Practice</h2>
        <span className="text-gray-500 text-sm">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Who's here today */}
      {players.length > 0 && (
        <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Today's Roster</p>
          <div className="flex flex-wrap gap-2 mb-3">
            {players.map(p => {
              const absent = absentIds.has(p.id)
              return (
                <button key={p.id} onClick={() => toggleAbsent(p.id)}
                  className={`tap-btn flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 border ${absent ? 'bg-navy-800 border-white/10 opacity-40' : 'bg-navy-600 border-vr-500/40'}`}>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                    {POSITION_LABELS[p.position]}
                  </span>
                  <span className={`text-xs font-medium ${absent ? 'text-gray-500 line-through' : 'text-white'}`}>{p.name}</span>
                </button>
              )
            })}
          </div>
          {guests.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {guests.map(g => (
                <span key={g.id} className="tap-btn flex items-center gap-1.5 bg-vr-900/30 border border-vr-500/40 rounded-full pl-2.5 pr-1 py-1">
                  <span className="text-xs font-medium text-white">{g.name}</span>
                  <button onClick={() => removeGuest(g.id)} className="tap-btn text-gray-500 hover:text-red-400 text-xs px-1">✕</button>
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addGuest() }}
              placeholder="Coach stepping in? Add her name"
              className="flex-1 bg-navy-600 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pb-500"
            />
            <button onClick={addGuest} disabled={!guestName.trim()}
              className="tap-btn bg-vr-600 disabled:opacity-40 text-white font-bold px-4 rounded-xl text-sm">
              + Add
            </button>
          </div>
          <p className="text-gray-600 text-[10px] mt-2">Uncheck anyone who isn't here today. Added guests count toward today's drills only.</p>

          <div className="border-t border-white/10 my-3" />

          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2">Set Teams for Today (optional)</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {todaysRoster.map(p => {
              const t = teamAssign[p.id]
              return (
                <button key={p.id} onClick={() => cycleTeamAssign(p.id)}
                  className={`tap-btn flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 border ${
                    t === 'team1' ? 'bg-vr-900/30 border-vr-500/50'
                    : t === 'team2' ? 'bg-cyan-900/30 border-cyan-500/50'
                    : 'bg-navy-800 border-white/10'
                  }`}>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                    {POSITION_LABELS[p.position]}
                  </span>
                  <span className={`text-xs font-medium ${t === 'team1' ? 'text-vr-300' : t === 'team2' ? 'text-cyan-300' : 'text-gray-400'}`}>
                    {p.name}{t === 'team1' ? ' · T1' : t === 'team2' ? ' · T2' : ''}
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-gray-600 text-[10px]">Tap a girl to cycle Team 1 → Team 2 → unassigned. Team Drill, 0 vs 18, and 3 Before 10 will start from this split.</p>
        </div>
      )}

      {/* Start new practice */}
      <div className="bg-navy-700 border border-vr-700/40 rounded-2xl p-4 mb-6">
        <p className="text-vr-400 text-xs font-bold uppercase tracking-widest mb-3">New Practice Session</p>

        {todaysRoster.length === 0 ? (
          <p className="text-yellow-400 text-sm">Add players to your roster first, or add a guest above.</p>
        ) : (
          <>
            <p className="text-gray-400 text-sm mb-4">
              Uses the full court UI — rotations, subs, and per-player stats. Two coaches can each track their own 6 players on separate iPads by selecting a team side.
            </p>
            <button
              onClick={() => setScrimmageActive(true)}
              className="tap-btn w-full bg-vr-600 text-white font-bold py-4 rounded-xl text-base"
            >
              Start Scrimmage 🏐
            </button>

            <div className="border-t border-white/10 my-4" />

            <p className="text-gray-400 text-sm mb-4">
              Track a focused serve-vs-pass drill: who's acing/erring on serve, and how each passer is rating. Works solo on one iPad, or pair two iPads — one on servers, one on passers.
            </p>
            <button
              onClick={() => setDrillActive(true)}
              className="tap-btn w-full bg-navy-600 border border-vr-500/40 text-white font-bold py-4 rounded-xl text-base"
            >
              Start Serve & Pass Drill 🎾
            </button>

            <div className="border-t border-white/10 my-4" />

            <p className="text-gray-400 text-sm mb-4">
              Fast-paced 3-ball scrimmage: tap a girl's spot on the court grid, then tap what happened (Pass/Serve/Attack). Works solo, or pair two iPads — each tracks its own 6 on court, merged into one session when either of you ends it.
            </p>
            <button
              onClick={() => setThreeBallActive(true)}
              className="tap-btn w-full bg-navy-600 border border-vr-500/40 text-white font-bold py-4 rounded-xl text-base"
            >
              Start 3-Ball Scrimmage 🎯
            </button>

            <div className="border-t border-white/10 my-4" />

            <p className="text-gray-400 text-sm mb-4">
              Small-sided competitive drills (3v3, Queen of the Court, Mini Tournament): auto-balance the roster into teams, play it out, and log who won. Builds each girl's season win/loss record.
            </p>
            <button
              onClick={() => setTeamGameActive(true)}
              className="tap-btn w-full bg-navy-600 border border-vr-500/40 text-white font-bold py-4 rounded-xl text-base"
            >
              Start Team Drill 🆚
            </button>

            <div className="border-t border-white/10 my-4" />

            <p className="text-gray-400 text-sm mb-4">
              0 vs 18: the 0-side scores on everything, the 18-side only on the 0-side's errors. 0-side wins by reaching 25 before 7 errors. Full rotations and real per-player stats for the 0-side, same as a Scrimmage.
            </p>
            {hasPresetTeams && (
              <div className="flex gap-2 mb-2">
                <button onClick={() => setZveZeroIsTeam1(true)}
                  className={`tap-btn flex-1 py-2 rounded-xl text-xs font-bold border ${zveZeroIsTeam1 ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-700 border-white/10 text-gray-400'}`}>
                  0-side: Team 1
                </button>
                <button onClick={() => setZveZeroIsTeam1(false)}
                  className={`tap-btn flex-1 py-2 rounded-xl text-xs font-bold border ${!zveZeroIsTeam1 ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-700 border-white/10 text-gray-400'}`}>
                  0-side: Team 2
                </button>
              </div>
            )}
            <button
              onClick={() => setZeroVsEighteenActive(true)}
              disabled={zveZeroRoster.length === 0}
              className="tap-btn w-full bg-navy-600 border border-vr-500/40 text-white font-bold py-4 rounded-xl text-base disabled:opacity-40"
            >
              Start 0 vs 18 🎯
            </button>

            <div className="border-t border-white/10 my-4" />

            <p className="text-gray-400 text-sm mb-4">
              3 Before 10: hitting lines vs. a full-6 defense with blockers. Hitters win with 3 kills in a row; defense wins first with 10 total digs/blocks.
            </p>
            <button
              onClick={() => setThreeBeforeTenActive(true)}
              className="tap-btn w-full bg-navy-600 border border-vr-500/40 text-white font-bold py-4 rounded-xl text-base"
            >
              Start 3 Before 10 🔟
            </button>

            <div className="border-t border-white/10 my-4" />

            <p className="text-gray-400 text-sm mb-4">
              Servers vs Passers (2 teams of 5): ace or a 1-pass scores servers, a 3-pass scores passers, a missed serve scores passers, a 0-pass costs passers. Tracks each girl's serve/pass reps toward her season stats.
            </p>
            <button
              onClick={() => setServersVsPassersActive(true)}
              className="tap-btn w-full bg-navy-600 border border-vr-500/40 text-white font-bold py-4 rounded-xl text-base"
            >
              Start Servers vs Passers 🎾🙌
            </button>

            <div className="border-t border-white/10 my-4" />

            <p className="text-gray-400 text-sm mb-4">
              Pressure Serve Receive (Danger): the active passer starts at 10 — a 3-pass earns a point, a 1-pass or ace puts her in danger, and a 2nd shaky pass while in danger swaps her out for the server. Tracks every passer's and server's reps.
            </p>
            <button
              onClick={() => setPressureServeReceiveActive(true)}
              className="tap-btn w-full bg-navy-600 border border-vr-500/40 text-white font-bold py-4 rounded-xl text-base"
            >
              Start Pressure Serve Receive ⚠️
            </button>
          </>
        )}

        <div className="border-t border-white/10 my-4" />

        <p className="text-gray-400 text-sm mb-4">
          Serve/pass competition: one side receives 50 serves trying to hit a 2.5 pass average (125/150 points) to "win," then switch sides and run it again. No roster needed — just a running team total.
        </p>
        <button
          onClick={() => setPassChallengeActive(true)}
          className="tap-btn w-full bg-navy-600 border border-vr-500/40 text-white font-bold py-4 rounded-xl text-base"
        >
          Start Pass Challenge 🏆
        </button>
      </div>

      {/* Past sessions */}
      {sorted.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No practice sessions yet.</p>
          <p className="text-gray-600 text-xs mt-1">Start a scrimmage above to track stats.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest px-1">Past Sessions</p>
          {sorted.map(s => {
            const activePlayers = sessionPlayers(s, players).filter(p =>
              s.scrimmages.some((sc: SetStats) => sc[p.id] && (
                sc[p.id].kills + sc[p.id].digs + sc[p.id].attackAttempts + sc[p.id].attackErrors +
                sc[p.id].aces + sc[p.id].settingAssists + sc[p.id].passAttempts +
                sc[p.id].serveAttempts > 0
              ))
            )
            const totals = activePlayers.reduce((acc, p) => {
              const st = totalStats(s, p.id)
              return {
                kills: acc.kills + st.kills, digs: acc.digs + st.digs, aces: acc.aces + st.aces,
                serveAttempts: acc.serveAttempts + st.serveAttempts, passAttempts: acc.passAttempts + st.passAttempts,
                attackErrors: acc.attackErrors + st.attackErrors,
              }
            }, { kills: 0, digs: 0, aces: 0, serveAttempts: 0, passAttempts: 0, attackErrors: 0 })

            return (
              <button key={s.id} onClick={() => setDetail(s)}
                className="tap-btn w-full bg-navy-700 border border-white/10 rounded-2xl p-4 text-left flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-bold truncate">{s.name}</p>
                    {s.teamLabel && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-vr-800 border border-vr-500/40 text-vr-300 shrink-0">
                        {s.teamLabel}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">
                    {s.date} · {drillSubtitle(s)}{s.drillType === 'pass_challenge'
                      ? ` · ${s.passChallenge?.rounds.length ?? 0} round${s.passChallenge?.rounds.length === 1 ? '' : 's'}`
                      : s.drillType === 'team_game'
                      ? ` · ${s.teamGame?.teams.length ?? 0} teams`
                      : s.drillType === 'zero_vs_eighteen'
                      ? ` · ${s.zeroVsEighteen?.score ?? 0}/${s.zeroVsEighteen?.scoreGoal ?? 25} pts, ${s.zeroVsEighteen?.errors ?? 0}/${s.zeroVsEighteen?.errorGoal ?? 7} err`
                      : s.drillType === 'three_before_ten'
                      ? ` · ${s.threeBeforeTen?.streak ?? 0}/${s.threeBeforeTen?.streakGoal ?? 3} streak, ${s.threeBeforeTen?.defenseTotal ?? 0}/${s.threeBeforeTen?.digGoal ?? 10} digs`
                      : s.drillType === 'servers_vs_passers'
                      ? ` · ${s.serversVsPassers?.serverScore ?? 0}–${s.serversVsPassers?.passerScore ?? 0}`
                      : ` · ${activePlayers.length} players`}
                  </p>
                  {s.notes && <p className="text-gray-600 text-xs italic truncate mt-0.5">"{s.notes}"</p>}
                </div>
                {s.drillType === 'team_game' && s.teamGame ? (
                  <div className="shrink-0 text-right">
                    {s.teamGame.winningTeamIndex !== null ? (
                      <p className="text-green-400 font-bold text-sm">🏆 {s.teamGame.teams[s.teamGame.winningTeamIndex]?.name}</p>
                    ) : (
                      <p className="text-gray-500 text-xs">No winner</p>
                    )}
                  </div>
                ) : s.drillType === 'zero_vs_eighteen' && s.zeroVsEighteen ? (
                  <div className="shrink-0 text-right">
                    {s.zeroVsEighteen.winner !== null ? (
                      <p className="text-green-400 font-bold text-sm">🏆 {s.zeroVsEighteen.winner === 'zero' ? s.zeroVsEighteen.zeroTeam.name : s.zeroVsEighteen.eighteenTeam.name}</p>
                    ) : (
                      <p className="text-gray-500 text-xs">No winner</p>
                    )}
                  </div>
                ) : s.drillType === 'three_before_ten' && s.threeBeforeTen ? (
                  <div className="shrink-0 text-right">
                    {s.threeBeforeTen.winner !== null ? (
                      <p className="text-green-400 font-bold text-sm">🏆 {s.threeBeforeTen.winner === 'hitting' ? s.threeBeforeTen.hittingTeam.name : s.threeBeforeTen.defenseTeam.name}</p>
                    ) : (
                      <p className="text-gray-500 text-xs">No winner</p>
                    )}
                  </div>
                ) : s.drillType === 'servers_vs_passers' && s.serversVsPassers ? (
                  <div className="shrink-0 text-right">
                    {s.serversVsPassers.winner !== null ? (
                      <p className="text-green-400 font-bold text-sm">🏆 {s.serversVsPassers.winner === 'servers' ? s.serversVsPassers.serverTeam.name : s.serversVsPassers.passerTeam.name}</p>
                    ) : (
                      <p className="text-gray-500 text-xs">No winner</p>
                    )}
                  </div>
                ) : s.drillType === 'pass_challenge' && s.passChallenge ? (
                  <div className="flex gap-3 text-center shrink-0">
                    {s.passChallenge.rounds.map((r, i) => {
                      const { total, complete } = roundStats(r, s.passChallenge!.repsGoal)
                      const won = total >= s.passChallenge!.targetTotal
                      return (
                        <div key={i}>
                          <p className={`font-bold ${complete ? (won ? 'text-green-400' : 'text-red-400') : 'text-gray-400'}`}>{total}</p>
                          <p className="text-gray-600 text-[10px]">R{i + 1}{complete ? (won ? ' ✓' : ' ✗') : ''}</p>
                        </div>
                      )
                    })}
                  </div>
                ) : s.drillType === 'serve_pass' || s.drillType === 'pressure_serve_receive' ? (
                  <div className="flex gap-3 text-center shrink-0">
                    <div><p className="text-pb-300 font-bold">{totals.serveAttempts}</p><p className="text-gray-600 text-[10px]">SRV</p></div>
                    <div><p className="text-yellow-400 font-bold">{totals.aces}</p><p className="text-gray-600 text-[10px]">ACE</p></div>
                    <div><p className="text-cyan-300 font-bold">{totals.passAttempts}</p><p className="text-gray-600 text-[10px]">PASS</p></div>
                  </div>
                ) : s.drillType === 'three_ball' ? (
                  <div className="flex gap-3 text-center shrink-0">
                    <div><p className="text-green-400 font-bold">{totals.kills}</p><p className="text-gray-600 text-[10px]">K</p></div>
                    <div><p className="text-red-400 font-bold">{totals.attackErrors}</p><p className="text-gray-600 text-[10px]">E</p></div>
                    <div><p className="text-cyan-300 font-bold">{totals.passAttempts}</p><p className="text-gray-600 text-[10px]">PASS</p></div>
                  </div>
                ) : (
                  <div className="flex gap-3 text-center shrink-0">
                    <div><p className="text-green-400 font-bold">{totals.kills}</p><p className="text-gray-600 text-[10px]">K</p></div>
                    <div><p className="text-cyan-400 font-bold">{totals.digs}</p><p className="text-gray-600 text-[10px]">D</p></div>
                    <div><p className="text-yellow-400 font-bold">{totals.aces}</p><p className="text-gray-600 text-[10px]">A</p></div>
                  </div>
                )}
                <span className="text-gray-600 text-lg">›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
