import { useState, useRef } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScoutPlayer { number: number; name?: string }
type HitOutcome = 'kill' | 'error' | 'dug' | 'blocked'
type HitType    = 'attack' | 'serve'

interface ScoutHit {
  id: string
  x: number          // 0–1 normalized within court
  y: number          // 0–1 normalized within court
  playerNumber: number
  outcome: HitOutcome
  type: HitType
  set: number
}

interface ScoutSession {
  id: string
  date: string
  opponent: string
  tournament: string
  players: ScoutPlayer[]
  hits: ScoutHit[]
  notes: string
}

// ── Storage ───────────────────────────────────────────────────────────────────

const KEY = 'vb_scouting'
function loadSessions(): ScoutSession[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}
function persist(sessions: ScoutSession[]) {
  localStorage.setItem(KEY, JSON.stringify(sessions))
}

// ── Court SVG constants ───────────────────────────────────────────────────────

const CX = 30, CY = 24, CW = 240, CH = 480
const NET_Y   = CY + CH / 2                   // 264
const ATK_OPP = NET_Y - CH / 6                // 184  opponent attack line
const ATK_OWN = NET_Y + CH / 6                // 344  our attack line
const ZW      = CW / 3                        // 80   column width

// ── Palette ───────────────────────────────────────────────────────────────────

const OC: Record<HitOutcome, string> = {
  kill: '#22c55e', error: '#ef4444', dug: '#3b82f6', blocked: '#a855f7',
}
const OL: Record<HitOutcome, string> = {
  kill: 'Kill', error: 'Error', dug: 'Dug', blocked: 'Blocked',
}
const OUTCOMES: HitOutcome[] = ['kill', 'error', 'dug', 'blocked']

// ── Main component ────────────────────────────────────────────────────────────

interface Props { isPro: boolean; onUpgrade: () => void }
type View = 'home' | 'chart' | 'review'

