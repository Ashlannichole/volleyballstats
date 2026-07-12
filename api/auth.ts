import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'
import { randomBytes, pbkdf2Sync } from 'crypto'

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })

const SESSION_TTL = 60 * 60 * 24 * 30 // 30 days

function makeToken() { return [...Array(40)].map(() => Math.random().toString(36)[2]).join('') }

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const s = salt ?? randomBytes(16).toString('hex')
  const hash = pbkdf2Sync(password, s, 100000, 64, 'sha256').toString('hex')
  return { hash, salt: s }
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':')
  if (!salt || !hash) return false
  const { hash: computed } = hashPassword(password, salt)
  return computed === hash
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const action = req.query.action as string

  // POST /api/auth?action=register  { email, password }
  if (action === 'register') {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(400).json({ error: 'A valid email address is required.' })
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' })
    }

    const key = email.trim().toLowerCase()
    const existing = await redis.get(`user:${key}:password`)
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Sign in instead.' })
    }

    const { hash, salt } = hashPassword(password)
    await redis.set(`user:${key}:password`, `${salt}:${hash}`)

    const token = makeToken()
    await redis.set(`session:${token}`, key, { ex: SESSION_TTL })
    return res.status(200).json({ token, email: key })
  }

  // POST /api/auth?action=login  { email, password }
  if (action === 'login') {
    const { email, password } = req.body as { email?: string; password?: string }
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const key = email.trim().toLowerCase()
    const stored = await redis.get(`user:${key}:password`) as string | null

    if (!stored) {
      return res.status(401).json({ error: 'No account found with this email. Create one first.' })
    }
    if (!verifyPassword(password, stored)) {
      return res.status(401).json({ error: 'Incorrect password.' })
    }

    const token = makeToken()
    await redis.set(`session:${token}`, key, { ex: SESSION_TTL })
    return res.status(200).json({ token, email: key })
  }

  // POST /api/auth?action=signout  { token }
  if (action === 'signout') {
    const { token } = req.body as { token?: string }
    if (token) await redis.del(`session:${token}`)
    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
