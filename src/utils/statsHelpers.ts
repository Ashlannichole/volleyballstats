import type { PlayerStats, Match, PracticeSession } from '../types'
import { EMPTY_STATS } from '../types'

// A single number to rank players by for auto-balancing teams in small-sided
// drills — not shown to anyone, just a sort key. Rewards production, docks errors.
export function playerImpactScore(s: PlayerStats): number {
  return s.kills + s.aces + s.digs + s.soloBlocks + s.blockAssists + s.settingAssists
    - s.attackErrors - s.serveErrors
}

// A player's season win/loss record across all saved team-vs-team drills
// (3v3, Queen of the Court, Mini Tournament, 0 vs 18, 3 Before 10, etc.)
// she's been assigned to. A session with no winner recorded (tie / not
// declared / not finished) counts toward neither.
export function aggregateTeamGameRecord(playerId: string, sessions: PracticeSession[]): { wins: number; losses: number } {
  let wins = 0, losses = 0
  for (const session of sessions) {
    if (session.drillType === 'team_game' && session.teamGame) {
      const { teams, winningTeamIndex } = session.teamGame
      if (winningTeamIndex === null) continue
      const myTeamIndex = teams.findIndex(t => t.playerIds.includes(playerId))
      if (myTeamIndex === -1) continue
      if (myTeamIndex === winningTeamIndex) wins++
      else losses++
    } else if (session.drillType === 'zero_vs_eighteen' && session.zeroVsEighteen) {
      const { zeroTeam, eighteenTeam, winner } = session.zeroVsEighteen
      if (winner === null) continue
      if (zeroTeam.playerIds.includes(playerId)) { winner === 'zero' ? wins++ : losses++ }
      else if (eighteenTeam.playerIds.includes(playerId)) { winner === 'eighteen' ? wins++ : losses++ }
    } else if (session.drillType === 'three_before_ten' && session.threeBeforeTen) {
      const { hittingTeam, defenseTeam, winner } = session.threeBeforeTen
      if (winner === null) continue
      if (hittingTeam.playerIds.includes(playerId)) { winner === 'hitting' ? wins++ : losses++ }
      else if (defenseTeam.playerIds.includes(playerId)) { winner === 'defense' ? wins++ : losses++ }
    }
  }
  return { wins, losses }
}

export function killPct(s: PlayerStats): string {
  if (s.attackAttempts === 0) return '—'
  return (((s.kills - s.attackErrors) / s.attackAttempts) * 100).toFixed(1) + '%'
}

export function servePct(s: PlayerStats): string {
  if (s.serveAttempts === 0) return '—'
  return (((s.aces) / s.serveAttempts) * 100).toFixed(1) + '%'
}

export function passAvg(s: PlayerStats): string {
  if (s.passAttempts === 0) return '—'
  return (s.passRatingTotal / s.passAttempts).toFixed(2)
}

export function hittingPct(s: PlayerStats): string {
  if (s.attackAttempts === 0) return '—'
  return (((s.kills - s.attackErrors) / s.attackAttempts)).toFixed(3)
}