export default function Scouting({ isPro, onUpgrade }: Props) {
  const [sessions, setSessions] = useState<ScoutSession[]>(loadSessions)
  const [view,     setView]     = useState<View>('home')
  const [active,   setActive]   = useState<ScoutSession | null>(null)
  const [reviewing, setReviewing] = useState<ScoutSession | null>(null)

  // New session form
  const [showForm,  setShowForm]  = useState(false)
  const [oppName,   setOppName]   = useState('')
  const [tourney,   setTourney]   = useState('')

  function upsert(s: ScoutSession) {
    const next = sessions.some(x => x.id === s.id)
      ? sessions.map(x => x.id === s.id ? s : x)
      : [...sessions, s]
    setSessions(next)
    persist(next)
  }

  function remove(id: string) {
    const next = sessions.filter(s => s.id !== id)
    setSessions(next)
    persist(next)
  }

  function startSession() {
    if (!oppName.trim()) return
    const s: ScoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      opponent: oppName.trim(),
      tournament: tourney.trim(),
      players: [], hits: [], notes: '',
    }
    upsert(s)
    setActive(s)
    setOppName(''); setTourney(''); setShowForm(false)
    setView('chart')
  }

  if (!isPro) return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-4 text-center">
      <span className="text-5xl">🔍</span>
      <h2 className="text-white font-bold text-xl">Opponent Scouting</h2>
      <p className="text-gray-500 text-sm">Chart opponent hits, build heat maps, and track tendencies match by match.</p>
      <button onClick={onUpgrade} className="tap-btn bg-vr-700 border border-vr-500 rounded-2xl px-6 py-3 text-white font-bold">⚡ Upgrade to Pro</button>
    </div>
  )

  if (view === 'chart' && active) return (
    <ChartView
      session={active}
      onUpdate={s => { setActive(s); upsert(s) }}
      onDone={() => { setView('home'); setActive(null) }}
    />
  )

  if (view === 'review' && reviewing) return (
    <ReviewView
      session={reviewing}
      onBack={() => { setView('home'); setReviewing(null) }}
      onResume={() => { setActive(reviewing); setView('chart'); setReviewing(null) }}
      onDelete={() => { remove(reviewing.id); setView('home'); setReviewing(null) }}
    />
  )

  // ── Home: opponent list ───────────────────────────────────────────────────

  const opponents = [...new Set(sessions.map(s => s.opponent))]

  return (
    <div className="p-4 flex flex-col gap-4 pb-10">
      <div className="text-center mt-4 mb-1">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Scouting</p>
        <h2 className="text-2xl font-bold text-white">Opponents</h2>
      </div>

      {showForm ? (
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-white font-bold text-sm">New Scouting Session</p>
          <input value={oppName} onChange={e => setOppName(e.target.value)}
            placeholder="Opponent name *"
            className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
          <input value={tourney} onChange={e => setTourney(e.target.value)}
            placeholder="Tournament (optional)"
            className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="tap-btn flex-1 border border-white/10 rounded-xl py-2.5 text-gray-400 text-sm font-bold">Cancel</button>
            <button onClick={startSession} disabled={!oppName.trim()}
              className="tap-btn flex-1 bg-vr-700 border border-vr-500 rounded-xl py-2.5 text-white text-sm font-bold disabled:opacity-40">Start Scouting</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="tap-btn w-full bg-vr-700 border border-vr-500 rounded-2xl py-3.5 text-white font-bold text-sm">
          + New Scouting Session
        </button>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🔍</p>
          <p className="text-gray-500 text-sm">No scouting sessions yet.</p>
          <p className="text-gray-600 text-xs mt-1">Start one before your next match!</p>
        </div>
      ) : opponents.map(opp => {
        const list = sessions.filter(s => s.opponent === opp).sort((a, b) => b.date.localeCompare(a.date))
        const total = list.reduce((n, s) => n + s.hits.length, 0)
        return (
          <div key={opp} className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div>
                <p className="text-white font-bold text-sm">{opp}</p>
                <p className="text-gray-500 text-xs">{list.length} session{list.length !== 1 ? 's' : ''} · {total} hits charted</p>
              </div>
              <button onClick={() => { setOppName(opp); setTourney(''); setShowForm(true) }}
                className="tap-btn text-xs font-bold px-3 py-1.5 bg-navy-700 border border-white/10 rounded-xl text-gray-300">
                + Scout Again
              </button>
            </div>
            {list.map(s => (
              <button key={s.id} onClick={() => { setReviewing(s); setView('review') }}
                className="tap-btn w-full px-4 py-3 flex items-center justify-between border-b border-white/5 last:border-0">
                <div className="text-left">
                  <p className="text-gray-300 text-sm font-medium">{s.date}</p>
                  {s.tournament && <p className="text-gray-600 text-xs">{s.tournament}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {OUTCOMES.map(o => {
                    const n = s.hits.filter(h => h.outcome === o).length
                    if (!n) return null
                    return (
                      <span key={o} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: OC[o] + '33', color: OC[o] }}>
                        {n}{o[0].toUpperCase()}
                      </span>
                    )
                  })}
                  <span className="text-gray-600 text-xs ml-1">›</span>
                </div>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}

// ── Chart View ────────────────────────────────────────────────────────────────

function ChartView({ session, onUpdate, onDone }: {
  session: ScoutSession
  onUpdate: (s: ScoutSession) => void
  onDone: () => void
}) {
  const svgRef        = useRef<SVGSVGElement>(null)
  const [pendingXY,   setPendingXY]   = useState<{ x: number; y: number } | null>(null)
  const [pendingNum,  setPendingNum]  = useState<number | null>(null)
  const [activeSet,   setActiveSet]   = useState(1)
  const [hitType,     setHitType]     = useState<HitType>('attack')
  const [addingNum,   setAddingNum]   = useState('')
  const [showAdd,     setShowAdd]     = useState(false)

  function tapCourt(e: React.MouseEvent<SVGRectElement>) {
    if (pendingXY) return
    const svg = svgRef.current; if (!svg) return
    const pt  = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
    const x = (p.x - CX) / CW, y = (p.y - CY) / CH
    if (x < 0 || x > 1 || y < 0 || y > 1) return
    setPendingXY({ x, y }); setPendingNum(null)
  }

  function logHit(outcome: HitOutcome) {
    if (!pendingXY || pendingNum === null) return
    const hit: ScoutHit = {
      id: Date.now().toString(),
      x: pendingXY.x, y: pendingXY.y,
      playerNumber: pendingNum,
      outcome, type: hitType, set: activeSet,
    }
    onUpdate({ ...session, hits: [...session.hits, hit] })
    setPendingXY(null); setPendingNum(null)
  }

  function addPlayer() {
    const n = parseInt(addingNum)
    if (isNaN(n) || n < 0 || n > 99) return
    if (session.players.some(p => p.number === n)) { setAddingNum(''); setShowAdd(false); return }
    onUpdate({ ...session, players: [...session.players, { number: n }] })
    setAddingNum(''); setShowAdd(false)
  }

  const setHits = session.hits.filter(h => h.set === activeSet)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
        <button onClick={onDone} className="tap-btn text-vr-300 text-sm font-bold">✓ Done</button>
        <div className="flex-1 text-center">
          <p className="text-white font-bold text-sm">{session.opponent}</p>
          <p className="text-gray-500 text-[11px]">{session.hits.length} hits total · Set {activeSet}</p>
        </div>
        <button onClick={() => {
          if (session.hits.length === 0) return
          onUpdate({ ...session, hits: session.hits.slice(0, -1) })
        }} disabled={session.hits.length === 0}
          className="tap-btn text-gray-500 text-sm disabled:opacity-30">↩</button>
      </div>

      {/* Set + type selectors */}
      <div className="flex items-center gap-1 px-3 py-2 bg-navy-900 shrink-0">
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={() => setActiveSet(s)}
            className={`tap-btn flex-1 py-1.5 rounded-lg text-xs font-bold ${activeSet === s ? 'bg-vr-700 text-white' : 'text-gray-600'}`}>
            S{s}
          </button>
        ))}
        <div className="w-px bg-white/10 mx-1 self-stretch" />
        {(['attack','serve'] as HitType[]).map(t => (
          <button key={t} onClick={() => setHitType(t)}
            className={`tap-btn px-2.5 py-1.5 rounded-lg text-xs font-bold ${hitType === t ? 'bg-navy-700 text-white border border-white/20' : 'text-gray-600'}`}>
            {t === 'attack' ? 'ATK' : 'SRV'}
          </button>
        ))}
      </div>

      {/* Court + bottom sheet */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* SVG Court */}
        <div className="flex-1 flex items-center justify-center p-2 min-h-0">
          <svg ref={svgRef} viewBox="0 0 300 528"
            className="h-full w-auto" style={{ maxWidth: '100%' }}>
            {/* Court bg */}
            <rect x={CX} y={CY} width={CW} height={CH} fill="#0f1929" rx={3} />
            {/* Opponent half highlight */}
            <rect x={CX} y={CY} width={CW} height={CH/2} fill="#fff" fillOpacity="0.015" />
            {/* Zone columns */}
            {[1,2].map(i => (
              <line key={i} x1={CX+ZW*i} y1={CY} x2={CX+ZW*i} y2={CY+CH}
                stroke="#fff" strokeOpacity="0.08" strokeWidth="1" />
            ))}
            {/* Attack lines */}
            <line x1={CX} y1={ATK_OPP} x2={CX+CW} y2={ATK_OPP}
              stroke="#fff" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="5 4" />
            <line x1={CX} y1={ATK_OWN} x2={CX+CW} y2={ATK_OWN}
              stroke="#fff" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="5 4" />
            {/* Court border */}
            <rect x={CX} y={CY} width={CW} height={CH}
              fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
            {/* Net */}
            <rect x={CX} y={NET_Y-3} width={CW} height={6} fill="#fff" fillOpacity="0.15" />
            <line x1={CX} y1={NET_Y} x2={CX+CW} y2={NET_Y}
              stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" />
            {/* Labels */}
            <text x={CX+CW/2} y={CY-8} textAnchor="middle" fill="#fff" fillOpacity="0.3" fontSize="9" fontWeight="bold">OPPONENT</text>
            <text x={CX+CW/2} y={CY+CH+14} textAnchor="middle" fill="#fff" fillOpacity="0.2" fontSize="9">OUR SIDE</text>
            {['L','M','R'].map((l,i) => (
              <text key={l} x={CX+ZW*i+ZW/2} y={CY+10} textAnchor="middle"
                fill="#fff" fillOpacity="0.15" fontSize="8">{l}</text>
            ))}
            {/* Tap target */}
            <rect x={CX} y={CY} width={CW} height={CH}
              fill="transparent" style={{ cursor: 'crosshair' }}
              onClick={tapCourt} />
            {/* Hit dots */}
            {setHits.map(h => {
              const dx = CX + h.x * CW, dy = CY + h.y * CH
              const c  = OC[h.outcome]
              return (
                <g key={h.id}>
                  <circle cx={dx} cy={dy} r={13} fill={c} fillOpacity="0.2" />
                  <circle cx={dx} cy={dy} r={6}  fill={c} fillOpacity="0.9" />
                  <text x={dx} y={dy-11} textAnchor="middle" fill={c} fontSize="8" fontWeight="bold">
                    #{h.playerNumber}
                  </text>
                </g>
              )
            })}
            {/* Pending indicator */}
            {pendingXY && (
              <circle cx={CX+pendingXY.x*CW} cy={CY+pendingXY.y*CH}
                r={13} fill="#fff" fillOpacity="0.25"
                stroke="#fff" strokeWidth="2" strokeOpacity="0.7" />
            )}
          </svg>
        </div>

        {/* Hit logger — slides in when court is tapped */}
        {pendingXY ? (
          <div className="bg-navy-800 border-t border-white/10 p-4 flex flex-col gap-3 shrink-0">
            {/* Player row */}
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2">Who hit it?</p>
              <div className="flex flex-wrap gap-2">
                {session.players.sort((a,b) => a.number - b.number).map(p => (
                  <button key={p.number}
                    onClick={() => setPendingNum(p.number)}
                    className={`tap-btn w-11 h-11 rounded-xl border text-sm font-black transition-all ${
                      pendingNum === p.number
                        ? 'bg-vr-700 border-vr-500 text-white scale-105'
                        : 'bg-navy-700 border-white/20 text-gray-300'
                    }`}>
                    #{p.number}
                  </button>
                ))}
                {showAdd ? (
                  <div className="flex gap-1">
                    <input value={addingNum}
                      onChange={e => setAddingNum(e.target.value.replace(/\D/g,'').slice(0,2))}
                      placeholder="#" autoFocus
                      onKeyDown={e => e.key === 'Enter' && addPlayer()}
                      className="w-11 h-11 bg-navy-700 border border-white/20 rounded-xl text-center text-white text-sm font-black focus:outline-none" />
                    <button onClick={addPlayer}
                      className="tap-btn h-11 px-3 bg-vr-700 rounded-xl text-white text-xs font-bold">Add</button>
                  </div>
                ) : (
                  <button onClick={() => setShowAdd(true)}
                    className="tap-btn w-11 h-11 bg-navy-700/50 border border-dashed border-white/20 rounded-xl text-gray-500 text-xl">+</button>
                )}
              </div>
            </div>
            {/* Outcome row */}
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2">Outcome</p>
              <div className="grid grid-cols-4 gap-2">
                {OUTCOMES.map(o => (
                  <button key={o}
                    onClick={() => pendingNum !== null && logHit(o)}
                    disabled={pendingNum === null}
                    className="tap-btn py-2.5 rounded-xl border text-xs font-bold disabled:opacity-30 transition-all active:scale-95"
                    style={{
                      backgroundColor: OC[o] + '22',
                      borderColor: OC[o] + '66',
                      color: OC[o],
                    }}>
                    {OL[o]}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={() => { setPendingXY(null); setPendingNum(null) }}
              className="tap-btn text-gray-600 text-xs text-center">Cancel</button>
          </div>
        ) : (
          /* Hint bar when no pending hit */
          <div className="bg-navy-900/80 border-t border-white/5 py-2 shrink-0 text-center">
            <p className="text-gray-600 text-xs">Tap the court where the ball landed</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Review View ───────────────────────────────────────────────────────────────

function ReviewView({ session, onBack, onResume, onDelete }: {
  session: ScoutSession
  onBack:   () => void
  onResume: () => void
  onDelete: () => void
}) {
  const [filterPlayers,  setFilterPlayers]  = useState<number[]>([])
  const [filterOutcomes, setFilterOutcomes] = useState<HitOutcome[]>([])
  const [filterSet,      setFilterSet]      = useState<number | 'all'>('all')
  const [filterType,     setFilterType]     = useState<HitType | 'all'>('all')
  const [heatmap,        setHeatmap]        = useState(false)
  const [confirmDelete,  setConfirmDelete]  = useState(false)

  const allPlayers = [...new Set(session.hits.map(h => h.playerNumber))].sort((a,b) => a-b)

  const visible = session.hits.filter(h => {
    if (filterPlayers.length  && !filterPlayers.includes(h.playerNumber)) return false
    if (filterOutcomes.length && !filterOutcomes.includes(h.outcome))      return false
    if (filterSet !== 'all'   && h.set !== filterSet)                      return false
    if (filterType !== 'all'  && h.type !== filterType)                    return false
    return true
  })

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
  }

  // Stats summary
  const kills   = session.hits.filter(h => h.outcome === 'kill').length
  const errors  = session.hits.filter(h => h.outcome === 'error').length
  const topHitter = allPlayers.reduce<{ num: number; kills: number } | null>((best, num) => {
    const k = session.hits.filter(h => h.playerNumber === num && h.outcome === 'kill').length
    return (!best || k > best.kills) ? { num, kills: k } : best
  }, null)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
        <button onClick={onBack} className="tap-btn text-gray-400 text-sm">← Back</button>
        <div className="flex-1 text-center">
          <p className="text-white font-bold text-sm">{session.opponent}</p>
          <p className="text-gray-500 text-[11px]">{session.date}{session.tournament ? ` · ${session.tournament}` : ''}</p>
        </div>
        <button onClick={onResume} className="tap-btn text-vr-300 text-sm font-bold">+ Add</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stats bar */}
        <div className="flex gap-3 px-4 py-3 border-b border-white/5">
          <div className="flex-1 bg-navy-800 rounded-xl p-2.5 text-center">
            <p className="text-green-400 font-black text-lg">{kills}</p>
            <p className="text-gray-600 text-[10px]">Kills</p>
          </div>
          <div className="flex-1 bg-navy-800 rounded-xl p-2.5 text-center">
            <p className="text-red-400 font-black text-lg">{errors}</p>
            <p className="text-gray-600 text-[10px]">Errors</p>
          </div>
          <div className="flex-1 bg-navy-800 rounded-xl p-2.5 text-center">
            <p className="text-white font-black text-lg">{session.hits.length}</p>
            <p className="text-gray-600 text-[10px]">Total</p>
          </div>
          {topHitter && (
            <div className="flex-1 bg-navy-800 rounded-xl p-2.5 text-center">
              <p className="text-vr-300 font-black text-lg">#{topHitter.num}</p>
              <p className="text-gray-600 text-[10px]">Top Hitter</p>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="px-4 py-3 flex flex-col gap-2 border-b border-white/5">
          {/* Player filter */}
          {allPlayers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allPlayers.map(n => (
                <button key={n}
                  onClick={() => setFilterPlayers(p => toggle(p, n))}
                  className={`tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                    filterPlayers.includes(n)
                      ? 'bg-vr-700 border-vr-500 text-white'
                      : 'bg-navy-700 border-white/10 text-gray-400'
                  }`}>
                  #{n}
                </button>
              ))}
            </div>
          )}
          {/* Outcome + type + set filters */}
          <div className="flex flex-wrap gap-1.5">
            {OUTCOMES.map(o => (
              <button key={o}
                onClick={() => setFilterOutcomes(p => toggle(p, o))}
                className="tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all"
                style={filterOutcomes.includes(o)
                  ? { backgroundColor: OC[o]+'33', borderColor: OC[o]+'88', color: OC[o] }
                  : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280' }
                }>
                {OL[o]}
              </button>
            ))}
            {(['attack','serve'] as HitType[]).map(t => (
              <button key={t}
                onClick={() => setFilterType(f => f === t ? 'all' : t)}
                className={`tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  filterType === t ? 'bg-navy-600 border-white/30 text-white' : 'border-white/10 text-gray-600'
                }`}>
                {t === 'attack' ? 'ATK' : 'SRV'}
              </button>
            ))}
            {[1,2,3,4,5].map(s => {
              const hasHits = session.hits.some(h => h.set === s)
              if (!hasHits) return null
              return (
                <button key={s}
                  onClick={() => setFilterSet(f => f === s ? 'all' : s)}
                  className={`tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                    filterSet === s ? 'bg-navy-600 border-white/30 text-white' : 'border-white/10 text-gray-600'
                  }`}>
                  S{s}
                </button>
              )
            })}
            <button
              onClick={() => setHeatmap(h => !h)}
              className={`tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                heatmap ? 'bg-orange-900/40 border-orange-600/50 text-orange-300' : 'border-white/10 text-gray-600'
              }`}>
              🔥 Heat Map
            </button>
          </div>
        </div>

        {/* Court */}
        <div className="flex items-center justify-center p-3">
          <svg viewBox="0 0 300 528" className="w-full" style={{ maxWidth: 360 }}>
            <rect x={CX} y={CY} width={CW} height={CH} fill="#0f1929" rx={3} />
            <rect x={CX} y={CY} width={CW} height={CH/2} fill="#fff" fillOpacity="0.015" />
            {[1,2].map(i => (
              <line key={i} x1={CX+ZW*i} y1={CY} x2={CX+ZW*i} y2={CY+CH}
                stroke="#fff" strokeOpacity="0.08" strokeWidth="1" />
            ))}
            <line x1={CX} y1={ATK_OPP} x2={CX+CW} y2={ATK_OPP} stroke="#fff" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="5 4" />
            <line x1={CX} y1={ATK_OWN} x2={CX+CW} y2={ATK_OWN} stroke="#fff" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="5 4" />
            <rect x={CX} y={CY} width={CW} height={CH} fill="none" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
            <rect x={CX} y={NET_Y-3} width={CW} height={6} fill="#fff" fillOpacity="0.15" />
            <line x1={CX} y1={NET_Y} x2={CX+CW} y2={NET_Y} stroke="#fff" strokeOpacity="0.7" strokeWidth="2.5" />
            <text x={CX+CW/2} y={CY-8} textAnchor="middle" fill="#fff" fillOpacity="0.3" fontSize="9" fontWeight="bold">OPPONENT</text>
            <text x={CX+CW/2} y={CY+CH+14} textAnchor="middle" fill="#fff" fillOpacity="0.2" fontSize="9">OUR SIDE</text>

            {/* Hits */}
            {visible.map(h => {
              const dx = CX + h.x * CW, dy = CY + h.y * CH
              const c  = OC[h.outcome]
              return heatmap ? (
                <circle key={h.id} cx={dx} cy={dy} r={22} fill={c} fillOpacity="0.12" />
              ) : (
                <g key={h.id}>
                  <circle cx={dx} cy={dy} r={12} fill={c} fillOpacity="0.2" />
                  <circle cx={dx} cy={dy} r={6}  fill={c} fillOpacity="0.9" />
                  <text x={dx} y={dy-10} textAnchor="middle" fill={c} fontSize="8" fontWeight="bold">
                    #{h.playerNumber}
                  </text>
                </g>
              )
            })}
          </svg>
        </div>

        {/* Per-player breakdown */}
        {allPlayers.length > 0 && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Player Breakdown</p>
            {allPlayers.map(n => {
              const playerHits = session.hits.filter(h => h.playerNumber === n)
              return (
                <div key={n} className="bg-navy-800 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-white font-black text-base w-8">#{n}</span>
                  <div className="flex gap-2 flex-wrap">
                    {OUTCOMES.map(o => {
                      const count = playerHits.filter(h => h.outcome === o).length
                      if (!count) return null
                      return (
                        <span key={o} className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: OC[o]+'22', color: OC[o] }}>
                          {count} {OL[o]}
                        </span>
                      )
                    })}
                  </div>
                  <span className="ml-auto text-gray-600 text-xs">{playerHits.length} total</span>
                </div>
              )
            })}
          </div>
        )}

        {/* Delete */}
        <div className="px-4 pb-10">
          {confirmDelete ? (
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(false)}
                className="tap-btn flex-1 border border-white/10 rounded-xl py-2.5 text-gray-400 text-sm">Keep</button>
              <button onClick={onDelete}
                className="tap-btn flex-1 border border-red-900/50 rounded-xl py-2.5 text-red-500 text-sm font-bold">Delete</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)}
              className="tap-btn w-full border border-red-900/30 rounded-xl py-2.5 text-red-600 text-sm">
              Delete Session
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
