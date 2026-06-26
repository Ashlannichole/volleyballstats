import type { Player, Match, SavedLineup } from '../types'

const PLAYERS_KEY  = 'vb_players'
const MATCHES_KEY  = 'vb_matches'
const LINEUPS_KEY  = 'vb_lineups'

export function loadPlayers(): Player[] {
  try {
    return JSON.parse(localStorage.getItem(PLAYERS_KEY) || '[]')
  } catch {
    return []
  }
}

export function savePlayers(players: Player[]): void {
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(players))
}

export function loadMatches(): Match[] {
  try {
    return JSON.parse(localStorage.getItem(MATCHES_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveMatches(matches: Match[]): void {
  localStorage.setItem(MATCHES_KEY, JSON.stringify(matches))
}

export function loadLineups(): SavedLineup[] {
  try {
    return JSON.parse(localStorage.getItem(LINEUPS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveLineups(lineups: SavedLineup[]): void {
  localStorage.setItem(LINEUPS_KEY, JSON.stringify(lineups))
}
