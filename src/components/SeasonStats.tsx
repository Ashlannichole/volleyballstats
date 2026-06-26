import { useState } from 'react'
import type { Match, Player, PlayerStats } from '../types'
import { aggregatePlayerStats, buildTeamSummary, killPct, passAvg, hittingPct, mergeStats } from '../utils/statsHelpers'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'

interface Props {
  matches: Match[]
  players: Player[]
}

type View = 'overview' | 'progress' | 'awards'

// Group matches by tournament name (falls back to date string)
function groupByTournament(matches: Match[]): { name: string; matches: Match[] }[] {
  const map = new Map<string, Match[]>()
  for (const m of matches) {
    const key = m.tournament?.trim() || m.date
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(m)
  }
  // Sort by earliest match date within each tournament
  return Array.from(map.entries())
    .map(([name, ms]) => ({ name, matches: ms.sort((a, b) => a.date.localeCompare(b.date)) }))
    .sort((a, b) => a.matches[0].date.localeCompare(b.matches[0].date))
}

function teamStats(matches: Match[]) {
  return buildTeamSummary(matches)
}

function winLoss(matches: Match[]) {
  let w = 0, l = 0
  for (const m of matches) {
    if (Number(m.ourScore) > Number(m.theirScore)) w++
    else l++
  }
  return { w, l }
}

