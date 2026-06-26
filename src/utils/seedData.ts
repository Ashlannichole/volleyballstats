import type { Player, Match, SetStats, PlayerStats, PracticeSession } from '../types'
import { EMPTY_STATS } from '../types'

// Fixed IDs so stats reference the same players across all matches
const IDS = {
  emma:    'seed-p01',
  alyssa:  'seed-p02',
  kai:     'seed-p03',
  jordan:  'seed-p04',
  riley:   'seed-p05',
  sophia:  'seed-p06',
  maya:    'seed-p07',
  olivia:  'seed-p08',
  grace:   'seed-p09',
  natalie: 'seed-p10',
  chloe:   'seed-p11',
  zoe:     'seed-p12',
}

export const SEED_PLAYERS: Player[] = [
  { id: IDS.emma,    name: 'Emma Johnson',    number: 1,  position: 'setter'   },
  { id: IDS.alyssa,  name: 'Alyssa Martinez', number: 11, position: 'outside'  },
  { id: IDS.kai,     name: 'Kai Thompson',    number: 7,  position: 'outside'  },
  { id: IDS.jordan,  name: 'Jordan Williams', number: 4,  position: 'middle'   },
  { id: IDS.riley,   name: 'Riley Davis',     number: 14, position: 'middle'   },
  { id: IDS.sophia,  name: 'Sophia Chen',     number: 10, position: 'opposite' },
  { id: IDS.maya,    name: 'Maya Rodriguez',  number: 22, position: 'libero'   },
  { id: IDS.olivia,  name: 'Olivia Brown',    number: 15, position: 'ds'       },
  { id: IDS.grace,   name: 'Grace Wilson',    number: 5,  position: 'ds'       },
  { id: IDS.natalie, name: 'Natalie Taylor',  number: 8,  position: 'outside'  },
  { id: IDS.chloe,   name: 'Chloe Anderson',  number: 2,  position: 'setter'   },
  { id: IDS.zoe,     name: 'Zoe Thomas',      number: 13, position: 'middle'   },
]

function ps(overrides: Partial<PlayerStats>): PlayerStats {
  return { ...EMPTY_STATS(), ...overrides }
}

function setStats(data: Record<string, Partial<PlayerStats>>): SetStats {
  const out: SetStats = {}
  for (const id of Object.values(IDS)) out[id] = EMPTY_STATS()
  for (const [id, vals] of Object.entries(data)) out[id] = ps(vals)
  return out
}

// ── Match 1: Pool play vs Summit 14U — Win 2-0 ──────────────────────────────
const m1s1 = setStats({
  [IDS.emma]:    { settingAssists: 28, settingErrors: 2, digs: 5, serveErrors: 1, serveAttempts: 7 },
  [IDS.alyssa]:  { kills: 9, attackErrors: 2, attackAttempts: 20, aces: 2, serveErrors: 1, serveAttempts: 8, digs: 3, atkErrMissed: 1, atkErrNet: 1 },
  [IDS.kai]:     { kills: 7, attackErrors: 3, attackAttempts: 17, aces: 1, serveErrors: 0, serveAttempts: 6, digs: 4 },
  [IDS.jordan]:  { kills: 5, attackErrors: 1, attackAttempts: 10, soloBlocks: 2, blockAssists: 1, serveAttempts: 5 },
  [IDS.riley]:   { kills: 4, attackErrors: 2, attackAttempts: 9,  soloBlocks: 1, blockAssists: 2, serveAttempts: 4 },
  [IDS.sophia]:  { kills: 6, attackErrors: 1, attackAttempts: 12, aces: 1, serveAttempts: 5, digs: 2 },
  [IDS.maya]:    { digs: 14, passRatingTotal: 38, passAttempts: 15, aces: 1, serveAttempts: 6 },
  [IDS.olivia]:  { digs: 6,  passRatingTotal: 14, passAttempts: 6  },
  [IDS.grace]:   { digs: 5,  passRatingTotal: 12, passAttempts: 5  },
  [IDS.natalie]: { kills: 3, attackErrors: 1, attackAttempts: 7,  digs: 2 },
})
const m1s2 = setStats({
  [IDS.emma]:    { settingAssists: 31, settingErrors: 1, digs: 4, serveAttempts: 6 },
  [IDS.alyssa]:  { kills: 11, attackErrors: 2, attackAttempts: 22, aces: 1, serveAttempts: 8, digs: 4, atkErrBlocked: 1, atkErrNet: 1 },
  [IDS.kai]:     { kills: 8,  attackErrors: 2, attackAttempts: 16, serveAttempts: 7, digs: 3 },
  [IDS.jordan]:  { kills: 6,  attackErrors: 1, attackAttempts: 11, soloBlocks: 3, serveAttempts: 5 },
  [IDS.riley]:   { kills: 5,  attackErrors: 1, attackAttempts: 10, soloBlocks: 1, blockAssists: 1, serveAttempts: 4 },
  [IDS.sophia]:  { kills: 7,  attackErrors: 0, attackAttempts: 13, aces: 2, serveAttempts: 6, digs: 3 },
  [IDS.maya]:    { digs: 16, passRatingTotal: 44, passAttempts: 17, serveAttempts: 5 },
  [IDS.olivia]:  { digs: 7,  passRatingTotal: 16, passAttempts: 7  },
  [IDS.grace]:   { digs: 6,  passRatingTotal: 15, passAttempts: 6  },
  [IDS.natalie]: { kills: 4, attackErrors: 1, attackAttempts: 8,  digs: 3 },
})

