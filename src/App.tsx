import { useState, useEffect } from 'react'
import type { Player, Match } from './types'
import { loadPlayers, savePlayers, loadMatches, saveMatches, loadPractices, savePractices } from './utils/storage'
import { loadTier } from './utils/tier'
import type { Tier } from './utils/tier'
import { loadSettings, applyColorVars } from './utils/settings'
import type { TeamSettings } from './utils/settings'
import { SEED_PLAYERS, SEED_MATCHES, SEED_PRACTICES } from './utils/seedData'
import Roster from './components/Roster'
import LiveGame from './components/LiveGame'
import MatchHistory from './components/MatchHistory'
import SeasonStats from './components/SeasonStats'
import Practice from './components/Practice'
import SettingsPage from './components/Settings'
import AdBanner from './components/AdBanner'
import { useUpgradeModal } from './components/UpgradePrompt'
import type { PracticeSession } from './types'

type Tab = 'roster' | 'live' | 'history' | 'season' | 'practice' | 'settings'

export default function App() {
  const [tab, setTab]           = useState<Tab>('live')
  const [players, setPlayers]   = useState<Player[]>(loadPlayers)
  const [matches, setMatches]   = useState<Match[]>(loadMatches)
  const [practices, setPractices] = useState<PracticeSession[]>(loadPractices)
  const [tier, setTier]         = useState<Tier>(loadTier)
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(() => {
    const s = loadSettings()
    applyColorVars(s)
    return s
  })

  const isPro = tier === 'pro'
  const teamName = isPro ? teamSettings.teamName : 'My Team'

  const { openModal, modal } = useUpgradeModal((t) => setTier(t))

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
    setPractices(prev => {
      const existingIds = new Set(prev.map(p => p.id))
      const newPractices = SEED_PRACTICES.filter(p => !existingIds.has(p.id))
      return [...prev, ...newPractices]
    })
  }

  function handleClearDemo() {
    const seedPlayerIds   = new Set(SEED_PLAYERS.map(p => p.id))
    const seedMatchIds    = new Set(SEED_MATCHES.map(m => m.id))
    const seedPracticeIds = new Set(SEED_PRACTICES.map(p => p.id))
    setPlayers(prev => prev.filter(p => !seedPlayerIds.has(p.id)))
    setMatches(prev => prev.filter(m => !seedMatchIds.has(m.id)))
    setPractices(prev => prev.filter(p => !seedPracticeIds.has(p.id)))
  }

  // Live game is the only screen where we suppress the ad banner
  const [liveGameStarted, setLiveGameStarted] = useState(false)
  const showAd = !isPro && !(tab === 'live' && liveGameStarted)

  const TABS: { id: Tab; label: string; icon: string; proOnly?: boolean }[] = [
    { id: 'roster',   label: 'Roster',   icon: '👥' },
    { id: 'live',     label: 'Live',     icon: '🏐' },
    { id: 'history',  label: 'History',  icon: '📋' },
    { id: 'season',   label: 'Season',   icon: '📊' },
    { id: 'practice', label: 'Practice', icon: '🎽', proOnly: true },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  return (
    <div className="flex flex-col h-screen bg-navy-900 overflow-hidden">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 shrink-0 flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill={teamSettings.primaryColor} />
          <text x="16" y="22" textAnchor="middle" fontSize="18" fill={teamSettings.secondaryColor}>
            {isPro ? '⚔' : '🏐'}
          </text>
        </svg>
        <div className="flex-1">
          <h1 className="text-white font-bold text-lg leading-tight tracking-tight">{teamName}</h1>
          <p className="text-pb-400 text-xs font-medium leading-none">Volleyball Stats</p>
        </div>
        {/* Pro badge / upgrade button */}
        {isPro ? (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-vr-800 border border-vr-500/40 text-vr-300">
            ⚡ Pro
          </span>
        ) : (
          <button onClick={openModal}
            className="tap-btn text-xs font-bold px-3 py-1.5 rounded-full bg-vr-700 text-white border border-vr-500">
            Upgrade ⚡
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative min-h-0">
        <div className={tab === 'roster'  ? '' : 'hidden'}>
          <Roster players={players} onChange={setPlayers} />
        </div>
        <div className={tab === 'live' ? 'h-full flex flex-col' : 'hidden'}>
          <LiveGame
            players={players}
            onSaveMatch={handleSaveMatch}
            onGameStartedChange={setLiveGameStarted}
            isPro={isPro}
            teamName={teamName}
          />
        </div>
        <div className={tab === 'history' ? '' : 'hidden'}>
          <MatchHistory
            matches={matches}
            players={players}
            onDelete={handleDeleteMatch}
            onLoadDemo={handleLoadDemo}
            onClearDemo={handleClearDemo}
            isPro={isPro}
            onUpgrade={openModal}
          />
        </div>
        <div className={tab === 'season' ? '' : 'hidden'}>
          <SeasonStats matches={matches} players={players} isPro={isPro} onUpgrade={openModal} />
        </div>
        <div className={tab === 'practice' ? 'h-full flex flex-col' : 'hidden'}>
          <Practice
            players={players}
            sessions={practices}
            onSave={s => setPractices(prev => [...prev, s])}
            onDelete={id => setPractices(prev => prev.filter(p => p.id !== id))}
          />
        </div>
        <div className={tab === 'settings' ? '' : 'hidden'}>
          <SettingsPage
            settings={teamSettings}
            onSettingsChange={setTeamSettings}
            isPro={isPro}
            onUpgrade={openModal}
          />
        </div>
      </div>

      {/* Ad banner — hidden during live tracking */}
      {showAd && <AdBanner />}

      {/* Bottom nav */}
      <nav className="bg-navy-800 border-t border-white/10 flex shrink-0">
        {TABS.map(t => {
          const locked = t.proOnly && !isPro
          return (
            <button
              key={t.id}
              onClick={() => locked ? openModal() : setTab(t.id)}
              className={`tap-btn flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${
                tab === t.id && !locked ? 'text-pb-400' : locked ? 'text-gray-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="text-[10px] font-medium">{t.label}</span>
              {locked
                ? <span className="text-[9px] text-vr-500 font-bold">PRO</span>
                : tab === t.id && <span className="w-4 h-0.5 rounded-full bg-vr-500 mt-0.5" />
              }
            </button>
          )
        })}
      </nav>

      {modal}
    </div>
  )
}