// Simple inline sparkline SVG
function Sparkline({ values, color = '#5ab3d0' }: { values: number[]; color?: string }) {
  if (values.length < 2) return null
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const w = 80, h = 28, pad = 3
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

export default function SeasonStats({ matches, players }: Props) {
  const [view, setView] = useState<View>('overview')

  if (matches.length === 0) {
    return (
      <div className="p-6 text-center mt-12">
        <p className="text-gray-400 text-lg">No match data yet.</p>
        <p className="text-gray-600 text-sm mt-2">Save matches to see season stats.</p>
      </div>
    )
  }

  const tournaments = groupByTournament(matches)
  const { w: totalW, l: totalL } = winLoss(matches)
  const totalSets = matches.reduce((n, m) => n + m.sets.length, 0)
  const team = teamStats(matches)

  return (
    <div className="p-4 max-w-3xl mx-auto pb-8">
      {/* Season headline */}
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="text-2xl font-bold text-white">Season Stats</h2>
        <span className="text-gray-500 text-sm">{matches.length} matches · {totalSets} sets</span>
      </div>

      {/* View tabs */}
      <div className="flex gap-1 bg-navy-800 rounded-xl p-1 mb-5">
        {([
          { id: 'overview', label: '📊 Overview' },
          { id: 'progress', label: '📈 Progress' },
          { id: 'awards',   label: '🏆 Awards'   },
        ] as { id: View; label: string }[]).map(t => (
          <button key={t.id} onClick={() => setView(t.id)}
            className={`tap-btn flex-1 py-2 rounded-lg text-sm font-semibold transition-colors ${
              view === t.id ? 'bg-vr-700 text-white' : 'text-gray-500'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────────────────── */}
      {view === 'overview' && (
        <div className="space-y-4">
          {/* Season record */}
          <div className="bg-navy-700 border border-white/10 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Season Record</p>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="text-4xl font-black text-green-400">{totalW}</p>
                <p className="text-gray-500 text-xs">Wins</p>
              </div>
              <div className="text-gray-600 text-2xl font-light">–</div>
              <div className="text-center">
                <p className="text-4xl font-black text-red-400">{totalL}</p>
                <p className="text-gray-500 text-xs">Losses</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-white font-bold text-lg">
                  {totalW + totalL > 0 ? ((totalW / (totalW + totalL)) * 100).toFixed(0) : 0}%
                </p>
                <p className="text-gray-500 text-xs">Win rate</p>
              </div>
            </div>
          </div>

          {/* Team averages */}
          <div className="bg-navy-700 border border-white/10 rounded-2xl p-4">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Team Averages</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Pass Avg',  val: team.passAvgTeam.toFixed(2),                      color: 'text-cyan-400' },
                { label: 'Kill %',    val: (team.killPctTeam * 100).toFixed(1) + '%',         color: 'text-green-400' },
                { label: 'Ace %',     val: (team.servePctTeam * 100).toFixed(1) + '%',        color: 'text-yellow-400' },
                { label: 'Total K',   val: String(team.totalKills),                           color: 'text-green-300' },
                { label: 'Total D',   val: String(team.totalDigs),                            color: 'text-cyan-300' },
                { label: 'Errors',    val: String(team.totalErrors),                          color: 'text-red-400' },
              ].map(({ label, val, color }) => (
                <div key={label} className="bg-navy-600 rounded-xl p-3 text-center">
                  <p className={`font-bold text-xl ${color}`}>{val}</p>
                  <p className="text-gray-500 text-xs mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-player season totals */}
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest px-1">Player Totals</p>
          {players.map(p => {
            const s = aggregatePlayerStats(p.id, matches)
            const setsPlayed = matches.reduce((n, m) =>
              n + m.sets.filter(set => set[p.id] && (
                set[p.id].kills + set[p.id].digs + set[p.id].attackAttempts + set[p.id].serveAttempts > 0
              )).length, 0)
            if (setsPlayed === 0) return null
            return (
              <div key={p.id} className="bg-navy-700 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-white font-bold text-lg">#{p.number}</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                    {POSITION_LABELS[p.position]}
                  </span>
                  <span className="text-white font-semibold">{p.name}</span>
                  <span className="ml-auto text-gray-500 text-xs">{setsPlayed} sets</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { label: 'Kills',   val: s.kills,          color: 'text-green-400' },
                    { label: 'Digs',    val: s.digs,           color: 'text-cyan-400' },
                    { label: 'Aces',    val: s.aces,           color: 'text-yellow-400' },
                    { label: 'Assists', val: s.settingAssists, color: 'text-orange-400' },
                    { label: 'BS',      val: s.soloBlocks,     color: 'text-purple-400' },
                    { label: 'BA',      val: s.blockAssists,   color: 'text-purple-300' },
                    { label: 'K/Set',   val: setsPlayed > 0 ? (s.kills / setsPlayed).toFixed(1) : '—', color: 'text-green-300' },
                    { label: 'D/Set',   val: setsPlayed > 0 ? (s.digs  / setsPlayed).toFixed(1) : '—', color: 'text-cyan-300' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="bg-navy-600 rounded-xl p-2 text-center">
                      <p className={`font-bold text-base ${color}`}>{val}</p>
                      <p className="text-gray-500 text-[10px]">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2 border-t border-white/10 pt-3">
                  {[
                    { label: 'Hit %',    val: hittingPct(s) },
                    { label: 'Kill %',   val: killPct(s) },
                    { label: 'Pass Avg', val: passAvg(s) },
                    { label: 'Errors',   val: String(s.attackErrors + s.serveErrors) },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center">
                      <p className="text-white font-bold text-sm">{val}</p>
                      <p className="text-gray-500 text-[10px]">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── PROGRESS ─────────────────────────────────────────────────────────── */}
      {view === 'progress' && (
        <div className="space-y-5">
          {/* Team trend sparklines */}
          {tournaments.length >= 2 && (() => {
            const tStats = tournaments.map(t => buildTeamSummary(t.matches))
            const passVals = tStats.map(s => s.passAvgTeam)
            const killVals = tStats.map(s => s.killPctTeam * 100)
            const errVals  = tStats.map(s => s.totalErrors)
            return (
              <div className="bg-navy-700 border border-white/10 rounded-2xl p-4">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Season Trends</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Pass Avg', vals: passVals, color: '#5ab3d0', fmt: (v: number) => v.toFixed(2) },
                    { label: 'Kill %',   vals: killVals, color: '#4ade80', fmt: (v: number) => v.toFixed(0) + '%' },
                    { label: 'Errors',   vals: errVals,  color: '#f87171', fmt: (v: number) => String(Math.round(v)) },
                  ].map(({ label, vals, color, fmt }) => {
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
                  {tournaments.map(t => (
                    <p key={t.name} className="text-gray-600 text-[9px] truncate max-w-[60px] text-center">{t.name}</p>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Tournament-by-tournament breakdown */}
          {tournaments.map((t, ti) => {
            const { w, l } = winLoss(t.matches)
            const ts = buildTeamSummary(t.matches)
            const firstDate = t.matches[0].date
            return (
              <div key={t.name} className="bg-navy-700 border border-white/10 rounded-2xl overflow-hidden">
                {/* Tournament header */}
                <div className="bg-navy-800 px-4 py-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-vr-700 border border-vr-500/50 flex items-center justify-center shrink-0">
                    <span className="text-white font-black text-xs">{ti + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold truncate">{t.name}</p>
                    <p className="text-gray-500 text-xs">{firstDate}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-green-400 font-black">{w}W</span>
                    <span className="text-gray-600">–</span>
                    <span className="text-red-400 font-black">{l}L</span>
                  </div>
                </div>

                {/* Match list */}
                <div className="divide-y divide-white/5">
                  {t.matches.map(m => {
                    const won = Number(m.ourScore) > Number(m.theirScore)
                    return (
                      <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                        <span className={`text-xs font-black w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${won ? 'bg-green-800 text-green-300' : 'bg-red-900 text-red-300'}`}>
                          {won ? 'W' : 'L'}
                        </span>
                        <span className="text-gray-300 text-sm flex-1 truncate">{m.opponent}</span>
                        <span className="text-white font-semibold text-sm shrink-0">{m.ourScore}–{m.theirScore}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Tournament team stats */}
                <div className="px-4 py-3 border-t border-white/10 grid grid-cols-4 gap-2">
                  {[
                    { label: 'Pass',  val: ts.passAvgTeam.toFixed(2),            color: 'text-cyan-400' },
                    { label: 'Kill%', val: (ts.killPctTeam * 100).toFixed(0)+'%', color: 'text-green-400' },
                    { label: 'Kills', val: String(ts.totalKills),                 color: 'text-green-300' },
                    { label: 'Errs',  val: String(ts.totalErrors),                color: 'text-red-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="text-center">
                      <p className={`font-bold text-sm ${color}`}>{val}</p>
                      <p className="text-gray-600 text-[10px]">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Tournament mini-awards */}
                {(() => {
                  const tStats = players.map(p => ({
                    player: p,
                    s: t.matches.reduce((acc, m) =>
                      m.sets.reduce((a, set) => set[p.id] ? mergeStats(a, set[p.id]) : a, acc),
                      EMPTY_STATS()
                    ),
                  })).filter(x => x.s.kills + x.s.digs + x.s.aces + x.s.settingAssists + x.s.passAttempts > 0)

                  const best = (key: keyof PlayerStats) =>
                    tStats.sort((a, b) => (b.s[key] as number) - (a.s[key] as number))[0]
                  const bestPasser = tStats.filter(x => x.s.passAttempts >= 5)
                    .sort((a, b) => (b.s.passRatingTotal / b.s.passAttempts) - (a.s.passRatingTotal / a.s.passAttempts))[0]

                  const miniAwards = [
                    { emoji: '⚡', label: 'Kills',   entry: best('kills'),          val: (x: typeof tStats[0]) => `${x.s.kills}` },
                    { emoji: '🎯', label: 'Aces',    entry: best('aces'),           val: (x: typeof tStats[0]) => `${x.s.aces}` },
                    { emoji: '🛡️', label: 'Digs',    entry: best('digs'),           val: (x: typeof tStats[0]) => `${x.s.digs}` },
                    { emoji: '🤝', label: 'Assists', entry: best('settingAssists'), val: (x: typeof tStats[0]) => `${x.s.settingAssists}` },
                    { emoji: '🧱', label: 'Blocks',  entry: best('soloBlocks'),     val: (x: typeof tStats[0]) => `${x.s.soloBlocks + x.s.blockAssists}` },
                    { emoji: '📊', label: 'Passing', entry: bestPasser,             val: (x: typeof tStats[0]) => x.s.passAttempts > 0 ? (x.s.passRatingTotal / x.s.passAttempts).toFixed(2) : '—' },
                  ].filter(a => a.entry && (Number(a.val(a.entry)) > 0 || a.label === 'Passing'))

                  if (miniAwards.length === 0) return null
                  return (
                    <div className="border-t border-vr-700/30 bg-vr-900/20 px-4 py-3">
                      <p className="text-vr-400 text-[10px] font-bold uppercase tracking-widest mb-2">🏆 Tournament Stars</p>
                      <div className="grid grid-cols-3 gap-2">
                        {miniAwards.map(a => (
                          <div key={a.label} className="bg-navy-800/60 rounded-xl px-2 py-2 flex items-center gap-2">
                            <span className="text-base shrink-0">{a.emoji}</span>
                            <div className="min-w-0">
                              <p className="text-white text-xs font-semibold truncate">{a.entry!.player.name.split(' ')[0]}</p>
                              <p className="text-gray-500 text-[10px]">{a.label}: <span className="text-vr-300 font-bold">{a.val(a.entry!)}</span></p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            )
          })}
        </div>
      )}

      {/* ── AWARDS ───────────────────────────────────────────────────────────── */}
      {view === 'awards' && (() => {
        // Compute each player's season totals
        const stats = players.map(p => ({
          player: p,
          s: aggregatePlayerStats(p.id, matches),
          setsPlayed: matches.reduce((n, m) =>
            n + m.sets.filter(set => set[p.id] && (
              set[p.id].kills + set[p.id].digs + set[p.id].attackAttempts + set[p.id].serveAttempts > 0
            )).length, 0),
        })).filter(x => x.setsPlayed > 0)

        function leader<K extends keyof PlayerStats>(key: K, min = 0) {
          return [...stats]
            .filter(x => (x.s[key] as number) >= min)
            .sort((a, b) => (b.s[key] as number) - (a.s[key] as number))
        }

        function passLeader() {
          return [...stats]
            .filter(x => x.s.passAttempts >= 15)
            .sort((a, b) => (b.s.passRatingTotal / b.s.passAttempts) - (a.s.passRatingTotal / a.s.passAttempts))
        }

        const awards = [
          { emoji: '⚡', title: 'Kill Leader',    color: 'border-green-500/40 bg-green-900/10', textColor: 'text-green-400', list: leader('kills', 1),         fmt: (x: typeof stats[0]) => `${x.s.kills} kills` },
          { emoji: '🎯', title: 'Ace Leader',     color: 'border-yellow-500/40 bg-yellow-900/10', textColor: 'text-yellow-400', list: leader('aces', 1),        fmt: (x: typeof stats[0]) => `${x.s.aces} aces` },
          { emoji: '🛡️', title: 'Dig Queen',      color: 'border-cyan-500/40 bg-cyan-900/10', textColor: 'text-cyan-400',    list: leader('digs', 1),          fmt: (x: typeof stats[0]) => `${x.s.digs} digs` },
          { emoji: '🤝', title: 'Assist Leader',  color: 'border-orange-500/40 bg-orange-900/10', textColor: 'text-orange-400', list: leader('settingAssists', 1), fmt: (x: typeof stats[0]) => `${x.s.settingAssists} assists` },
          { emoji: '🧱', title: 'Block Leader',   color: 'border-purple-500/40 bg-purple-900/10', textColor: 'text-purple-400', list: leader('soloBlocks', 1),  fmt: (x: typeof stats[0]) => `${x.s.soloBlocks} solo · ${x.s.blockAssists} assist` },
          { emoji: '📊', title: 'Top Passer',     color: 'border-pb-500/40 bg-pb-900/10', textColor: 'text-pb-400',     list: passLeader(),              fmt: (x: typeof stats[0]) => `${(x.s.passRatingTotal / x.s.passAttempts).toFixed(2)} avg (${x.s.passAttempts} att)` },
        ]

        return (
          <div className="space-y-4">
            <p className="text-gray-500 text-xs text-center">Season leaders across all {matches.length} matches</p>
            {awards.map(award => {
              const top3 = award.list.slice(0, 3)
              if (top3.length === 0) return null
              const [gold, silver, bronze] = top3
              return (
                <div key={award.title} className={`border rounded-2xl overflow-hidden ${award.color}`}>
                  <div className="px-4 py-3 flex items-center gap-2 border-b border-white/5">
                    <span className="text-2xl">{award.emoji}</span>
                    <h3 className="text-white font-bold text-lg">{award.title}</h3>
                  </div>
                  <div className="divide-y divide-white/5">
                    {[[gold,'🥇','text-yellow-400'],[silver,'🥈','text-gray-400'],[bronze,'🥉','text-orange-400']].map(([entry, medal, medalColor], idx) => {
                      if (!entry) return null
                      const x = entry as typeof stats[0]
                      return (
                        <div key={idx} className="px-4 py-3 flex items-center gap-3">
                          <span className="text-xl w-6 shrink-0">{medal as string}</span>
                          <div className={`w-8 h-8 rounded-full bg-navy-700 border flex items-center justify-center shrink-0 ${award.color}`}>
                            <span className="text-white font-bold text-xs">#{x.player.number}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-semibold truncate">{x.player.name}</p>
                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[x.player.position]}`}>
                              {POSITION_LABELS[x.player.position]}
                            </span>
                          </div>
                          <span className={`font-bold text-sm shrink-0 ${award.textColor}`}>{award.fmt(x)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )
      })()}
    </div>
  )
}