export function mergeStats(a: PlayerStats, b: PlayerStats): PlayerStats {
  return {
    kills: a.kills + b.kills,
    attackErrors: a.attackErrors + b.attackErrors,
    attackAttempts: a.attackAttempts + b.attackAttempts,
    aces: a.aces + b.aces,
    serveErrors: a.serveErrors + b.serveErrors,
    serveAttempts: a.serveAttempts + b.serveAttempts,
    passRatingTotal: a.passRatingTotal + b.passRatingTotal,
    passAttempts: a.passAttempts + b.passAttempts,
    digs: a.digs + b.digs,
    digErrors: a.digErrors + b.digErrors,
    soloBlocks: a.soloBlocks + b.soloBlocks,
    blockAssists: a.blockAssists + b.blockAssists,
    settingAssists: a.settingAssists + b.settingAssists,
    settingErrors: a.settingErrors + b.settingErrors,
    atkErrMissed: a.atkErrMissed + b.atkErrMissed,
    atkErrBlocked: a.atkErrBlocked + b.atkErrBlocked,
    atkErrOut: a.atkErrOut + b.atkErrOut,
    atkErrNet: a.atkErrNet + b.atkErrNet,
    srvErrMissed: a.srvErrMissed + b.srvErrMissed,
    srvErrNet: a.srvErrNet + b.srvErrNet,
    srvErrOut: a.srvErrOut + b.srvErrOut,
    srvErrFoot: a.srvErrFoot + b.srvErrFoot,
    passZeroShank: a.passZeroShank + b.passZeroShank,
    passZeroAce: a.passZeroAce + b.passZeroAce,
    passZeroOverpass: a.passZeroOverpass + b.passZeroOverpass,
    maxServingRun: Math.max(a.maxServingRun ?? 0, b.maxServingRun ?? 0),
  }
}

export function aggregatePlayerStats(playerId: string, matches: Match[]): PlayerStats {
  const base: PlayerStats = {
    kills: 0, attackErrors: 0, attackAttempts: 0,
    aces: 0, serveErrors: 0, serveAttempts: 0,
    passRatingTotal: 0, passAttempts: 0,
    digs: 0, digErrors: 0, soloBlocks: 0, blockAssists: 0,
    settingAssists: 0, settingErrors: 0,
    atkErrMissed: 0, atkErrBlocked: 0, atkErrOut: 0, atkErrNet: 0,
    srvErrMissed: 0, srvErrNet: 0, srvErrOut: 0, srvErrFoot: 0,
    passZeroShank: 0, passZeroAce: 0, passZeroOverpass: 0,
    maxServingRun: 0,
  }
  for (const match of matches) {
    for (const setStats of match.sets) {
      if (setStats[playerId]) {
        Object.assign(base, mergeStats(base, setStats[playerId]))
      }
    }
  }
  return base
}

// Same idea as aggregatePlayerStats, but over practice sessions instead of
// matches — scrimmage/serve_pass/three_ball drills all store per-player
// stats the same way (session.scrimmages is the same SetStats[] shape as
// match.sets). Pass Challenge sessions contribute nothing here since that
// drill tracks a team total only (scrimmages is always empty for it).
export function aggregatePracticeStats(playerId: string, sessions: PracticeSession[]): PlayerStats {
  let base = EMPTY_STATS()
  for (const session of sessions) {
    for (const setStats of session.scrimmages) {
      if (setStats[playerId]) base = mergeStats(base, setStats[playerId])
    }
  }
  return base
}

export function buildTeamSummary(matches: Match[]): {
  passAvgTeam: number
  killPctTeam: number
  servePctTeam: number
  totalErrors: number
  totalKills: number
  totalDigs: number
} {
  let passTotal = 0, passAttempts = 0
  let kills = 0, attackErrors = 0, attackAttempts = 0
  let aces = 0, serveAttempts = 0
  let errors = 0, digs = 0

  for (const match of matches) {
    for (const setStats of match.sets) {
      for (const s of Object.values(setStats)) {
        passTotal += s.passRatingTotal
        passAttempts += s.passAttempts
        kills += s.kills
        attackErrors += s.attackErrors
        attackAttempts += s.attackAttempts
        aces += s.aces
        serveAttempts += s.serveAttempts
        errors += s.attackErrors + s.serveErrors
        digs += s.digs
      }
    }
  }

  return {
    passAvgTeam: passAttempts > 0 ? passTotal / passAttempts : 0,
    killPctTeam: attackAttempts > 0 ? (kills - attackErrors) / attackAttempts : 0,
    servePctTeam: serveAttempts > 0 ? aces / serveAttempts : 0,
    totalErrors: errors,
    totalKills: kills,
    totalDigs: digs,
  }
}
