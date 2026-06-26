import { useState } from 'react'
import type { Player, PlayerStats, SetStats, PracticeSession } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'
import { mergeStats, killPct, passAvg } from '../utils/statsHelpers'

interface Props {
  players: Player[]
  sessions: PracticeSession[]
  onSave: (s: PracticeSession) => void
  onDelete: (id: string) => void
}

// ── Stat chips shown on each player card during scrimmage ──────────────────
interface Chip { key: keyof PlayerStats; label: string; color: string; bg: string }
const CHIPS: Chip[] = [
  { key: 'kills',          label: 'KILL', color: 'text-green-300',  bg: 'bg-green-900/40 border-green-600/40' },
  { key: 'attackErrors',   label: 'ERR',  color: 'text-red-300',    bg: 'bg-red-900/40 border-red-600/40' },
  { key: 'attackAttempts', label: 'ATT',  color: 'text-pb-300',     bg: 'bg-pb-900/20 border-pb-600/30' },
  { key: 'aces',           label: 'ACE',  color: 'text-yellow-300', bg: 'bg-yellow-900/30 border-yellow-600/30' },
  { key: 'digs',           label: 'DIG',  color: 'text-cyan-300',   bg: 'bg-cyan-900/30 border-cyan-600/30' },
  { key: 'soloBlocks',     label: 'BS',   color: 'text-vr-300',     bg: 'bg-vr-900/30 border-vr-600/30' },
  { key: 'settingAssists', label: 'AST',  color: 'text-orange-300', bg: 'bg-orange-900/30 border-orange-600/30' },
  { key: 'serveErrors',    label: 'SE',   color: 'text-red-400',    bg: 'bg-red-900/30 border-red-700/30' },
]

