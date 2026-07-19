import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type SkillTag = 'warm-up' | 'serving' | 'passing' | 'setting' | 'attacking' | 'defense' | 'blocking' | 'conditioning' | 'cool-down'
type StationMode = 'full' | 'split'

interface Drill {
  id: string
  name: string
  description: string
  minPlayers: number
  maxPlayers: number   // 99 = no upper limit
  defaultDuration: number
  tags: SkillTag[]
  stations: StationMode
  coachNotes?: string
  isCustom?: boolean
}

interface PlanBlock {
  id: string
  name: string
  duration: number
  tags: SkillTag[]
  stations: StationMode
  notes: string
  drillId?: string
}

interface PracticePlan {
  id: string
  name: string
  date: string
  startTime: string   // HH:MM
  totalMinutes: number
  playerCount: number
  blocks: PlanBlock[]
  isTemplate: boolean
}

// ── Storage ───────────────────────────────────────────────────────────────────

const PLANS_KEY  = 'vb_plans'
const DRILLS_KEY = 'vb_custom_drills'

function loadPlans(): PracticePlan[]  { try { return JSON.parse(localStorage.getItem(PLANS_KEY)  ?? '[]') } catch { return [] } }
function loadCustom(): Drill[]        { try { return JSON.parse(localStorage.getItem(DRILLS_KEY) ?? '[]') } catch { return [] } }
function savePlans(p: PracticePlan[]) { localStorage.setItem(PLANS_KEY,  JSON.stringify(p)) }
function saveCustom(d: Drill[])       { localStorage.setItem(DRILLS_KEY, JSON.stringify(d)) }

// ── Drill Library ─────────────────────────────────────────────────────────────

