import type { Player, Match, SavedLineup, PracticeSession, PlayerNote } from '../types'

const PLAYERS_KEY   = 'vb_players'
const MATCHES_KEY   = 'vb_matches'
const LINEUPS_KEY   = 'vb_lineups'
const PRACTICE_KEY  = 'vb_practice'
const NOTES_KEY     = 'vb_player_notes'

// Team 2 keys
const PLAYERS2_KEY  = 'vb_players_2'
const MATCHES2_KEY  = 'vb_matches_2'
const PRACTICE2_KEY = 'vb_practice_2'
const NOTES2_KEY    = 'vb_player_notes_2'

function parseOr<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback }
  catch { return fallback }
}

// ── Team 1 ──────────────────────────────────────────────
export function loadPlayers():   Player[]         { return parseOr(PLAYERS_KEY,  []) }
export function savePlayers(v:   Player[])         { localStorage.setItem(PLAYERS_KEY,  JSON.stringify(v)) }

export function loadMatches():   Match[]           { return parseOr(MATCHES_KEY,  []) }
export function saveMatches(v:   Match[])          { localStorage.setItem(MATCHES_KEY,  JSON.stringify(v)) }

export function loadPractices(): PracticeSession[] { return parseOr(PRACTICE_KEY, []) }
export function savePractices(v: PracticeSession[]) { localStorage.setItem(PRACTICE_KEY, JSON.stringify(v)) }

export function loadLineups():   SavedLineup[]     { return parseOr(LINEUPS_KEY,  []) }
export function saveLineups(v:   SavedLineup[])    { localStorage.setItem(LINEUPS_KEY,  JSON.stringify(v)) }

export function loadPlayerNotes(): PlayerNote[]     { return parseOr(NOTES_KEY, []) }
export function savePlayerNotes(v: PlayerNote[])     { localStorage.setItem(NOTES_KEY, JSON.stringify(v)) }

// ── Team 2 ──────────────────────────────────────────────
export function loadPlayers2():   Player[]         { return parseOr(PLAYERS2_KEY,  []) }
export function savePlayers2(v:   Player[])        { localStorage.setItem(PLAYERS2_KEY,  JSON.stringify(v)) }

export function loadMatches2():   Match[]          { return parseOr(MATCHES2_KEY,  []) }
export function saveMatches2(v:   Match[])         { localStorage.setItem(MATCHES2_KEY,  JSON.stringify(v)) }

export function loadPractices2(): PracticeSession[] { return parseOr(PRACTICE2_KEY, []) }
export function savePractices2(v: PracticeSession[]) { localStorage.setItem(PRACTICE2_KEY, JSON.stringify(v)) }

export function loadPlayerNotes2(): PlayerNote[]     { return parseOr(NOTES2_KEY, []) }
export function savePlayerNotes2(v: PlayerNote[])     { localStorage.setItem(NOTES2_KEY, JSON.stringify(v)) }
