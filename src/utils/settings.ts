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
