export type Position = 'setter' | 'outside' | 'middle' | 'opposite' | 'libero' | 'ds'

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
  passRatingTotal: number  // sum of all pass ratings given
  passAttempts: number     // number of passes rated
  digs: number
  soloBlocks: number
  blockAssists: number
  settingAssists: number
  settingErrors: number
}

export type SetStats = Record<string, PlayerStats>  // playerId -> stats

export interface Match {
  id: string
  date: string
  opponent: string
  ourScore: string
  theirScore: string
  sets: SetStats[]   // index 0 = set 1, etc.
  notes: string
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
  soloBlocks: 0,
  blockAssists: 0,
  settingAssists: 0,
  settingErrors: 0,
})

export const POSITION_LABELS: Record<Position, string> = {
  setter: 'S',
  outside: 'OH',
  middle: 'MB',
  opposite: 'OPP',
  libero: 'L',
  ds: 'DS',
}

export const POSITION_COLORS: Record<Position, string> = {
  setter: 'bg-yellow-600',
  outside: 'bg-blue-600',
  middle: 'bg-green-600',
  opposite: 'bg-purple-600',
  libero: 'bg-red-600',
  ds: 'bg-orange-600',
}