function buildSetStats(ps: Player[]): SetStats {
  const s: SetStats = {}
  for (const p of ps) s[p.id] = EMPTY_STATS()
  return s
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

  // Sort by kills desc for the starter recommendation
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
      <p className="text-gray-500 text-sm mb-1">{session.date} · {session.scrimmages.length} scrimmage{session.scrimmages.length !== 1 ? 's' : ''}</p>
      {session.notes && <p className="text-gray-400 text-sm italic mb-4">"{session.notes}"</p>}

      {/* Scrimmage selector */}
      {session.scrimmages.length > 1 && (
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          <button onClick={() => setScrimmageIdx(null)}
            className={`tap-btn px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${scrimmageIdx === null ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-700 border-white/10 text-gray-400'}`}>
            All Combined
          </button>
          {session.scrimmages.map((_, i) => (
            <button key={i} onClick={() => setScrimmageIdx(i)}
              className={`tap-btn px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border ${scrimmageIdx === i ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-700 border-white/10 text-gray-400'}`}>
              Scrimmage {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Starter recommendation */}
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

// ── Live scrimmage tracker ─────────────────────────────────────────────────
function LiveScrimmage({
  players,
  sessionName,
  scrimmages,
  currentIdx,
  stats,
  onAdjust,
  onAdjustPass,
  onNextScrimmage,
  onEnd,
}: {
  players: Player[]
  sessionName: string
  scrimmages: SetStats[]
  currentIdx: number
  stats: SetStats
  onAdjust: (pid: string, key: keyof PlayerStats, delta: number) => void
  onAdjustPass: (pid: string, rating: number) => void
  onNextScrimmage: () => void
  onEnd: () => void
}) {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="flex flex-col h-full bg-navy-900">
      {/* Header bar */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center justify-between shrink-0">
        <div>
          <p className="text-white font-bold">{sessionName}</p>
          <p className="text-gray-500 text-xs">Scrimmage {currentIdx + 1} of {scrimmages.length}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onNextScrimmage}
            className="tap-btn bg-navy-600 border border-white/10 text-gray-300 text-xs font-bold px-3 py-2 rounded-xl">
            + New Scrimmage
          </button>
          <button onClick={onEnd}
            className="tap-btn bg-green-800 text-white text-xs font-bold px-3 py-2 rounded-xl">
            End Practice
          </button>
        </div>
      </div>

      {/* Scrimmage tabs */}
      {scrimmages.length > 1 && (
        <div className="bg-navy-800/60 border-b border-white/5 px-3 py-1.5 flex gap-2 overflow-x-auto shrink-0">
          {scrimmages.map((_, i) => (
            <span key={i}
              className={`text-xs font-bold px-3 py-1 rounded-lg border shrink-0 ${i === currentIdx ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-700 border-white/10 text-gray-500'}`}>
              S{i + 1}
            </span>
          ))}
        </div>
      )}

      {/* Player cards */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {players.map(p => {
          const ps = stats[p.id] ?? EMPTY_STATS()
          const isExpanded = expanded === p.id
          return (
            <div key={p.id} className="bg-navy-700 border border-white/10 rounded-2xl overflow-hidden">
              {/* Card header */}
              <div className="flex items-center gap-3 px-3 pt-3 pb-2 border-b border-white/5">
                <div className="w-9 h-9 rounded-full bg-vr-800 border border-vr-500/40 flex items-center justify-center shrink-0">
                  <span className="text-pb-400 font-black text-sm">#{p.number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm truncate">{p.name}</p>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                    {POSITION_LABELS[p.position]}
                  </span>
                </div>
                {/* Quick totals */}
                <div className="flex gap-3 text-center shrink-0">
                  <div><p className="text-green-400 font-bold text-sm">{ps.kills}</p><p className="text-gray-600 text-[9px]">K</p></div>
                  <div><p className="text-cyan-400 font-bold text-sm">{ps.digs}</p><p className="text-gray-600 text-[9px]">D</p></div>
                  <div><p className="text-yellow-400 font-bold text-sm">{ps.aces}</p><p className="text-gray-600 text-[9px]">A</p></div>
                </div>
                <button onClick={() => setExpanded(isExpanded ? null : p.id)}
                  className={`tap-btn text-xs px-2 ${isExpanded ? 'text-vr-400' : 'text-gray-600'}`}>
                  {isExpanded ? '▲' : '▼'}
                </button>
              </div>

              {/* Stat chips — 4 per row */}
              <div className="px-3 py-2 grid grid-cols-4 gap-1.5">
                {CHIPS.map(chip => (
                  <button key={chip.key}
                    onClick={() => onAdjust(p.id, chip.key, 1)}
                    onContextMenu={e => { e.preventDefault(); onAdjust(p.id, chip.key, -1) }}
                    className={`tap-btn border rounded-lg py-1.5 px-1 text-center ${chip.bg}`}>
                    <p className={`text-sm font-bold leading-none ${chip.color}`}>{ps[chip.key] as number}</p>
                    <p className="text-white/30 text-[9px] leading-none mt-0.5">{chip.label}</p>
                  </button>
                ))}
              </div>

              {/* Pass rating */}
              <div className="px-3 pb-2 flex items-center gap-2">
                <span className="text-gray-600 text-[10px] w-6">PA</span>
                <span className="text-pb-400 text-xs font-bold w-8">
                  {ps.passAttempts > 0 ? (ps.passRatingTotal / ps.passAttempts).toFixed(1) : '—'}
                </span>
                {[0,1,2,3].map(r => (
                  <button key={r} onClick={() => onAdjustPass(p.id, r)}
                    className={`tap-btn flex-1 rounded text-xs font-bold py-1 border ${
                      r === 0 ? 'border-red-600/60 bg-red-900/30 text-red-300' :
                      r === 1 ? 'border-orange-700/50 bg-orange-900/20 text-orange-300' :
                      r === 2 ? 'border-yellow-700/50 bg-yellow-900/20 text-yellow-300' :
                               'border-green-700/50 bg-green-900/20 text-green-300'
                    }`}>{r}</button>
                ))}
              </div>

              {/* Expanded: block assists + setting errors */}
              {isExpanded && (
                <div className="border-t border-white/10 px-3 py-2 bg-navy-800/50 grid grid-cols-2 gap-2">
                  {([
                    { label: 'Block Assists', key: 'blockAssists' as keyof PlayerStats },
                    { label: 'Setting Errors', key: 'settingErrors' as keyof PlayerStats },
                    { label: 'Serve Attempts', key: 'serveAttempts' as keyof PlayerStats },
                    { label: 'Attack Att.',   key: 'attackAttempts' as keyof PlayerStats },
                  ]).map(({ label, key }) => (
                    <div key={key} className="flex items-center justify-between bg-navy-700 rounded-lg px-2 py-1.5">
                      <span className="text-gray-500 text-xs">{label}</span>
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => onAdjust(p.id, key, -1)} className="tap-btn text-gray-500 w-5 h-5 flex items-center justify-center rounded bg-navy-600 text-xs">−</button>
                        <span className="text-white font-bold text-xs w-5 text-center">{ps[key] as number}</span>
                        <button onClick={() => onAdjust(p.id, key, 1)}  className="tap-btn text-white w-5 h-5 flex items-center justify-center rounded bg-vr-700 text-xs">+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main Practice component ────────────────────────────────────────────────
export default function Practice({ players, sessions, onSave, onDelete }: Props) {
  const [detail, setDetail]         = useState<PracticeSession | null>(null)
  const [active, setActive]         = useState(false)
  const [sessionName, setSessionName] = useState('')
  const [notes, setNotes]           = useState('')
  const [scrimmages, setScrimmages] = useState<SetStats[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)

  // ── Start a new practice ──────────────────────────────────────────────
  function startPractice() {
    if (!sessionName.trim() || players.length === 0) return
    setScrimmages([buildSetStats(players)])
    setCurrentIdx(0)
    setActive(true)
  }

  function adjust(pid: string, key: keyof PlayerStats, delta: number) {
    setScrimmages(prev => prev.map((s, i) => {
      if (i !== currentIdx) return s
      const ps = { ...s[pid] }
      return { ...s, [pid]: { ...ps, [key]: Math.max(0, (ps[key] as number) + delta) } }
    }))
  }

  function adjustPass(pid: string, rating: number) {
    setScrimmages(prev => prev.map((s, i) => {
      if (i !== currentIdx) return s
      const ps = { ...s[pid] }
      return { ...s, [pid]: { ...ps, passRatingTotal: ps.passRatingTotal + rating, passAttempts: ps.passAttempts + 1 } }
    }))
  }

  function addScrimmage() {
    setScrimmages(prev => [...prev, buildSetStats(players)])
    setCurrentIdx(scrimmages.length)
  }

  function endPractice() {
    const session: PracticeSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: sessionName.trim(),
      notes: notes.trim(),
      scrimmages,
    }
    onSave(session)
    setActive(false)
    setSessionName('')
    setNotes('')
    setScrimmages([])
    setCurrentIdx(0)
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

  // ── Live scrimmage ────────────────────────────────────────────────────
  if (active) {
    return (
      <LiveScrimmage
        players={players}
        sessionName={sessionName}
        scrimmages={scrimmages}
        currentIdx={currentIdx}
        stats={scrimmages[currentIdx] ?? buildSetStats(players)}
        onAdjust={adjust}
        onAdjustPass={adjustPass}
        onNextScrimmage={addScrimmage}
        onEnd={endPractice}
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

      {/* New practice setup */}
      <div className="bg-navy-700 border border-vr-700/40 rounded-2xl p-4 mb-6">
        <p className="text-vr-400 text-xs font-bold uppercase tracking-widest mb-3">New Practice Session</p>

        {players.length === 0 && (
          <p className="text-yellow-400 text-sm mb-3">Add players to your roster first.</p>
        )}

        <div className="flex flex-col gap-3">
          <input
            className="w-full bg-navy-600 border border-white/20 rounded-xl px-4 py-3 text-white text-base outline-none focus:border-pb-500"
            placeholder="Session name (e.g. Pre-tournament scrimmage)"
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
          />
          <input
            className="w-full bg-navy-600 border border-white/20 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-pb-500"
            placeholder="Notes (optional)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button
            disabled={!sessionName.trim() || players.length === 0}
            onClick={startPractice}
            className="tap-btn w-full bg-vr-600 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-base">
            Start Practice 🏐
          </button>
        </div>
      </div>

      {/* Past sessions */}
      {sorted.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 text-sm">No practice sessions yet.</p>
          <p className="text-gray-600 text-xs mt-1">Start a session above to track scrimmage stats.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest px-1">Past Sessions</p>
          {sorted.map(s => {
            // Count active players
            const activePlayers = players.filter(p =>
              s.scrimmages.some(sc => sc[p.id] && (
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
                  <p className="text-white font-bold truncate">{s.name}</p>
                  <p className="text-gray-500 text-xs">{s.date} · {s.scrimmages.length} scrimmage{s.scrimmages.length !== 1 ? 's' : ''} · {activePlayers.length} players</p>
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
