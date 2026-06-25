import { useState, useEffect } from 'react'
import type { Player, Match } from './types'
import { loadPlayers, savePlayers, loadMatches, saveMatches } from './utils/storage'
import Roster from './components/Roster'
import LiveGame from './components/LiveGame'
import MatchHistory from './components/MatchHistory'
import SeasonStats from './components/SeasonStats'

type Tab = 'roster' | 'live' | 'history' | 'season'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'roster',  label: 'Roster',  icon: '👥' },
  { id: 'live',    label: 'Live',    icon: '🏐' },
  { id: 'history', label: 'History', icon: '📋' },
  { id: 'season',  label: 'Season',  icon: '📊' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('live')
  const [players, setPlayers] = useState<Player[]>(loadPlayers)
  const [matches, setMatches] = useState<Match[]>(loadMatches)

  useEffect(() => { savePlayers(players) }, [players])
  useEffect(() => { saveMatches(matches) }, [matches])

  function handleSaveMatch(match: Match) {
    setMatches(prev => [...prev, match])
    setTab('history')
  }

  function handleDeleteMatch(id: string) {
    setMatches(prev => prev.filter(m => m.id !== id))
  }

  return (
    <div className="flex flex-col h-screen bg-navy-900 overflow-hidden">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 shrink-0">
        <h1 className="text-white font-bold text-xl tracking-tight">VB Stats</h1>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'roster'  && <Roster players={players} onChange={setPlayers} />}
        {tab === 'live'    && <LiveGame players={players} onSaveMatch={handleSaveMatch} />}
        {tab === 'history' && <MatchHistory matches={matches} players={players} onDelete={handleDeleteMatch} />}
        {tab === 'season'  && <SeasonStats matches={matches} players={players} />}
      </div>

      {/* Bottom nav */}
      <nav className="bg-navy-800 border-t border-white/10 flex shrink-0 safe-area-bottom">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tap-btn flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              tab === t.id ? 'text-blue-400' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-xs font-medium">{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
