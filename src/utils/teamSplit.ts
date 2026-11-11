import type { Player, Match, PracticeSession, TeamGameTeam } from '../types'
import { mergeStats, aggregatePlayerStats, aggregatePracticeStats, playerImpactScore } from './statsHelpers'

// A preset 2-team split for the day (e.g. "Team One" / "Team Two" picked
// before practice in the Today's Roster step), carried into whichever
// team-vs-team drill gets started so the coach doesn't have to re-split
// the roster every time.
export interface PresetTeams {
  team1: string[]
  team2: string[]
}

export function computeImpactScores(players: Player[], matches: Match[], practices: PracticeSession[]): Map<string, number> {
  return new Map(players.map(p => {
    const combined = mergeStats(aggregatePlayerStats(p.id, matches), aggregatePracticeStats(p.id, practices))
    return [p.id, playerImpactScore(combined)] as const
  }))
}

// Snake draft by impact score so each team ends up roughly as strong as the next.
export function autoBalanceTeams(players: Player[], teamCount: number, scores: Map<string, number>): TeamGameTeam[] {
  const sorted = [...players].sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0))
  const teams: TeamGameTeam[] = Array.from({ length: teamCount }, (_, i) => ({ name: `Team ${i + 1}`, playerIds: [] }))
  let idx = 0, dir = 1
  for (const p of sorted) {
    teams[idx].playerIds.push(p.id)
    idx += dir
    if (idx === teamCount) { idx = teamCount - 1; dir = -1 }
    else if (idx < 0) { idx = 0; dir = 1 }
  }
  return teams
}

// A 2-team split, preferring today's preset Team 1 / Team 2 (filtered down
// to whoever's actually present) over an auto-balance guess.
export function initialTwoTeams(players: Player[], scores: Map<string, number>, presetTeams?: PresetTeams | null): [TeamGameTeam, TeamGameTeam] {
  if (presetTeams && (presetTeams.team1.length > 0 || presetTeams.team2.length > 0)) {
    const ids = new Set(players.map(p => p.id))
    return [
      { name: 'Team 1', playerIds: presetTeams.team1.filter(id => ids.has(id)) },
      { name: 'Team 2', playerIds: presetTeams.team2.filter(id => ids.has(id)) },
    ]
  }
  const [a, b] = autoBalanceTeams(players, 2, scores)
  return [a, b]
}
