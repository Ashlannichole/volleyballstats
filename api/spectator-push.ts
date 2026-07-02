// Push live match state from coach's device to Vercel KV.
// Called on every score change during an active match.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '@vercel/kv'

export interface SpectatorState {
  code: string
  opponent: string
  ourScore: number
  theirScore: number
  setNumber: number
  rotation: (string | null)[]   // 6 player names in court slots [P1-P6]
  weAreServing: boolean
  updatedAt: number
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const state: SpectatorState = req.body
  if (!state?.code || typeof state.code !== 'string') {
    return res.status(400).json({ error: 'Missing code' })
  }

  // Store for 6 hours — long enough for any match
  await kv.set(`spectator:${state.code}`, state, { ex: 21600 })
  res.status(200).json({ ok: true })
}
