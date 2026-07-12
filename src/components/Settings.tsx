import { useState, useRef } from 'react'
import type { Match, Player } from '../types'
import type { TeamSettings, CoachTeam } from '../utils/settings'
import { saveSettings, applyColorVars, saveCoachTeam } from '../utils/settings'
import type { Session } from '../utils/auth'

interface Props {
  settings: TeamSettings
  onSettingsChange: (s: TeamSettings) => void
  isPro: boolean
  onUpgrade: () => void
  coachTeam: CoachTeam | null
  onCoachTeamChange: (t: CoachTeam | null) => void
  session: Session | null
  onSignOut: () => void
  onSyncNow: () => Promise<void>
  matches: Match[]
  players: Player[]
  onSyncTeamData: (matches: Match[], players: Player[]) => void
  logo: string
  onLogoChange: (url: string) => void
  onTutorial?: () => void
}

const PRESET_COLORS = [
  { label: 'Royal Purple', primary: '#4a1d8a', secondary: '#87cde3' },
  { label: 'Navy & Gold',  primary: '#1a2a4a', secondary: '#f5c518' },
  { label: 'Crimson',      primary: '#8b0000', secondary: '#f0e6e6' },
  { label: 'Forest',       primary: '#1a4a2a', secondary: '#7ec8a0' },
  { label: 'Midnight',     primary: '#0f172a', secondary: '#818cf8' },
  { label: 'Sunset',       primary: '#7c2d12', secondary: '#fb923c' },
]

