import { useState } from 'react'
import type { Player, Match, PracticeSession } from '../types'
import Practice from './Practice'
import Scouting from './Scouting'
import Calendar from './Calendar'

type ToolId = 'practice' | 'scout' | 'calendar' | 'planner' | 'ai'

interface Props {
  isPro: boolean
  onUpgrade: () => void
  players: Player[]
  matches: Match[]
  practices: PracticeSession[]
  onSavePractice: (s: PracticeSession) => void
  onDeletePractice: (id: string) => void
}

const TOOLS: {
  id: ToolId
  icon: string
  label: string
  description: string
  available: boolean
}[] = [
  { id: 'practice',  icon: '🎽', label: 'Practice Tracker',  description: 'Log drills, track reps, review stats',      available: true  },
  { id: 'scout',     icon: '🔍', label: 'Opponent Scouting', description: 'Chart hits, build heat maps, spot patterns', available: true  },
  { id: 'calendar',  icon: '📅', label: 'Team Calendar',     description: 'Match schedule with your stats at a glance', available: true  },
  { id: 'planner',   icon: '📋', label: 'Practice Planner',  description: 'Build and save practice plans',              available: false },
  { id: 'ai',        icon: '🤖', label: 'AI Suggestions',    description: 'Personalized drills based on your stats',    available: false },
]

export default function Tools({ isPro, onUpgrade, players, matches, practices, onSavePractice, onDeletePractice }: Props) {
  const [active, setActive] = useState<ToolId | null>(null)

  function back() { setActive(null) }

  if (active === 'practice') return (
    <div className="h-full flex flex-col">
      <ToolHeader label="Practice Tracker" onBack={back} />
      <div className="flex-1 overflow-y-auto">
        <Practice players={players} sessions={practices} onSave={onSavePractice} onDelete={onDeletePractice} />
      </div>
    </div>
  )

  if (active === 'scout') return (
    <div className="h-full flex flex-col">
      <Scouting isPro={isPro} onUpgrade={onUpgrade} />
    </div>
  )

  if (active === 'calendar') return (
    <div className="h-full flex flex-col">
      <ToolHeader label="Team Calendar" onBack={back} />
      <div className="flex-1 overflow-y-auto">
        <Calendar matches={matches} />
      </div>
    </div>
  )

  // ── Hub ──────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 flex flex-col gap-4 pb-10">
      <div className="text-center mt-4 mb-1">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Pro Tools</p>
        <h2 className="text-2xl font-bold text-white">Tools</h2>
      </div>

      {!isPro && (
        <div className="bg-vr-900/40 border border-vr-600/30 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">⚡</span>
          <div className="flex-1">
            <p className="text-vr-300 font-bold text-sm">Unlock all Pro Tools</p>
            <p className="text-gray-500 text-xs">Scouting, calendar, practice planner, AI suggestions</p>
          </div>
          <button onClick={onUpgrade}
            className="tap-btn bg-vr-700 border border-vr-500 rounded-xl px-3 py-2 text-white text-xs font-bold shrink-0">
            Upgrade
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {TOOLS.map(tool => {
          const locked = !isPro
          const comingSoon = !tool.available

          return (
            <button key={tool.id}
              onClick={() => {
                if (locked)      { onUpgrade(); return }
                if (comingSoon)  { return }
                setActive(tool.id)
              }}
              className={`tap-btn w-full bg-navy-800 border rounded-2xl p-4 flex items-center gap-4 text-left transition-all ${
                locked || comingSoon ? 'border-white/8 opacity-70' : 'border-white/10 active:scale-[0.98]'
              }`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                comingSoon ? 'bg-navy-700/60' : 'bg-navy-700'
              }`}>
                {tool.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-white font-bold text-sm">{tool.label}</p>
                  {comingSoon && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-pb-900/50 border border-pb-600/40 text-pb-400">
                      SOON
                    </span>
                  )}
                  {locked && !comingSoon && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-vr-900/50 border border-vr-600/40 text-vr-400">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-gray-500 text-xs mt-0.5">{tool.description}</p>
              </div>
              {!comingSoon && (
                <span className={`text-lg shrink-0 ${locked ? 'text-gray-700' : 'text-gray-600'}`}>
                  {locked ? '🔒' : '›'}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function ToolHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <div className="bg-navy-800 border-b border-white/10 px-4 py-3 flex items-center shrink-0">
      <button onClick={onBack} className="tap-btn text-gray-400 text-sm">← Tools</button>
      <p className="flex-1 text-center text-white font-bold text-sm">{label}</p>
      <div className="w-16" />
    </div>
  )
}
