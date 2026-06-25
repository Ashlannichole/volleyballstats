import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { prompt } = req.body as { prompt: string }
  if (!prompt) return res.status(400).json({ error: 'Missing prompt' })

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const suggestions = JSON.parse(text)
    res.status(200).json({ suggestions })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e instanceof Error ? e.message : 'AI error' })
  }
}
