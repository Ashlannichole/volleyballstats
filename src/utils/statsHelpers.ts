import type { PlayerStats, Match } from '../types'

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
  }
}

export function aggregatePlayerStats(playerId: string, matches: Match[]): PlayerStats {
  const base: PlayerStats = {
    kills: 0, attackErrors: 0, attackAttempts: 0,
    aces: 0, serveErrors: 0, serveAttempts: 0,
    passRatingTotal: 0, passAttempts: 0,
    digs: 0, soloBlocks: 0, blockAssists: 0,
    settingAssists: 0, settingErrors: 0,
    atkErrMissed: 0, atkErrBlocked: 0, atkErrOut: 0, atkErrNet: 0,
    srvErrMissed: 0, srvErrNet: 0, srvErrOut: 0, srvErrFoot: 0,
    passZeroShank: 0, passZeroAce: 0, passZeroOverpass: 0,
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
