export interface TeamSettings {
  teamName: string
  primaryColor: string   // hex e.g. '#4a1d8a'
  secondaryColor: string // hex e.g. '#87cde3'
}

const KEY = 'vb_team_settings'

const DEFAULTS: TeamSettings = {
  teamName: 'My Team',
  primaryColor: '#4a1d8a',
  secondaryColor: '#87cde3',
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
