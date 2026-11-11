import { useState } from 'react'
import type { Player, Match, PracticeSession, SetStats } from '../types'
import { EMPTY_STATS, POSITION_LABELS, POSITION_COLORS } from '../types'
import { computeImpactScores, initialTwoTeams, type PresetTeams } from '../utils/teamSplit'

interface Props {
  players: Player[]
  matches: Match[]
  practices: PracticeSession[]
  presetTeams?: PresetTeams | null
  onSave: (s: PracticeSession) => void
  onCancel: () => void
}

type Outcome = 'ace' | 'error' | 0 | 1 | 2 | 3

interface RepEvent {
  serverId: string
  passerId?: string
  outcome: Outcome
  serverDelta: number
  passerDelta: number
}

function blankSet(players: Player[]): SetStats {
  const s: SetStats = {}
  for (const p of players) s[p.id] = EMPTY_STATS()
  return s
}

// Server scoring: ace or a 1-pass = +1; missed serve = -1.
// Passer scoring: 3-pass = +1; 0-pass (incl. an ace) = -1; missed serve = +1; 2-pass is a wash.
function scoreDeltas(outcome: Outcome): { serverDelta: number; passerDelta: number } {
  if (outcome === 'error') return { serverDelta: -1, passerDelta: 1 }
  if (outcome === 'ace') return { serverDelta: 1, passerDelta: -1 }
  if (outcome === 0) return { serverDelta: 0, passerDelta: -1 }
  if (outcome === 1) return { serverDelta: 1, passerDelta: 0 }
  if (outcome === 3) return { serverDelta: 0, passerDelta: 1 }
  return { serverDelta: 0, passerDelta: 0 } // 2-pass: wash
}

