import { useRef, useState } from 'react'
import type { CalEvent } from './Calendar'

interface ParsedEvent {
  date: string
  endDate?: string
  title: string
  location?: string
  time?: string
}

interface ReviewRow extends ParsedEvent {
  selected: boolean
}

interface Props {
  onImport: (events: CalEvent[]) => void
  onCancel: () => void
}

type Status = 'idle' | 'busy' | 'review' | 'error'

const MAX_FILE_BYTES = 10 * 1024 * 1024 // raw upload cap, before any downscaling
const MAX_IMAGE_DIM = 1800              // downscale a photo's long edge to this many px

function todayStr() {
  const t = new Date()
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
}

function formatRange(date: string, endDate?: string) {
  const start = new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (!endDate || endDate <= date) return start
  const end = new Date(endDate + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${start} – ${end}`
}

// Photos from a phone camera can be several MB — downscale before sending so the
// upload is fast and stays under the API's request-size limit. PDFs pass through as-is.
function fileToPayload(file: File): Promise<{ mediaType: string; data: string }> {
  return new Promise((resolve, reject) => {
    if (file.type === 'application/pdf') {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Could not read that file.'))
      reader.onload = () => resolve({ mediaType: 'application/pdf', data: (reader.result as string).split(',')[1] ?? '' })
      reader.readAsDataURL(file)
      return
    }

    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read that image.'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not read that image.'))
      img.onload = () => {
        const scale = Math.min(1, MAX_IMAGE_DIM / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { reject(new Error('Could not process that image.')); return }
        ctx.drawImage(img, 0, 0, w, h)
        resolve({ mediaType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', 0.85).split(',')[1] ?? '' })
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

export default function ImportSchedule({ onImport, onCancel }: Props) {
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [rows, setRows] = useState<ReviewRow[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    if (file.size > MAX_FILE_BYTES) {
      setStatus('error'); setError('That file is too large (max 10MB). Try a smaller photo or file.')
      return
    }
    setStatus('busy'); setError('')
    try {
      const { mediaType, data } = await fileToPayload(file)
      const res = await fetch('/api/parse-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mediaType, data, today: todayStr() }),
      })
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)

      const json = await res.json() as { events?: ParsedEvent[]; error?: string }
      if (json.error) throw new Error(json.error)

      const events = json.events ?? []
      if (events.length === 0) {
        setStatus('error')
        setError("Couldn't find any dated events in that file. Try a clearer photo, or add events manually.")
        return
      }
      setRows(events.map(e => ({ ...e, selected: true })))
      setStatus('review')
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : 'Something went wrong reading that file.')
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) handleFile(file)
  }

  function toggle(i: number) {
    setRows(rs => rs.map((r, j) => j === i ? { ...r, selected: !r.selected } : r))
  }

  const selectedCount = rows.filter(r => r.selected).length

  function confirm() {
    const events: CalEvent[] = rows
      .filter(r => r.selected)
      .map((r, i) => ({
        id: `${Date.now()}-${i}`,
        date: r.date,
        endDate: r.endDate && r.endDate > r.date ? r.endDate : undefined,
        type: 'tournament',
        title: r.title,
        location: r.location,
        time: r.time,
      }))
    onImport(events)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
        <button onClick={onCancel} className="tap-btn text-gray-400 text-sm">Cancel</button>
        <p className="flex-1 text-center text-white font-bold text-sm">Import Schedule</p>
        <div className="w-14" />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {status === 'idle' && (
          <div className="flex flex-col items-center text-center gap-4 mt-6">
            <div className="text-4xl">📅</div>
            <div>
              <p className="text-white font-bold text-base mb-1">Scan a tournament schedule</p>
              <p className="text-gray-500 text-sm">
                Take a photo of a printed or on-screen schedule, or upload a photo or PDF. We'll find the dates and tournament names and let you review them before anything's added to your calendar.
              </p>
            </div>
            <input ref={inputRef} type="file" accept="image/*,application/pdf" capture="environment"
              className="hidden" onChange={onPick} />
            <button onClick={() => inputRef.current?.click()}
              className="tap-btn w-full bg-vr-700 border border-vr-500 rounded-2xl py-3.5 text-white font-bold text-sm">
              📤 Choose Photo or File
            </button>
          </div>
        )}

        {status === 'busy' && (
          <div className="flex flex-col items-center text-center gap-3 mt-16">
            <div className="w-8 h-8 border-2 border-vr-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Reading the schedule…</p>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center text-center gap-4 mt-10">
            <div className="text-3xl">⚠️</div>
            <p className="text-red-400 text-sm">{error}</p>
            <button onClick={() => setStatus('idle')}
              className="tap-btn bg-navy-700 border border-white/10 rounded-2xl px-6 py-2.5 text-white text-sm font-bold">
              Try Again
            </button>
          </div>
        )}

        {status === 'review' && (
          <div className="flex flex-col gap-3 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-gray-400 text-xs">{rows.length} event{rows.length === 1 ? '' : 's'} found — review before adding</p>
              <button onClick={() => setRows(rs => rs.map(r => ({ ...r, selected: selectedCount !== rs.length })))}
                className="tap-btn text-vr-300 text-xs font-bold">
                {selectedCount === rows.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            {rows.map((r, i) => (
              <button key={i} onClick={() => toggle(i)}
                className={`tap-btn text-left border rounded-2xl p-3 flex items-start gap-3 transition-all ${
                  r.selected ? 'bg-navy-800 border-vr-500/40' : 'bg-navy-800/40 border-white/5 opacity-50'
                }`}>
                <div className={`w-5 h-5 rounded-md border shrink-0 mt-0.5 flex items-center justify-center ${
                  r.selected ? 'bg-vr-600 border-vr-400' : 'border-white/20'
                }`}>
                  {r.selected && <span className="text-white text-xs">✓</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-bold text-sm truncate">{r.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    {formatRange(r.date, r.endDate)}
                    {r.time && ` · ${new Date(`2000-01-01T${r.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                    {r.location && ` · ${r.location}`}
                  </p>
                </div>
              </button>
            ))}

            <div className="flex gap-2 mt-2">
              <button onClick={() => setStatus('idle')}
                className="tap-btn flex-1 bg-navy-700 border border-white/10 rounded-2xl py-3 text-gray-400 text-sm font-bold">
                Try Different File
              </button>
              <button onClick={confirm} disabled={selectedCount === 0}
                className="tap-btn flex-[2] bg-vr-700 border border-vr-500 rounded-2xl py-3 text-white text-sm font-bold disabled:opacity-40">
                Add {selectedCount || ''} Event{selectedCount === 1 ? '' : 's'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
