export interface TeamSettings {
  teamName: string       // active team 1 name
  team2Name: string      // team 2 name (Pro)
  activeTeam: 1 | 2     // which roster is currently shown
  primaryColor: string
  secondaryColor: string
  recMode: boolean       // recreational mode: unlimited subs, no sub counting
  bestOf5: boolean       // best of 5 sets (default: best of 3)
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
  bestOf5: false,
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

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace('#', '').match(/.{2}/g)
  if (!m || m.length < 3) return null
  return [parseInt(m[0], 16), parseInt(m[1], 16), parseInt(m[2], 16)]
}

function blend(rgb: [number,number,number], target: number, t: number): string {
  const r = Math.round(rgb[0] + (target - rgb[0]) * t)
  const g = Math.round(rgb[1] + (target - rgb[1]) * t)
  const b = Math.round(rgb[2] + (target - rgb[2]) * t)
  return `${r} ${g} ${b}`
}

export function applyColorVars(s: TeamSettings): void {
  const root = document.documentElement
  root.style.setProperty('--team-primary', s.primaryColor)
  root.style.setProperty('--team-secondary', s.secondaryColor)

  const p = hexToRgb(s.primaryColor) ?? [74, 29, 138]
  const sc = hexToRgb(s.secondaryColor) ?? [135, 205, 227]

  // Primary scale anchored at vr-700 = pure primary
  root.style.setProperty('--vr-900', blend(p as [number,number,number], 0, 0.72))
  root.style.setProperty('--vr-800', blend(p as [number,number,number], 0, 0.50))
  root.style.setProperty('--vr-700', `${p[0]} ${p[1]} ${p[2]}`)
  root.style.setProperty('--vr-600', blend(p as [number,number,number], 255, 0.22))
  root.style.setProperty('--vr-500', blend(p as [number,number,number], 255, 0.40))
  root.style.setProperty('--vr-400', blend(p as [number,number,number], 255, 0.56))
  root.style.setProperty('--vr-300', blend(p as [number,number,number], 255, 0.72))

  // Secondary scale
  root.style.setProperty('--pb-700', blend(sc as [number,number,number], 0, 0.50))
  root.style.setProperty('--pb-600', blend(sc as [number,number,number], 0, 0.28))
  root.style.setProperty('--pb-500', blend(sc as [number,number,number], 255, 0.12))
  root.style.setProperty('--pb-400', `${sc[0]} ${sc[1]} ${sc[2]}`)
  root.style.setProperty('--pb-300', blend(sc as [number,number,number], 255, 0.38))

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