export default function ServersVsPassersDrill({ players, matches, practices, presetTeams, onSave, onCancel }: Props) {
  const scores = computeImpactScores(players, matches, practices)
  const [teamA, teamB] = initialTwoTeams(players, scores, presetTeams)

  const [serversIsA, setServersIsA] = useState(true)
  const serverTeam = serversIsA ? teamA : teamB
  const passerTeam = serversIsA ? teamB : teamA

  const [stats, setStats] = useState<SetStats>(() => blankSet(players))
  const [serverScore, setServerScore] = useState(0)
  const [passerScore, setPasserScore] = useState(0)
  const [history, setHistory] = useState<RepEvent[]>([])
  const [currentServerId, setCurrentServerId] = useState<string | null>(serverTeam.playerIds[0] ?? null)
  const [pendingOutcome, setPendingOutcome] = useState<Outcome | null>(null)
  const [winner, setWinner] = useState<'servers' | 'passers' | null>(null)

  function playerById(id: string) { return players.find(p => p.id === id) }
  const serverPlayers = serverTeam.playerIds.map(playerById).filter((p): p is Player => !!p)
  const passerPlayers = passerTeam.playerIds.map(playerById).filter((p): p is Player => !!p)

  function chooseOutcome(outcome: Outcome) {
    if (!currentServerId) return
    if (outcome === 'error') {
      logRep(outcome, undefined)
    } else {
      setPendingOutcome(outcome)
    }
  }

  function choosePasser(passerId: string) {
    if (pendingOutcome === null || !currentServerId) return
    logRep(pendingOutcome, passerId)
    setPendingOutcome(null)
  }

  function logRep(outcome: Outcome, passerId: string | undefined) {
    if (!currentServerId) return
    const { serverDelta, passerDelta } = scoreDeltas(outcome)

    setStats(prev => {
      const next = { ...prev }
      const sp = next[currentServerId] ?? EMPTY_STATS()
      next[currentServerId] = {
        ...sp,
        serveAttempts: sp.serveAttempts + 1,
        aces: sp.aces + (outcome === 'ace' ? 1 : 0),
        serveErrors: sp.serveErrors + (outcome === 'error' ? 1 : 0),
      }
      if (passerId && outcome !== 'error') {
        const pp = next[passerId] ?? EMPTY_STATS()
        const rating = outcome === 'ace' ? 0 : outcome
        next[passerId] = {
          ...pp,
          passAttempts: pp.passAttempts + 1,
          passRatingTotal: pp.passRatingTotal + rating,
          passZeroAce: pp.passZeroAce + (outcome === 'ace' ? 1 : 0),
        }
      }
      return next
    })
    setServerScore(s => s + serverDelta)
    setPasserScore(s => s + passerDelta)
    setHistory(h => [...h, { serverId: currentServerId, passerId, outcome, serverDelta, passerDelta }])
  }

  function undo() {
    if (history.length === 0) return
    const last = history[history.length - 1]
    setStats(prev => {
      const next = { ...prev }
      const sp = next[last.serverId]
      if (sp) {
        next[last.serverId] = {
          ...sp,
          serveAttempts: Math.max(0, sp.serveAttempts - 1),
          aces: Math.max(0, sp.aces - (last.outcome === 'ace' ? 1 : 0)),
          serveErrors: Math.max(0, sp.serveErrors - (last.outcome === 'error' ? 1 : 0)),
        }
      }
      if (last.passerId && last.outcome !== 'error') {
        const pp = next[last.passerId]
        if (pp) {
          const rating = last.outcome === 'ace' ? 0 : last.outcome
          next[last.passerId] = {
            ...pp,
            passAttempts: Math.max(0, pp.passAttempts - 1),
            passRatingTotal: pp.passRatingTotal - rating,
            passZeroAce: Math.max(0, pp.passZeroAce - (last.outcome === 'ace' ? 1 : 0)),
          }
        }
      }
      return next
    })
    setServerScore(s => s - last.serverDelta)
    setPasserScore(s => s - last.passerDelta)
    setHistory(history.slice(0, -1))
  }

  function save() {
    onSave({
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      name: 'Servers vs Passers',
      teamLabel: '',
      notes: '',
      scrimmages: [stats],
      drillType: 'servers_vs_passers',
      serversVsPassers: { serverTeam, passerTeam, serverScore, passerScore, winner },
    })
  }

  return (
    <div className="p-4 max-w-2xl mx-auto pb-8">
      <button onClick={onCancel} className="tap-btn text-pb-400 text-sm mb-4 flex items-center gap-1">
        ← Cancel
      </button>

      <h2 className="text-2xl font-bold text-white mb-1">Servers vs Passers</h2>
      <p className="text-gray-500 text-sm mb-5">
        Ace or a 1-pass scores servers; a 3-pass scores passers; a missed serve scores passers; a 0-pass (or an ace) costs passers; 2-pass is a wash. Per-player reps count toward each girl's season stats.
      </p>

      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Who Serves First?</p>
        <div className="flex gap-2 mb-3">
          <button onClick={() => { setServersIsA(true); setCurrentServerId(teamA.playerIds[0] ?? null) }}
            className={`tap-btn flex-1 py-2.5 rounded-xl text-sm font-bold border ${serversIsA ? 'bg-vr-600 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
            {teamA.name}
          </button>
          <button onClick={() => { setServersIsA(false); setCurrentServerId(teamB.playerIds[0] ?? null) }}
            className={`tap-btn flex-1 py-2.5 rounded-xl text-sm font-bold border ${!serversIsA ? 'bg-vr-600 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
            {teamB.name}
          </button>
        </div>
        <p className="text-gray-600 text-[10px]">
          {presetTeams && (presetTeams.team1.length > 0 || presetTeams.team2.length > 0)
            ? "Using today's Team 1 / Team 2 split."
            : 'Auto-split by season stats.'}
        </p>
      </div>

      {/* Running score */}
      <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 mb-4 flex items-center justify-around text-center">
        <div>
          <p className="text-vr-300 text-3xl font-black leading-none">{serverScore}</p>
          <p className="text-gray-500 text-xs mt-0.5">{serverTeam.name} (serving)</p>
        </div>
        <div className="text-gray-600 text-xl font-bold">–</div>
        <div>
          <p className="text-cyan-300 text-3xl font-black leading-none">{passerScore}</p>
          <p className="text-gray-500 text-xs mt-0.5">{passerTeam.name} (passing)</p>
        </div>
      </div>

      {/* Who's serving */}
      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-4">
        <p className="text-vr-300 text-xs font-bold uppercase tracking-widest mb-2">Who's Serving?</p>
        <div className="flex flex-wrap gap-2">
          {serverPlayers.map(p => (
            <button key={p.id} onClick={() => setCurrentServerId(p.id)}
              className={`tap-btn flex items-center gap-1.5 rounded-full pl-1 pr-2.5 py-1 border ${currentServerId === p.id ? 'bg-vr-700 border-vr-500' : 'bg-navy-800 border-white/10'}`}>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>{POSITION_LABELS[p.position]}</span>
              <span className="text-white text-xs font-medium">{p.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Outcome or passer prompt */}
      {pendingOutcome === null ? (
        <div className="bg-navy-800 border border-white/10 rounded-2xl p-4 mb-4">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-2 text-center">What happened?</p>
          <div className="grid grid-cols-3 gap-1.5 mb-1.5">
            <button onClick={() => chooseOutcome('ace')} disabled={!currentServerId}
              className="tap-btn py-3.5 rounded-xl text-sm font-black bg-yellow-900/40 border border-yellow-600/50 text-yellow-300 disabled:opacity-30">Ace</button>
            <button onClick={() => chooseOutcome('error')} disabled={!currentServerId}
              className="tap-btn py-3.5 rounded-xl text-sm font-black bg-red-900/40 border border-red-600/50 text-red-300 disabled:opacity-30">Error</button>
            <button onClick={() => chooseOutcome(2)} disabled={!currentServerId}
              className="tap-btn py-3.5 rounded-xl text-sm font-black bg-cyan-900/40 border border-cyan-600/50 text-cyan-300 disabled:opacity-30">2-Pass</button>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button onClick={() => chooseOutcome(0)} disabled={!currentServerId}
              className="tap-btn py-3.5 rounded-xl text-sm font-black bg-navy-700 border border-white/10 text-gray-300 disabled:opacity-30">0-Pass</button>
            <button onClick={() => chooseOutcome(1)} disabled={!currentServerId}
              className="tap-btn py-3.5 rounded-xl text-sm font-black bg-orange-900/40 border border-orange-600/50 text-orange-300 disabled:opacity-30">1-Pass</button>
            <button onClick={() => chooseOutcome(3)} disabled={!currentServerId}
              className="tap-btn py-3.5 rounded-xl text-sm font-black bg-green-900/40 border border-green-600/50 text-green-300 disabled:opacity-30">3-Pass</button>
          </div>
        </div>
      ) : (
        <div className="bg-navy-800 border border-vr-500/40 rounded-2xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-vr-300 text-xs font-bold uppercase tracking-widest">Who received it?</p>
            <button onClick={() => setPendingOutcome(null)} className="tap-btn text-gray-500 text-xs">Cancel</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {passerPlayers.map(p => (
              <button key={p.id} onClick={() => choosePasser(p.id)}
                className="tap-btn flex items-center gap-1.5 bg-cyan-900/30 border border-cyan-500/50 rounded-full pl-1 pr-2.5 py-1.5">
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${POSITION_COLORS[p.position]}`}>{POSITION_LABELS[p.position]}</span>
                <span className="text-white text-xs font-medium">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={undo} disabled={history.length === 0}
        className="tap-btn w-full py-2.5 rounded-xl text-xs font-bold bg-navy-700 border border-white/10 text-gray-400 disabled:opacity-30 mb-5">
        ↩ Undo ({history.length} rep{history.length === 1 ? '' : 's'})
      </button>

      <div className="bg-navy-700 border border-white/10 rounded-2xl p-4 mb-5">
        <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-3">Who Won?</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setWinner('servers')}
            className={`tap-btn px-4 py-2.5 rounded-xl text-sm font-bold border ${winner === 'servers' ? 'bg-green-700 border-green-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
            🏆 {serverTeam.name}
          </button>
          <button onClick={() => setWinner('passers')}
            className={`tap-btn px-4 py-2.5 rounded-xl text-sm font-bold border ${winner === 'passers' ? 'bg-green-700 border-green-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
            🏆 {passerTeam.name}
          </button>
          <button onClick={() => setWinner(null)}
            className={`tap-btn px-4 py-2.5 rounded-xl text-sm font-bold border ${winner === null ? 'bg-vr-700 border-vr-500 text-white' : 'bg-navy-600 border-white/10 text-gray-400'}`}>
            Tie / No Winner
          </button>
        </div>
      </div>

      <button onClick={save}
        className="tap-btn w-full bg-vr-600 text-white font-bold py-4 rounded-xl text-base">
        Save Drill
      </button>
    </div>
  )
}
