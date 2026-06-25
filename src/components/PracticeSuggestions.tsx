import { useState } from 'react'
import type { Match, Player } from '../types'
import { mergeStats, buildTeamSummary, killPct, servePct, passAvg } from '../utils/statsHelpers'
import { EMPTY_STATS } from '../types'

interface Props {
  match: Match
  players: Player[]
  onBack: () => void
}

interface Suggestion {
  title: string
  drill: string
  focus: string
}

export default function PracticeSuggestions({ match, players, onBack }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function buildPayload() {
    const playerSummaries = players.map(p => {
      const stats = match.sets.reduce(
        (acc, s) => mergeStats(acc, s[p.id] ?? EMPTY_STATS()),
        EMPTY_STATS()
      )
      return {
        name: p.name,
        position: p.position,
        number: p.number,
        stats: {
          kills: stats.kills,
          attackErrors: stats.attackErrors,
          attackAttempts: stats.attackAttempts,
          killPct: killPct(stats),
          aces: stats.aces,
          serveErrors: stats.serveErrors,
          serveAttempts: stats.serveAttempts,
          servePct: servePct(stats),
          passAvg: passAvg(stats),
          passAttempts: stats.passAttempts,
          digs: stats.digs,
          soloBlocks: stats.soloBlocks,
          blockAssists: stats.blockAssists,
          settingAssists: stats.settingAssists,
          settingErrors: stats.settingErrors,
        },
      }
    })

    const team = buildTeamSummary([match])

    return {
      match: {
        date: match.date,
        opponent: match.opponent,
        score: `${match.ourScore}-${match.theirScore}`,
        sets: match.sets.length,
      },
      team: {
        passAvg: team.passAvgTeam.toFixed(2),
        killPct: (team.killPctTeam * 100).toFixed(1) + '%',
        servePct: (team.servePctTeam * 100).toFixed(1) + '%',
        totalErrors: team.totalErrors,
        totalKills: team.totalKills,
        totalDigs: team.totalDigs,
      },
      players: playerSummaries,
    }
  }

  async function fetchSuggestions() {
    setLoading(true)
    setError(null)
    try {
      const payload = buildPayload()
      const prompt = `You are an expert 14U girls indoor volleyball coach for a club team called Viking Roots. Analyze these match stats and return 4-5 specific, actionable practice drill suggestions based on team weaknesses. Return ONLY valid JSON — an array of objects with keys "title" (drill name), "drill" (2-3 sentence description of how to run it), and "focus" (the stat weakness it addresses). No markdown, no extra text.

Match data:
${JSON.stringify(payload, null, 2)}`

      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(text || `HTTP ${response.status}`)
      }

      const data = await response.json()
      setSuggestions(data.suggestions)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const team = buildTeamSummary([match])

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <button onClick={onBack} className="tap-btn text-pb-400 text-sm mb-4 flex items-center gap-1">
        ← Match History
      </button>

      <h2 className="text-2xl font-bold text-white mb-1">AI Practice Suggestions</h2>
      <p className="text-pb-400 text-sm mb-4">Viking Roots vs {match.opponent} · {match.date}</p>

      {/* Team snapshot */}
      <div className="bg-navy-700 border border-vr-700/40 rounded-2xl p-4 mb-6">
        <p className="text-vr-400 text-xs font-bold uppercase mb-3">Match Summary</p>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: 'Pass Avg', val: team.passAvgTeam.toFixed(2) },
            { label: 'Kill %',   val: (team.killPctTeam * 100).toFixed(1) + '%' },
            { label: 'Ace %',    val: (team.servePctTeam * 100).toFixed(1) + '%' },
            { label: 'Total K',  val: team.totalKills },
            { label: 'Errors',   val: team.totalErrors },
            { label: 'Digs',     val: team.totalDigs },
          ].map(({ label, val }) => (
            <div key={label} className="bg-navy-600 rounded-xl p-3">
              <p className="text-white font-bold text-xl">{val}</p>
              <p className="text-gray-500 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {!suggestions && !loading && (
        <button
          onClick={fetchSuggestions}
          className="tap-btn w-full bg-vr-600 hover:bg-vr-500 text-white font-bold py-5 rounded-2xl text-lg"
        >
          Generate Practice Drills ✨
        </button>
      )}

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-10 h-10 border-4 border-vr-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">Analyzing match data...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-2xl p-4 mb-4">
          <p className="text-red-400 text-sm font-medium">Error: {error}</p>
          <button onClick={fetchSuggestions} className="tap-btn text-pb-400 text-sm mt-2">
            Try again
          </button>
        </div>
      )}

      {suggestions && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div key={i} className="bg-navy-700 border border-vr-700/40 rounded-2xl p-4">
              <div className="flex items-start gap-3 mb-2">
                <span className="bg-vr-600 text-white font-bold text-sm w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="text-white font-bold text-lg">{s.title}</p>
                  <p className="text-pb-400 text-xs font-medium mb-2">Focus: {s.focus}</p>
                  <p className="text-gray-300 text-sm leading-relaxed">{s.drill}</p>
                </div>
              </div>
            </div>
          ))}
          <button
            onClick={fetchSuggestions}
            className="tap-btn w-full border border-white/20 text-gray-300 py-3 rounded-xl text-sm mt-2"
          >
            Regenerate
          </button>
        </div>
      )}
    </div>
  )
}
