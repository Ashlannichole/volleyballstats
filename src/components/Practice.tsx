import { useState } from 'react'
import type { Player, PlayerStats, SetStats, PracticeSession, Match } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'
import { mergeStats, killPct, passAvg } from '../utils/statsHelpers'
import LiveGame from './LiveGame'

interface Props {
  players: Player[]
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

  const displayPlayers = players.filter(p =>
    session.scrimmages.some(s => s[p.id] && (
      s[p.id].kills + s[p.id].digs + s[p.id].attackAttempts +
      s[p.id].aces + s[p.id].settingAssists + s[p.id].passAttempts > 0
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
        <p className="text-gray-500 text-sm">{session.date} · {session.scrimmages.length} set{session.scrimmages.length !== 1 ? 's' : ''}</p>
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

      <button onClick={() => { if (confirm('Delete this practice session?')) onDelete() }}
        className="tap-btn w-full border border-red-500/30 text-red-400 py-3 rounded-xl text-sm">
        Delete Session
      </button>
    </div>
  )
}

// ── Main Practice component ────────────────────────────────────────────────
export default function Practice({ players, sessions, onSave, onDelete }: Props) {
  const [detail, setDetail] = useState<PracticeSession | null>(null)
  const [scrimmageActive, setScrimmageActive] = useState(false)

  function handleSavePractice(session: PracticeSession) {
    onSave(session)
    setScrimmageActive(false)
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
          players={players}
          onSaveMatch={(_: Match) => {}}
          practiceMode={true}
          onSavePractice={handleSavePractice}
        />
      </div>
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

      {/* Start new practice */}
      <div className="bg-navy-700 border border-vr-700/40 rounded-2xl p-4 mb-6">
        <p className="text-vr-400 text-xs font-bold uppercase tracking-widest mb-3">New Practice Session</p>

        {players.length === 0 ? (
          <p className="text-yellow-400 text-sm">Add players to your roster first.</p>
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
          </>
        )}
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
            const activePlayers = players.filter(p =>
              s.scrimmages.some((sc: SetStats) => sc[p.id] && (
                sc[p.id].kills + sc[p.id].digs + sc[p.id].attackAttempts +
                sc[p.id].aces + sc[p.id].settingAssists + sc[p.id].passAttempts > 0
              ))
            )
            const totals = activePlayers.reduce((acc, p) => {
              const st = totalStats(s, p.id)
              return { kills: acc.kills + st.kills, digs: acc.digs + st.digs, aces: acc.aces + st.aces }
            }, { kills: 0, digs: 0, aces: 0 })

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
                  <p className="text-gray-500 text-xs">{s.date} · {s.scrimmages.length} set{s.scrimmages.length !== 1 ? 's' : ''} · {activePlayers.length} players</p>
                  {s.notes && <p className="text-gray-600 text-xs italic truncate mt-0.5">"{s.notes}"</p>}
                </div>
                <div className="flex gap-3 text-center shrink-0">
                  <div><p className="text-green-400 font-bold">{totals.kills}</p><p className="text-gray-600 text-[10px]">K</p></div>
                  <div><p className="text-cyan-400 font-bold">{totals.digs}</p><p className="text-gray-600 text-[10px]">D</p></div>
                  <div><p className="text-yellow-400 font-bold">{totals.aces}</p><p className="text-gray-600 text-[10px]">A</p></div>
                </div>
                <span className="text-gray-600 text-lg">›</span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
