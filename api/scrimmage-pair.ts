import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url:   process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

const TTL = 60 * 60 * 6 // 6 hours — plenty for one practice

type Side = 'A' | 'B'

function makeCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.query.action as string

  // POST /api/scrimmage-pair?action=create
  // The creating iPad is always side A; whoever joins with the code is B.
  if (action === 'create' && req.method === 'POST') {
    const code = makeCode()
    await redis.set(`scrimmage:${code}:meta`, JSON.stringify({ createdAt: Date.now() }), { ex: TTL })
    return res.status(200).json({ code })
  }

  // POST /api/scrimmage-pair?action=join  body: { code }
  if (action === 'join' && req.method === 'POST') {
    const { code } = req.body as { code?: string }
    if (!code) return res.status(400).json({ error: 'Missing code' })

    const raw = await redis.get(`scrimmage:${code.toUpperCase()}:meta`)
    if (!raw) return res.status(404).json({ error: "Session not found. Check the code and try again." })

    return res.status(200).json({ ok: true })
  }

  // POST /api/scrimmage-pair?action=push  body: { code, side, teamLabel, sets }
  // Each side only ever writes its OWN key — the two iPads never write the
  // same key, so there's no merge/race to resolve server-side.
  if (action === 'push' && req.method === 'POST') {
    const { code, side, teamLabel, sets } = req.body as {
      code?: string; side?: Side; teamLabel?: string; sets?: unknown
    }
    if (!code || (side !== 'A' && side !== 'B')) {
      return res.status(400).json({ error: 'Missing code or side' })
    }
    await redis.set(
      `scrimmage:${code.toUpperCase()}:${side}`,
      JSON.stringify({ teamLabel: teamLabel ?? '', sets, updatedAt: Date.now() }),
      { ex: TTL }
    )
    return res.status(200).json({ ok: true })
  }

  // GET /api/scrimmage-pair?action=pull&code=XXX
  if (action === 'pull' && req.method === 'GET') {
    const code = (req.query.code as string | undefined)?.toUpperCase()
    if (!code) return res.status(400).json({ error: 'Missing code' })

    const [aRaw, bRaw] = await Promise.all([
      redis.get(`scrimmage:${code}:A`),
      redis.get(`scrimmage:${code}:B`),
    ])
    const parse = (raw: unknown) => {
      if (!raw) return null
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw
      return v as { teamLabel: string; sets: unknown; updatedAt: number }
    }
    return res.status(200).json({ a: parse(aRaw), b: parse(bRaw) })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