// ── Match 2: Pool play vs Eastside Elite 14U — Loss 0-2 ─────────────────────
const m2s1 = setStats({
  [IDS.emma]:    { settingAssists: 22, settingErrors: 4, digs: 3, serveErrors: 2, serveAttempts: 6 },
  [IDS.alyssa]:  { kills: 6,  attackErrors: 5, attackAttempts: 18, serveErrors: 2, serveAttempts: 7, digs: 2, atkErrBlocked: 3, atkErrOut: 2 },
  [IDS.kai]:     { kills: 5,  attackErrors: 4, attackAttempts: 15, serveErrors: 1, serveAttempts: 6, digs: 3 },
  [IDS.jordan]:  { kills: 3,  attackErrors: 2, attackAttempts: 8,  soloBlocks: 1, serveAttempts: 4 },
  [IDS.riley]:   { kills: 2,  attackErrors: 3, attackAttempts: 8,  blockAssists: 1, serveAttempts: 3 },
  [IDS.sophia]:  { kills: 4,  attackErrors: 2, attackAttempts: 11, serveErrors: 1, serveAttempts: 5, digs: 1 },
  [IDS.maya]:    { digs: 12, passRatingTotal: 27, passAttempts: 14, passZeroShank: 1, serveAttempts: 5 },
  [IDS.olivia]:  { digs: 5,  passRatingTotal: 9,  passAttempts: 6,  passZeroAce: 1   },
  [IDS.grace]:   { digs: 4,  passRatingTotal: 10, passAttempts: 5  },
  [IDS.natalie]: { kills: 2, attackErrors: 1, attackAttempts: 6,  digs: 2 },
})
const m2s2 = setStats({
  [IDS.emma]:    { settingAssists: 19, settingErrors: 3, digs: 2, serveErrors: 1, serveAttempts: 5 },
  [IDS.alyssa]:  { kills: 5,  attackErrors: 4, attackAttempts: 16, serveErrors: 1, serveAttempts: 6, digs: 2, atkErrBlocked: 2, atkErrMissed: 2 },
  [IDS.kai]:     { kills: 4,  attackErrors: 3, attackAttempts: 13, serveAttempts: 5, digs: 2 },
  [IDS.jordan]:  { kills: 2,  attackErrors: 2, attackAttempts: 7,  soloBlocks: 0, serveAttempts: 4 },
  [IDS.riley]:   { kills: 3,  attackErrors: 2, attackAttempts: 8,  serveAttempts: 3 },
  [IDS.sophia]:  { kills: 3,  attackErrors: 2, attackAttempts: 10, serveErrors: 1, serveAttempts: 5 },
  [IDS.maya]:    { digs: 11, passRatingTotal: 25, passAttempts: 13, passZeroShank: 2, serveAttempts: 4 },
  [IDS.olivia]:  { digs: 4,  passRatingTotal: 8,  passAttempts: 5  },
  [IDS.grace]:   { digs: 3,  passRatingTotal: 9,  passAttempts: 5  },
  [IDS.natalie]: { kills: 2, attackErrors: 2, attackAttempts: 6,  digs: 1 },
})

