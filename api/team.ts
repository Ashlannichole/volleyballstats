import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url:   process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const TTL = 60 * 60 * 24 * 90 // 90 days

function makeCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string

  // POST /api/team?action=create
  if (action === 'create' && req.method === 'POST') {
    const code = makeCode()
    await redis.set(`team:${code}`, JSON.stringify({
      code,
      memberCount: 1,
      createdAt: Date.now(),
      matches: [],
      players: [],
    }), { ex: TTL })
    return res.status(200).json({ code })
  }

  // POST /api/team?action=join  body: { code }
  if (action === 'join' && req.method === 'POST') {
    const { code } = req.body as { code: string }
    if (!code) return res.status(400).json({ error: 'Missing code' })

    const raw = await redis.get(`team:${code}`)
    if (!raw) return res.status(404).json({ error: 'Team not found. Check the code and try again.' })

    const team = typeof raw === 'string' ? JSON.parse(raw) : raw as { memberCount: number; matches: unknown[]; players: unknown[] }
    if (team.memberCount >= 3) {
      return res.status(403).json({ error: 'This team is full (max 3 coaches).' })
    }

    team.memberCount = team.memberCount + 1
    await redis.set(`team:${code}`, JSON.stringify(team), { ex: TTL })
    return res.status(200).json({
      ok: true,
      matchCount: (team.matches ?? []).length,
      playerCount: (team.players ?? []).length,
    })
  }

  // POST /api/team?action=push  body: { code, matches, players }
  if (action === 'push' && req.method === 'POST') {
    const { code, matches, players } = req.body as { code: string; matches: unknown[]; players: unknown[] }
    if (!code) return res.status(400).json({ error: 'Missing code' })

    const raw = await redis.get(`team:${code}`)
    if (!raw) return res.status(404).json({ error: 'Team not found' })

    const team = typeof raw === 'string' ? JSON.parse(raw) : raw
    team.matches = matches ?? team.matches
    team.players = players ?? team.players
    team.updatedAt = Date.now()
    await redis.set(`team:${code}`, JSON.stringify(team), { ex: TTL })
    return res.status(200).json({ ok: true })
  }

  // GET /api/team?action=pull&code=XXXXXX
  if (action === 'pull' && req.method === 'GET') {
    const code = req.query.code as string
    if (!code) return res.status(400).json({ error: 'Missing code' })

    const raw = await redis.get(`team:${code}`)
    if (!raw) return res.status(404).json({ error: 'Team not found or expired' })

    const team = typeof raw === 'string' ? JSON.parse(raw) : raw as { matches: unknown[]; players: unknown[] }
    return res.status(200).json({
      matches: team.matches ?? [],
      players: team.players ?? [],
    })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
