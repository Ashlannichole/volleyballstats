import { useState } from 'react'
import type { Match } from '../types'

interface Props { matches: Match[] }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function Calendar({ matches }: Props) {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  // Build date → matches index
  const matchByDate = new Map<string, Match[]>()
  for (const m of matches) {
    const list = matchByDate.get(m.date) ?? []
    list.push(m)
    matchByDate.set(m.date, list)
  }

  // Calendar grid
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to full weeks
  while (cells.length % 7 !== 0) cells.push(null)

  function dateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  const selectedMatches = selected ? (matchByDate.get(selected) ?? []) : []

  // Months that have matches (for quick jump dots at bottom)
  const matchMonths = new Set(matches.map(m => m.date.slice(0,7)))

  return (
    <div className="flex flex-col gap-0 pb-10">
      {/* Month nav */}
      <div className="flex items-center justify-between px-4 py-4">
        <button onClick={prevMonth} className="tap-btn w-9 h-9 rounded-xl bg-navy-700 border border-white/10 text-white text-lg flex items-center justify-center">‹</button>
        <div className="text-center">
          <p className="text-white font-bold text-base">{MONTHS[month]}</p>
          <p className="text-gray-500 text-xs">{year}</p>
        </div>
        <button onClick={nextMonth} className="tap-btn w-9 h-9 rounded-xl bg-navy-700 border border-white/10 text-white text-lg flex items-center justify-center">›</button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-3">
        {DAYS.map(d => (
          <div key={d} className="text-center text-gray-600 text-[10px] font-bold py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 px-3 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />
          const ds = dateStr(day)
          const dayMatches = matchByDate.get(ds) ?? []
          const isToday    = ds === todayStr
          const isSelected = ds === selected
          const hasMatch   = dayMatches.length > 0
          const won = dayMatches.filter(m => {
            const [ms, os] = [m.ourSets ?? 0, m.opponentSets ?? 0]
            return ms > os
          }).length
          const lost = dayMatches.length - won

          return (
            <button key={i}
              onClick={() => setSelected(isSelected ? null : ds)}
              className={`tap-btn flex flex-col items-center py-1.5 rounded-xl transition-all ${
                isSelected ? 'bg-vr-700/60 border border-vr-500/60' :
                isToday    ? 'bg-navy-700/60 border border-white/20' :
                             'border border-transparent'
              }`}>
              <span className={`text-sm font-bold ${
                isSelected ? 'text-white' :
                isToday    ? 'text-white' :
                hasMatch   ? 'text-white' :
                             'text-gray-500'
              }`}>{day}</span>
              {hasMatch && (
                <div className="flex gap-0.5 mt-0.5">
                  {won  > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-400" />}
                  {lost > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-400"   />}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center mt-3 mb-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          <span className="text-gray-500 text-[10px]">Win</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-400" />
          <span className="text-gray-500 text-[10px]">Loss</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full border border-white/20 bg-navy-700" />
          <span className="text-gray-500 text-[10px]">Today</span>
        </div>
      </div>

      <div className="mx-3 my-2 border-t border-white/8" />

      {/* Selected day detail */}
      {selected ? (
        <div className="px-4 flex flex-col gap-3">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">
            {new Date(selected + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          {selectedMatches.length === 0 ? (
            <p className="text-gray-600 text-sm">No matches on this date.</p>
          ) : selectedMatches.map(m => {
            const ourSets = m.ourSets ?? 0
            const oppSets = m.opponentSets ?? 0
            const won = ourSets > oppSets
            return (
              <div key={m.id} className="bg-navy-800 border border-white/10 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-white font-bold text-sm">vs {m.opponent}</p>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                    won ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'
                  }`}>{won ? 'WIN' : 'LOSS'}</span>
                </div>
                <p className="text-gray-400 text-2xl font-black tracking-wide">
                  {ourSets} – {oppSets}
                </p>
                {m.location && <p className="text-gray-600 text-xs mt-1">📍 {m.location}</p>}
                {/* Per-set scores */}
                {m.sets && m.sets.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {m.sets.map((s, i) => (
                      <div key={i} className="bg-navy-700 rounded-lg px-2 py-1 text-center">
                        <p className="text-gray-500 text-[9px]">Set {i+1}</p>
                        <p className="text-white text-xs font-bold">{s.us}–{s.them}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* Month summary */
        <div className="px-4 flex flex-col gap-3">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">{MONTHS[month]} {year}</p>
          {(() => {
            const monthMatches = matches.filter(m => m.date.startsWith(`${year}-${String(month+1).padStart(2,'0')}`))
            if (monthMatches.length === 0) return (
              <p className="text-gray-600 text-sm">No matches this month.</p>
            )
            const wins   = monthMatches.filter(m => (m.ourSets ?? 0) > (m.opponentSets ?? 0)).length
            const losses = monthMatches.length - wins
            return (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Matches', value: monthMatches.length, color: 'text-white' },
                    { label: 'Wins',    value: wins,                 color: 'text-green-400' },
                    { label: 'Losses',  value: losses,               color: 'text-red-400' },
                  ].map(s => (
                    <div key={s.label} className="bg-navy-800 border border-white/10 rounded-xl p-2.5 text-center">
                      <p className={`font-black text-lg ${s.color}`}>{s.value}</p>
                      <p className="text-gray-600 text-[9px]">{s.label}</p>
                    </div>
                  ))}
                </div>
                {monthMatches.sort((a,b) => a.date.localeCompare(b.date)).map(m => {
                  const won = (m.ourSets ?? 0) > (m.opponentSets ?? 0)
                  return (
                    <button key={m.id}
                      onClick={() => setSelected(m.date)}
                      className="tap-btn bg-navy-800 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3 text-left">
                      <div className={`w-1.5 self-stretch rounded-full ${won ? 'bg-green-400' : 'bg-red-400'}`} />
                      <div className="flex-1">
                        <p className="text-white text-sm font-bold">vs {m.opponent}</p>
                        <p className="text-gray-500 text-xs">{new Date(m.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                      <p className="text-white font-black text-sm">{m.ourSets ?? 0}–{m.opponentSets ?? 0}</p>
                    </button>
                  )
                })}
              </>
            )
          })()}
        </div>
      )}

      {/* Quick-jump: months with matches */}
      {matchMonths.size > 0 && (
        <div className="px-4 mt-4">
          <p className="text-gray-600 text-[10px] uppercase tracking-wide mb-2">Months with matches</p>
          <div className="flex flex-wrap gap-2">
            {[...matchMonths].sort().map(ym => {
              const [y, m] = ym.split('-').map(Number)
              const isActive = y === year && m - 1 === month
              return (
                <button key={ym}
                  onClick={() => { setYear(y); setMonth(m - 1); setSelected(null) }}
                  className={`tap-btn text-xs font-bold px-2.5 py-1 rounded-full border transition-all ${
                    isActive ? 'bg-vr-700 border-vr-500 text-white' : 'border-white/10 text-gray-500'
                  }`}>
                  {MONTHS[m-1].slice(0,3)} {y}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
