import type { Match, Player } from '../types'
import { aggregatePlayerStats, killPct, servePct, passAvg, hittingPct } from '../utils/statsHelpers'
import { POSITION_LABELS, POSITION_COLORS } from '../types'

interface Props {
  matches: Match[]
  players: Player[]
}

export default function SeasonStats({ matches, players }: Props) {
  if (matches.length === 0) {
    return (
      <div className="p-6 text-center mt-12">
        <p className="text-gray-400 text-lg">No match data yet.</p>
        <p className="text-gray-600 text-sm mt-2">Save matches to see season totals.</p>
      </div>
    )
  }

  const totalSets = matches.reduce((n, m) => n + m.sets.length, 0)

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex items-baseline gap-3 mb-6">
        <h2 className="text-2xl font-bold text-white">Season Stats</h2>
        <span className="text-gray-500 text-sm">{matches.length} matches · {totalSets} sets</span>
      </div>

      <div className="space-y-3">
        {players.map(p => {
          const s = aggregatePlayerStats(p.id, matches)
          const setsPlayed = matches.reduce((n, m) =>
            n + m.sets.filter(set => set[p.id] && (
              set[p.id].kills + set[p.id].digs + set[p.id].attackAttempts + set[p.id].serveAttempts > 0
            )).length, 0)

          return (
            <div key={p.id} className="bg-navy-700 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-white font-bold text-xl">#{p.number}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>
                  {POSITION_LABELS[p.position]}
                </span>
                <span className="text-white font-semibold text-lg">{p.name}</span>
                {setsPlayed > 0 && (
                  <span className="ml-auto text-gray-500 text-xs">{setsPlayed} sets</span>
                )}
              </div>

              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Kills',    val: s.kills,           color: 'text-green-400' },
                  { label: 'Digs',     val: s.digs,            color: 'text-cyan-400' },
                  { label: 'Aces',     val: s.aces,            color: 'text-yellow-400' },
                  { label: 'Assists',  val: s.settingAssists,  color: 'text-orange-400' },
                  { label: 'BS',       val: s.soloBlocks,      color: 'text-purple-400' },
                  { label: 'BA',       val: s.blockAssists,    color: 'text-purple-300' },
                  { label: 'Atk Att', val: s.attackAttempts,  color: 'text-blue-300' },
                  { label: 'Srv Att', val: s.serveAttempts,   color: 'text-blue-300' },
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-navy-600 rounded-xl p-2 text-center">
                    <p className={`font-bold text-lg ${color}`}>{val}</p>
                    <p className="text-gray-500 text-xs">{label}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-white/10 pt-3">
                {[
                  { label: 'Hit %',     val: hittingPct(s) },
                  { label: 'Kill %',    val: killPct(s) },
                  { label: 'Ace %',     val: servePct(s) },
                  { label: 'Pass Avg',  val: passAvg(s) },
                  { label: 'K/Set',     val: setsPlayed > 0 ? (s.kills / setsPlayed).toFixed(1) : '—' },
                  { label: 'D/Set',     val: setsPlayed > 0 ? (s.digs / setsPlayed).toFixed(1) : '—' },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center">
                    <p className="text-white font-bold">{val}</p>
                    <p className="text-gray-500 text-xs">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