// ── Match 3: Pool play vs Metro Crush 14U — Win 2-1 ─────────────────────────
const m3s1 = setStats({
  [IDS.emma]:    { settingAssists: 26, settingErrors: 2, digs: 4, serveAttempts: 7 },
  [IDS.alyssa]:  { kills: 8,  attackErrors: 3, attackAttempts: 18, aces: 1, serveAttempts: 8, digs: 3, atkErrNet: 2, atkErrOut: 1 },
  [IDS.kai]:     { kills: 6,  attackErrors: 2, attackAttempts: 14, serveAttempts: 6, digs: 4 },
  [IDS.jordan]:  { kills: 5,  attackErrors: 1, attackAttempts: 10, soloBlocks: 2, serveAttempts: 5 },
  [IDS.riley]:   { kills: 3,  attackErrors: 2, attackAttempts: 8,  blockAssists: 2, serveAttempts: 4 },
  [IDS.sophia]:  { kills: 5,  attackErrors: 1, attackAttempts: 11, aces: 2, serveAttempts: 6, digs: 2 },
  [IDS.maya]:    { digs: 13, passRatingTotal: 35, passAttempts: 14, aces: 1, serveAttempts: 6 },
  [IDS.olivia]:  { digs: 5,  passRatingTotal: 12, passAttempts: 5  },
  [IDS.grace]:   { digs: 5,  passRatingTotal: 13, passAttempts: 5  },
  [IDS.natalie]: { kills: 3, attackErrors: 1, attackAttempts: 7,  digs: 2 },
})
const m3s2 = setStats({
  [IDS.emma]:    { settingAssists: 20, settingErrors: 3, digs: 3, serveErrors: 1, serveAttempts: 6 },
  [IDS.alyssa]:  { kills: 5,  attackErrors: 4, attackAttempts: 15, serveErrors: 1, serveAttempts: 7, digs: 2, atkErrBlocked: 2, atkErrMissed: 2 },
  [IDS.kai]:     { kills: 5,  attackErrors: 3, attackAttempts: 13, serveAttempts: 5, digs: 3 },
  [IDS.jordan]:  { kills: 3,  attackErrors: 2, attackAttempts: 8,  soloBlocks: 1, serveAttempts: 4 },
  [IDS.riley]:   { kills: 2,  attackErrors: 2, attackAttempts: 7,  serveAttempts: 3 },
  [IDS.sophia]:  { kills: 4,  attackErrors: 2, attackAttempts: 10, serveAttempts: 5, digs: 1 },
  [IDS.maya]:    { digs: 10, passRatingTotal: 24, passAttempts: 12, passZeroOverpass: 1, serveAttempts: 4 },
  [IDS.olivia]:  { digs: 4,  passRatingTotal: 9,  passAttempts: 5  },
  [IDS.grace]:   { digs: 4,  passRatingTotal: 10, passAttempts: 5  },
  [IDS.natalie]: { kills: 2, attackErrors: 1, attackAttempts: 6,  digs: 2 },
})
const m3s3 = setStats({
  [IDS.emma]:    { settingAssists: 18, settingErrors: 1, digs: 3, serveAttempts: 5 },
  [IDS.alyssa]:  { kills: 7,  attackErrors: 2, attackAttempts: 14, aces: 1, serveAttempts: 6, digs: 3 },
  [IDS.kai]:     { kills: 6,  attackErrors: 1, attackAttempts: 12, serveAttempts: 5, digs: 3 },
  [IDS.jordan]:  { kills: 4,  attackErrors: 0, attackAttempts: 7,  soloBlocks: 2, serveAttempts: 4 },
  [IDS.riley]:   { kills: 3,  attackErrors: 1, attackAttempts: 7,  blockAssists: 1, serveAttempts: 3 },
  [IDS.sophia]:  { kills: 4,  attackErrors: 1, attackAttempts: 9,  aces: 1, serveAttempts: 4, digs: 2 },
  [IDS.maya]:    { digs: 11, passRatingTotal: 30, passAttempts: 12, serveAttempts: 4 },
  [IDS.olivia]:  { digs: 4,  passRatingTotal: 11, passAttempts: 4  },
  [IDS.grace]:   { digs: 4,  passRatingTotal: 10, passAttempts: 4  },
  [IDS.natalie]: { kills: 3, attackErrors: 0, attackAttempts: 5,  digs: 2 },
})

