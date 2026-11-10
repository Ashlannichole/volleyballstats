import { useState } from 'react'
import type { Player, PlayerStats, Match, PracticeSession, PlayerNote } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'
import { mergeStats, aggregatePlayerStats, aggregatePracticeStats, buildTeamSummary, killPct, passAvg, hittingPct } from '../utils/statsHelpers'

interface Props {
  player: Player
  players: Player[]
  matches: Match[]
  practices: PracticeSession[]
  notes: PlayerNote[]
  onAddNote: (text: string) => void
  onDeleteNote: (id: string) => void
  onBack: () => void
}

// Group matches by tournament name (falls back to date string), earliest first.
// Mirrors SeasonStats' own grouping so a player's trend lines up with the
// same tournament buckets shown there.
function groupByTournament(matches: Match[]): { name: string; matches: Match[] }[] {
  const map = new Map<string, Match[]>()
  for (const m of matches) {
    const key = m.tournament?.trim() || m.date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  return Array.from(map.entries())
    .map(([name, ms]) => ({ name, matches: ms.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => a.matches[0].date.localeCompare(b.matches[0].date))
}

function statsForPlayer(playerId: string, matches: Match[]): PlayerStats {
  return matches.reduce(
    (acc, m) => m.sets.reduce((a, set) => set[playerId] ? mergeStats(a, set[playerId]) : a, acc),
    EMPTY_STATS()
  )
}

function Sparkline({ values, color = '#5ab3d0' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 100, h = 32, pad = 3
  const points = values.map((v, i) => {
    const x = pad + (i / (values.length - 1)) * (w - pad * 2)
    const y = h - pad - ((v - min) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {values.map((v, i) => {
        const x = pad + (i / (values.length - 1)) * (w - pad * 2)
        const y = h - pad - ((v - min) / range) * (h - pad * 2)
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />
      })}
    </svg>
  )
}

interface Insight { tone: 'positive' | 'negative' | 'neutral'; text: string }

function buildInsights(matchStats: PlayerStats, practiceStats: PlayerStats, team: ReturnType<typeof buildTeamSummary>, tournamentSeries: { name: string; stats: PlayerStats }[]): Insight[] {
  const insights: Insight[] = []

  // Passing vs team average (matches)
  if (matchStats.passAttempts >= 10) {
    const mine = matchStats.passRatingTotal / matchStats.passAttempts
    const diff = mine - team.passAvgTeam
    if (diff <= -0.3) insights.push({ tone: 'negative', text: `Passing is below the team average in matches (${mine.toFixed(2)} vs team ${team.passAvgTeam.toFixed(2)}) — worth extra serve-receive reps.` })
    else if (diff >= 0.3) insights.push({ tone: 'positive', text: `Passing is a strength in matches (${mine.toFixed(2)} vs team ${team.passAvgTeam.toFixed(2)} average).` })
  }

  // Hitting efficiency vs team average (matches)
  if (matchStats.attackAttempts >= 10) {
    const mine = (matchStats.kills - matchStats.attackErrors) / matchStats.attackAttempts
    const diff = mine - team.killPctTeam
    if (diff <= -0.08) insights.push({ tone: 'negative', text: `Hitting efficiency is below the team average (${(mine * 100).toFixed(1)}% vs team ${(team.killPctTeam * 100).toFixed(1)}%) — look at shot selection and footwork into the attack.` })
    else if (diff >= 0.08) insights.push({ tone: 'positive', text: `Hitting efficiency is a strength (${(mine * 100).toFixed(1)}% vs team ${(team.killPctTeam * 100).toFixed(1)}% average).` })
  }

  // Overall error rate (matches)
  const attempts = matchStats.attackAttempts + matchStats.serveAttempts
  if (attempts >= 10) {
    const errRate = (matchStats.attackErrors + matchStats.serveErrors) / attempts
    if (errRate >= 0.25) insights.push({ tone: 'negative', text: `Error rate is high this season (${(errRate * 100).toFixed(0)}% of attack + serve attempts end in an error) — focus on consistency over power.` })
  }

  // Serving (ace rate) vs team average
  if (matchStats.serveAttempts >= 10) {
    const mine = matchStats.aces / matchStats.serveAttempts
    const diff = mine - team.servePctTeam
    if (diff >= 0.08) insights.push({ tone: 'positive', text: `Serving is a weapon (${(mine * 100).toFixed(1)}% ace rate vs team ${(team.servePctTeam * 100).toFixed(1)}%).` })
    else if (diff <= -0.08 && matchStats.serveErrors / matchStats.serveAttempts >= 0.15) insights.push({ tone: 'negative', text: `Serve error rate is notable (${((matchStats.serveErrors / matchStats.serveAttempts) * 100).toFixed(0)}% of serves) with a below-average ace rate — consider a safer target zone.` })
  }

  // Season trend (first vs most recent tournament with enough data)
  const withPassData = tournamentSeries.filter(t => t.stats.passAttempts >= 5)
  if (withPassData.length >= 2) {
    const first = withPassData[0].stats
    const last = withPassData[withPassData.length - 1].stats
    const firstAvg = first.passRatingTotal / first.passAttempts
    const lastAvg = last.passRatingTotal / last.passAttempts
    const diff = lastAvg - firstAvg
    if (diff >= 0.3) insights.push({ tone: 'positive', text: `Passing has improved since early season — ${firstAvg.toFixed(2)} (${withPassData[0].name}) → ${lastAvg.toFixed(2)} (${withPassData[withPassData.length - 1].name}).` })
    else if (diff <= -0.3) insights.push({ tone: 'negative', text: `Passing has dropped off since early season — ${firstAvg.toFixed(2)} (${withPassData[0].name}) → ${lastAvg.toFixed(2)} (${withPassData[withPassData.length - 1].name}).` })
  }

  // Practice vs match gap (passing)
  if (matchStats.passAttempts >= 10 && practiceStats.passAttempts >= 10) {
    const matchP = matchStats.passRatingTotal / matchStats.passAttempts
    const practiceP = practiceStats.passRatingTotal / practiceStats.passAttempts
    const diff = practiceP - matchP
    if (diff >= 0.4) insights.push({ tone: 'neutral', text: `Passes noticeably better in practice than in matches (${practiceP.toFixed(2)} vs ${matchP.toFixed(2)}) — may be a pressure or focus factor worth talking through.` })
    else if (diff <= -0.4) insights.push({ tone: 'positive', text: `Performs better passing in live matches than in practice reps (${matchP.toFixed(2)} vs ${practiceP.toFixed(2)}) — good competitive focus; more deliberate practice reps could build on it.` })
  }

  return insights
}

export default function PlayerReport({ player, players, matches, practices, notes, onAddNote, onDeleteNote, onBack }: Props) {
  const [newNote, setNewNote] = useState('')

  const matchStats = aggregatePlayerStats(player.id, matches)
  const practiceStats = aggregatePracticeStats(player.id, practices)
  const team = buildTeamSummary(matches)

  const tournaments = groupByTournament(matches)
  const tournamentSeries = tournaments
    .map(t => ({ name: t.name, stats: statsForPlayer(player.id, t.matches) }))
    .filter(t => t.stats.kills + t.stats.digs + t.stats.attackAttempts + t.stats.serveAttempts + t.stats.passAttempts > 0)

  const passSeries = tournamentSeries.filter(t => t.stats.passAttempts > 0).map(t => t.stats.passRatingTotal / t.stats.passAttempts)
  const hitSeries = tournamentSeries.filter(t => t.stats.attackAttempts > 0).map(t => (t.stats.kills - t.stats.attackErrors) / t.stats.attackAttempts)
  const errSeries = tournamentSeries.map(t => t.stats.attackErrors + t.stats.serveErrors)

  // Practice sessions this player actually appears in, chronological
  function practiceSessionStats(session: PracticeSession): PlayerStats {
    return session.scrimmages.reduce(
      (acc, s) => s[player.id] ? mergeStats(acc, s[player.id]) : acc,
      EMPTY_STATS()
    )
  }
  const practiceSessionSeries = [...practices]
    .filter(s => s.scrimmages.some(sc => sc[player.id]))
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(s => ({ name: s.name, stats: practiceSessionStats(s) }))
  const practicePassSeries = practiceSessionSeries.filter(s => s.stats.passAttempts > 0).map(s => s.stats.passRatingTotal / s.stats.passAttempts)
  const practiceHitSeries = practiceSessionSeries.filter(s => s.stats.attackAttempts > 0).map(s => (s.stats.kills - s.stats.attackErrors) / s.stats.attackAttempts)

  const insights = buildInsights(matchStats, practiceStats, team, tournamentSeries)
  const playerNotes = notes.filter(n => n.playerId === player.id).sort((a, b) => b.date.localeCompare(a.date))

  function addNote() {
    if (!newNote.trim()) return
    onAddNote(newNote.trim())
    setNewNote('')
  }

  const toneStyle = {
    positive: 'bg-green-900/20 border-green-600/30 text-green-300',
    negative: 'bg-red-900/20 border-red-600/30 text-red-300',
    neutral: 'bg-navy-600 border-white/10 text-gray-300',
  }
  const toneIcon = { positive: '✓', negative: '⚠', neutral: 'ℹ' }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <button onClick={onBack} className="tap-btn text-pb-400 text-sm mb-4 flex items-center gap-1">
        ← Players
      </button>

      <div className="flex items-center gap-3 mb-5">
        <span className="text-white font-black text-2xl">#{player.number}</span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[player.position]}`}>
          {POSITION_LABELS[player.position]}
        </span>
        <h2 className="text-2xl font-bold text-white">{player.name}</h2>
      </div>

      {/* Actionable insights */}
      <div className="bg-vr-900/20 border border-vr-600/30 rounded-2xl p-4 mb-4">
        <p className="text-vr-400 text-xs font-bold uppercase tracking-widest mb-3">💬 Talking Points</p>
        {insights.length === 0 ? (
          <p className="text-gray-500 text-sm">Not enough data yet to call out specific trends — check back after a few more matches.</p>
        ) : (
          <div className="space-y-2">
            {insights.map((ins, i) => (
              <div key={i} className={`flex items-start gap-2 border rounded-xl px-3 py-2 text-sm ${toneStyle[ins.tone]}`}>
                <span className="shrink-0">{toneIcon[ins.tone]}</span>
                <span>{ins.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Match season totals */}
      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Match Totals (Season)</p>
        <div className="grid grid-cols-4 gap-2 mb-3">
          {[
            { label: 'Kills', val: matchStats.kills, color: 'text-green-400' },
            { label: 'Digs', val: matchStats.digs, color: 'text-cyan-400' },
            { label: 'Aces', val: matchStats.aces, color: 'text-yellow-400' },
            { label: 'Assists', val: matchStats.settingAssists, color: 'text-orange-400' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-navy-600 rounded-xl p-2 text-center">
              <p className={`font-bold text-base ${color}`}>{val}</p>
              <p className="text-gray-500 text-[10px]">{label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Hit %', val: hittingPct(matchStats) },
            { label: 'Kill %', val: killPct(matchStats) },
            { label: 'Pass Avg', val: passAvg(matchStats) },
            { label: 'Errors', val: String(matchStats.attackErrors + matchStats.serveErrors) },
          ].map(({ label, val }) => (
            <div key={label} className="text-center">
              <p className="text-white font-bold text-sm">{val}</p>
              <p className="text-gray-500 text-[10px]">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Match trend */}
      {tournamentSeries.length >= 2 && (
        <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Match Trend (by tournament)</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Pass Avg', vals: passSeries, color: '#5ab3d0', fmt: (v: number) => v.toFixed(2) },
              { label: 'Hit %', vals: hitSeries, color: '#4ade80', fmt: (v: number) => (v * 100).toFixed(0) + '%' },
              { label: 'Errors', vals: errSeries, color: '#f87171', fmt: (v: number) => String(Math.round(v)) },
            ].map(({ label, vals, color, fmt }) => {
              if (vals.length < 2) return (
                <div key={label} className="bg-navy-600 rounded-xl p-3 flex flex-col items-center gap-1">
                  <p className="text-gray-500 text-[10px] font-bold uppercase">{label}</p>
                  <p className="text-gray-600 text-xs mt-2">Not enough data</p>
                </div>
              )
              const last = vals[vals.length - 1]
              const first = vals[0]
              const up = label === 'Errors' ? last < first : last > first
              const same = Math.abs(last - first) < 0.01
              return (
                <div key={label} className="bg-navy-600 rounded-xl p-3 flex flex-col items-center gap-1">
                  <p className="text-gray-500 text-[10px] font-bold uppercase">{label}</p>
                  <Sparkline values={vals} color={color} />
                  <div className="flex items-center gap-1">
                    <p className="text-white font-bold text-sm">{fmt(last)}</p>
                    {!same && <span className={`text-xs ${up ? 'text-green-400' : 'text-red-400'}`}>{up ? '▲' : '▼'}</span>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-between mt-2 px-1">
            {tournamentSeries.map(t => (
              <p key={t.name} className="text-gray-600 text-[9px] truncate max-w-[60px] text-center">{t.name}</p>
            ))}
          </div>
        </div>
      )}

      {/* Practice totals */}
      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Practice Totals (All Drills)</p>
        {practiceStats.kills + practiceStats.digs + practiceStats.attackAttempts + practiceStats.serveAttempts + practiceStats.passAttempts === 0 ? (
          <p className="text-gray-500 text-sm">No practice drill data recorded for her yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { label: 'Kills', val: practiceStats.kills, color: 'text-green-400' },
                { label: 'Digs', val: practiceStats.digs, color: 'text-cyan-400' },
                { label: 'Aces', val: practiceStats.aces, color: 'text-yellow-400' },
                { label: 'Errors', val: practiceStats.attackErrors + practiceStats.serveErrors, color: 'text-red-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-navy-600 rounded-xl p-2 text-center">
                  <p className={`font-bold text-base ${color}`}>{val}</p>
                  <p className="text-gray-500 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Hit %', val: hittingPct(practiceStats) },
                { label: 'Pass Avg', val: passAvg(practiceStats) },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <p className="text-white font-bold text-sm">{val}</p>
                  <p className="text-gray-500 text-[10px]">{label}</p>
                </div>
              ))}
            </div>
            {(practicePassSeries.length >= 2 || practiceHitSeries.length >= 2) && (
              <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-white/10">
                {practicePassSeries.length >= 2 && (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-gray-500 text-[10px] font-bold uppercase">Pass Avg by Session</p>
                    <Sparkline values={practicePassSeries} color="#5ab3d0" />
                  </div>
                )}
                {practiceHitSeries.length >= 2 && (
                  <div className="flex flex-col items-center gap-1">
                    <p className="text-gray-500 text-[10px] font-bold uppercase">Hit % by Session</p>
                    <Sparkline values={practiceHitSeries} color="#4ade80" />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Notes & action plan */}
      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">📝 Notes &amp; Action Plan</p>
        {playerNotes.length > 0 && (
          <div className="space-y-2 mb-3">
            {playerNotes.map(n => (
              <div key={n.id} className="bg-navy-600 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-gray-500 text-[10px] font-bold">{n.date}</p>
                  <button onClick={() => onDeleteNote(n.id)} className="tap-btn text-gray-600 text-xs hover:text-red-400">✕</button>
                </div>
                <p className="text-white text-sm mt-1 whitespace-pre-wrap">{n.text}</p>
              </div>
            ))}
          </div>
        )}
        <textarea
          value={newNote}
          onChange={e => setNewNote(e.target.value)}
          placeholder="What did you talk about? What's the focus until next check-in?"
          rows={3}
          className="w-full bg-navy-600 border border-white/20 rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-pb-500 mb-2"
        />
        <button onClick={addNote} disabled={!newNote.trim()}
          className="tap-btn w-full bg-vr-600 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm">
          + Add Note
        </button>
      </div>

      <p className="text-gray-600 text-[10px] text-center">
        Team averages compare against {players.length} roster player{players.length === 1 ? '' : 's'} across {matches.length} match{matches.length === 1 ? '' : 'es'}.
      </p>
    </div>
  )
}
