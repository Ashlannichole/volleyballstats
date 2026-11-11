import { useState } from 'react'
import type { Player, PracticeSession, SetStats } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'

interface Props {
  players: Player[]
  onSave: (s: PracticeSession) => void
  onCancel: () => void
}

const START_SCORE = 10
const MAX_SCORE = 10

type Outcome = '3' | '2' | '1' | 'ace'

interface Snapshot {
  activePasserId: string
  serverQueue: string[]
  passerScore: number
  inDanger: boolean
  stats: SetStats
}

function blankSet(players: Player[]): SetStats {
  const s: SetStats = {}
  for (const p of players) s[p.id] = EMPTY_STATS()
  return s
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function PressureServeReceiveDrill({ players, onSave, onCancel }: Props) {
  const [phase, setPhase] = useState<'setup' | 'live'>('setup')
  const [pendingPasserId, setPendingPasserId] = useState<string | null>(players[0]?.id ?? null)
  const [setupOrder, setSetupOrder] = useState<string[]>(players.map(p => p.id))

  const [stats, setStats] = useState<SetStats>(() => blankSet(players))
  const [activePasserId, setActivePasserId] = useState<string | null>(null)
  const [serverQueue, setServerQueue] = useState<string[]>([])
  const [passerScore, setPasserScore] = useState(START_SCORE)
  const [inDanger, setInDanger] = useState(false)
  const [history, setHistory] = useState<Snapshot[]>([])
  const [repCount, setRepCount] = useState(0)
  const [swapCount, setSwapCount] = useState(0)

  function playerById(id: string) { return players.find(p => p.id === id) }

  function startDrill() {
    if (!pendingPasserId) return
    const order = setupOrder.filter(id => id !== pendingPasserId)
    setActivePasserId(pendingPasserId)
    setServerQueue(order)
    setPasserScore(START_SCORE)
    setInDanger(false)
    setStats(blankSet(players))
    setHistory([])
    setRepCount(0)
    setSwapCount(0)
    setPhase('live')
  }

  function logOutcome(outcome: Outcome) {
    if (!activePasserId || serverQueue.length === 0) return
    const serverId = serverQueue[0]
    const snap: Snapshot = { activePasserId, serverQueue: [...serverQueue], passerScore, inDanger, stats }

    const rating = outcome === 'ace' ? 0 : Number(outcome)
    let swap = false
    let newScore = passerScore
    let newDanger = inDanger

    if (outcome === '3') {
      newScore = Math.min(MAX_SCORE, passerScore + 1)
      newDanger = false
    } else if (outcome === '2') {
      if (inDanger) swap = true
    } else if (outcome === '1') {
      if (inDanger) swap = true
      else { newScore = passerScore - 1; newDanger = true }
    } else {
      newScore = passerScore - 1
      swap = true
    }

    const nextStats: SetStats = { ...stats }
    const sp = nextStats[serverId] ?? EMPTY_STATS()
    nextStats[serverId] = { ...sp, serveAttempts: sp.serveAttempts + 1, aces: sp.aces + (outcome === 'ace' ? 1 : 0) }
    const pp = nextStats[activePasserId] ?? EMPTY_STATS()
    nextStats[activePasserId] = {
      ...pp,
      passAttempts: pp.passAttempts + 1,
      passRatingTotal: pp.passRatingTotal + rating,
      passZeroAce: pp.passZeroAce + (outcome === 'ace' ? 1 : 0),
    }

    setHistory(h => [...h, snap])
    setStats(nextStats)
    setRepCount(n => n + 1)

    if (swap) {
      setActivePasserId(serverId)
      setServerQueue([...serverQueue.slice(1), activePasserId])
      setInDanger(false)
      setPasserScore(START_SCORE)
      setSwapCount(n => n + 1)
    } else {
      setServerQueue([...serverQueue.slice(1), serverId])
      setInDanger(newDanger)
      setPasserScore(newScore)
    }
  }

  function undo() {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setActivePasserId(last.activePasserId)
    setServerQueue(last.serverQueue)
    setPasserScore(last.passerScore)
    setInDanger(last.inDanger)
    setStats(last.stats)
    setHistory(history.slice(0, -1))
    setRepCount(n => Math.max(0, n - 1))
  }

  function save() {
    onSave({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: 'Pressure Serve Receive (Danger)',
      teamLabel: '',
      notes: '',
      scrimmages: [stats],
      drillType: 'pressure_serve_receive',
    })
  }

  if (phase === 'setup') {
    return (
      <div className="p-4 max-w-2xl mx-auto pb-8">
        <button onClick={onCancel} className="tap-btn text-pb-400 text-sm mb-4 flex items-center gap-1">
          ← Cancel
        </button>
        <h2 className="text-2xl font-bold text-white mb-1">Pressure Serve Receive (Danger)</h2>
        <p className="text-gray-500 text-sm mb-5">
          Every passer starts at {START_SCORE}. A 3-pass earns a point (capped at {MAX_SCORE}); a 1-pass or ace puts her "in danger" (-1); a 2-pass or 1-pass while in danger swaps her out — the server takes her spot and she joins the back of the server line.
        </p>

        {players.length === 0 ? (
          <p className="text-yellow-400 text-sm">Add players to your roster first.</p>
        ) : (
          <>
            <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
              <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Who Receives First?</p>
              <div className="flex flex-wrap gap-2">
                {players.map(p => (
                  <button key={p.id} onClick={() => setPendingPasserId(p.id)}
                    className={`tap-btn flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 border ${pendingPasserId === p.id ? 'bg-cyan-900/30 border-cyan-500/50' : 'bg-navy-800 border-white/10'}`}>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>{POSITION_LABELS[p.position]}</span>
                    <span className={`text-xs font-medium ${pendingPasserId === p.id ? 'text-cyan-300' : 'text-white'}`}>{p.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Server Line Order</p>
                <button onClick={() => setSetupOrder(shuffle(setupOrder))} className="tap-btn text-vr-300 text-xs font-bold">🔀 Shuffle</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {setupOrder.filter(id => id !== pendingPasserId).map(id => {
                  const p = playerById(id)
                  return p ? (
                    <span key={id} className="bg-navy-800 border border-white/10 rounded-full px-2.5 py-1 text-white text-xs">{p.name}</span>
                  ) : null
                })}
              </div>
            </div>

            <button onClick={startDrill} disabled={!pendingPasserId}
              className="tap-btn w-full bg-vr-600 disabled:opacity-40 text-white font-bold py-4 rounded-xl text-base">
              Start Drill
            </button>
          </>
        )}
      </div>
    )
  }

  const passer = activePasserId ? playerById(activePasserId) : null
  const server = serverQueue.length > 0 ? playerById(serverQueue[0]) : null
  const upNext = serverQueue.slice(1, 4).map(playerById).filter((p): p is Player => !!p)

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <button onClick={onCancel} className="tap-btn text-pb-400 text-sm mb-4 flex items-center gap-1">
        ← Cancel
      </button>

      <h2 className="text-2xl font-bold text-white mb-1">Pressure Serve Receive (Danger)</h2>
      <p className="text-gray-500 text-xs mb-5">{repCount} rep{repCount === 1 ? '' : 's'} · {swapCount} swap{swapCount === 1 ? '' : 's'}</p>

      <div className={`border rounded-2xl p-4 mb-3 ${inDanger ? 'border-red-500/50 bg-red-900/15' : 'border-cyan-500/50 bg-cyan-900/20'}`}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-cyan-300 text-xs font-bold uppercase tracking-widest">🎯 Active Passer</p>
          {inDanger && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-900/40 border border-red-600/50 text-red-300">⚠ IN DANGER</span>}
        </div>
        <p className="text-white font-bold text-lg">{passer?.name ?? '—'}</p>
        <p className="text-white text-2xl font-black mt-1">{passerScore}<span className="text-gray-600 text-base">/{MAX_SCORE}</span></p>
      </div>

      <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 mb-5">
        <p className="text-vr-300 text-xs font-bold uppercase tracking-widest mb-1">🎾 Serving</p>
        <p className="text-white font-bold text-lg mb-2">{server?.name ?? '—'}</p>
        {upNext.length > 0 && (
          <p className="text-gray-600 text-[11px]">Up next: {upNext.map(p => p.name).join(', ')}</p>
        )}
      </div>

      <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 mb-5">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 text-center">Pass Result</p>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <button onClick={() => logOutcome('3')} className="tap-btn py-4 rounded-xl text-sm font-black bg-green-900/40 border border-green-600/50 text-green-300">3-Pass</button>
          <button onClick={() => logOutcome('2')} className="tap-btn py-4 rounded-xl text-sm font-black bg-cyan-900/40 border border-cyan-600/50 text-cyan-300">2-Pass</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => logOutcome('1')} className="tap-btn py-4 rounded-xl text-sm font-black bg-orange-900/40 border border-orange-600/50 text-orange-300">1-Pass</button>
          <button onClick={() => logOutcome('ace')} className="tap-btn py-4 rounded-xl text-sm font-black bg-yellow-900/40 border border-yellow-600/50 text-yellow-300">Ace</button>
        </div>
      </div>

      <button onClick={undo} disabled={history.length === 0}
        className="tap-btn w-full py-2.5 rounded-xl text-xs font-bold bg-navy-700 border border-white/10 text-gray-400 disabled:opacity-30 mb-5">
        ↩ Undo
      </button>

      <button onClick={save}
        className="tap-btn w-full bg-vr-600 text-white font-bold py-4 rounded-xl text-base">
        Save Drill
      </button>
    </div>
  )
}