// ── Match 4: Bracket vs Lakeside 14U — Win 2-0 ──────────────────────────────
const m4s1 = setStats({
  [IDS.emma]:    { settingAssists: 29, settingErrors: 1, digs: 5, serveAttempts: 7 },
  [IDS.alyssa]:  { kills: 10, attackErrors: 2, attackAttempts: 19, aces: 2, serveAttempts: 8, digs: 4 },
  [IDS.kai]:     { kills: 8,  attackErrors: 1, attackAttempts: 16, aces: 1, serveAttempts: 6, digs: 3 },
  [IDS.jordan]:  { kills: 6,  attackErrors: 1, attackAttempts: 11, soloBlocks: 3, blockAssists: 1, serveAttempts: 5 },
  [IDS.riley]:   { kills: 4,  attackErrors: 1, attackAttempts: 9,  soloBlocks: 1, blockAssists: 2, serveAttempts: 4 },
  [IDS.sophia]:  { kills: 7,  attackErrors: 1, attackAttempts: 13, aces: 2, serveAttempts: 6, digs: 3 },
  [IDS.maya]:    { digs: 15, passRatingTotal: 43, passAttempts: 17, aces: 1, serveAttempts: 5 },
  [IDS.olivia]:  { digs: 7,  passRatingTotal: 17, passAttempts: 7  },
  [IDS.grace]:   { digs: 6,  passRatingTotal: 16, passAttempts: 6  },
  [IDS.natalie]: { kills: 4, attackErrors: 1, attackAttempts: 8,  digs: 3 },
})
const m4s2 = setStats({
  [IDS.emma]:    { settingAssists: 25, settingErrors: 1, digs: 4, serveAttempts: 6 },
  [IDS.alyssa]:  { kills: 9,  attackErrors: 2, attackAttempts: 17, aces: 1, serveAttempts: 7, digs: 3 },
  [IDS.kai]:     { kills: 7,  attackErrors: 1, attackAttempts: 14, serveAttempts: 6, digs: 4 },
  [IDS.jordan]:  { kills: 5,  attackErrors: 0, attackAttempts: 10, soloBlocks: 2, blockAssists: 1, serveAttempts: 4 },
  [IDS.riley]:   { kills: 4,  attackErrors: 1, attackAttempts: 8,  soloBlocks: 1, serveAttempts: 3 },
  [IDS.sophia]:  { kills: 6,  attackErrors: 0, attackAttempts: 12, aces: 1, serveAttempts: 5, digs: 2 },
  [IDS.maya]:    { digs: 14, passRatingTotal: 40, passAttempts: 16, serveAttempts: 5 },
  [IDS.olivia]:  { digs: 6,  passRatingTotal: 15, passAttempts: 6  },
  [IDS.grace]:   { digs: 5,  passRatingTotal: 14, passAttempts: 5  },
  [IDS.natalie]: { kills: 3, attackErrors: 0, attackAttempts: 6,  digs: 2 },
})

// ── Match 5: Bracket vs Summit 14U rematch — Win 2-1 ────────────────────────
const m5s1 = setStats({
  [IDS.emma]:    { settingAssists: 27, settingErrors: 2, digs: 4, serveAttempts: 7 },
  [IDS.alyssa]:  { kills: 9,  attackErrors: 3, attackAttempts: 20, aces: 1, serveAttempts: 7, digs: 3, atkErrBlocked: 2, atkErrOut: 1 },
  [IDS.kai]:     { kills: 7,  attackErrors: 2, attackAttempts: 15, serveAttempts: 6, digs: 4 },
  [IDS.jordan]:  { kills: 5,  attackErrors: 1, attackAttempts: 10, soloBlocks: 2, serveAttempts: 5 },
  [IDS.riley]:   { kills: 4,  attackErrors: 1, attackAttempts: 9,  blockAssists: 2, serveAttempts: 4 },
  [IDS.sophia]:  { kills: 6,  attackErrors: 1, attackAttempts: 12, aces: 2, serveAttempts: 6, digs: 2 },
  [IDS.maya]:    { digs: 13, passRatingTotal: 36, passAttempts: 14, serveAttempts: 5 },
  [IDS.olivia]:  { digs: 5,  passRatingTotal: 13, passAttempts: 5  },
  [IDS.grace]:   { digs: 5,  passRatingTotal: 12, passAttempts: 5  },
  [IDS.natalie]: { kills: 3, attackErrors: 1, attackAttempts: 6,  digs: 2 },
})
const m5s2 = setStats({
  [IDS.emma]:    { settingAssists: 21, settingErrors: 3, digs: 3, serveErrors: 1, serveAttempts: 6 },
  [IDS.alyssa]:  { kills: 6,  attackErrors: 4, attackAttempts: 16, serveErrors: 1, serveAttempts: 7, digs: 2, atkErrBlocked: 3, atkErrMissed: 1 },
  [IDS.kai]:     { kills: 5,  attackErrors: 3, attackAttempts: 13, serveAttempts: 5, digs: 3 },
  [IDS.jordan]:  { kills: 3,  attackErrors: 2, attackAttempts: 8,  soloBlocks: 1, serveAttempts: 4 },
  [IDS.riley]:   { kills: 3,  attackErrors: 2, attackAttempts: 7,  serveAttempts: 3 },
  [IDS.sophia]:  { kills: 4,  attackErrors: 2, attackAttempts: 11, serveAttempts: 5, digs: 1 },
  [IDS.maya]:    { digs: 11, passRatingTotal: 26, passAttempts: 13, passZeroShank: 1, serveAttempts: 4 },
  [IDS.olivia]:  { digs: 4,  passRatingTotal: 9,  passAttempts: 5  },
  [IDS.grace]:   { digs: 3,  passRatingTotal: 8,  passAttempts: 4  },
  [IDS.natalie]: { kills: 2, attackErrors: 1, attackAttempts: 5,  digs: 1 },
})
const m5s3 = setStats({
  [IDS.emma]:    { settingAssists: 20, settingErrors: 1, digs: 3, serveAttempts: 5 },
  [IDS.alyssa]:  { kills: 8,  attackErrors: 2, attackAttempts: 15, aces: 2, serveAttempts: 6, digs: 3 },
  [IDS.kai]:     { kills: 7,  attackErrors: 1, attackAttempts: 12, aces: 1, serveAttempts: 5, digs: 3 },
  [IDS.jordan]:  { kills: 5,  attackErrors: 0, attackAttempts: 8,  soloBlocks: 2, serveAttempts: 4 },
  [IDS.riley]:   { kills: 3,  attackErrors: 0, attackAttempts: 7,  blockAssists: 1, serveAttempts: 3 },
  [IDS.sophia]:  { kills: 5,  attackErrors: 1, attackAttempts: 10, aces: 1, serveAttempts: 4, digs: 2 },
  [IDS.maya]:    { digs: 12, passRatingTotal: 33, passAttempts: 13, serveAttempts: 4 },
  [IDS.olivia]:  { digs: 4,  passRatingTotal: 11, passAttempts: 4  },
  [IDS.grace]:   { digs: 4,  passRatingTotal: 10, passAttempts: 4  },
  [IDS.natalie]: { kills: 3, attackErrors: 0, attackAttempts: 5,  digs: 2 },
})