export default function Settings({
  settings, onSettingsChange, isPro, onUpgrade,
  coachTeam, onCoachTeamChange, matches, players, onSyncTeamData,
  session, onSignOut, onSyncNow, logo, onLogoChange, onTutorial,
}: Props) {
  const [syncing, setSyncing] = useState(false)
  const [syncMsg, setSyncMsg] = useState('')
  const [newSponsor, setNewSponsor] = useState('')
  const sponsorInputRef = useRef<HTMLInputElement>(null)

  async function handleSyncNow() {
    setSyncing(true)
    setSyncMsg('')
    try {
      await onSyncNow()
      setSyncMsg('✓ All data synced')
    } catch {
      setSyncMsg('Sync failed — check your connection')
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncMsg(''), 3000)
    }
  }
  const [localName, setLocalName]           = useState(settings.teamName)
  const [localPrimary, setLocalPrimary]     = useState(settings.primaryColor)
  const [localSecondary, setLocalSecondary] = useState(settings.secondaryColor)
  const [saved, setSaved]                   = useState(false)

  // Coach team state
  const [joinCode, setJoinCode]   = useState('')
  const [teamBusy, setTeamBusy]   = useState(false)
  const [teamMsg, setTeamMsg]     = useState<{ text: string; ok: boolean } | null>(null)
  const [syncBusy, setSyncBusy]   = useState(false)
  const [showCode, setShowCode]   = useState(false)

  function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => onLogoChange((ev.target?.result as string) ?? '')
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function commit(patch: Partial<TeamSettings>) {
    const next = { ...settings, teamName: localName, primaryColor: localPrimary, secondaryColor: localSecondary, ...patch }
    saveSettings(next)
    applyColorVars(next)
    onSettingsChange(next)
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  function applyPreset(p: typeof PRESET_COLORS[0]) {
    setLocalPrimary(p.primary)
    setLocalSecondary(p.secondary)
    commit({ primaryColor: p.primary, secondaryColor: p.secondary })
  }

  function flash(text: string, ok: boolean) {
    setTeamMsg({ text, ok })
    setTimeout(() => setTeamMsg(null), 3500)
  }

  async function handleCreate() {
    setTeamBusy(true)
    try {
      const res = await fetch('/api/team?action=create', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { flash(data.error ?? 'Failed to create team', false); return }
      const team: CoachTeam = { code: data.code, role: 'owner' }
      saveCoachTeam(team)
      onCoachTeamChange(team)
      setShowCode(true)
      flash(`Team created! Share code ${data.code} with up to 2 other coaches.`, true)
    } catch {
      flash('Network error. Try again.', false)
    } finally {
      setTeamBusy(false)
    }
  }

  async function handleJoin() {
    const code = joinCode.trim().toUpperCase()
    if (code.length < 4) { flash('Enter a valid team code.', false); return }
    setTeamBusy(true)
    try {
      const res = await fetch('/api/team?action=join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
      const data = await res.json()
      if (!res.ok) { flash(data.error ?? 'Could not join team', false); return }
      const team: CoachTeam = { code, role: 'member' }
      saveCoachTeam(team)
      onCoachTeamChange(team)
      setJoinCode('')
      flash(`Joined! ${data.matchCount} match${data.matchCount !== 1 ? 'es' : ''} available — tap Sync to import.`, true)
    } catch {
      flash('Network error. Try again.', false)
    } finally {
      setTeamBusy(false)
    }
  }

  async function handleSync() {
    if (!coachTeam) return
    setSyncBusy(true)
    try {
      const res = await fetch(`/api/team?action=pull&code=${encodeURIComponent(coachTeam.code)}`)
      const data = await res.json()
      if (!res.ok) { flash(data.error ?? 'Sync failed', false); return }
      const pulledMatches: Match[] = data.matches ?? []
      const pulledPlayers: Player[] = data.players ?? []

      // Count genuinely new items for the feedback message
      const localMatchIds = new Set(matches.map(m => m.id))
      const localMatchFps = new Set(matches.map(m => `${m.date}|${m.opponent.toLowerCase().trim()}`))
      const newMatches = pulledMatches.filter(m =>
        !localMatchIds.has(m.id) &&
        !localMatchFps.has(`${m.date}|${m.opponent.toLowerCase().trim()}`)
      )
      const localPlayerIds = new Set(players.map(p => p.id))
      const localPlayerKeys = new Set(players.map(p => `${p.name.toLowerCase().trim()}|${p.number}`))
      const newPlayers = pulledPlayers.filter(p =>
        !localPlayerIds.has(p.id) &&
        !localPlayerKeys.has(`${p.name.toLowerCase().trim()}|${p.number}`)
      )

      onSyncTeamData(pulledMatches, pulledPlayers)

      const parts: string[] = []
      if (newMatches.length > 0) parts.push(`${newMatches.length} match${newMatches.length !== 1 ? 'es' : ''}`)
      if (newPlayers.length > 0) parts.push(`${newPlayers.length} player${newPlayers.length !== 1 ? 's' : ''}`)
      flash(parts.length > 0 ? `Synced ${parts.join(' & ')} from team.` : 'Already up to date.', true)
    } catch {
      flash('Network error. Try again.', false)
    } finally {
      setSyncBusy(false)
    }
  }

  function handleLeave() {
    saveCoachTeam(null)
    onCoachTeamChange(null)
    setShowCode(false)
    flash('Left the team. Your local data is unchanged.', true)
  }

  function copyCode() {
    if (coachTeam) navigator.clipboard.writeText(coachTeam.code).catch(() => {})
    flash('Code copied!', true)
  }

  return (
    <div className="overflow-y-auto p-4 max-w-lg mx-auto flex flex-col gap-5 pb-10">

      {/* Header */}
      <div className="text-center mt-4 mb-1">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Settings</p>
        <h2 className="text-2xl font-bold text-white">App Settings</h2>
      </div>

      {/* Appearance */}
      <section className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">Appearance</p>
            <p className="text-gray-500 text-[11px] mt-0.5">Dark mode · Light mode</p>
          </div>
          <div className="flex items-center gap-1 bg-navy-900 rounded-xl p-1 border border-white/10">
            <button
              onClick={() => onSettingsChange({ ...settings, colorMode: 'dark' })}
              className={`tap-btn px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                settings.colorMode !== 'light'
                  ? 'bg-vr-700 text-white shadow'
                  : 'text-gray-500'
              }`}
            >🌙 Dark</button>
            <button
              onClick={() => onSettingsChange({ ...settings, colorMode: 'light' })}
              className={`tap-btn px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                settings.colorMode === 'light'
                  ? 'bg-vr-700 text-white shadow'
                  : 'text-gray-500'
              }`}
            >☀️ Light</button>
          </div>
        </div>
      </section>

      {/* REC Mode — available to all */}
      <section className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">Recreational Mode</p>
            <p className="text-gray-500 text-[11px] mt-0.5">Unlimited subs · no sub counting</p>
          </div>
          <button
            onClick={() => commit({ recMode: !settings.recMode })}
            className={`tap-btn relative w-12 h-6 rounded-full border transition-colors shrink-0 ${
              settings.recMode
                ? 'bg-green-600 border-green-500'
                : 'bg-navy-600 border-white/20'
            }`}
          >
            <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
              settings.recMode ? 'left-[26px]' : 'left-[2px]'
            }`} />
          </button>
        </div>
        {settings.recMode && (
          <div className="px-4 pb-3">
            <p className="text-green-400 text-xs">
              REC mode on — subs are unlimited and not counted during matches.
            </p>
          </div>
        )}
      </section>

      {/* Match Format */}
      <section className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">Best of 5 Sets</p>
            <p className="text-gray-500 text-[11px] mt-0.5">Off = best of 3 · On = best of 5 (sets 3 &amp; 5 play to 15)</p>
          </div>
          <button
            onClick={() => commit({ bestOf5: !settings.bestOf5 })}
            className={`tap-btn relative w-12 h-6 rounded-full border transition-colors shrink-0 ${
              settings.bestOf5 ? 'bg-vr-600 border-vr-500' : 'bg-navy-600 border-white/20'
            }`}
          >
            <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
              settings.bestOf5 ? 'left-[26px]' : 'left-[2px]'
            }`} />
          </button>
        </div>
      </section>

      {/* Teams — Pro only */}
      <section className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">My Teams</p>
            <p className="text-gray-500 text-[11px] mt-0.5">Up to 2 rosters with separate stats</p>
          </div>
          {!isPro && (
            <button onClick={onUpgrade}
              className="tap-btn text-[10px] font-black px-2 py-0.5 rounded-full bg-vr-700 border border-vr-500 text-vr-200 shrink-0">
              ⚡ PRO
            </button>
          )}
        </div>
        <div className="p-4 flex flex-col gap-3">
          {!isPro ? (
            <button onClick={onUpgrade} className="tap-btn w-full bg-navy-700/50 border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <div className="text-left">
                <p className="text-gray-500 text-sm font-semibold">Multiple rosters</p>
                <p className="text-gray-700 text-xs mt-0.5">Pro only — free tier is single roster</p>
              </div>
              <span className="text-gray-700 ml-auto">🔒</span>
            </button>
          ) : (
            <>
              {/* Team 1 */}
              {[
                { num: 1 as const, nameKey: 'teamName' as const },
                { num: 2 as const, nameKey: 'team2Name' as const },
              ].map(({ num, nameKey }) => (
                <div key={num} className={`rounded-xl border p-3 flex items-center gap-3 ${
                  settings.activeTeam === num
                    ? 'bg-vr-900/40 border-vr-600/50'
                    : 'bg-navy-700/50 border-white/10'
                }`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">Team {num}</p>
                    <input
                      value={settings[nameKey]}
                      onChange={e => commit({ [nameKey]: e.target.value })}
                      maxLength={25}
                      placeholder={`Team ${num} name`}
                      className="w-full bg-transparent text-white text-sm font-semibold focus:outline-none placeholder-gray-600"
                    />
                  </div>
                  {settings.activeTeam === num ? (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-vr-700 border border-vr-500 text-vr-200 shrink-0">
                      ACTIVE
                    </span>
                  ) : (
                    <button
                      onClick={() => commit({ activeTeam: num })}
                      className="tap-btn text-[10px] font-bold px-2 py-0.5 rounded-full bg-navy-600 border border-white/20 text-gray-400 shrink-0">
                      Switch
                    </button>
                  )}
                </div>
              ))}
              <p className="text-gray-600 text-xs text-center">
                Each team has its own roster, match history, and practice sessions.
              </p>
            </>
          )}
        </div>
      </section>

      {/* Team Identity — Pro only */}
      <section className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <p className="text-white font-bold text-sm">Team Identity</p>
          {!isPro && (
            <button onClick={onUpgrade}
              className="tap-btn text-[10px] font-black px-2 py-0.5 rounded-full bg-vr-700 border border-vr-500 text-vr-200">
              ⚡ PRO
            </button>
          )}
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Team Logo */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-2">
              Team Logo
            </label>
            {isPro ? (
              <div className="flex items-center gap-4">
                {logo ? (
                  <img src={logo} alt="Team logo" className="w-16 h-16 rounded-full object-cover border-2 border-white/20 shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-navy-700 border-2 border-dashed border-white/20 flex items-center justify-center text-2xl shrink-0">
                    🏐
                  </div>
                )}
                <div className="flex flex-col gap-2 flex-1">
                  <label className="tap-btn cursor-pointer text-center bg-navy-700 border border-white/20 rounded-xl px-3 py-2 text-white text-sm font-medium">
                    {logo ? 'Change Logo' : 'Upload Logo'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </label>
                  {logo && (
                    <button onClick={() => onLogoChange('')}
                      className="tap-btn text-red-500 text-xs text-center py-1">
                      Remove
                    </button>
                  )}
                  <p className="text-gray-600 text-[10px] text-center">PNG, JPG · appears in header</p>
                </div>
              </div>
            ) : (
              <button onClick={onUpgrade}
                className="tap-btn w-full bg-navy-700/50 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="w-10 h-10 rounded-full bg-navy-600 border-2 border-dashed border-white/20 flex items-center justify-center text-lg">🏐</div>
                <span className="text-gray-500 text-sm">Upload your team logo</span>
                <span className="text-gray-700 text-xs">🔒 Pro only</span>
              </button>
            )}
          </div>

          {/* Team Name */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              Team Name
            </label>
            {isPro ? (
              <input
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={() => commit({})}
                maxLength={30}
                placeholder="e.g. Viking Roots"
                className="w-full bg-navy-700 border border-white/20 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-vr-500"
              />
            ) : (
              <button onClick={onUpgrade} className="tap-btn w-full text-left bg-navy-700/50 border border-white/10 rounded-xl px-3 py-2 text-gray-600 text-sm flex items-center justify-between">
                <span>{settings.teamName}</span>
                <span className="text-gray-700 text-xs">🔒 Pro only</span>
              </button>
            )}
          </div>

          {/* Color Presets */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-2">
              Color Theme
            </label>
            {isPro ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {PRESET_COLORS.map(p => (
                    <button key={p.label} onClick={() => applyPreset(p)}
                      className={`tap-btn rounded-xl overflow-hidden border-2 transition-all ${
                        localPrimary === p.primary ? 'border-white/60 scale-95' : 'border-transparent'
                      }`}>
                      <div className="h-8 flex">
                        <div className="flex-1" style={{ backgroundColor: p.primary }} />
                        <div className="flex-1" style={{ backgroundColor: p.secondary }} />
                      </div>
                      <div className="bg-navy-700 py-1">
                        <p className="text-gray-400 text-[10px] font-medium">{p.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="flex gap-3">
                  <div className="flex-1">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">Primary</p>
                    <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                      <input type="color" value={localPrimary}
                        onChange={e => setLocalPrimary(e.target.value)}
                        onBlur={() => commit({})}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                      <span className="text-gray-400 text-xs font-mono">{localPrimary}</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-1">Secondary</p>
                    <div className="flex items-center gap-2 bg-navy-700 border border-white/20 rounded-xl px-3 py-2">
                      <input type="color" value={localSecondary}
                        onChange={e => setLocalSecondary(e.target.value)}
                        onBlur={() => commit({})}
                        className="w-6 h-6 rounded cursor-pointer bg-transparent border-0 p-0" />
                      <span className="text-gray-400 text-xs font-mono">{localSecondary}</span>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <button onClick={onUpgrade} className="tap-btn w-full bg-navy-700/50 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex gap-1">
                  {PRESET_COLORS.slice(0, 4).map(p => (
                    <div key={p.label} className="w-6 h-6 rounded-md flex overflow-hidden opacity-40">
                      <div className="flex-1" style={{ backgroundColor: p.primary }} />
                      <div className="flex-1" style={{ backgroundColor: p.secondary }} />
                    </div>
                  ))}
                </div>
                <span className="text-gray-700 text-xs">🔒 Pro only</span>
              </button>
            )}
          </div>

          {saved && (
            <p className="text-green-400 text-xs text-center font-semibold">✓ Saved</p>
          )}
        </div>
      </section>

      {/* Sponsors — Pro only */}
      <section className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">Sponsors</p>
            <p className="text-gray-500 text-[11px] mt-0.5">Show on the parent spectator view</p>
          </div>
          {!isPro ? (
            <button onClick={onUpgrade}
              className="tap-btn text-[10px] font-black px-2 py-0.5 rounded-full bg-vr-700 border border-vr-500 text-vr-200 shrink-0">
              ⚡ PRO
            </button>
          ) : (
            <button
              onClick={() => commit({ showSponsors: !settings.showSponsors })}
              className={`tap-btn relative w-12 h-6 rounded-full border transition-colors shrink-0 ${
                settings.showSponsors ? 'bg-green-600 border-green-500' : 'bg-navy-600 border-white/20'
              }`}
            >
              <span className={`absolute top-[2px] w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                settings.showSponsors ? 'left-[26px]' : 'left-[2px]'
              }`} />
            </button>
          )}
        </div>

        <div className="p-4">
          {!isPro ? (
            <button onClick={onUpgrade} className="tap-btn w-full bg-navy-700/50 border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">🤝</span>
              <div className="text-left">
                <p className="text-gray-500 text-sm font-semibold">Sponsor acknowledgments</p>
                <p className="text-gray-700 text-xs mt-0.5">Show sponsor names on the live spectator view</p>
              </div>
              <span className="text-gray-700 ml-auto">🔒</span>
            </button>
          ) : (() => {
            const activeSponsorsKey = settings.activeTeam === 2 ? 'team2Sponsors' : 'sponsors'
            const activeSponsors: string[] = settings[activeSponsorsKey] ?? []

            function addSponsor() {
              const name = newSponsor.trim()
              if (!name || activeSponsors.includes(name)) return
              commit({ [activeSponsorsKey]: [...activeSponsors, name] })
              setNewSponsor('')
              sponsorInputRef.current?.focus()
            }

            function removeSponsor(name: string) {
              commit({ [activeSponsorsKey]: activeSponsors.filter(s => s !== name) })
            }

            return (
              <div className="flex flex-col gap-3">
                {!settings.showSponsors && (
                  <p className="text-gray-600 text-xs text-center">Toggle on above to show sponsors on the spectator view.</p>
                )}

                {/* Sponsor list */}
                {activeSponsors.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {activeSponsors.map(name => (
                      <div key={name} className="flex items-center justify-between bg-navy-700 border border-white/10 rounded-xl px-3 py-2.5">
                        <p className="text-white text-sm font-medium">🤝 {name}</p>
                        <button onClick={() => removeSponsor(name)}
                          className="tap-btn text-red-500 text-xs px-2 py-1">
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs text-center">No sponsors added yet.</p>
                )}

                {/* Add sponsor */}
                <div className="flex gap-2">
                  <input
                    ref={sponsorInputRef}
                    value={newSponsor}
                    onChange={e => setNewSponsor(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addSponsor()}
                    placeholder="Sponsor name"
                    maxLength={40}
                    className="flex-1 bg-navy-700 border border-white/20 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none"
                  />
                  <button onClick={addSponsor}
                    disabled={!newSponsor.trim()}
                    className="tap-btn bg-navy-600 border border-white/20 rounded-xl px-4 py-2 text-white text-sm font-bold disabled:opacity-40">
                    Add
                  </button>
                </div>
                <p className="text-gray-600 text-[10px] text-center">
                  Sponsors rotate every 3 s on the parent view · {settings.activeTeam === 2 ? settings.team2Name : settings.teamName}
                </p>
              </div>
            )
          })()}
        </div>
      </section>

      {/* Coach Collaboration — Pro only */}
      <section className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="text-white font-bold text-sm">Coach Collaboration</p>
            <p className="text-gray-500 text-[11px] mt-0.5">Share stats with up to 2 other coaches</p>
          </div>
          {!isPro && (
            <button onClick={onUpgrade}
              className="tap-btn text-[10px] font-black px-2 py-0.5 rounded-full bg-vr-700 border border-vr-500 text-vr-200 shrink-0">
              ⚡ PRO
            </button>
          )}
        </div>

        <div className="p-4">
          {!isPro ? (
            <button onClick={onUpgrade} className="tap-btn w-full bg-navy-700/50 border border-white/10 rounded-xl p-4 flex items-center gap-3">
              <span className="text-2xl">👥</span>
              <div className="text-left">
                <p className="text-gray-500 text-sm font-semibold">Multi-coach stat sharing</p>
                <p className="text-gray-700 text-xs mt-0.5">Pro only — free tier is single device</p>
              </div>
              <span className="text-gray-700 ml-auto">🔒</span>
            </button>
          ) : coachTeam ? (
            /* Already in a team */
            <div className="flex flex-col gap-3">
              <div className="bg-navy-700 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${coachTeam.role === 'owner' ? 'bg-vr-400' : 'bg-pb-400'}`} />
                  <p className="text-white text-sm font-semibold">
                    {coachTeam.role === 'owner' ? 'You created this team' : 'You joined this team'}
                  </p>
                </div>

                {/* Code display */}
                <button onClick={() => setShowCode(v => !v)}
                  className="tap-btn w-full bg-navy-800 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="text-left">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wide">Team Code</p>
                    <p className={`font-black text-xl tracking-widest mt-0.5 ${showCode ? 'text-white' : 'text-gray-600 blur-sm select-none'}`}>
                      {coachTeam.code}
                    </p>
                  </div>
                  <span className="text-gray-500 text-xs">{showCode ? 'hide' : 'show'}</span>
                </button>

                {showCode && (
                  <div className="flex gap-2">
                    <button onClick={copyCode}
                      className="tap-btn flex-1 bg-vr-700 border border-vr-600 rounded-xl py-2 text-vr-200 text-sm font-bold">
                      📋 Copy Code
                    </button>
                    <button onClick={handleSync} disabled={syncBusy}
                      className="tap-btn flex-1 bg-navy-600 border border-white/10 rounded-xl py-2 text-white text-sm font-bold disabled:opacity-50">
                      {syncBusy ? '⏳ Syncing…' : '🔄 Sync Team Data'}
                    </button>
                  </div>
                )}

                {!showCode && (
                  <button onClick={handleSync} disabled={syncBusy}
                    className="tap-btn w-full bg-navy-600 border border-white/10 rounded-xl py-2.5 text-white text-sm font-bold disabled:opacity-50">
                    {syncBusy ? '⏳ Syncing…' : '🔄 Sync Team Data'}
                  </button>
                )}
              </div>

              <p className="text-gray-600 text-xs text-center px-2">
                Share this code with your coaches. Stats sync automatically when you save a match — or tap Sync to pull updates now.
              </p>

              <button onClick={handleLeave}
                className="tap-btn w-full border border-red-900/40 rounded-xl py-2.5 text-red-500 text-sm font-semibold">
                Leave Team
              </button>
            </div>
          ) : (
            /* No team yet */
            <div className="flex flex-col gap-4">
              <p className="text-gray-500 text-xs text-center leading-relaxed">
                Create a team to share match stats with up to 2 assistant coaches. Each coach keeps stats on their own device, then syncs to combine everything.
              </p>

              {/* Create */}
              <button onClick={handleCreate} disabled={teamBusy}
                className="tap-btn w-full bg-vr-700 border border-vr-500 rounded-xl py-3 text-white font-bold text-sm disabled:opacity-50">
                {teamBusy ? '⏳ Creating…' : '✦ Create Team'}
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <p className="text-gray-600 text-xs">or join one</p>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Join */}
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="Enter code"
                  className="flex-1 bg-navy-700 border border-white/20 rounded-xl px-3 py-2.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-pb-500 font-mono tracking-widest uppercase"
                />
                <button onClick={handleJoin} disabled={teamBusy || joinCode.trim().length < 4}
                  className="tap-btn bg-pb-700 border border-pb-500 rounded-xl px-4 py-2.5 text-white font-bold text-sm disabled:opacity-40">
                  Join
                </button>
              </div>
            </div>
          )}

          {/* Feedback message */}
          {teamMsg && (
            <p className={`text-xs text-center mt-3 font-semibold ${teamMsg.ok ? 'text-green-400' : 'text-red-400'}`}>
              {teamMsg.text}
            </p>
          )}
        </div>
      </section>

      {/* Upgrade CTA for free users */}
      {!isPro && (
        <button onClick={onUpgrade}
          className="tap-btn w-full bg-vr-800 border border-vr-600/50 rounded-2xl p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-vr-600 flex items-center justify-center text-xl shrink-0">⚡</div>
          <div className="text-left">
            <p className="text-white font-bold text-sm">Upgrade to Pro</p>
            <p className="text-vr-300 text-xs mt-0.5">Custom team name, colors, multi-coach sync, practice stats & more</p>
          </div>
          <span className="text-vr-400 text-lg ml-auto">›</span>
        </button>
      )}

      {/* Account + General */}
      <section className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-white font-bold text-sm">Account</p>
        </div>
        <div className="divide-y divide-white/5">
          {session && (
            <div className="px-4 py-3 flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs uppercase tracking-wide font-semibold">Signed in as</p>
                <p className="text-white text-sm font-medium mt-0.5 truncate max-w-[220px]">{session.email}</p>
              </div>
            </div>
          )}
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-gray-300 text-sm">Tier</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPro ? 'bg-vr-800 border border-vr-500/40 text-vr-300' : 'bg-navy-700 border border-white/10 text-gray-400'}`}>
              {isPro ? '⚡ Pro' : 'Free'}
            </span>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-gray-300 text-sm">Storage</p>
            <p className="text-gray-600 text-sm">Cloud · auto-synced</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-gray-300 text-sm">App Version</p>
            <p className="text-gray-600 text-sm">1.0.0</p>
          </div>
          <div className="px-4 py-3 flex flex-col gap-2">
            <button onClick={handleSyncNow} disabled={syncing}
              className="tap-btn w-full bg-navy-700 border border-white/10 rounded-xl py-2.5 text-white text-sm font-semibold disabled:opacity-50">
              {syncing ? '⏳ Syncing…' : '🔄 Sync Now'}
            </button>
            {syncMsg && (
              <p className={`text-xs text-center font-semibold ${syncMsg.startsWith('✓') ? 'text-green-400' : 'text-red-400'}`}>
                {syncMsg}
              </p>
            )}
            {onTutorial && (
              <button onClick={onTutorial}
                className="tap-btn w-full border border-white/10 rounded-xl py-2.5 text-gray-400 text-sm font-semibold">
                📖 View Tutorial
              </button>
            )}
            <button onClick={onSignOut}
              className="tap-btn w-full border border-red-900/40 rounded-xl py-2.5 text-red-500 text-sm font-semibold">
              Sign Out
            </button>
          </div>
        </div>
      </section>

    </div>
  )
}
