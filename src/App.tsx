import { useState, useEffect, useRef } from 'react'
import type { Player, Match } from './types'
import {
  loadPlayers, savePlayers, loadMatches, saveMatches, loadPractices, savePractices,
  loadPlayers2, savePlayers2, loadMatches2, saveMatches2, loadPractices2, savePractices2,
} from './utils/storage'
import { loadTier } from './utils/tier'
import type { Tier } from './utils/tier'
import { loadSettings, saveSettings, applyColorVars, loadCoachTeam, saveCoachTeam } from './utils/settings'
import type { TeamSettings, CoachTeam } from './utils/settings'
import { loadSession, saveSession, pushUserData, pullUserData } from './utils/auth'
import type { Session } from './utils/auth'
import { SEED_PLAYERS, SEED_MATCHES, SEED_PRACTICES } from './utils/seedData'
import AuthScreen from './components/AuthScreen'
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
  const [session, setSession]     = useState<Session | null>(loadSession)
  const [syncing, setSyncing]     = useState(false)
  const [syncError, setSyncError] = useState('')

  const [tab, setTab] = useState<Tab>('live')
  const [tier, setTier] = useState<Tier>(loadTier)
  const [teamSettings, setTeamSettings] = useState<TeamSettings>(() => {
    const s = loadSettings()
    applyColorVars(s)
    return s
  })
  const [coachTeam, setCoachTeam] = useState<CoachTeam | null>(loadCoachTeam)

  // Team 1 data
  const [players,   setPlayers]   = useState<Player[]>(loadPlayers)
  const [matches,   setMatches]   = useState<Match[]>(loadMatches)
  const [practices, setPractices] = useState<PracticeSession[]>(loadPractices)

  // Team 2 data (Pro only)
  const [players2,   setPlayers2]   = useState<Player[]>(loadPlayers2)
  const [matches2,   setMatches2]   = useState<Match[]>(loadMatches2)
  const [practices2, setPractices2] = useState<PracticeSession[]>(loadPractices2)

  const isPro       = tier === 'pro'
  const activeTeam  = isPro ? (teamSettings.activeTeam ?? 1) : 1
  const recMode     = teamSettings.recMode ?? false

  // Active dataset — everything else reads from these
  const activePlayers   = activeTeam === 2 ? players2   : players
  const activeMatches   = activeTeam === 2 ? matches2   : matches
  const activePractices = activeTeam === 2 ? practices2 : practices
  const setActivePlayers   = activeTeam === 2 ? setPlayers2   : setPlayers
  const setActiveMatches   = activeTeam === 2 ? setMatches2   : setMatches
  const setActivePractices = activeTeam === 2 ? setPractices2 : setPractices

  const activeTeamName = isPro
    ? (activeTeam === 2 ? teamSettings.team2Name : teamSettings.teamName)
    : 'My Team'

  const { openModal, modal } = useUpgradeModal((t) => setTier(t))

  // Persist to localStorage whenever data changes
  useEffect(() => { savePlayers(players) },     [players])
  useEffect(() => { saveMatches(matches) },     [matches])
  useEffect(() => { savePractices(practices) }, [practices])
  useEffect(() => { savePlayers2(players2) },     [players2])
  useEffect(() => { saveMatches2(matches2) },     [matches2])
  useEffect(() => { savePractices2(practices2) }, [practices2])

  // Debounced push to server on any data change
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function schedulePush(
    m: Match[], p: Player[], pr: PracticeSession[],
    m2: Match[], p2: Player[], pr2: PracticeSession[],
    s: TeamSettings,
  ) {
    if (!session) return
    if (pushTimer.current) clearTimeout(pushTimer.current)
    pushTimer.current = setTimeout(() => {
      pushUserData(session.token, {
        matches: m,  players: p,  practices: pr,
        matches2: m2, players2: p2, practices2: pr2,
        settings: s,
      })
    }, 1500)
  }

  useEffect(() => {
    if (session) schedulePush(matches, players, practices, matches2, players2, practices2, teamSettings)
  }, [matches, players, practices, matches2, players2, practices2, teamSettings])

  // On sign-in: pull server data, merge with local
  async function handleSignIn(s: Session) {
    setSession(s)
    setSyncing(true)
    setSyncError('')
    try {
      const remote = await pullUserData(s.token) as {
        matches: Match[]; players: Player[]; practices: PracticeSession[]
        matches2?: Match[]; players2?: Player[]; practices2?: PracticeSession[]
        settings?: TeamSettings
      }

      function merge<T extends { id: string }>(remote: T[], local: T[]): T[] {
        const remoteIds = new Set(remote.map(x => x.id))
        return [...remote, ...local.filter(x => !remoteIds.has(x.id))]
      }

      const mM   = merge(remote.matches   ?? [], matches)
      const mP   = merge(remote.players   ?? [], players)
      const mPr  = merge(remote.practices ?? [], practices)
      const mM2  = merge(remote.matches2  ?? [], matches2)
      const mP2  = merge(remote.players2  ?? [], players2)
      const mPr2 = merge(remote.practices2 ?? [], practices2)

      setMatches(mM);   setPlayers(mP);   setPractices(mPr)
      setMatches2(mM2); setPlayers2(mP2); setPractices2(mPr2)
      if (remote.settings) handleSettingsChange(remote.settings)

      await pushUserData(s.token, {
        matches: mM, players: mP, practices: mPr,
        matches2: mM2, players2: mP2, practices2: mPr2,
        settings: remote.settings ?? teamSettings,
      })
    } catch (e) {
      if (e instanceof Error && e.message === 'session_expired') {
        saveSession(null); setSession(null)
      } else {
        setSyncError("Couldn't sync — working offline.")
      }
    } finally {
      setSyncing(false)
    }
  }

  async function handleSyncNow() {
    if (!session) return
    const remote = await pullUserData(session.token) as {
      matches: Match[]; players: Player[]; practices: PracticeSession[]
      matches2?: Match[]; players2?: Player[]; practices2?: PracticeSession[]
      settings?: TeamSettings
    }
    function merge<T extends { id: string }>(rem: T[], local: T[]): T[] {
      const remIds = new Set(rem.map(x => x.id))
      return [...rem, ...local.filter(x => !remIds.has(x.id))]
    }
    const mM   = merge(remote.matches   ?? [], matches)
    const mP   = merge(remote.players   ?? [], players)
    const mPr  = merge(remote.practices ?? [], practices)
    const mM2  = merge(remote.matches2  ?? [], matches2)
    const mP2  = merge(remote.players2  ?? [], players2)
    const mPr2 = merge(remote.practices2 ?? [], practices2)
    setMatches(mM);   setPlayers(mP);   setPractices(mPr)
    setMatches2(mM2); setPlayers2(mP2); setPractices2(mPr2)
    if (remote.settings) handleSettingsChange(remote.settings)
  }

  function handleSignOut() {
    if (session) fetch('/api/auth?action=signout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: session.token }),
    }).catch(() => {})
    saveSession(null)
    setSession(null)
  }

  function handleSettingsChange(s: TeamSettings) {
    saveSettings(s)
    applyColorVars(s)
    setTeamSettings(s)
  }

  function handleCoachTeamChange(t: CoachTeam | null) {
    saveCoachTeam(t); setCoachTeam(t)
  }

  function handleSaveMatch(match: Match) {
    setActiveMatches(prev => [...prev, match])
    setTab('history')
  }

  function handleDeleteMatch(id: string) {
    setActiveMatches(prev => prev.filter(m => m.id !== id))
  }

  function handleSyncMatches(newMatches: Match[]) {
    if (newMatches.length === 0) return
    setActiveMatches(prev => [...prev, ...newMatches])
  }

  function handleLoadDemo() {
    setActivePlayers(prev => {
      const ids = new Set(prev.map(p => p.id))
      return [...prev, ...SEED_PLAYERS.filter(p => !ids.has(p.id))]
    })
    setActiveMatches(prev => {
      const ids = new Set(prev.map(m => m.id))
      return [...prev, ...SEED_MATCHES.filter(m => !ids.has(m.id))]
    })
    setActivePractices(prev => {
      const ids = new Set(prev.map(p => p.id))
      return [...prev, ...SEED_PRACTICES.filter(p => !ids.has(p.id))]
    })
  }

  function handleClearDemo() {
    const pIds  = new Set(SEED_PLAYERS.map(p => p.id))
    const mIds  = new Set(SEED_MATCHES.map(m => m.id))
    const prIds = new Set(SEED_PRACTICES.map(p => p.id))
    setActivePlayers(prev => prev.filter(p => !pIds.has(p.id)))
    setActiveMatches(prev => prev.filter(m => !mIds.has(m.id)))
    setActivePractices(prev => prev.filter(p => !prIds.has(p.id)))
  }

  const [liveGameStarted, setLiveGameStarted] = useState(false)
  const showAd = !isPro && !(tab === 'live' && liveGameStarted)

  // --- Auth gate ---
  if (!session) return <AuthScreen onSignIn={handleSignIn} />

  if (syncing) {
    return (
      <div className="min-h-screen bg-navy-900 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-vr-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Syncing your stats…</p>
      </div>
    )
  }

  const TABS: { id: Tab; label: string; icon: string; proOnly?: boolean }[] = [
    { id: 'roster',   label: 'Roster',   icon: '👥' },
    { id: 'live',     label: 'Live',     icon: '🏐' },
    { id: 'history',  label: 'History',  icon: '📋' },
    { id: 'season',   label: 'Season',   icon: '📊' },
    { id: 'practice', label: 'Practice', icon: '🎽', proOnly: true },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ]

  const hasTeam2 = isPro && (players2.length > 0 || teamSettings.team2Name !== 'Team 2')

  return (
    <div className="flex flex-col h-dvh bg-navy-900 overflow-hidden">
      {/* Header */}
      <div className="bg-navy-800 border-b border-white/10 px-4 py-3 shrink-0 flex items-center gap-3">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="16" cy="16" r="16" fill={teamSettings.primaryColor} />
          <text x="16" y="22" textAnchor="middle" fontSize="18" fill={teamSettings.secondaryColor}>
            {isPro ? '⚔' : '🏐'}
          </text>
        </svg>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-white font-bold text-lg leading-tight tracking-tight truncate">
              {activeTeamName}
            </h1>
            {recMode && (
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-green-800/60 border border-green-600/40 text-green-300 shrink-0">
                REC
              </span>
            )}
          </div>
          <p className="text-pb-400 text-xs font-medium leading-none truncate">
            {syncError
              ? <span className="text-yellow-500">{syncError}</span>
              : hasTeam2
                ? <button onClick={() => handleSettingsChange({ ...teamSettings, activeTeam: activeTeam === 1 ? 2 : 1 })}
                    className="tap-btn text-pb-400 underline underline-offset-2">
                    {activeTeam === 1 ? `Switch to ${teamSettings.team2Name}` : `Switch to ${teamSettings.teamName}`}
                  </button>
                : coachTeam && isPro ? 'Volleyball Stats · 👥 Team' : 'Volleyball Stats'
            }
          </p>
        </div>
        {isPro ? (
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-vr-800 border border-vr-500/40 text-vr-300 shrink-0">
            ⚡ Pro
          </span>
        ) : (
          <button onClick={openModal}
            className="tap-btn text-xs font-bold px-3 py-1.5 rounded-full bg-vr-700 text-white border border-vr-500 shrink-0">
            Upgrade ⚡
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative min-h-0">
        <div className={tab === 'roster' ? '' : 'hidden'}>
          <Roster players={activePlayers} onChange={setActivePlayers} />
        </div>
        <div className={tab === 'live' ? 'h-full flex flex-col' : 'hidden'}>
          <LiveGame
            players={activePlayers}
            onSaveMatch={handleSaveMatch}
            onGameStartedChange={setLiveGameStarted}
            isPro={isPro}
            teamName={activeTeamName}
            recMode={recMode}
          />
        </div>
        <div className={tab === 'history' ? '' : 'hidden'}>
          <MatchHistory
            matches={activeMatches}
            players={activePlayers}
            onDelete={handleDeleteMatch}
            onLoadDemo={handleLoadDemo}
            onClearDemo={handleClearDemo}
            isPro={isPro}
            onUpgrade={openModal}
          />
        </div>
        <div className={tab === 'season' ? '' : 'hidden'}>
          <SeasonStats matches={activeMatches} players={activePlayers} isPro={isPro} onUpgrade={openModal} />
        </div>
        <div className={tab === 'practice' ? 'h-full flex flex-col' : 'hidden'}>
          <Practice
            players={activePlayers}
            sessions={activePractices}
            onSave={s => setActivePractices(prev => [...prev, s])}
            onDelete={id => setActivePractices(prev => prev.filter(p => p.id !== id))}
          />
        </div>
        <div className={tab === 'settings' ? '' : 'hidden'}>
          <SettingsPage
            settings={teamSettings}
            onSettingsChange={handleSettingsChange}
            isPro={isPro}
            onUpgrade={openModal}
            coachTeam={coachTeam}
            onCoachTeamChange={handleCoachTeamChange}
            matches={activeMatches}
            onSyncMatches={handleSyncMatches}
            session={session}
            onSignOut={handleSignOut}
            onSyncNow={handleSyncNow}
          />
        </div>
      </div>

      {showAd && <AdBanner />}

      <nav className="bg-navy-800 border-t border-white/10 flex shrink-0">
        {TABS.map(t => {
          const locked = t.proOnly && !isPro
          return (
            <button key={t.id}
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
