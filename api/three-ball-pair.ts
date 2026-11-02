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

  // POST /api/three-ball-pair?action=create
  // The creating iPad is always side A; whoever joins with the code is B.
  // Each side tracks its own chosen 6 players — there's no server-assigned
  // role split like the Serve & Pass drill, so create/join don't need to
  // coordinate anything beyond the code itself.
  if (action === 'create' && req.method === 'POST') {
    const code = makeCode()
    await redis.set(`threeball:${code}:meta`, JSON.stringify({ createdAt: Date.now() }), { ex: TTL })
    return res.status(200).json({ code })
  }

  // POST /api/three-ball-pair?action=join  body: { code }
  if (action === 'join' && req.method === 'POST') {
    const { code } = req.body as { code?: string }
    if (!code) return res.status(400).json({ error: 'Missing code' })

    const raw = await redis.get(`threeball:${code.toUpperCase()}:meta`)
    if (!raw) return res.status(404).json({ error: "Session not found. Check the code and try again." })

    return res.status(200).json({ ok: true })
  }

  // POST /api/three-ball-pair?action=push  body: { code, side, stats }
  // Each side only ever writes its OWN key — the two iPads never write the
  // same key, so there's no merge/race to resolve server-side.
  if (action === 'push' && req.method === 'POST') {
    const { code, side, stats } = req.body as { code?: string; side?: Side; stats?: unknown }
    if (!code || (side !== 'A' && side !== 'B')) {
      return res.status(400).json({ error: 'Missing code or side' })
    }
    await redis.set(
      `threeball:${code.toUpperCase()}:${side}`,
      JSON.stringify({ stats, updatedAt: Date.now() }),
      { ex: TTL }
    )
    return res.status(200).json({ ok: true })
  }

  // GET /api/three-ball-pair?action=pull&code=XXX
  if (action === 'pull' && req.method === 'GET') {
    const code = (req.query.code as string | undefined)?.toUpperCase()
    if (!code) return res.status(400).json({ error: 'Missing code' })

    const [aRaw, bRaw] = await Promise.all([
      redis.get(`threeball:${code}:A`),
      redis.get(`threeball:${code}:B`),
    ])
    const parse = (raw: unknown) => {
      if (!raw) return null
      const v = typeof raw === 'string' ? JSON.parse(raw) : raw
      return v as { stats: unknown; updatedAt: number }
    }
    return res.status(200).json({ a: parse(aRaw), b: parse(bRaw) })
  }

  return res.status(400).json({ error: 'Unknown action' })
}
