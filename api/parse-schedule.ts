import type { VercelRequest, VercelResponse } from '@vercel/node'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
// A real tournament rarely runs longer than this — used to catch OCR/typo'd date
// ranges (reversed, or wildly far apart) rather than let them paint the calendar.
const MAX_EVENT_SPAN_DAYS = 14

interface ParsedEvent {
  date: string
  endDate?: string
  title: string
  location?: string
  time?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { mediaType, data, today } = req.body as { mediaType?: string; data?: string; today?: string }
  if (!mediaType || !data) return res.status(400).json({ error: 'Missing file data' })

  const isPdf = mediaType === 'application/pdf'
  if (!isPdf && !IMAGE_TYPES.has(mediaType)) {
    return res.status(400).json({ error: 'Please upload a JPEG/PNG/WebP photo or a PDF.' })
  }

  const refDate = today && /^\d{4}-\d{2}-\d{2}$/.test(today) ? today : new Date().toISOString().slice(0, 10)

  const prompt = `You are reading a volleyball team's schedule from an uploaded ${isPdf ? 'PDF' : 'photo'}. Extract every dated event you can find (tournaments, scrimmages, open gyms, anything with a date) into a JSON array.

Today's date is ${refDate} — use it to resolve any date missing a year, or written ambiguously.

For each event return an object with:
- "date": start date, "YYYY-MM-DD"
- "endDate": end date "YYYY-MM-DD" — ONLY include this key for events that clearly span multiple days; omit it entirely for single-day events
- "title": the event/tournament name, exactly as written
- "location": venue or city, only if shown — omit if not shown
- "time": "HH:MM" 24-hour, only if a specific start time is shown — omit if not shown

Return ONLY a JSON array, no markdown fences, no explanation. If a date is illegible or the row doesn't make sense, skip that row rather than guessing. If you find nothing, return [].`

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          isPdf
            ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data } }
            : { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data } },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const text = message.content[0]?.type === 'text' ? message.content[0].text : '[]'
    const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '')
    const raw: unknown = JSON.parse(cleaned)
    if (!Array.isArray(raw)) throw new Error('Unexpected response format')

    const events: ParsedEvent[] = raw
      .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
      .map(e => {
        const date = String(e.date ?? '')
        let endDate = e.endDate ? String(e.endDate) : undefined
        if (endDate) {
          const span = (new Date(endDate).getTime() - new Date(date).getTime()) / 86400000
          if (!(span > 0 && span <= MAX_EVENT_SPAN_DAYS)) endDate = undefined
        }
        return {
          date,
          endDate,
          title: String(e.title ?? '').trim(),
          location: e.location ? String(e.location).trim() : undefined,
          time: e.time ? String(e.time).trim() : undefined,
        }
      })
      .filter(e => /^\d{4}-\d{2}-\d{2}$/.test(e.date) && e.title.length > 0)

    res.status(200).json({ events })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: e instanceof Error ? e.message : 'Could not read that schedule.' })
  }
}
