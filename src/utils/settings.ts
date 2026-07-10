export interface TeamSettings {
  teamName: string       // active team 1 name
  team2Name: string      // team 2 name (Pro)
  activeTeam: 1 | 2     // which roster is currently shown
  primaryColor: string
  secondaryColor: string
  recMode: boolean       // recreational mode: unlimited subs, no sub counting
}

const KEY = 'vb_team_settings'

const DEFAULTS: TeamSettings = {
  teamName: 'My Team',
  team2Name: 'Team 2',
  activeTeam: 1,
  primaryColor: '#4a1d8a',
  secondaryColor: '#87cde3',
  recMode: false,
}

export function loadSettings(): TeamSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: TeamSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export function applyColorVars(s: TeamSettings): void {
  const root = document.documentElement
  root.style.setProperty('--team-primary', s.primaryColor)
  root.style.setProperty('--team-secondary', s.secondaryColor)
}

// Coach team (separate from team display settings)
const TEAM_KEY = 'vb_coach_team'

export interface CoachTeam {
  code: string
  role: 'owner' | 'member'
}

export function loadCoachTeam(): CoachTeam | null {
  try {
    const raw = localStorage.getItem(TEAM_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveCoachTeam(t: CoachTeam | null): void {
  if (t) localStorage.setItem(TEAM_KEY, JSON.stringify(t))
  else localStorage.removeItem(TEAM_KEY)
}
