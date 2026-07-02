// Read live match state — polled by spectator page every 5 seconds.
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { kv } from '@vercel/kv'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end()

  const { code } = req.query
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Missing code' })
  }

  const state = await kv.get(`spectator:${code}`)
  if (!state) return res.status(404).json({ error: 'Match not found or expired' })

  res.status(200).json(state)
}
