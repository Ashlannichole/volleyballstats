import { useState, useRef, type RefObject, type MouseEvent as ReactMouseEvent, type ReactNode } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface ScoutPlayer { number: number; name?: string }
type HitOutcome = 'kill' | 'ace' | 'error' | 'dug' | 'stuffblock'
type HitType    = 'attack' | 'serve'

interface ScoutHit {
  id: string
  fromX: number      // origin (0–1 court coords, opponent half)
  fromY: number
  toX: number        // landing (0–1 court coords, possibly outside = OOB)
  toY: number
  outOfBounds: boolean
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
function persist(s: ScoutSession[]) { localStorage.setItem(KEY, JSON.stringify(s)) }

// ── Court SVG constants ───────────────────────────────────────────────────────

const CX = 36, CY = 28, CW = 228, CH = 456
const NET_Y   = CY + CH / 2
const ATK_OPP = NET_Y - CH / 6
const ATK_OWN = NET_Y + CH / 6
const ZW      = CW / 3

// Out-of-bounds extended tap zone (px beyond court edge)
const OOB_PAD = 20

// ── Palette ───────────────────────────────────────────────────────────────────

const OC: Record<HitOutcome, string> = {
  kill: '#22c55e', ace: '#f59e0b', error: '#ef4444',
  dug: '#3b82f6', stuffblock: '#a855f7',
}
const OL: Record<HitOutcome, string> = {
  kill: 'Kill', ace: 'Ace', error: 'Error', dug: 'Dug', stuffblock: 'Stuff Block',
}

const ATK_OUTCOMES: HitOutcome[]  = ['kill', 'error', 'dug', 'stuffblock']
const SERVE_OUTCOMES: HitOutcome[] = ['ace', 'error']
const ALL_OUTCOMES: HitOutcome[]   = ['kill', 'ace', 'error', 'dug', 'stuffblock']

// ── SVG helpers ───────────────────────────────────────────────────────────────

function courtPt(svg: SVGSVGElement, clientX: number, clientY: number) {
  const pt = svg.createSVGPoint()
  pt.x = clientX; pt.y = clientY
  const p = pt.matrixTransform(svg.getScreenCTM()!.inverse())
  return { cx: (p.x - CX) / CW, cy: (p.y - CY) / CH }
}

function clampOOB(v: number) { return Math.max(-0.12, Math.min(1.12, v)) }

// ── Main component ────────────────────────────────────────────────────────────

type View = 'home' | 'chart' | 'report' | 'review'
interface Props { isPro: boolean; onUpgrade: () => void; onBack?: () => void; onSync?: () => void }

export default function Scouting({ isPro, onUpgrade, onBack, onSync }: Props) {
  const [sessions,   setSessions]   = useState<ScoutSession[]>(loadSessions)
  const [view,       setView]       = useState<View>('home')
  const [active,     setActive]     = useState<ScoutSession | null>(null)
  const [reviewing,  setReviewing]  = useState<ScoutSession | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [oppName,    setOppName]    = useState('')
  const [tourney,    setTourney]    = useState('')

  function upsert(s: ScoutSession) {
    const next = sessions.some(x => x.id === s.id)
      ? sessions.map(x => x.id === s.id ? s : x)
      : [...sessions, s]
    setSessions(next); persist(next); onSync?.()
  }

  function remove(id: string) {
    const next = sessions.filter(s => s.id !== id)
    setSessions(next); persist(next); onSync?.()
  }

  function startSession() {
    if (!oppName.trim()) return
    const s: ScoutSession = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      opponent: oppName.trim(), tournament: tourney.trim(),
      players: [], hits: [], notes: '',
    }
    upsert(s); setActive(s)
    setOppName(''); setTourney(''); setShowForm(false)
    setView('chart')
  }

  if (!isPro) return (
    <div className="flex flex-col items-center justify-center h-full p-8 gap-4 text-center">
      <span className="text-5xl">🔍</span>
      <h2 className="text-white font-bold text-xl">Opponent Scouting</h2>
      <p className="text-gray-500 text-sm">Chart opponent hits, build heat maps, and track tendencies.</p>
      <button onClick={onUpgrade} className="tap-btn bg-vr-700 border border-vr-500 rounded-2xl px-6 py-3 text-white font-bold">⚡ Upgrade to Pro</button>
    </div>
  )

