export type Position = 'setter' | 'outside' | 'middle' | 'opposite' | 'libero' | 'ds' | 'coach'

export interface Player {
  id: string
  name: string
  number: number
  position: Position
}

export interface PlayerStats {
  kills: number
  attackErrors: number
  attackAttempts: number
  aces: number
  serveErrors: number
  serveAttempts: number
  passRatingTotal: number
  passAttempts: number
  digs: number
  digErrors: number
  soloBlocks: number
  blockAssists: number
  settingAssists: number
  settingErrors: number
  // Attack error breakdown
  atkErrMissed: number     // whiff / missed hit
  atkErrBlocked: number    // blocked by opponent
  atkErrOut: number        // hit out of bounds
  atkErrNet: number        // hit into net
  // Serve error breakdown
  srvErrMissed: number     // missed / whiff
  srvErrNet: number        // into net
  srvErrOut: number        // long or wide
  srvErrFoot: number       // foot fault
  // Pass 0 breakdown
  passZeroShank: number    // shanked off platform
  passZeroAce: number      // server aced (couldn't reach)
  passZeroOverpass: number // overpass over net
  // Serving run
  maxServingRun: number    // longest consecutive points scored while serving
}

export type SetStats = Record<string, PlayerStats>

export interface Match {
  id: string
  date: string
  tournament: string
  opponent: string
  ourScore: string
  theirScore: string
  sets: SetStats[]
  notes: string
  setScores?: { our: number; their: number }[]
}

export const EMPTY_STATS = (): PlayerStats => ({
  kills: 0,
  attackErrors: 0,
  attackAttempts: 0,
  aces: 0,
  serveErrors: 0,
  serveAttempts: 0,
  passRatingTotal: 0,
  passAttempts: 0,
  digs: 0,
  digErrors: 0,
  soloBlocks: 0,
  blockAssists: 0,
  settingAssists: 0,
  settingErrors: 0,
  atkErrMissed: 0,
  atkErrBlocked: 0,
  atkErrOut: 0,
  atkErrNet: 0,
  srvErrMissed: 0,
  srvErrNet: 0,
  srvErrOut: 0,
  srvErrFoot: 0,
  passZeroShank: 0,
  passZeroAce: 0,
  passZeroOverpass: 0,
  maxServingRun: 0,
})

// One side's result in a Pass Challenge drill: a fixed number of serves
// (e.g. 50), each received and rated 0-3 (an ace auto-scores 0; a service
// error isn't logged here at all — it doesn't count toward the reps).
export interface PassChallengeRound {
  sideLabel: string     // e.g. "Black" or "Receiving" — whatever the coach typed in
  reps: number[]        // one 0-3 rating per served-and-received ball, in order
  serveErrors: number   // service errors that didn't count toward reps (for reference only)
}

export interface PassChallenge {
  repsGoal: number       // e.g. 50
  targetTotal: number    // e.g. 125 (the cumulative score needed to "win")
  rounds: PassChallengeRound[]   // one per side; two once both sides have gone
}

// One side of a small-sided competitive drill (3v3, Queen of the Court,
// Mini Tournament, etc.) — just a label and the girls assigned to it, no
// per-player stats.
export interface TeamGameTeam {
  name: string
  playerIds: string[]
}

export interface TeamGame {
  drillName: string               // e.g. "Queen of the Court", "3v3" — whatever the coach typed in
  teams: TeamGameTeam[]
  winningTeamIndex: number | null // index into teams; null = tie / not recorded, doesn't count toward anyone's record
}

// "0 vs 18": the side at 0 scores on everything (kills, aces, opponent
// errors); the side at 18 only scores when the 0-side makes an error.
// The 0-side wins by reaching `scoreGoal` (25) before reaching `errorGoal`
// (7 errors) — whichever happens first ends the drill.
export interface ZeroVsEighteen {
  zeroTeam: TeamGameTeam
  eighteenTeam: TeamGameTeam
  scoreGoal: number    // 25
  errorGoal: number    // 7
  score: number        // 0-side's current points
  errors: number       // 0-side's current errors
  winner: 'zero' | 'eighteen' | null   // null = drill not finished/recorded
}

// "3 Before 10": a hitting group works lines against a full-6 defense with
// blockers. The hitting side wins by landing `streakGoal` (3) kills in a
// row; the defense wins first by reaching `digGoal` (10) total digs/blocks
// (not necessarily consecutive). Any dig, block, or hitting error resets
// the hitting streak back to 0; only digs/blocks count toward the
// defense's total (a hitting error doesn't).
export interface ThreeBeforeTen {
  hittingTeam: TeamGameTeam
  defenseTeam: TeamGameTeam
  streakGoal: number   // 3
  digGoal: number      // 10
  streak: number       // hitting side's current consecutive kills
  defenseTotal: number // defense side's current total digs/blocks
  winner: 'hitting' | 'defense' | null   // null = drill not finished/recorded
}

export interface PracticeSession {
  id: string
  date: string
  name: string          // e.g. "Tuesday scrimmage"
  teamLabel: string     // e.g. "Black" or "White" for two-coach tracking
  notes: string
  scrimmages: SetStats[]
  drillType?: 'scrimmage' | 'serve_pass' | 'three_ball' | 'pass_challenge' | 'team_game' | 'zero_vs_eighteen' | 'three_before_ten'   // absent/undefined = 'scrimmage', for older saved sessions
  passChallenge?: PassChallenge   // present only when drillType === 'pass_challenge'
  teamGame?: TeamGame              // present only when drillType === 'team_game'
  zeroVsEighteen?: ZeroVsEighteen   // present only when drillType === 'zero_vs_eighteen'
  threeBeforeTen?: ThreeBeforeTen   // present only when drillType === 'three_before_ten'
  // Stand-ins for this one session (e.g. a coach filling in short-handed) who
  // aren't on the permanent roster — kept here so her name still resolves
  // when viewing this session later, after she's no longer in `players`.
  guestPlayers?: { id: string; name: string }[]
}

// A dated coaching note / action-plan entry for one player — written during
// a mid-season or end-of-season check-in, kept so the next conversation can
// pick up where the last one left off.
export interface PlayerNote {
  id: string
  playerId: string
  date: string   // ISO date, when the note was written
  text: string
}

export interface SavedLineup {
  id: string
  name: string
  // 6 player IDs indexed 0–5 (P1–P6), null = empty slot
  slots: (string | null)[]
}

export const POSITION_LABELS: Record<Position, string> = {
  setter: 'S',
  outside: 'OH',
  middle: 'MB',
  opposite: 'OPP',
  libero: 'L',
  ds: 'DS',
  coach: 'Coach',
}

export const POSITION_COLORS: Record<Position, string> = {
  setter: 'bg-yellow-600',
  outside: 'bg-blue-600',
  middle: 'bg-green-600',
  opposite: 'bg-purple-600',
  libero: 'bg-red-600',
  ds: 'bg-orange-600',
  coach: 'bg-gray-600',
}