// ── Match 6: Championship vs Premier VBC 14U — Loss 1-2 ─────────────────────
const m6s1 = setStats({
  [IDS.emma]:    { settingAssists: 30, settingErrors: 2, digs: 5, serveAttempts: 7 },
  [IDS.alyssa]:  { kills: 10, attackErrors: 3, attackAttempts: 21, aces: 1, serveAttempts: 8, digs: 4 },
  [IDS.kai]:     { kills: 8,  attackErrors: 2, attackAttempts: 16, aces: 1, serveAttempts: 6, digs: 4 },
  [IDS.jordan]:  { kills: 6,  attackErrors: 1, attackAttempts: 11, soloBlocks: 3, blockAssists: 1, serveAttempts: 5 },
  [IDS.riley]:   { kills: 4,  attackErrors: 1, attackAttempts: 9,  soloBlocks: 1, blockAssists: 2, serveAttempts: 4 },
  [IDS.sophia]:  { kills: 7,  attackErrors: 0, attackAttempts: 13, aces: 2, serveAttempts: 6, digs: 3 },
  [IDS.maya]:    { digs: 15, passRatingTotal: 42, passAttempts: 17, aces: 1, serveAttempts: 5 },
  [IDS.olivia]:  { digs: 7,  passRatingTotal: 17, passAttempts: 7  },
  [IDS.grace]:   { digs: 6,  passRatingTotal: 15, passAttempts: 6  },
  [IDS.natalie]: { kills: 4, attackErrors: 1, attackAttempts: 8,  digs: 3 },
})
const m6s2 = setStats({
  [IDS.emma]:    { settingAssists: 23, settingErrors: 3, digs: 3, serveErrors: 1, serveAttempts: 6 },
  [IDS.alyssa]:  { kills: 7,  attackErrors: 4, attackAttempts: 18, serveErrors: 2, serveAttempts: 7, digs: 3, atkErrBlocked: 3, atkErrOut: 1 },
  [IDS.kai]:     { kills: 6,  attackErrors: 3, attackAttempts: 14, serveErrors: 1, serveAttempts: 5, digs: 3 },
  [IDS.jordan]:  { kills: 3,  attackErrors: 2, attackAttempts: 8,  soloBlocks: 1, serveAttempts: 4 },
  [IDS.riley]:   { kills: 3,  attackErrors: 2, attackAttempts: 8,  serveAttempts: 3 },
  [IDS.sophia]:  { kills: 4,  attackErrors: 2, attackAttempts: 11, serveErrors: 1, serveAttempts: 5, digs: 1 },
  [IDS.maya]:    { digs: 12, passRatingTotal: 28, passAttempts: 14, passZeroShank: 2, serveAttempts: 5 },
  [IDS.olivia]:  { digs: 5,  passRatingTotal: 10, passAttempts: 6  },
  [IDS.grace]:   { digs: 4,  passRatingTotal: 10, passAttempts: 5  },
  [IDS.natalie]: { kills: 3, attackErrors: 2, attackAttempts: 7,  digs: 2 },
})
const m6s3 = setStats({
  [IDS.emma]:    { settingAssists: 22, settingErrors: 2, digs: 3, serveAttempts: 5 },
  [IDS.alyssa]:  { kills: 8,  attackErrors: 3, attackAttempts: 17, aces: 1, serveAttempts: 6, digs: 3, atkErrBlocked: 2, atkErrMissed: 1 },
  [IDS.kai]:     { kills: 6,  attackErrors: 2, attackAttempts: 13, serveAttempts: 5, digs: 3 },
  [IDS.jordan]:  { kills: 4,  attackErrors: 1, attackAttempts: 9,  soloBlocks: 2, serveAttempts: 4 },
  [IDS.riley]:   { kills: 3,  attackErrors: 2, attackAttempts: 8,  blockAssists: 1, serveAttempts: 3 },
  [IDS.sophia]:  { kills: 5,  attackErrors: 2, attackAttempts: 11, serveAttempts: 4, digs: 2 },
  [IDS.maya]:    { digs: 11, passRatingTotal: 29, passAttempts: 13, serveAttempts: 4 },
  [IDS.olivia]:  { digs: 4,  passRatingTotal: 10, passAttempts: 5  },
  [IDS.grace]:   { digs: 4,  passRatingTotal: 9,  passAttempts: 5  },
  [IDS.natalie]: { kills: 2, attackErrors: 1, attackAttempts: 5,  digs: 2 },
})

