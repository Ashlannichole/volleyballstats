import { useState, useEffect } from 'react'
import type { Player, Match } from './types'
import { loadPlayers, savePlayers, loadMatches, saveMatches, loadPractices, savePractices } from './utils/storage'
import { SEED_PLAYERS, SEED_MATCHES } from './utils/seedData'
import Roster from './components/Roster'
import LiveGame from './components/LiveGame'
import MatchHistory from './components/MatchHistory'
import SeasonStats from './components/SeasonStats'
import Practice from './components/Practice'
import type { PracticeSession } from './types'

type Tab = 'roster' | 'live' | 'history' | 'season' | 'practice'

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'roster',   label: 'Roster',    icon: '👥' },
  { id: 'live',     label: 'Live',      icon: '🏐' },
  { id: 'history',  label: 'History',   icon: '📋' },
  { id: 'season',   label: 'Season',    icon: '📊' },
  { id: 'practice', label: 'Practice',  icon: '🎽' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('live')
  const [players, setPlayers] = useState<Player[]>(loadPlayers)
  const [matches, setMatches] = useState<Match[]>(loadMatches)
  const [practices, setPractices] = useState<PracticeSession[]>(loadPractices)

  useEffect(() => { savePlayers(players) }, [players])
  useEffect(() => { saveMatches(matches) }, [matches])
  useEffect(() => { savePractices(practices) }, [practices])

  function handleSaveMatch(match: Match) {
    setMatches(prev => [...prev, match])
    setTab('history')
  }

  function handleDeleteMatch(id: string) {
    setMatches(prev => prev.filter(m => m.id !== id))
  }

  function handleLoadDemo() {
    setPlayers(prev => {
      const existingIds = new Set(prev.map(p => p.id))
      const newPlayers = SEED_PLAYERS.filter(p => !existingIds.has(p.id))
      return [...prev, ...newPlayers]
    })
    setMatches(prev => {
      const existingIds = new Set(prev.map(m => m.id))
      const newMatches = SEED_MATCHES.filter(m => !existingIds.has(m.id))
      return [...prev, ...newMatches]
    })
  }

  function handleClearDemo() {
    const seedPlayerIds = new Set(SEED_PLAYERS.map(p => p.id))
    const seedMatchIds  = new Set(SEED_MATCHES.map(m => m.id))
    setPlayers(prev => prev.filter(p => !seedPlayerIds.has(p.id)))
    setMatches(prev => prev.filter(m => !seedMatchIds.has(m.id)))
  }

  return (
    <div className="flex flex-col h-screen bg-navy-900 overflow-hidden">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 shrink-0 flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill="#4a1d8a" />
          <text x="16" y="22" textAnchor="middle" fontSize="18" fill="#87cde3">⚔</text>
        </svg>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight tracking-tight">Viking Roots</h1>
          <p className="text-pb-400 text-xs font-medium leading-none">Volleyball Stats</p>
        </div>
      </div>

      {/* Content — all tabs stay mounted; hidden hides inactive ones so Live game state persists */}
      <div className="flex-1 overflow-y-auto relative">
        <div className={tab === 'roster'  ? '' : 'hidden'}><Roster players={players} onChange={setPlayers} /></div>
        <div className={tab === 'live'    ? 'h-full flex flex-col' : 'hidden'}>
          <LiveGame players={players} onSaveMatch={handleSaveMatch} />
        </div>
        <div className={tab === 'history' ? '' : 'hidden'}><MatchHistory matches={matches} players={players} onDelete={handleDeleteMatch} onLoadDemo={handleLoadDemo} onClearDemo={handleClearDemo} /></div>
        <div className={tab === 'season'   ? '' : 'hidden'}><SeasonStats matches={matches} players={players} /></div>
        <div className={tab === 'practice' ? 'h-full flex flex-col' : 'hidden'}>
          <Practice
            players={players}
            sessions={practices}
            onSave={s => setPractices(prev => [...prev, s])}
            onDelete={id => setPractices(prev => prev.filter(p => p.id !== id))}
          />
        </div>
      </div>

      {/* Bottom nav */}
      <nav className="bg-navy-800 border-t border-white/10 flex shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`tap-btn flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
              tab === t.id ? 'text-pb-400' : 'text-gray-500'
            }`}
          >
            <span className="text-xl">{t.icon}</span>
            <span className="text-xs font-medium">{t.label}</span>
            {tab === t.id && <span className="w-4 h-0.5 rounded-full bg-vr-500 mt-0.5" />}
          </button>
        ))}
      </nav>
    </div>
  )
}
