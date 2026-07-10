const SESSION_KEY = 'vb_session'

export interface Session {
  token: string
  email: string
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function saveSession(s: Session | null): void {
  if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s))
  else localStorage.removeItem(SESSION_KEY)
}

interface UserData {
  matches: unknown[]; players: unknown[]; practices: unknown[]
  matches2?: unknown[]; players2?: unknown[]; practices2?: unknown[]
}

export async function pushUserData(token: string, data: UserData) {
  return fetch(`/api/user-data?token=${encodeURIComponent(token)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).catch(() => {})
}

export async function pullUserData(token: string): Promise<UserData> {
  const res = await fetch(`/api/user-data?token=${encodeURIComponent(token)}`)
  if (res.status === 401) throw new Error('session_expired')
  if (!res.ok) throw new Error('fetch_failed')
  return res.json()
}