// ── Practice seed data ────────────────────────────────────────────────────────

function practiceSet(data: Record<string, Partial<PlayerStats>>): SetStats {
  const out: SetStats = {}
  for (const id of Object.values(IDS)) out[id] = EMPTY_STATS()
  for (const [id, vals] of Object.entries(data)) out[id] = ps(vals)
  return out
}

// Pre-tournament scrimmage (Mar 14 — day before Spring Kickoff)
// Team Black vs Team White, two coaches tracking
const pr1_black_s1 = practiceSet({
  [IDS.emma]:    { settingAssists: 18, settingErrors: 3, digs: 3, serveAttempts: 5 },
  [IDS.alyssa]:  { kills: 6, attackErrors: 4, attackAttempts: 14, serveErrors: 2, serveAttempts: 6, digs: 2, atkErrBlocked: 2, atkErrMissed: 2 },
  [IDS.kai]:     { kills: 5, attackErrors: 2, attackAttempts: 12, serveAttempts: 5, digs: 3 },
  [IDS.jordan]:  { kills: 3, attackErrors: 2, attackAttempts: 7,  soloBlocks: 1, serveAttempts: 4 },
  [IDS.riley]:   { kills: 2, attackErrors: 2, attackAttempts: 6,  blockAssists: 1, serveAttempts: 3 },
  [IDS.maya]:    { digs: 11, passRatingTotal: 28, passAttempts: 13, serveAttempts: 5 },
})
const pr1_black_s2 = practiceSet({
  [IDS.emma]:    { settingAssists: 21, settingErrors: 2, digs: 4, serveAttempts: 6 },
  [IDS.alyssa]:  { kills: 8, attackErrors: 3, attackAttempts: 16, aces: 1, serveAttempts: 7, digs: 3, atkErrNet: 1, atkErrBlocked: 2 },
  [IDS.kai]:     { kills: 7, attackErrors: 2, attackAttempts: 14, aces: 1, serveAttempts: 5, digs: 4 },
  [IDS.jordan]:  { kills: 4, attackErrors: 1, attackAttempts: 9,  soloBlocks: 2, serveAttempts: 4 },
  [IDS.riley]:   { kills: 3, attackErrors: 1, attackAttempts: 7,  blockAssists: 2, serveAttempts: 3 },
  [IDS.maya]:    { digs: 13, passRatingTotal: 35, passAttempts: 14, serveAttempts: 5 },
})
const pr1_black_s3 = practiceSet({
  [IDS.emma]:    { settingAssists: 16, settingErrors: 1, digs: 3, serveAttempts: 4 },
  [IDS.alyssa]:  { kills: 7, attackErrors: 2, attackAttempts: 13, aces: 2, serveAttempts: 6, digs: 2 },
  [IDS.kai]:     { kills: 6, attackErrors: 1, attackAttempts: 11, serveAttempts: 5, digs: 3 },
  [IDS.jordan]:  { kills: 4, attackErrors: 0, attackAttempts: 7,  soloBlocks: 2, serveAttempts: 3 },
  [IDS.riley]:   { kills: 3, attackErrors: 1, attackAttempts: 6,  soloBlocks: 1, serveAttempts: 3 },
  [IDS.maya]:    { digs: 10, passRatingTotal: 27, passAttempts: 12, aces: 1, serveAttempts: 4 },
})

