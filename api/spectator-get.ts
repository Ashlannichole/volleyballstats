import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url:   process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { code } = req.query
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing code' })
  }

  const raw = await redis.get(`spectator:${code}`)
  if (!raw) return res.status(404).json({ error: 'Match not found or expired' })

  // Upstash auto-parses JSON, so raw may already be an object
  const state = typeof raw === 'string' ? JSON.parse(raw) : raw
  res.status(200).json(state)
}
