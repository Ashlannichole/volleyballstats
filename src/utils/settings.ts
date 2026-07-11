export interface TeamSettings {
  teamName: string       // active team 1 name
  team2Name: string      // team 2 name (Pro)
  activeTeam: 1 | 2     // which roster is currently shown
  primaryColor: string
  secondaryColor: string
  recMode: boolean       // recreational mode: unlimited subs, no sub counting
  showSponsors: boolean  // Pro: show sponsor strip on spectator view
  sponsors: string[]     // Pro: team 1 sponsor names
  team2Sponsors: string[] // Pro: team 2 sponsor names
}

const KEY = 'vb_team_settings'

export const DEFAULTS: TeamSettings = {
  teamName: 'My Team',
  team2Name: 'Team 2',
  activeTeam: 1,
  primaryColor: '#4a1d8a',
  secondaryColor: '#87cde3',
  recMode: false,
  showSponsors: false,
  sponsors: [],
  team2Sponsors: [],
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

  // Inject a global style so focus rings, borders, and key accents follow the team color
  let el = document.getElementById('team-theme') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'team-theme'
    document.head.appendChild(el)
  }
  el.textContent = `
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: ${s.primaryColor} !important;
      box-shadow: 0 0 0 2px ${s.primaryColor}33;
    }
    .team-accent { color: ${s.primaryColor}; }
    .team-accent-bg { background-color: ${s.primaryColor}; }
    .team-accent-border { border-color: ${s.primaryColor}; }
    .team-secondary { color: ${s.secondaryColor}; }
    .team-secondary-bg { background-color: ${s.secondaryColor}; }
  `
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