const LIBRARY: Drill[] = [
  // Warm-Up
  { id: 'dyn-warmup',   name: 'Dynamic Warm-Up',       description: 'Jogging, high knees, butt kicks, arm circles around the court.',                   minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['warm-up'],              stations: 'full' },
  { id: 'ball-handle',  name: 'Ball Handling',          description: 'Individual ball control — self-setting, overhead toss, platform work.',             minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['warm-up', 'passing'],    stations: 'full' },
  { id: 'pepper',       name: 'Pepper',                 description: 'Partner passing: pass → set → hit → dig, continuous rally.',                       minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['warm-up', 'passing'],    stations: 'split' },
  // Serving
  { id: 'serving-lines',name: 'Serving Lines',          description: 'Players serve from baseline. Rotate targets on the other side.',                   minPlayers: 2, maxPlayers: 99, defaultDuration: 15, tags: ['serving'],               stations: 'full' },
  { id: 'serve-zones',  name: 'Zone Serving',           description: 'Cones placed in target zones. Score points for hitting the zone.',                 minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['serving'],               stations: 'full' },
  { id: 'ace-hunt',     name: 'Ace Hunt',               description: 'Servers compete to ace passers. Track score. Rotate passers.',                     minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['serving', 'passing'],    stations: 'full' },
  { id: 'srv-pressure', name: 'Pressure Serving',       description: 'Must make 5 in a row before rotating. Miss = restart count.',                     minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['serving', 'conditioning'],stations: 'full' },
  // Passing
  { id: 'butterfly',    name: 'Butterfly Passing',      description: 'Classic butterfly drill: pass to target, follow pass, shag, repeat.',              minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['passing'],               stations: 'split' },
  { id: 'freeball-pass',name: 'Freeball Passing',       description: 'Coach tosses freeballs. Passers call "free" and pass to target.',                  minPlayers: 4, maxPlayers: 99, defaultDuration: 10, tags: ['passing'],               stations: 'full' },
  { id: 'srv-receive',  name: 'Serve Receive 3-Person', description: '3 passers in serve receive formation. Serve → pass → set → tip. Rotate.',        minPlayers: 6, maxPlayers: 99, defaultDuration: 20, tags: ['passing', 'serving'],    stations: 'full' },
  { id: 'wash-drill',   name: 'Wash Drill',             description: 'Win 2 in a row to score. Freeball → side out, then coach ball second ball.',       minPlayers: 8, maxPlayers: 99, defaultDuration: 20, tags: ['passing', 'defense'],    stations: 'full' },
  // Setting
  { id: 'set-targets',  name: 'Setting to Targets',     description: 'Setter sets to targets at OH and RS. Coach feeds. Rotate after set number.',      minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['setting'],               stations: 'split' },
  { id: 'quick-sets',   name: 'Quick Set Work',         description: 'MB runs slide and 1-ball. Setter practices timing with various middle approaches.',minPlayers: 4, maxPlayers: 12, defaultDuration: 15, tags: ['setting', 'attacking'],  stations: 'split' },
  { id: 'setting-reps', name: 'Setting Reps',           description: 'High volume setting reps from different pass quality — perfect, off, and shanked.',minPlayers: 3, maxPlayers: 8,  defaultDuration: 10, tags: ['setting'],               stations: 'split' },
  // Attacking
  { id: 'hitting-lines',name: 'Hitting Lines',          description: 'Standard hitting lines: OH, RS, MB. Coach or setter sets, blocker optional.',      minPlayers: 6, maxPlayers: 99, defaultDuration: 20, tags: ['attacking'],             stations: 'full' },
  { id: 'gauntlet',     name: 'Gauntlet',               description: 'Hitter must beat a 3-person block/dig crew. Crew wins if they stop 3 in a row.',  minPlayers: 8, maxPlayers: 99, defaultDuration: 15, tags: ['attacking', 'defense'],  stations: 'full' },
  { id: 'cut-shots',    name: 'Cut Shot Clinic',        description: 'OH works sharp angle and cut shots crosscourt. Set up deep vs short targets.',    minPlayers: 4, maxPlayers: 12, defaultDuration: 15, tags: ['attacking'],             stations: 'split' },
  { id: 'trans-attack', name: '6-2 Transition',         description: 'Full team in 6-2 system. Coach initiates, team transitions and runs offenses.',   minPlayers: 12,maxPlayers: 99, defaultDuration: 20, tags: ['attacking', 'setting'],  stations: 'full' },
  { id: 'tip-roll',     name: 'Tip & Roll Shot',        description: 'Hitters practice controlled tip to open zones and roll shots off the block.',      minPlayers: 4, maxPlayers: 12, defaultDuration: 10, tags: ['attacking'],             stations: 'split' },
  // Defense
  { id: 'dig-lines',    name: 'Dig Lines',              description: 'Coach hits at defenders in rotation. Work on platform angle and footwork.',        minPlayers: 4, maxPlayers: 99, defaultDuration: 15, tags: ['defense'],               stations: 'full' },
  { id: 'scramble-def', name: 'Scramble Defense',       description: 'Coach hits randomly. Team must keep ball alive for 3 contacts.',                  minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['defense'],               stations: 'full' },
  { id: 'def-cover',    name: 'Defense & Cover',        description: 'Setter sets, hitter attacks, team digs and covers. Coach adds block touch.',      minPlayers: 8, maxPlayers: 99, defaultDuration: 20, tags: ['defense', 'attacking'],  stations: 'full' },
  { id: 'dive-roll',    name: 'Dive & Roll Work',       description: 'Defensive footwork and floor work — rolls, dives, and emergency saves.',          minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['defense'],               stations: 'full' },
  // Blocking
  { id: 'block-foot',   name: 'Block Footwork',         description: 'Blockers work lateral movement — side shuffle, crossover step, and close.',       minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['blocking'],              stations: 'full' },
  { id: 'block-swing',  name: 'Block & Swing',          description: 'MB blocks quick, then swings around the outside for a set. Setter feeds.',        minPlayers: 6, maxPlayers: 12, defaultDuration: 15, tags: ['blocking', 'attacking'], stations: 'split' },
  { id: 'seam-attack',  name: 'Seam Attack',            description: 'Two blockers, hitter aims at the seam. Blockers work closing footwork.',          minPlayers: 6, maxPlayers: 99, defaultDuration: 15, tags: ['blocking'],              stations: 'full' },
  // Conditioning
  { id: 'cond-passing', name: 'Passing Reps',           description: 'High volume passing — 100 reps per person with partner or coach feed.',           minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['passing', 'conditioning'],stations: 'split' },
  { id: 'cond-serving', name: 'Serving Conditioning',   description: '10 serves, sprint to net and back between each. Competitive team scoring.',        minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['serving', 'conditioning'],stations: 'full' },
  // Cool-Down
  { id: 'team-stretch', name: 'Team Stretch',           description: 'Full team cool-down — hamstrings, quads, hip flexors, shoulder stretch.',         minPlayers: 2, maxPlayers: 99, defaultDuration: 10, tags: ['cool-down'],             stations: 'full' },
  { id: 'huddle',       name: 'Team Huddle',            description: 'Review practice highlights, set goals for next session, team hand-in.',           minPlayers: 2, maxPlayers: 99, defaultDuration: 5,  tags: ['cool-down'],             stations: 'full' },
]

// ── UI Helpers ────────────────────────────────────────────────────────────────

const TAG_STYLES: Record<SkillTag, { label: string; color: string; bg: string }> = {
  'warm-up':     { label: 'Warm-Up',    color: 'text-orange-400',  bg: 'bg-orange-900/30 border-orange-600/40' },
  'serving':     { label: 'Serving',    color: 'text-yellow-400',  bg: 'bg-yellow-900/30 border-yellow-600/40' },
  'passing':     { label: 'Passing',    color: 'text-blue-400',    bg: 'bg-blue-900/30 border-blue-600/40' },
  'setting':     { label: 'Setting',    color: 'text-purple-400',  bg: 'bg-purple-900/30 border-purple-600/40' },
  'attacking':   { label: 'Attacking',  color: 'text-green-400',   bg: 'bg-green-900/30 border-green-600/40' },
  'defense':     { label: 'Defense',    color: 'text-pb-400',      bg: 'bg-pb-900/30 border-pb-600/40' },
  'blocking':    { label: 'Blocking',   color: 'text-red-400',     bg: 'bg-red-900/30 border-red-600/40' },
  'conditioning':{ label: 'Cond.',      color: 'text-pink-400',    bg: 'bg-pink-900/30 border-pink-600/40' },
  'cool-down':   { label: 'Cool-Down',  color: 'text-gray-400',    bg: 'bg-gray-800/50 border-gray-600/40' },
}

