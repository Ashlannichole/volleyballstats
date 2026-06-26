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
  passRatingTotal: number
  passAttempts: number
  digs: number
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
}

export type SetStats = Record<string, PlayerStats>

export interface Match {
  id: string
  date: string
  opponent: string
  ourScore: string
  theirScore: string
  sets: SetStats[]
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