  if (view === 'chart' && active) return (
    <ChartView
      session={active}
      onUpdate={s => { setActive(s); upsert(s) }}
      onDone={s => { setActive(s); upsert(s); setView('report') }}
    />
  )

  if (view === 'report' && active) return (
    <ReportView
      session={active}
      onViewChart={() => { setReviewing(active); setView('review') }}
      onDone={() => { setActive(null); setView('home') }}
    />
  )

  if (view === 'review' && reviewing) return (
    <ReviewView
      session={reviewing}
      onBack={() => { setView(active ? 'report' : 'home'); if (!active) setReviewing(null) }}
      onResume={() => { setActive(reviewing); setView('chart'); setReviewing(null) }}
      onDelete={() => { remove(reviewing.id); setReviewing(null); setActive(null); setView('home') }}
    />
  )

  // ── Home ──────────────────────────────────────────────────────────────────

  const opponents = [...new Set(sessions.map(s => s.opponent))]

  return (
    <div className="flex flex-col h-full">
    <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
      <button onClick={onBack} className="tap-btn text-gray-400 text-sm">← Tools</button>
      <p className="flex-1 text-center text-white font-bold text-sm">Opponents</p>
      <div className="w-16" />
    </div>
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-10">

      {showForm ? (
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 flex flex-col gap-3">
          <p className="text-white font-bold text-sm">New Scouting Session</p>
          <input value={oppName} onChange={e => setOppName(e.target.value)} placeholder="Opponent name *"
            className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
          <input value={tourney} onChange={e => setTourney(e.target.value)} placeholder="Tournament (optional)"
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
        const list  = sessions.filter(s => s.opponent === opp).sort((a,b) => b.date.localeCompare(a.date))
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
                  {ALL_OUTCOMES.map(o => {
                    const n = s.hits.filter(h => h.outcome === o).length
                    if (!n) return null
                    return (
                      <span key={o} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ backgroundColor: OC[o]+'33', color: OC[o] }}>
                        {n}{o === 'stuffblock' ? 'SB' : o[0].toUpperCase()}
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
    </div>
  )
}

// ── Court SVG (shared between ChartView and ReviewView) ───────────────────────

function CourtSVG({ children, svgRef, onTap }: {
  children?: ReactNode
  svgRef?: RefObject<SVGSVGElement | null>
  onTap?: (e: ReactMouseEvent<SVGRectElement>) => void
}) {
  return (
    <svg ref={svgRef} viewBox="0 0 300 516" className="h-full w-auto" style={{ maxWidth: '100%' }}>
      {/* OOB zone (slightly lighter) */}
      <rect x={CX - OOB_PAD} y={CY - OOB_PAD} width={CW + OOB_PAD*2} height={CH + OOB_PAD*2}
        fill="#1a2535" rx={4} />
      {/* Court bg */}
      <rect x={CX} y={CY} width={CW} height={CH} fill="#0f1929" />
      {/* Opponent half highlight */}
      <rect x={CX} y={CY} width={CW} height={CH/2} fill="#fff" fillOpacity="0.02" />
      {/* Zone columns */}
      {[1,2].map(i => (
        <line key={i} x1={CX+ZW*i} y1={CY} x2={CX+ZW*i} y2={CY+CH}
          stroke="#fff" strokeOpacity="0.07" strokeWidth="1" />
      ))}
      {/* Attack lines */}
      <line x1={CX} y1={ATK_OPP} x2={CX+CW} y2={ATK_OPP}
        stroke="#fff" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="5 4" />
      <line x1={CX} y1={ATK_OWN} x2={CX+CW} y2={ATK_OWN}
        stroke="#fff" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="5 4" />
      {/* Court border */}
      <rect x={CX} y={CY} width={CW} height={CH}
        fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
      {/* Net */}
      <rect x={CX} y={NET_Y-3} width={CW} height={6} fill="#fff" fillOpacity="0.12" />
      <line x1={CX} y1={NET_Y} x2={CX+CW} y2={NET_Y} stroke="#fff" strokeOpacity="0.75" strokeWidth="2.5" />
      {/* Labels */}
      <text x={CX+CW/2} y={CY-10} textAnchor="middle" fill="#fff" fillOpacity="0.35" fontSize="8" fontWeight="bold" letterSpacing="1">OPPONENT</text>
      <text x={CX+CW/2} y={CY+CH+16} textAnchor="middle" fill="#fff" fillOpacity="0.2" fontSize="8" letterSpacing="1">OUR SIDE</text>
      {['L','M','R'].map((l,i) => (
        <text key={l} x={CX+ZW*i+ZW/2} y={CY+10} textAnchor="middle" fill="#fff" fillOpacity="0.12" fontSize="8">{l}</text>
      ))}
      {/* Extended tap target (includes OOB zone) */}
      {onTap && (
        <rect x={CX-OOB_PAD} y={CY-OOB_PAD} width={CW+OOB_PAD*2} height={CH+OOB_PAD*2}
          fill="transparent" style={{ cursor: 'crosshair' }} onClick={onTap} />
      )}
      {children}
    </svg>
  )
}

// ── Chart View ────────────────────────────────────────────────────────────────

type TapStep = 'from' | 'to'

function ChartView({ session, onUpdate, onDone }: {
  session: ScoutSession
  onUpdate: (s: ScoutSession) => void
  onDone:   (s: ScoutSession) => void
}) {
  const svgRef       = useRef<SVGSVGElement>(null)
  const [tapStep,    setTapStep]    = useState<TapStep>('from')
  const [fromPt,     setFromPt]     = useState<{ x: number; y: number } | null>(null)
  const [toPt,       setToPt]       = useState<{ x: number; y: number; oob: boolean } | null>(null)
  const [pendingNum, setPendingNum] = useState<number | null>(null)
  const [activeSet,  setActiveSet]  = useState(1)
  const [hitType,    setHitType]    = useState<HitType>('attack')
  const [addingNum,  setAddingNum]  = useState('')
  const [showAdd,    setShowAdd]    = useState(false)

  const outcomes = hitType === 'serve' ? SERVE_OUTCOMES : ATK_OUTCOMES

  function handleTap(e: ReactMouseEvent<SVGRectElement>) {
    if (!svgRef.current) return
    const { cx, cy } = courtPt(svgRef.current, e.clientX, e.clientY)

    if (tapStep === 'from') {
      // Must tap opponent half (top half of court)
      if (cy < 0 || cy >= 0.5 || cx < 0 || cx > 1) return
      setFromPt({ x: cx, y: cy })
      setTapStep('to')
    } else {
      // Any tap (including OOB) records the landing
      const oob = cx < 0 || cx > 1 || cy < 0 || cy > 1
      setToPt({ x: clampOOB(cx), y: clampOOB(cy), oob })
      // if OOB: auto-set outcome as error after player picked
    }
  }

  function logHit(outcome: HitOutcome) {
    if (!fromPt || !toPt || pendingNum === null) return
    const hit: ScoutHit = {
      id: Date.now().toString(),
      fromX: fromPt.x, fromY: fromPt.y,
      toX: toPt.x,     toY: toPt.y,
      outOfBounds: toPt.oob,
      playerNumber: pendingNum,
      outcome, type: hitType, set: activeSet,
    }
    const updated = { ...session, hits: [...session.hits, hit] }
    onUpdate(updated)
    // Reset for next hit
    setFromPt(null); setToPt(null); setPendingNum(null); setTapStep('from')
  }

  function cancelPending() {
    setFromPt(null); setToPt(null); setPendingNum(null); setTapStep('from')
  }

  function addPlayer() {
    const n = parseInt(addingNum)
    if (isNaN(n) || n < 0 || n > 99) return
    if (!session.players.some(p => p.number === n)) {
      onUpdate({ ...session, players: [...session.players, { number: n }] })
    }
    setPendingNum(n); setAddingNum(''); setShowAdd(false)
  }

  const setHits = session.hits.filter(h => h.set === activeSet)
  const showLogger = toPt !== null

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
        <button onClick={() => onDone(session)} className="tap-btn text-vr-300 text-sm font-bold">✓ Done</button>
        <div className="flex-1 text-center">
          <p className="text-white font-bold text-sm">{session.opponent}</p>
          <p className="text-gray-500 text-[11px]">{session.hits.length} hits · Set {activeSet}</p>
        </div>
        <button onClick={() => {
          if (fromPt || toPt) { cancelPending(); return }
          if (session.hits.length > 0) onUpdate({ ...session, hits: session.hits.slice(0, -1) })
        }} className="tap-btn text-gray-500 text-sm">↩</button>
      </div>

      {/* Set + type bar */}
      <div className="flex items-center gap-1 px-3 py-2 bg-navy-900 shrink-0">
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={() => setActiveSet(s)}
            className={`tap-btn flex-1 py-1.5 rounded-lg text-xs font-bold ${activeSet === s ? 'bg-vr-700 text-white' : 'text-gray-600'}`}>
            S{s}
          </button>
        ))}
        <div className="w-px bg-white/10 mx-1 self-stretch" />
        {(['attack','serve'] as HitType[]).map(t => (
          <button key={t} onClick={() => { setHitType(t); cancelPending() }}
            className={`tap-btn px-2.5 py-1.5 rounded-lg text-xs font-bold ${hitType === t ? 'bg-navy-700 text-white border border-white/20' : 'text-gray-600'}`}>
            {t === 'attack' ? 'ATK' : 'SRV'}
          </button>
        ))}
      </div>

      {/* Court */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex items-center justify-center p-2 min-h-0">
          <CourtSVG svgRef={svgRef} onTap={showLogger ? undefined : handleTap}>
            {/* Drawn hits */}
            {setHits.map(h => <HitMark key={h.id} hit={h} />)}

            {/* Pending from dot */}
            {fromPt && !toPt && (
              <g>
                <circle cx={CX+fromPt.x*CW} cy={CY+fromPt.y*CH} r={10}
                  fill="#ffffff" fillOpacity="0.15" stroke="#fff" strokeWidth="1.5" strokeOpacity="0.6"
                  strokeDasharray="3 2" />
                <line x1={CX+fromPt.x*CW} y1={CY+fromPt.y*CH-5}
                      x2={CX+fromPt.x*CW} y2={CY+fromPt.y*CH+5}
                  stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" />
                <line x1={CX+fromPt.x*CW-5} y1={CY+fromPt.y*CH}
                      x2={CX+fromPt.x*CW+5} y2={CY+fromPt.y*CH}
                  stroke="#fff" strokeOpacity="0.7" strokeWidth="1.5" />
              </g>
            )}

            {/* Pending trajectory preview */}
            {fromPt && toPt && (
              <g>
                <line x1={CX+fromPt.x*CW} y1={CY+fromPt.y*CH}
                      x2={CX+toPt.x*CW}   y2={CY+toPt.y*CH}
                  stroke="#fff" strokeOpacity="0.3" strokeWidth="1.5" strokeDasharray="4 3" />
                <circle cx={CX+toPt.x*CW} cy={CY+toPt.y*CH} r={10}
                  fill="#fff" fillOpacity="0.2" stroke="#fff" strokeWidth="2" strokeOpacity="0.7" />
                {toPt.oob && (
                  <text x={CX+toPt.x*CW} y={CY+toPt.y*CH+4} textAnchor="middle"
                    fill="#ef4444" fontSize="10" fontWeight="bold">OUT</text>
                )}
              </g>
            )}
          </CourtSVG>
        </div>

        {/* Hint / Logger */}
        {showLogger ? (
          <div className="bg-navy-800 border-t border-white/10 p-4 flex flex-col gap-3 shrink-0">
            {/* Player picker */}
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2">
                {hitType === 'serve' ? 'Who served?' : 'Who hit it?'}
              </p>
              <div className="flex flex-wrap gap-2">
                {session.players.sort((a,b) => a.number - b.number).map(p => (
                  <button key={p.number} onClick={() => setPendingNum(p.number)}
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
            {/* Outcome — if OOB, auto-select error but still show */}
            <div>
              <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-2">
                {toPt?.oob ? 'Out of bounds — confirm outcome' : 'Outcome'}
              </p>
              <div className={`grid gap-2 ${outcomes.length === 2 ? 'grid-cols-2' : 'grid-cols-4'}`}>
                {(toPt?.oob ? ['error'] as HitOutcome[] : outcomes).map(o => (
                  <button key={o}
                    onClick={() => pendingNum !== null && logHit(o)}
                    disabled={pendingNum === null}
                    className="tap-btn py-3 rounded-xl border text-xs font-bold disabled:opacity-30 active:scale-95 transition-all"
                    style={{ backgroundColor: OC[o]+'22', borderColor: OC[o]+'66', color: OC[o] }}>
                    {OL[o]}
                  </button>
                ))}
              </div>
            </div>
            <button onClick={cancelPending} className="tap-btn text-gray-600 text-xs text-center">Cancel</button>
          </div>
        ) : (
          <div className="bg-navy-900/80 border-t border-white/5 py-2.5 shrink-0 text-center">
            {tapStep === 'from' ? (
              <p className="text-gray-500 text-xs">
                {hitType === 'serve'
                  ? 'Tap opponent side — where is the server standing?'
                  : 'Tap opponent side — where did they hit from?'}
              </p>
            ) : (
              <p className="text-pb-400 text-xs font-medium">
                Now tap where the ball landed (or outside the court if out)
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Hit mark (arrow + dot) ────────────────────────────────────────────────────

function HitMark({ hit }: { hit: ScoutHit }) {
  const fx = CX + hit.fromX * CW, fy = CY + hit.fromY * CH
  const tx = CX + hit.toX   * CW, ty = CY + hit.toY   * CH
  const c  = OC[hit.outcome]
  return (
    <g>
      {/* Trajectory line */}
      <line x1={fx} y1={fy} x2={tx} y2={ty}
        stroke={c} strokeOpacity="0.4" strokeWidth="1.5" strokeDasharray="4 3" />
      {/* From dot (small hollow) */}
      <circle cx={fx} cy={fy} r={4} fill="none" stroke={c} strokeWidth="1.5" strokeOpacity="0.6" />
      {/* Landing dot */}
      <circle cx={tx} cy={ty} r={hit.outOfBounds ? 6 : 11} fill={c} fillOpacity="0.2" />
      <circle cx={tx} cy={ty} r={5}  fill={c} fillOpacity="0.9" />
      <text x={tx} y={ty-10} textAnchor="middle" fill={c} fontSize="8" fontWeight="bold">
        #{hit.playerNumber}
      </text>
      {hit.outOfBounds && (
        <text x={tx} y={ty+18} textAnchor="middle" fill={c} fontSize="7" fontWeight="bold" fillOpacity="0.8">OUT</text>
      )}
    </g>
  )
}

// ── Report View ───────────────────────────────────────────────────────────────

function ReportView({ session, onViewChart, onDone }: {
  session: ScoutSession
  onViewChart: () => void
  onDone: () => void
}) {
  const playerNums = [...new Set(session.hits.map(h => h.playerNumber))].sort((a,b) => a-b)

  const attackers = playerNums
    .map(n => {
      const h = session.hits.filter(x => x.playerNumber === n && x.type === 'attack')
      return {
        num: n,
        kills:      h.filter(x => x.outcome === 'kill').length,
        errors:     h.filter(x => x.outcome === 'error').length,
        dug:        h.filter(x => x.outcome === 'dug').length,
        stuffblock: h.filter(x => x.outcome === 'stuffblock').length,
        total:      h.length,
      }
    })
    .filter(a => a.total > 0)
    .sort((a,b) => b.kills - a.kills || a.errors - b.errors)

  const servers = playerNums
    .map(n => {
      const h = session.hits.filter(x => x.playerNumber === n && x.type === 'serve')
      return {
        num:    n,
        aces:   h.filter(x => x.outcome === 'ace').length,
        errors: h.filter(x => x.outcome === 'error').length,
        total:  h.length,
      }
    })
    .filter(s => s.total > 0)
    .sort((a,b) => b.aces - a.aces || a.errors - b.errors)

  return (
    <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
        <div className="flex-1 text-center">
          <p className="text-white font-bold text-sm">{session.opponent}</p>
          <p className="text-gray-500 text-[11px]">Scouting Report · {session.date}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-5 pb-10">
        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: 'Total Hits', value: session.hits.filter(h => h.type === 'attack').length, color: 'text-white' },
            { label: 'Kills', value: session.hits.filter(h => h.outcome === 'kill').length, color: 'text-green-400' },
            { label: 'Kill %', value: session.hits.filter(h => h.type === 'attack').length > 0
                ? Math.round(session.hits.filter(h => h.outcome === 'kill').length /
                    session.hits.filter(h => h.type === 'attack').length * 100) + '%'
                : '—', color: 'text-green-400' },
            { label: 'Total Serves', value: session.hits.filter(h => h.type === 'serve').length, color: 'text-white' },
            { label: 'Aces', value: session.hits.filter(h => h.outcome === 'ace').length, color: 'text-yellow-400' },
            { label: 'Ace %', value: session.hits.filter(h => h.type === 'serve').length > 0
                ? Math.round(session.hits.filter(h => h.outcome === 'ace').length /
                    session.hits.filter(h => h.type === 'serve').length * 100) + '%'
                : '—', color: 'text-yellow-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-navy-800 border border-white/10 rounded-xl p-2.5 text-center">
              <p className={`font-black text-lg ${stat.color}`}>{stat.value}</p>
              <p className="text-gray-600 text-[9px] mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Top Attackers */}
        {attackers.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Top Attackers</p>
            {attackers.map((a, i) => (
              <div key={a.num} className="bg-navy-800 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className={`text-xs font-black w-4 ${i === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {i === 0 ? '🥇' : `#${i+1}`}
                </span>
                <span className="text-white font-black text-base w-10">#{a.num}</span>
                <div className="flex-1 flex flex-wrap gap-1.5">
                  {a.kills > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-900/30 text-green-400">{a.kills}K</span>}
                  {a.errors > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400">{a.errors}E</span>}
                  {a.dug > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-400">{a.dug}D</span>}
                  {a.stuffblock > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-900/30 text-purple-400">{a.stuffblock}SB</span>}
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-bold">{a.total > 0 ? Math.round(a.kills/a.total*100) : 0}%</p>
                  <p className="text-gray-600 text-[9px]">kill%</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Servers */}
        {servers.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wide">Top Servers</p>
            {servers.map((s, i) => (
              <div key={s.num} className="bg-navy-800 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className={`text-xs font-black w-4 ${i === 0 ? 'text-yellow-400' : 'text-gray-600'}`}>
                  {i === 0 ? '🥇' : `#${i+1}`}
                </span>
                <span className="text-white font-black text-base w-10">#{s.num}</span>
                <div className="flex-1 flex gap-1.5">
                  {s.aces > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-yellow-900/30 text-yellow-400">{s.aces} Ace{s.aces !== 1 ? 's' : ''}</span>}
                  {s.errors > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-900/30 text-red-400">{s.errors} Err</span>}
                </div>
                <div className="text-right">
                  <p className="text-white text-sm font-bold">{s.total > 0 ? Math.round(s.aces/s.total*100) : 0}%</p>
                  <p className="text-gray-600 text-[9px]">ace%</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {attackers.length === 0 && servers.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-8">No hits charted yet.</p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 mt-2">
          <button onClick={onViewChart}
            className="tap-btn w-full border border-white/10 rounded-2xl py-3 text-gray-300 text-sm font-bold">
            🗺 View Court Chart
          </button>
          <button onClick={onDone}
            className="tap-btn w-full bg-vr-700 border border-vr-500 rounded-2xl py-3 text-white text-sm font-bold">
            Done
          </button>
        </div>
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

  function toggle<T>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v]
  }

  const visible = session.hits.filter(h => {
    if (filterPlayers.length  && !filterPlayers.includes(h.playerNumber)) return false
    if (filterOutcomes.length && !filterOutcomes.includes(h.outcome))      return false
    if (filterSet !== 'all'   && h.set !== filterSet)                      return false
    if (filterType !== 'all'  && h.type !== filterType)                    return false
    return true
  })

  return (
    <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
        <button onClick={onBack} className="tap-btn text-gray-400 text-sm">← Back</button>
        <div className="flex-1 text-center">
          <p className="text-white font-bold text-sm">{session.opponent}</p>
          <p className="text-gray-500 text-[11px]">{session.date}{session.tournament ? ` · ${session.tournament}` : ''}</p>
        </div>
        <button onClick={onResume} className="tap-btn text-vr-300 text-sm font-bold">+ Add</button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Filters */}
        <div className="px-4 py-3 flex flex-col gap-2 border-b border-white/5">
          {allPlayers.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allPlayers.map(n => (
                <button key={n} onClick={() => setFilterPlayers(p => toggle(p, n))}
                  className={`tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                    filterPlayers.includes(n) ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-700 border-white/10 text-gray-400'
                  }`}>
                  #{n}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {ALL_OUTCOMES.map(o => (
              <button key={o} onClick={() => setFilterOutcomes(p => toggle(p, o))}
                className="tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all"
                style={filterOutcomes.includes(o)
                  ? { backgroundColor: OC[o]+'33', borderColor: OC[o]+'88', color: OC[o] }
                  : { backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.1)', color: '#6b7280' }}>
                {o === 'stuffblock' ? 'Stuff' : OL[o]}
              </button>
            ))}
            {(['attack','serve'] as HitType[]).map(t => (
              <button key={t} onClick={() => setFilterType(f => f === t ? 'all' : t)}
                className={`tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  filterType === t ? 'bg-navy-600 border-white/30 text-white' : 'border-white/10 text-gray-600'
                }`}>
                {t === 'attack' ? 'ATK' : 'SRV'}
              </button>
            ))}
            {[1,2,3,4,5].filter(s => session.hits.some(h => h.set === s)).map(s => (
              <button key={s} onClick={() => setFilterSet(f => f === s ? 'all' : s)}
                className={`tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                  filterSet === s ? 'bg-navy-600 border-white/30 text-white' : 'border-white/10 text-gray-600'
                }`}>
                S{s}
              </button>
            ))}
            <button onClick={() => setHeatmap(h => !h)}
              className={`tap-btn px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${
                heatmap ? 'bg-orange-900/40 border-orange-600/50 text-orange-300' : 'border-white/10 text-gray-600'
              }`}>
              🔥 Heat Map
            </button>
          </div>
        </div>

        {/* Court */}
        <div className="flex items-center justify-center p-3">
          <svg viewBox="0 0 300 516" className="w-full" style={{ maxWidth: 360 }}>
            {/* OOB bg */}
            <rect x={CX-OOB_PAD} y={CY-OOB_PAD} width={CW+OOB_PAD*2} height={CH+OOB_PAD*2} fill="#1a2535" rx={4} />
            <rect x={CX} y={CY} width={CW} height={CH} fill="#0f1929" />
            <rect x={CX} y={CY} width={CW} height={CH/2} fill="#fff" fillOpacity="0.02" />
            {[1,2].map(i => <line key={i} x1={CX+ZW*i} y1={CY} x2={CX+ZW*i} y2={CY+CH} stroke="#fff" strokeOpacity="0.07" strokeWidth="1" />)}
            <line x1={CX} y1={ATK_OPP} x2={CX+CW} y2={ATK_OPP} stroke="#fff" strokeOpacity="0.15" strokeWidth="1" strokeDasharray="5 4" />
            <line x1={CX} y1={ATK_OWN} x2={CX+CW} y2={ATK_OWN} stroke="#fff" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="5 4" />
            <rect x={CX} y={CY} width={CW} height={CH} fill="none" stroke="#fff" strokeOpacity="0.3" strokeWidth="2" />
            <rect x={CX} y={NET_Y-3} width={CW} height={6} fill="#fff" fillOpacity="0.12" />
            <line x1={CX} y1={NET_Y} x2={CX+CW} y2={NET_Y} stroke="#fff" strokeOpacity="0.75" strokeWidth="2.5" />
            <text x={CX+CW/2} y={CY-10} textAnchor="middle" fill="#fff" fillOpacity="0.35" fontSize="8" fontWeight="bold" letterSpacing="1">OPPONENT</text>
            <text x={CX+CW/2} y={CY+CH+16} textAnchor="middle" fill="#fff" fillOpacity="0.2" fontSize="8" letterSpacing="1">OUR SIDE</text>

            {visible.map(h => heatmap ? (
              <g key={h.id}>
                <circle cx={CX+h.toX*CW} cy={CY+h.toY*CH} r={24} fill={OC[h.outcome]} fillOpacity="0.1" />
              </g>
            ) : (
              <HitMark key={h.id} hit={h} />
            ))}
          </svg>
        </div>

        {/* Per-player breakdown */}
        {allPlayers.length > 0 && (
          <div className="px-4 pb-4 flex flex-col gap-2">
            <p className="text-gray-500 text-xs uppercase tracking-wide">Player Breakdown</p>
            {allPlayers.map(n => {
              const ph = session.hits.filter(h => h.playerNumber === n)
              return (
                <div key={n} className="bg-navy-800 border border-white/10 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="text-white font-black text-base w-10">#{n}</span>
                  <div className="flex gap-1.5 flex-wrap flex-1">
                    {ALL_OUTCOMES.map(o => {
                      const cnt = ph.filter(h => h.outcome === o).length
                      if (!cnt) return null
                      return (
                        <span key={o} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: OC[o]+'22', color: OC[o] }}>
                          {cnt} {o === 'stuffblock' ? 'SB' : OL[o]}
                        </span>
                      )
                    })}
                  </div>
                  <span className="text-gray-600 text-xs">{ph.length}</span>
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