const ALL_TAGS = Object.keys(TAG_STYLES) as SkillTag[]

function fmt(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

function addMins(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = h * 60 + m + mins
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`
}

function displayTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2) }

function blockFromDrill(d: Drill): PlanBlock {
  return { id: uid(), drillId: d.id, name: d.name, duration: d.defaultDuration, tags: d.tags, stations: d.stations, notes: d.coachNotes ?? '' }
}

// ── Main component ────────────────────────────────────────────────────────────

type View = 'home' | 'setup' | 'build' | 'custom'

export default function PracticePlanner({ onBack, onSync }: { onBack?: () => void; onSync?: () => void }) {
  const [plans,        setPlans]        = useState<PracticePlan[]>(loadPlans)
  const [customDrills, setCustomDrills] = useState<Drill[]>(loadCustom)
  const [view,         setView]         = useState<View>('home')
  const [activePlan,   setActivePlan]   = useState<PracticePlan | null>(null)
  const [showLibrary,  setShowLibrary]  = useState(false)
  const [showPlanEdit, setShowPlanEdit] = useState(false)
  const [tagFilter,    setTagFilter]    = useState<SkillTag[]>([])
  const [editBlock,    setEditBlock]    = useState<string | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<string | null>(null)
  const [planNameEdit, setPlanNameEdit] = useState(false)

  // Setup form state
  const [setupName,       setSetupName]       = useState('')
  const [setupDate,       setSetupDate]       = useState(() => new Date().toISOString().split('T')[0])
  const [setupStart,      setSetupStart]      = useState('18:00')
  const [setupDuration,   setSetupDuration]   = useState(120)
  const [setupPlayers,    setSetupPlayers]    = useState(12)
  const [setupIsTemplate, setSetupIsTemplate] = useState(false)

  // Custom drill form
  const [cdName,     setCdName]     = useState('')
  const [cdDesc,     setCdDesc]     = useState('')
  const [cdMin,      setCdMin]      = useState(2)
  const [cdMax,      setCdMax]      = useState(99)
  const [cdDur,      setCdDur]      = useState(15)
  const [cdTags,     setCdTags]     = useState<SkillTag[]>([])
  const [cdStations, setCdStations] = useState<StationMode>('full')
  const [cdNotes,    setCdNotes]    = useState('')

  function upsertPlan(p: PracticePlan) {
    const next = plans.some(x => x.id === p.id) ? plans.map(x => x.id === p.id ? p : x) : [...plans, p]
    setPlans(next); savePlans(next); onSync?.()
    if (activePlan?.id === p.id) setActivePlan(p)
  }

  function deletePlan(id: string) {
    const next = plans.filter(p => p.id !== id)
    setPlans(next); savePlans(next)
    setConfirmDel(null)
  }

  function updateBlock(planId: string, block: PlanBlock) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    upsertPlan({ ...plan, blocks: plan.blocks.map(b => b.id === block.id ? block : b) })
  }

  function removeBlock(planId: string, blockId: string) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    upsertPlan({ ...plan, blocks: plan.blocks.filter(b => b.id !== blockId) })
    if (editBlock === blockId) setEditBlock(null)
  }

  function moveBlock(planId: string, blockId: string, dir: -1 | 1) {
    const plan = plans.find(p => p.id === planId)
    if (!plan) return
    const i = plan.blocks.findIndex(b => b.id === blockId)
    if (i + dir < 0 || i + dir >= plan.blocks.length) return
    const bs = [...plan.blocks]
    ;[bs[i], bs[i + dir]] = [bs[i + dir], bs[i]]
    upsertPlan({ ...plan, blocks: bs })
  }

  function addDrillToPlan(drill: Drill) {
    if (!activePlan) return
    const block = blockFromDrill(drill)
    const updated = { ...activePlan, blocks: [...activePlan.blocks, block] }
    upsertPlan(updated)
    setShowLibrary(false)
  }

  // ── Home ──────────────────────────────────────────────────────────────────

  if (view === 'home') {
    const templates = plans.filter(p => p.isTemplate)
    const sessions  = plans.filter(p => !p.isTemplate).sort((a,b) => b.date.localeCompare(a.date))
    const today = new Date().toISOString().split('T')[0]

    return (
      <div className="flex flex-col h-full">
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
        <button onClick={onBack} className="tap-btn text-gray-400 text-sm">← Tools</button>
        <p className="flex-1 text-center text-white font-bold text-sm">Practice Planner</p>
        <div className="w-16" />
      </div>
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-10">

        <button onClick={() => { setSetupIsTemplate(false); setSetupName(''); setView('setup') }}
          className="tap-btn w-full bg-vr-700 border border-vr-500 rounded-2xl py-3.5 text-white font-bold text-sm">
          + New Practice Plan
        </button>

        {templates.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Templates</p>
            {templates.map(p => (
              <PlanCard key={p.id} plan={p} today={today}
                onOpen={() => { setActivePlan(p); setView('build') }}
                onCopy={() => {
                  const copy: PracticePlan = { ...p, id: uid(), name: `${p.name} (copy)`, date: today, isTemplate: false }
                  upsertPlan(copy); setActivePlan(copy); setView('build')
                }}
                onDelete={() => setConfirmDel(p.id)}
                confirmDel={confirmDel === p.id}
                onConfirmDel={() => deletePlan(p.id)}
                onCancelDel={() => setConfirmDel(null)} />
            ))}
          </div>
        )}

        {sessions.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-gray-500 text-xs font-bold uppercase tracking-wide">Recent Plans</p>
            {sessions.map(p => (
              <PlanCard key={p.id} plan={p} today={today}
                onOpen={() => { setActivePlan(p); setView('build') }}
                onCopy={() => {
                  const copy: PracticePlan = { ...p, id: uid(), name: `${p.name} (copy)`, date: today }
                  upsertPlan(copy); setActivePlan(copy); setView('build')
                }}
                onDelete={() => setConfirmDel(p.id)}
                confirmDel={confirmDel === p.id}
                onConfirmDel={() => deletePlan(p.id)}
                onCancelDel={() => setConfirmDel(null)} />
            ))}
          </div>
        )}

        {plans.length === 0 && (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-gray-500 text-sm">No practice plans yet.</p>
            <p className="text-gray-600 text-xs mt-1">Create one above to get started.</p>
          </div>
        )}

        <button onClick={() => { setSetupIsTemplate(true); setSetupName(''); setView('setup') }}
          className="tap-btn w-full border border-dashed border-white/15 rounded-2xl py-3 text-gray-600 text-sm">
          + Save a Template
        </button>
      </div>
      </div>
    )
  }

  // ── Setup ─────────────────────────────────────────────────────────────────

  if (view === 'setup') {
    function create() {
      if (!setupName.trim()) return
      const plan: PracticePlan = {
        id: uid(), name: setupName.trim(), date: setupDate,
        startTime: setupStart, totalMinutes: setupDuration,
        playerCount: setupPlayers, blocks: [], isTemplate: setupIsTemplate,
      }
      upsertPlan(plan); setActivePlan(plan); setView('build')
    }

    return (
      <div className="flex flex-col h-full">
        <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
          <button onClick={() => setView('home')} className="tap-btn text-gray-400 text-sm">Cancel</button>
          <p className="flex-1 text-center text-white font-bold text-sm">
            {setupIsTemplate ? 'New Template' : 'New Plan'}
          </p>
          <button onClick={create} disabled={!setupName.trim()}
            className="tap-btn text-vr-300 font-bold text-sm disabled:opacity-40">Create</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Plan Name *</label>
            <input value={setupName} onChange={e => setSetupName(e.target.value)} autoFocus
              placeholder="e.g. Tuesday Serving Focus"
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
          </div>
          {!setupIsTemplate && (
            <div className="flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Date</label>
              <input type="date" value={setupDate} onChange={e => setSetupDate(e.target.value)}
                className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
            </div>
          )}
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Start Time</label>
              <input type="time" value={setupStart} onChange={e => setSetupStart(e.target.value)}
                className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none" />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Duration</label>
              <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                <button onClick={() => setSetupDuration(d => Math.max(30, d - 15))} className="tap-btn text-gray-400 text-lg w-6">−</button>
                <span className="flex-1 text-center text-white text-sm font-bold">{fmt(setupDuration)}</span>
                <button onClick={() => setSetupDuration(d => Math.min(240, d + 15))} className="tap-btn text-gray-400 text-lg w-6">+</button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Players at Practice</label>
            <div className="flex items-center gap-3 bg-navy-700 border border-white/20 rounded-xl px-4 py-3">
              <button onClick={() => setSetupPlayers(n => Math.max(2, n - 1))} className="tap-btn text-gray-400 text-2xl w-8 text-center">−</button>
              <span className="flex-1 text-center text-white text-2xl font-black">{setupPlayers}</span>
              <button onClick={() => setSetupPlayers(n => Math.min(30, n + 1))} className="tap-btn text-gray-400 text-2xl w-8 text-center">+</button>
            </div>
            <p className="text-gray-600 text-xs text-center">This filters drills to what works with your roster size</p>
          </div>
        </div>
      </div>
    )
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  if (view === 'build' && activePlan) {
    const plan       = plans.find(p => p.id === activePlan.id) ?? activePlan
    const usedMins   = plan.blocks.reduce((s, b) => s + b.duration, 0)
    const remaining  = plan.totalMinutes - usedMins
    const pct        = Math.min(100, Math.round(usedMins / plan.totalMinutes * 100))
    const overTime   = usedMins > plan.totalMinutes
    const endTime    = addMins(plan.startTime, usedMins)

    // Tag breakdown
    const tagMinutes: Partial<Record<SkillTag, number>> = {}
    for (const b of plan.blocks) {
      for (const t of b.tags) {
        tagMinutes[t] = (tagMinutes[t] ?? 0) + b.duration / b.tags.length
      }
    }

    // All drills (library + custom), filtered by player count
    const allDrills = [...LIBRARY, ...customDrills].filter(d => plan.playerCount >= d.minPlayers && plan.playerCount <= d.maxPlayers)
    const filtered  = tagFilter.length ? allDrills.filter(d => tagFilter.some(t => d.tags.includes(t))) : allDrills

    // Group library by first tag for browsing
    const grouped: Partial<Record<SkillTag, Drill[]>> = {}
    for (const d of filtered) {
      const t = d.tags[0]
      if (!grouped[t]) grouped[t] = []
      grouped[t]!.push(d)
    }
    const groupOrder: SkillTag[] = ['warm-up','serving','passing','setting','attacking','defense','blocking','conditioning','cool-down']

    return (
      <div className="flex flex-col h-full relative">
        {/* Header */}
        <div className="bg-navy-800 border-b border-white/10 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 mb-2">
            <button onClick={() => { setShowLibrary(false); setEditBlock(null); setShowPlanEdit(false); setView('home') }}
              className="tap-btn text-gray-400 text-sm">← Plans</button>
            <div className="flex-1 flex items-center justify-center gap-2">
              {planNameEdit ? (
                <input value={plan.name} autoFocus
                  onChange={e => upsertPlan({ ...plan, name: e.target.value })}
                  onBlur={() => setPlanNameEdit(false)}
                  onKeyDown={e => e.key === 'Enter' && setPlanNameEdit(false)}
                  className="bg-transparent text-white font-bold text-sm text-center border-b border-white/30 focus:outline-none w-40" />
              ) : (
                <button onClick={() => setPlanNameEdit(true)} className="tap-btn text-white font-bold text-sm">{plan.name}</button>
              )}
              {plan.isTemplate && <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-vr-900/50 border border-vr-600/40 text-vr-400">TEMPLATE</span>}
            </div>
            <button
              onClick={() => { setShowPlanEdit(e => !e); setEditBlock(null) }}
              className={`tap-btn text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                showPlanEdit
                  ? 'bg-vr-700/50 border-vr-500/60 text-white'
                  : 'border-white/10 text-gray-400'
              }`}>
              {showPlanEdit ? 'Done' : 'Edit'}
            </button>
          </div>
          {/* Time bar */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-gray-500 text-[11px]">{displayTime(plan.startTime)}</span>
            <div className="flex-1 h-2 bg-navy-700 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${overTime ? 'bg-red-500' : 'bg-vr-500'}`}
                style={{ width: `${pct}%` }} />
            </div>
            <span className={`text-[11px] font-bold ${overTime ? 'text-red-400' : 'text-gray-500'}`}>
              {fmt(usedMins)}/{fmt(plan.totalMinutes)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-[10px]">
              {overTime
                ? `⚠️ ${fmt(Math.abs(remaining))} over`
                : remaining > 0 ? `${fmt(remaining)} remaining` : 'Practice full!'}
            </span>
            <span className="text-gray-600 text-[10px]">Ends {displayTime(endTime)} · {plan.playerCount} players</span>
          </div>
        </div>

        {/* Tag breakdown */}
        {plan.blocks.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto px-4 py-2 shrink-0 no-scrollbar">
            {ALL_TAGS.filter(t => tagMinutes[t]).map(t => (
              <div key={t} className={`flex items-center gap-1 px-2 py-1 rounded-full border text-[10px] font-bold shrink-0 ${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}`}>
                {TAG_STYLES[t].label} {Math.round(tagMinutes[t]!)}m
              </div>
            ))}
          </div>
        )}

        {/* Plan blocks */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2 pb-28">
          {plan.blocks.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-gray-500 text-sm">No drills yet.</p>
              <p className="text-gray-600 text-xs mt-1">Tap "Add Drills" below to build your plan.</p>
            </div>
          ) : (() => {
            let t = plan.startTime
            return plan.blocks.map((block, i) => {
              const blockStart = t
              t = addMins(t, block.duration)
              const blockEnd   = t
              const isExpanded = editBlock === block.id

              if (!showPlanEdit) {
                // ── Clean read-only view ─────────────────────────────────────
                return (
                  <div key={block.id} className="bg-navy-800 border border-white/10 rounded-2xl px-4 py-3 flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0 pt-0.5">
                      <span className="text-gray-500 text-[10px] font-mono">{displayTime(blockStart)}</span>
                      <div className="w-px flex-1 bg-white/10 my-1 min-h-[18px]" />
                      <span className="text-gray-600 text-[10px] font-mono">{displayTime(blockEnd)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm">{block.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {block.tags.map(t2 => (
                          <span key={t2} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TAG_STYLES[t2].bg} ${TAG_STYLES[t2].color}`}>
                            {TAG_STYLES[t2].label}
                          </span>
                        ))}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          block.stations === 'full' ? 'bg-navy-700 border-white/10 text-gray-500' : 'bg-vr-900/30 border-vr-600/30 text-vr-400'
                        }`}>
                          {block.stations === 'full' ? '⚡ Full team' : '🔀 Stations'}
                        </span>
                      </div>
                      {block.notes && <p className="text-gray-600 text-xs italic mt-1.5">{block.notes}</p>}
                    </div>
                    <span className="text-gray-600 text-xs font-bold shrink-0 mt-0.5">{fmt(block.duration)}</span>
                  </div>
                )
              }

              // ── Edit mode view ───────────────────────────────────────────
              return (
                <div key={block.id} className={`bg-navy-800 border rounded-2xl overflow-hidden transition-all ${isExpanded ? 'border-vr-500/50' : 'border-white/15'}`}>
                  <div className="px-4 pt-3 pb-2 flex items-start gap-3">
                    <div className="flex flex-col items-center shrink-0 pt-0.5">
                      <span className="text-gray-500 text-[10px] font-mono">{displayTime(blockStart)}</span>
                      <div className="w-px flex-1 bg-white/10 my-1 min-h-[18px]" />
                      <span className="text-gray-600 text-[10px] font-mono">{displayTime(blockEnd)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-bold text-sm mb-1.5">{block.name}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {block.tags.map(t2 => (
                          <span key={t2} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TAG_STYLES[t2].bg} ${TAG_STYLES[t2].color}`}>
                            {TAG_STYLES[t2].label}
                          </span>
                        ))}
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                          block.stations === 'full' ? 'bg-navy-700 border-white/10 text-gray-500' : 'bg-vr-900/30 border-vr-600/30 text-vr-400'
                        }`}>
                          {block.stations === 'full' ? '⚡ Full team' : '🔀 Stations'}
                        </span>
                      </div>
                      {/* Controls row */}
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateBlock(plan.id, { ...block, duration: Math.max(5, block.duration - 5) })}
                          className="tap-btn w-8 h-8 rounded-lg bg-navy-700 border border-white/10 text-white text-base flex items-center justify-center">−</button>
                        <span className="text-white font-bold text-sm w-10 text-center">{fmt(block.duration)}</span>
                        <button onClick={() => updateBlock(plan.id, { ...block, duration: block.duration + 5 })}
                          className="tap-btn w-8 h-8 rounded-lg bg-navy-700 border border-white/10 text-white text-base flex items-center justify-center">+</button>
                        <div className="flex-1" />
                        <button onClick={() => setEditBlock(isExpanded ? null : block.id)}
                          className={`tap-btn text-xs px-2 py-1.5 rounded-lg border ${isExpanded ? 'border-vr-500/50 text-vr-300' : 'border-white/10 text-gray-500'}`}>
                          Notes
                        </button>
                        <button onClick={() => moveBlock(plan.id, block.id, -1)} disabled={i === 0}
                          className="tap-btn w-8 h-8 rounded-lg bg-navy-700/50 border border-white/8 text-gray-400 text-sm flex items-center justify-center disabled:opacity-20">↑</button>
                        <button onClick={() => moveBlock(plan.id, block.id, 1)} disabled={i === plan.blocks.length - 1}
                          className="tap-btn w-8 h-8 rounded-lg bg-navy-700/50 border border-white/8 text-gray-400 text-sm flex items-center justify-center disabled:opacity-20">↓</button>
                        <button onClick={() => removeBlock(plan.id, block.id)}
                          className="tap-btn w-8 h-8 rounded-lg bg-red-900/20 border border-red-800/30 text-red-500 text-sm flex items-center justify-center">✕</button>
                      </div>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3">
                      <textarea value={block.notes}
                        onChange={e => updateBlock(plan.id, { ...block, notes: e.target.value })}
                        placeholder="Coaching notes, cues, modifications…" rows={2}
                        className="w-full bg-navy-700 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-gray-600 focus:outline-none resize-none" />
                    </div>
                  )}
                </div>
              )
            })
          })()}
        </div>

        {/* Add Drills button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-navy-900 via-navy-900/95 to-transparent pointer-events-none">
          <button onClick={() => setShowLibrary(true)}
            className="tap-btn pointer-events-auto w-full bg-vr-700 border border-vr-500 rounded-2xl py-3.5 text-white font-bold text-sm shadow-xl">
            + Add Drills
          </button>
        </div>

        {/* Drill Library drawer */}
        {showLibrary && (
          <div className="absolute inset-0 z-40 flex flex-col">
            <button onClick={() => { setShowLibrary(false); setTagFilter([]) }}
              className="flex-1 bg-black/40 tap-btn" />
            <div className="bg-navy-800 border-t border-white/10 flex flex-col" style={{ maxHeight: '75vh' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
                <p className="text-white font-bold text-sm">Drill Library</p>
                <div className="flex gap-2">
                  <button onClick={() => { setShowLibrary(false); setView('custom') }}
                    className="tap-btn text-xs font-bold px-3 py-1.5 border border-white/10 rounded-xl text-gray-400">
                    + Custom
                  </button>
                  <button onClick={() => { setShowLibrary(false); setTagFilter([]) }}
                    className="tap-btn text-gray-400 text-sm">✕</button>
                </div>
              </div>
              {/* Tag filter chips */}
              <div className="flex gap-1.5 overflow-x-auto px-4 py-2 shrink-0 no-scrollbar">
                {ALL_TAGS.map(t => (
                  <button key={t} onClick={() => setTagFilter(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t])}
                    className={`tap-btn px-2.5 py-1 rounded-full border text-[10px] font-bold shrink-0 transition-all ${
                      tagFilter.includes(t) ? `${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}` : 'border-white/10 text-gray-600'
                    }`}>
                    {TAG_STYLES[t].label}
                  </button>
                ))}
              </div>
              <p className="text-gray-600 text-[10px] px-4 pb-1 shrink-0">
                Showing drills for {plan.playerCount} players
              </p>
              {/* Drill list */}
              <div className="overflow-y-auto flex-1 px-4 pb-4 flex flex-col gap-1">
                {groupOrder.filter(g => grouped[g]?.length).map(g => (
                  <div key={g}>
                    <p className={`text-[10px] font-black uppercase tracking-wide py-2 ${TAG_STYLES[g].color}`}>{TAG_STYLES[g].label}</p>
                    {grouped[g]!.map(drill => (
                      <button key={drill.id}
                        onClick={() => addDrillToPlan(drill)}
                        className="tap-btn w-full bg-navy-700/60 border border-white/8 rounded-xl px-3 py-2.5 flex items-center gap-3 text-left mb-1.5 active:scale-[0.98]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-white text-sm font-bold">{drill.name}</p>
                            {drill.isCustom && <span className="text-[9px] font-bold text-vr-400 border border-vr-600/40 px-1 rounded">CUSTOM</span>}
                          </div>
                          <p className="text-gray-600 text-[11px] mt-0.5 line-clamp-1">{drill.description}</p>
                          <p className="text-gray-600 text-[10px] mt-0.5">
                            {drill.stations === 'split' ? '🔀 Stations' : '⚡ Full team'}
                            {drill.minPlayers > 2 ? ` · min ${drill.minPlayers} players` : ''}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white font-bold text-sm">{drill.defaultDuration}m</p>
                          <p className="text-vr-400 text-xs font-bold mt-1">+ Add</p>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
                {filtered.length === 0 && (
                  <p className="text-gray-600 text-sm text-center py-6">No drills match these filters.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Custom Drill ──────────────────────────────────────────────────────────

  if (view === 'custom') {
    function saveCustomDrill() {
      if (!cdName.trim() || cdTags.length === 0) return
      const d: Drill = {
        id: uid(), name: cdName.trim(), description: cdDesc.trim(),
        minPlayers: cdMin, maxPlayers: cdMax === 99 ? 99 : cdMax,
        defaultDuration: cdDur, tags: cdTags, stations: cdStations,
        coachNotes: cdNotes.trim(), isCustom: true,
      }
      const next = [...customDrills, d]
      setCustomDrills(next); saveCustom(next)
      setCdName(''); setCdDesc(''); setCdMin(2); setCdMax(99); setCdDur(15); setCdTags([]); setCdStations('full'); setCdNotes('')
      setView('build'); setShowLibrary(true)
    }

    return (
      <div className="flex flex-col h-full">
        <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
          <button onClick={() => { setView('build'); setShowLibrary(true) }} className="tap-btn text-gray-400 text-sm">Cancel</button>
          <p className="flex-1 text-center text-white font-bold text-sm">Custom Drill</p>
          <button onClick={saveCustomDrill} disabled={!cdName.trim() || cdTags.length === 0}
            className="tap-btn text-vr-300 font-bold text-sm disabled:opacity-40">Save</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 pb-10">
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Drill Name *</label>
            <input value={cdName} onChange={e => setCdName(e.target.value)} placeholder="e.g. Queen of the Court"
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Description</label>
            <textarea value={cdDesc} onChange={e => setCdDesc(e.target.value)} rows={2}
              placeholder="Brief description of how the drill works…"
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none resize-none" />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Skills (pick all that apply) *</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_TAGS.map(t => (
                <button key={t} onClick={() => setCdTags(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t])}
                  className={`tap-btn px-2.5 py-1.5 rounded-full border text-xs font-bold transition-all ${
                    cdTags.includes(t) ? `${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}` : 'border-white/10 text-gray-600'
                  }`}>
                  {TAG_STYLES[t].label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Default Duration</label>
              <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                <button onClick={() => setCdDur(d => Math.max(5, d - 5))} className="tap-btn text-gray-400 text-lg">−</button>
                <span className="flex-1 text-center text-white font-bold text-sm">{cdDur}m</span>
                <button onClick={() => setCdDur(d => d + 5)} className="tap-btn text-gray-400 text-lg">+</button>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Format</label>
              <div className="flex gap-1">
                {(['full','split'] as StationMode[]).map(s => (
                  <button key={s} onClick={() => setCdStations(s)}
                    className={`tap-btn flex-1 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                      cdStations === s ? 'bg-vr-700/50 border-vr-500/60 text-white' : 'border-white/10 text-gray-600'
                    }`}>
                    {s === 'full' ? '⚡ Full' : '🔀 Stations'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Min Players</label>
              <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                <button onClick={() => setCdMin(n => Math.max(2, n - 1))} className="tap-btn text-gray-400 text-lg">−</button>
                <span className="flex-1 text-center text-white font-bold text-sm">{cdMin}</span>
                <button onClick={() => setCdMin(n => Math.min(cdMax === 99 ? 30 : cdMax, n + 1))} className="tap-btn text-gray-400 text-lg">+</button>
              </div>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-gray-500 text-xs uppercase tracking-wide">Max Players</label>
              <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                <button onClick={() => setCdMax(n => n === 99 ? 20 : Math.max(cdMin, n - 1))} className="tap-btn text-gray-400 text-lg">−</button>
                <span className="flex-1 text-center text-white font-bold text-sm">{cdMax === 99 ? '∞' : cdMax}</span>
                <button onClick={() => setCdMax(n => n >= 30 ? 99 : n + 1)} className="tap-btn text-gray-400 text-lg">+</button>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-gray-500 text-xs uppercase tracking-wide">Coaching Notes</label>
            <textarea value={cdNotes} onChange={e => setCdNotes(e.target.value)} rows={2}
              placeholder="Cues, progressions, common mistakes to watch for…"
              className="bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none resize-none" />
          </div>
        </div>
      </div>
    )
  }

  return null
}

// ── Plan Card ─────────────────────────────────────────────────────────────────

function PlanCard({ plan, today, onOpen, onCopy, onDelete, confirmDel, onConfirmDel, onCancelDel }: {
  plan: PracticePlan; today: string
  onOpen: () => void; onCopy: () => void; onDelete: () => void
  confirmDel: boolean; onConfirmDel: () => void; onCancelDel: () => void
}) {
  const usedMins = plan.blocks.reduce((s,b) => s+b.duration, 0)
  const pct      = Math.min(100, Math.round(usedMins / plan.totalMinutes * 100))
  const isPast   = !plan.isTemplate && plan.date < today

  const tagMinutes: Partial<Record<SkillTag, number>> = {}
  for (const b of plan.blocks) {
    for (const t of b.tags) {
      tagMinutes[t] = (tagMinutes[t] ?? 0) + b.duration / b.tags.length
    }
  }
  const topTags = ALL_TAGS.filter(t => tagMinutes[t]).sort((a,b) => (tagMinutes[b] ?? 0) - (tagMinutes[a] ?? 0)).slice(0,3)

  return (
    <div className={`bg-navy-800 border border-white/10 rounded-2xl overflow-hidden ${isPast ? 'opacity-60' : ''}`}>
      <button onClick={onOpen} className="tap-btn w-full px-4 pt-3 pb-2 text-left">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <p className="text-white font-bold text-sm">{plan.name}</p>
            <p className="text-gray-500 text-xs">
              {plan.isTemplate ? `${displayTime(plan.startTime)} · ${fmt(plan.totalMinutes)}` : `${plan.date} · ${displayTime(plan.startTime)}`}
              {` · ${plan.playerCount} players`}
            </p>
          </div>
          <span className="text-gray-600 text-sm">›</span>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 bg-navy-700 rounded-full overflow-hidden mb-2">
          <div className="h-full bg-vr-500 rounded-full" style={{ width: `${pct}%` }} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            {topTags.map(t => (
              <span key={t} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${TAG_STYLES[t].bg} ${TAG_STYLES[t].color}`}>
                {TAG_STYLES[t].label}
              </span>
            ))}
          </div>
          <span className="text-gray-600 text-[10px]">{plan.blocks.length} drills · {fmt(usedMins)}/{fmt(plan.totalMinutes)}</span>
        </div>
      </button>
      <div className="flex border-t border-white/8">
        <button onClick={onCopy} className="tap-btn flex-1 py-2 text-gray-500 text-xs border-r border-white/8">📋 Copy</button>
        {confirmDel ? (
          <>
            <button onClick={onCancelDel} className="tap-btn flex-1 py-2 text-gray-500 text-xs border-r border-white/8">Cancel</button>
            <button onClick={onConfirmDel} className="tap-btn flex-1 py-2 text-red-500 text-xs font-bold">Delete</button>
          </>
        ) : (
          <button onClick={onDelete} className="tap-btn flex-1 py-2 text-gray-700 text-xs">Delete</button>
        )}
      </div>
    </div>
  )
}
