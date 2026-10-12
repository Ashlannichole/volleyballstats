import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url:   process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const TTL = 60 * 60 * 4 // 4 hours — plenty for one practice

type Role = 'servers' | 'passers'

function makeCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

function otherRole(role: Role): Role {
  return role === 'servers' ? 'passers' : 'servers'
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string

  // POST /api/drill-session?action=create  body: { role }
  // The creating iPad picks which role IT tracks; the code it's given is
  // what the second iPad enters, and gets assigned the other role.
  if (action === 'create' && req.method === 'POST') {
    const { role } = req.body as { role?: Role }
    if (role !== 'servers' && role !== 'passers') {
      return res.status(400).json({ error: 'Invalid role' })
    }
    const code = makeCode()
    await redis.set(`drill:${code}:meta`, JSON.stringify({ hostRole: role, createdAt: Date.now() }), { ex: TTL })
    return res.status(200).json({ code })
  }

  // POST /api/drill-session?action=join  body: { code }
  if (action === 'join' && req.method === 'POST') {
    const { code } = req.body as { code?: string }
    if (!code) return res.status(400).json({ error: 'Missing code' })

    const raw = await redis.get(`drill:${code.toUpperCase()}:meta`)
    if (!raw) return res.status(404).json({ error: "Session not found. Check the code and try again." })

    const meta = (typeof raw === 'string' ? JSON.parse(raw) : raw) as { hostRole: Role }
    return res.status(200).json({ ok: true, role: otherRole(meta.hostRole) })
  }

  // POST /api/drill-session?action=push  body: { code, role, stats }
  // Each role only ever writes its OWN key — the two iPads never write the
  // same key, so there's no merge/race to resolve server-side.
  if (action === 'push' && req.method === 'POST') {
    const { code, role, stats } = req.body as { code?: string; role?: Role; stats?: unknown }
    if (!code || (role !== 'servers' && role !== 'passers')) {
      return res.status(400).json({ error: 'Missing code or role' })
    }
    await redis.set(`drill:${code.toUpperCase()}:${role}`, JSON.stringify({ stats, updatedAt: Date.now() }), { ex: TTL })
    return res.status(200).json({ ok: true })
  }

  // GET /api/drill-session?action=pull&code=XXX
  // Returns both roles' latest pushed stats, so either iPad can show the
  // other side's progress, and either can finalize the combined session.
  if (action === 'pull' && req.method === 'GET') {
    const code = (req.query.code as string | undefined)?.toUpperCase()
    if (!code) return res.status(400).json({ error: 'Missing code' })

    const [serversRaw, passersRaw] = await Promise.all([
      redis.get(`drill:${code}:servers`),
      redis.get(`drill:${code}:passers`),
    ])
    const parse = (raw: unknown) => {
      if (!raw) return null
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw
      return v as { stats: unknown; updatedAt: number }
    }
    return res.status(200).json({ servers: parse(serversRaw), passers: parse(passersRaw) })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
