import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

export interface SpectatorState {
  code: string
  opponent: string
  ourScore: number
  theirScore: number
  setNumber: number
  rotation: (string | null)[]
  weAreServing: boolean
  updatedAt: number
  ended?: boolean
}

const redis = new Redis({
  url:   process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const state: SpectatorState = req.body
  if (!state?.code || typeof state.code !== 'string') {
    return res.status(400).json({ error: 'Missing code' })
  }

  // Store for 6 hours — long enough for any match
  await redis.set(`spectator:${state.code}`, JSON.stringify(state), { ex: 21600 })
  res.status(200).json({ ok: true })
}