const pr1_white_s1 = practiceSet({
  [IDS.sophia]:  { kills: 5, attackErrors: 3, attackAttempts: 13, serveAttempts: 5, digs: 2 },
  [IDS.natalie]: { kills: 4, attackErrors: 3, attackAttempts: 11, serveErrors: 1, serveAttempts: 5, digs: 2 },
  [IDS.chloe]:   { settingAssists: 15, settingErrors: 4, digs: 2, serveAttempts: 4 },
  [IDS.zoe]:     { kills: 2, attackErrors: 2, attackAttempts: 6,  soloBlocks: 1, serveAttempts: 3 },
  [IDS.olivia]:  { digs: 8, passRatingTotal: 18, passAttempts: 9, serveAttempts: 4 },
  [IDS.grace]:   { digs: 7, passRatingTotal: 17, passAttempts: 8, serveAttempts: 3 },
})
const pr1_white_s2 = practiceSet({
  [IDS.sophia]:  { kills: 7, attackErrors: 2, attackAttempts: 14, aces: 1, serveAttempts: 6, digs: 3 },
  [IDS.natalie]: { kills: 5, attackErrors: 2, attackAttempts: 12, serveAttempts: 5, digs: 3 },
  [IDS.chloe]:   { settingAssists: 19, settingErrors: 2, digs: 3, serveAttempts: 5 },
  [IDS.zoe]:     { kills: 3, attackErrors: 1, attackAttempts: 7,  soloBlocks: 2, serveAttempts: 3 },
  [IDS.olivia]:  { digs: 9, passRatingTotal: 22, passAttempts: 10, serveAttempts: 4 },
  [IDS.grace]:   { digs: 8, passRatingTotal: 20, passAttempts: 9,  aces: 1, serveAttempts: 4 },
})
const pr1_white_s3 = practiceSet({
  [IDS.sophia]:  { kills: 6, attackErrors: 1, attackAttempts: 12, aces: 2, serveAttempts: 5, digs: 2 },
  [IDS.natalie]: { kills: 5, attackErrors: 1, attackAttempts: 10, aces: 1, serveAttempts: 5, digs: 3 },
  [IDS.chloe]:   { settingAssists: 17, settingErrors: 1, digs: 3, serveAttempts: 4 },
  [IDS.zoe]:     { kills: 3, attackErrors: 0, attackAttempts: 6,  soloBlocks: 1, serveAttempts: 3 },
  [IDS.olivia]:  { digs: 8, passRatingTotal: 20, passAttempts: 9,  serveAttempts: 4 },
  [IDS.grace]:   { digs: 7, passRatingTotal: 19, passAttempts: 8,  serveAttempts: 3 },
})

