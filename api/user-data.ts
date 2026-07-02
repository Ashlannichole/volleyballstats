import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({ url: process.env.KV_REST_API_URL!, token: process.env.KV_REST_API_TOKEN! })
const DATA_TTL = 60 * 60 * 24 * 365 // 1 year

async function resolveEmail(token: string): Promise<string | null> {
  const raw = await redis.get(`session:${token}`)
  return typeof raw === 'string' ? raw : null
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const token = req.query.token as string
  if (!token) return res.status(401).json({ error: 'Missing session token' })

  const email = await resolveEmail(token)
  if (!email) return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' })

  // GET /api/user-data?token=XXX  — pull all user data
  if (req.method === 'GET') {
    const raw = await redis.get(`user:${email}:data`)
    if (!raw) return res.status(200).json({ matches: [], players: [], practices: [] })
    const data = typeof raw === 'string' ? JSON.parse(raw) : raw
    return res.status(200).json(data)
  }

  // POST /api/user-data?token=XXX  body: { matches, players, practices }
  if (req.method === 'POST') {
    await redis.set(`user:${email}:data`, JSON.stringify(req.body), { ex: DATA_TTL })
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
