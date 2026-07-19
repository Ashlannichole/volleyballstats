import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType = 'tournament' | 'scrimmage' | 'open_gym' | 'practice' | 'match' | 'other'

interface CalEvent {
  id: string
  date: string       // YYYY-MM-DD
  type: EventType
  title: string
  time?: string      // HH:MM (optional)
  location?: string
  notes?: string
}

// ── Storage ───────────────────────────────────────────────────────────────────

const KEY = 'vb_calendar'
function load(): CalEvent[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
function save(evs: CalEvent[]) { localStorage.setItem(KEY, JSON.stringify(evs)) }

// ── Config ────────────────────────────────────────────────────────────────────

const EVENT_TYPES: { id: EventType; label: string; icon: string; color: string; bg: string }[] = [
  { id: 'tournament', label: 'Tournament',  icon: '🏆', color: 'text-yellow-400', bg: 'bg-yellow-900/30 border-yellow-600/40' },
  { id: 'match',      label: 'Match',       icon: '🏐', color: 'text-green-400',  bg: 'bg-green-900/30 border-green-600/40' },
  { id: 'scrimmage',  label: 'Scrimmage',   icon: '🤝', color: 'text-blue-400',   bg: 'bg-blue-900/30 border-blue-600/40' },
  { id: 'open_gym',   label: 'Open Gym',    icon: '🏋️', color: 'text-purple-400', bg: 'bg-purple-900/30 border-purple-600/40' },
  { id: 'practice',   label: 'Practice',    icon: '🎽', color: 'text-pb-400',     bg: 'bg-pb-900/30 border-pb-600/40' },
  { id: 'other',      label: 'Other',       icon: '📌', color: 'text-gray-400',   bg: 'bg-gray-800/50 border-gray-600/40' },
]

function typeInfo(t: EventType) { return EVENT_TYPES.find(e => e.id === t)! }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ── Blank form ────────────────────────────────────────────────────────────────

function blank(date: string): Omit<CalEvent, 'id'> {
  return { date, type: 'tournament', title: '', time: '', location: '', notes: '' }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Calendar({ onSync }: { onSync?: () => void }) {
  const [events,   setEvents]   = useState<CalEvent[]>(load)
  const [year,     setYear]     = useState(() => new Date().getFullYear())
  const [month,    setMonth]    = useState(() => new Date().getMonth())
  const [selected, setSelected] = useState<string | null>(null)
  const [form,     setForm]     = useState<Omit<CalEvent, 'id'> | null>(null)
  const [editing,  setEditing]  = useState<CalEvent | null>(null)

  const todayStr = (() => {
    const t = new Date()
    return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`
  })()

  function upsertEvent(ev: CalEvent) {
    const next = events.some(e => e.id === ev.id)
      ? events.map(e => e.id === ev.id ? ev : e)
      : [...events, ev]
    setEvents(next); save(next); onSync?.()
  }

  function deleteEvent(id: string) {
    const next = events.filter(e => e.id !== id)
    setEvents(next); save(next); onSync?.()
  }

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1)
    setSelected(null)
  }

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  function dateStr(day: number) {
    return `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  const eventsByDate = new Map<string, CalEvent[]>()
  for (const ev of events) {
    const list = eventsByDate.get(ev.date) ?? []
    list.push(ev); eventsByDate.set(ev.date, list)
  }

  const selectedEvents = selected ? (eventsByDate.get(selected) ?? []) : []

  // ── Add / Edit form ──────────────────────────────────────────────────────────

  if (form || editing) {
    const data   = editing ?? form!
    const isEdit = !!editing

    function setField<K extends keyof typeof data>(k: K, v: typeof data[K]) {
      if (editing) setEditing(e => e ? { ...e, [k]: v } : e)
      else         setForm(f => f ? { ...f, [k]: v } : f)
    }

    function submit() {
      if (!data.title.trim()) return
      if (isEdit && editing) {
        upsertEvent(editing)
        setEditing(null)
      } else {
        upsertEvent({ ...data, id: Date.now().toString() } as CalEvent)
        setForm(null)
        setSelected(data.date)
      }
    }

    function cancel() { setForm(null); setEditing(null) }

    return (
      <div className="flex flex-col h-full">
        <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
          <button onClick={cancel} className="tap-btn text-gray-400 text-sm">Cancel</button>
          <p className="flex-1 text-center text-white font-bold text-sm">
            {isEdit ? 'Edit Event' : 'New Event'}
          </p>
          <button onClick={submit} disabled={!data.title.trim()}
            className="tap-btn text-vr-300 font-bold text-sm disabled:opacity-40">
            {isEdit ? 'Save' : 'Add'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {/* Date */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Date</label>
            <input type="date" value={data.date}
              onChange={e => setField('date', e.target.value)}
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
          </div>

          {/* Type */}
          <div className="flex flex-col gap-2">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Type</label>
            <div className="grid grid-cols-2 gap-2">
              {EVENT_TYPES.map(t => (
                <button key={t.id} onClick={() => setField('type', t.id)}
                  className={`tap-btn border rounded-xl px-3 py-2.5 flex items-center gap-2 transition-all ${
                    data.type === t.id ? t.bg + ' border' : 'bg-navy-700 border-white/10'
                  }`}>
                  <span className="text-lg">{t.icon}</span>
                  <span className={`text-sm font-bold ${data.type === t.id ? t.color : 'text-gray-400'}`}>
                    {t.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Title *</label>
            <input value={data.title} onChange={e => setField('title', e.target.value)}
              placeholder={`e.g. ${data.type === 'tournament' ? 'Spring Invitational' : data.type === 'scrimmage' ? 'vs Lincoln High' : data.type === 'open_gym' ? 'Saturday Open Gym' : 'Practice'}`}
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
          </div>

          {/* Time */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Time (optional)</label>
            <input type="time" value={data.time ?? ''}
              onChange={e => setField('time', e.target.value)}
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
          </div>

          {/* Location */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Location (optional)</label>
            <input value={data.location ?? ''} onChange={e => setField('location', e.target.value)}
              placeholder="Gym name, address…"
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Notes (optional)</label>
            <textarea value={data.notes ?? ''} onChange={e => setField('notes', e.target.value)}
              placeholder="Bring gear, carpool info…" rows={3}
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none resize-none" />
          </div>
        </div>
      </div>
    )
  }

  // ── Selected day detail ──────────────────────────────────────────────────────

  if (selected) {
    const label = new Date(selected + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric',
    })
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

    return (
      <div className="flex flex-col h-full">
        <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
          <button onClick={() => setSelected(null)} className="tap-btn text-gray-400 text-sm">← Calendar</button>
          <p className="flex-1 text-center text-white font-bold text-sm truncate px-2">{label}</p>
          <button onClick={() => setForm(blank(selected))}
            className="tap-btn text-vr-300 font-bold text-sm">+ Add</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-10">
          {selectedEvents.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">📅</p>
              <p className="text-gray-500 text-sm">Nothing scheduled yet.</p>
              <button onClick={() => setForm(blank(selected))}
                className="tap-btn mt-4 bg-vr-700 border border-vr-500 rounded-2xl px-6 py-2.5 text-white text-sm font-bold">
                + Add Event
              </button>
            </div>
          ) : selectedEvents
              .sort((a,b) => (a.time ?? '').localeCompare(b.time ?? ''))
              .map(ev => {
                const ti = typeInfo(ev.type)
                return (
                  <div key={ev.id} className={`bg-navy-800 border rounded-2xl p-4 ${ti.bg}`}>
                    <div className="flex items-start gap-3">
                      <span className="text-2xl mt-0.5">{ti.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] font-black uppercase tracking-wide ${ti.color}`}>
                            {ti.label}
                          </span>
                          {ev.time && (
                            <span className="text-gray-500 text-[10px]">
                              {new Date(`2000-01-01T${ev.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-white font-bold text-base mt-0.5">{ev.title}</p>
                        {ev.location && <p className="text-gray-500 text-xs mt-1">📍 {ev.location}</p>}
                        {ev.notes && <p className="text-gray-600 text-xs mt-1 italic">{ev.notes}</p>}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button onClick={() => setEditing(ev)}
                          className="tap-btn text-gray-600 text-xs px-2 py-1 rounded-lg border border-white/10">
                          Edit
                        </button>
                        {confirmDelete === ev.id ? (
                          <button onClick={() => { deleteEvent(ev.id); setConfirmDelete(null) }}
                            className="tap-btn text-red-500 text-xs px-2 py-1 rounded-lg border border-red-800/50">
                            Delete?
                          </button>
                        ) : (
                          <button onClick={() => setConfirmDelete(ev.id)}
                            className="tap-btn text-gray-700 text-xs px-2 py-1 rounded-lg border border-white/5">
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>
    )
  }

  // ── Calendar grid ────────────────────────────────────────────────────────────

  // Upcoming events (next 30 days) for the agenda strip
  const upcoming = events
    .filter(e => e.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? '').localeCompare(b.time ?? ''))
    .slice(0, 5)

  return (
    <div className="flex flex-col gap-0 pb-10">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={prevMonth}
          className="tap-btn w-9 h-9 rounded-xl bg-navy-700 border border-white/10 text-white text-lg flex items-center justify-center">‹</button>
        <div className="text-center">
          <p className="text-white font-bold text-base">{MONTHS[month]}</p>
          <p className="text-gray-500 text-xs">{year}</p>
        </div>
        <button onClick={nextMonth}
          className="tap-btn w-9 h-9 rounded-xl bg-navy-700 border border-white/10 text-white text-lg flex items-center justify-center">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-3">
        {DAYS.map(d => (
          <div key={d} className="text-center text-gray-600 text-[10px] font-bold py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 px-3 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds         = dateStr(day)
          const dayEvents  = eventsByDate.get(ds) ?? []
          const isToday    = ds === todayStr
          const isPast     = ds < todayStr

          return (
            <button key={i}
              onClick={() => setSelected(ds)}
              className={`tap-btn flex flex-col items-center py-1.5 px-1 rounded-xl transition-all min-h-[52px] ${
                isToday ? 'bg-vr-700/30 border border-vr-500/40' : 'border border-transparent'
              } ${isPast && !isToday ? 'opacity-50' : ''}`}>
              <span className={`text-sm font-bold ${isToday ? 'text-vr-300' : dayEvents.length ? 'text-white' : 'text-gray-500'}`}>
                {day}
              </span>
              {/* Event dots — up to 3 */}
              {dayEvents.length > 0 && (
                <div className="flex flex-wrap gap-0.5 justify-center mt-0.5" style={{ maxWidth: 28 }}>
                  {dayEvents.slice(0, 3).map((ev, j) => (
                    <span key={j} className={`w-1.5 h-1.5 rounded-full ${typeInfo(ev.type).color.replace('text-', 'bg-')}`} />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className="text-gray-600 text-[8px] leading-none">+{dayEvents.length - 3}</span>
                  )}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-center mt-3 px-4">
        {EVENT_TYPES.map(t => (
          <div key={t.id} className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${t.color.replace('text-', 'bg-')}`} />
            <span className="text-gray-600 text-[10px]">{t.label}</span>
          </div>
        ))}
      </div>

      <div className="mx-3 my-3 border-t border-white/8" />

      {/* Add event CTA */}
      <div className="px-4 mb-3">
        <button onClick={() => setForm(blank(todayStr))}
          className="tap-btn w-full bg-navy-800 border border-dashed border-white/20 rounded-2xl py-3 text-gray-500 text-sm font-bold flex items-center justify-center gap-2">
          <span className="text-lg">+</span> Add Event
        </button>
      </div>

      {/* Upcoming agenda */}
      <div className="px-4 flex flex-col gap-2">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Upcoming</p>
        {upcoming.length === 0 ? (
          <p className="text-gray-700 text-sm">No upcoming events.</p>
        ) : upcoming.map(ev => {
          const ti = typeInfo(ev.type)
          const evDate = new Date(ev.date + 'T12:00:00')
          const isToday2 = ev.date === todayStr
          const daysAway = Math.round((evDate.getTime() - new Date(todayStr + 'T12:00:00').getTime()) / 86400000)
          return (
            <button key={ev.id}
              onClick={() => setSelected(ev.date)}
              className="tap-btn bg-navy-800 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 text-left">
              <span className="text-xl shrink-0">{ti.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-bold truncate">{ev.title}</p>
                <p className="text-gray-500 text-xs">
                  {evDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  {ev.time && ` · ${new Date(`2000-01-01T${ev.time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`}
                  {ev.location && ` · ${ev.location}`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-xs font-bold ${ti.color}`}>
                  {isToday2 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `${daysAway}d`}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