// Mid-week serve-receive focus practice (Mar 19)
const pr2_s1 = practiceSet({
  [IDS.emma]:    { settingAssists: 20, settingErrors: 2, digs: 3, serveAttempts: 5 },
  [IDS.alyssa]:  { kills: 5, attackErrors: 3, attackAttempts: 12, aces: 3, serveAttempts: 8, digs: 2 },
  [IDS.kai]:     { kills: 4, attackErrors: 2, attackAttempts: 10, aces: 2, serveAttempts: 7, digs: 3 },
  [IDS.jordan]:  { kills: 3, attackErrors: 1, attackAttempts: 6,  soloBlocks: 1, serveAttempts: 4 },
  [IDS.riley]:   { kills: 2, attackErrors: 1, attackAttempts: 5,  serveAttempts: 3 },
  [IDS.sophia]:  { kills: 4, attackErrors: 1, attackAttempts: 9,  aces: 2, serveAttempts: 6, digs: 2 },
  [IDS.maya]:    { digs: 16, passRatingTotal: 44, passAttempts: 16, aces: 1, serveAttempts: 5 },
  [IDS.olivia]:  { digs: 9,  passRatingTotal: 24, passAttempts: 10, serveAttempts: 4 },
  [IDS.grace]:   { digs: 8,  passRatingTotal: 22, passAttempts: 9,  serveAttempts: 3 },
  [IDS.natalie]: { kills: 3, attackErrors: 1, attackAttempts: 7,  aces: 1, serveAttempts: 5, digs: 2 },
})
const pr2_s2 = practiceSet({
  [IDS.emma]:    { settingAssists: 22, settingErrors: 1, digs: 4, serveAttempts: 5 },
  [IDS.alyssa]:  { kills: 7, attackErrors: 2, attackAttempts: 14, aces: 2, serveAttempts: 7, digs: 3 },
  [IDS.kai]:     { kills: 6, attackErrors: 1, attackAttempts: 12, aces: 3, serveAttempts: 8, digs: 3 },
  [IDS.jordan]:  { kills: 4, attackErrors: 0, attackAttempts: 7,  soloBlocks: 2, serveAttempts: 4 },
  [IDS.riley]:   { kills: 3, attackErrors: 1, attackAttempts: 6,  soloBlocks: 1, serveAttempts: 3 },
  [IDS.sophia]:  { kills: 5, attackErrors: 1, attackAttempts: 10, aces: 3, serveAttempts: 7, digs: 2 },
  [IDS.maya]:    { digs: 18, passRatingTotal: 50, passAttempts: 18, aces: 2, serveAttempts: 6 },
  [IDS.olivia]:  { digs: 10, passRatingTotal: 27, passAttempts: 11, serveAttempts: 4 },
  [IDS.grace]:   { digs: 9,  passRatingTotal: 25, passAttempts: 10, aces: 1, serveAttempts: 4 },
  [IDS.natalie]: { kills: 4, attackErrors: 1, attackAttempts: 8,  aces: 2, serveAttempts: 6, digs: 2 },
})

export const SEED_PRACTICES: PracticeSession[] = [
  {
    id: 'seed-pr1-black',
    date: '2025-03-14',
    name: 'Pre-tournament scrimmage',
    teamLabel: 'Black',
    notes: 'Shaking off rust before Spring Kickoff. Focus on first-ball sideout.',
    scrimmages: [pr1_black_s1, pr1_black_s2, pr1_black_s3],
  },
  {
    id: 'seed-pr1-white',
    date: '2025-03-14',
    name: 'Pre-tournament scrimmage',
    teamLabel: 'White',
    notes: 'Coach Kim tracking the white side.',
    scrimmages: [pr1_white_s1, pr1_white_s2, pr1_white_s3],
  },
  {
    id: 'seed-pr2',
    date: '2025-03-19',
    name: 'Serve-receive focus',
    teamLabel: '',
    notes: 'Post-tournament cleanup. Really emphasized jump serving and pass quality.',
    scrimmages: [pr2_s1, pr2_s2],
  },
]

export const SEED_MATCHES: Match[] = [
  {
    id: 'seed-m1', date: '2025-03-15', tournament: 'Spring Kickoff Classic',
    opponent: 'Summit 14U', ourScore: '2', theirScore: '0',
    notes: 'Strong serving game. Good block coverage.',
    sets: [m1s1, m1s2],
  },
  {
    id: 'seed-m2', date: '2025-03-15', tournament: 'Spring Kickoff Classic',
    opponent: 'Eastside Elite 14U', ourScore: '0', theirScore: '2',
    notes: 'Struggled against their strong middle. Too many attack errors.',
    sets: [m2s1, m2s2],
  },
  {
    id: 'seed-m3', date: '2025-03-15', tournament: 'Spring Kickoff Classic',
    opponent: 'Metro Crush 14U', ourScore: '2', theirScore: '1',
    notes: 'Good bounce back after morning loss. Clutch third set.',
    sets: [m3s1, m3s2, m3s3],
  },
  {
    id: 'seed-m4', date: '2025-03-16', tournament: 'Spring Kickoff Classic',
    opponent: 'Lakeside 14U', ourScore: '2', theirScore: '0',
    notes: 'Best passing game of the weekend. Great communication.',
    sets: [m4s1, m4s2],
  },
  {
    id: 'seed-m5', date: '2025-03-16', tournament: 'Spring Kickoff Classic',
    opponent: 'Summit 14U (Rematch)', ourScore: '2', theirScore: '1',
    notes: 'Revenge match! Came back strong in set 3.',
    sets: [m5s1, m5s2, m5s3],
  },
  {
    id: 'seed-m6', date: '2025-03-16', tournament: 'Spring Kickoff Classic',
    opponent: 'Premier VBC 14U', ourScore: '1', theirScore: '2',
    notes: 'Championship match. Went the distance — proud of the fight.',
    sets: [m6s1, m6s2, m6s3],
  },
]
