import { useState } from 'react'
import type { TeamSettings } from '../utils/settings'
import { saveSettings, applyColorVars } from '../utils/settings'

interface Props {
  settings: TeamSettings
  onSettingsChange: (s: TeamSettings) => void
  isPro: boolean
  onUpgrade: () => void
}

const PRESET_COLORS = [
  { label: 'Royal Purple', primary: '#4a1d8a', secondary: '#87cde3' },
  { label: 'Navy & Gold',  primary: '#1a2a4a', secondary: '#f5c518' },
  { label: 'Crimson',      primary: '#8b0000', secondary: '#f0e6e6' },
  { label: 'Forest',       primary: '#1a4a2a', secondary: '#7ec8a0' },
  { label: 'Midnight',     primary: '#0f172a', secondary: '#818cf8' },
  { label: 'Sunset',       primary: '#7c2d12', secondary: '#fb923c' },
]

export default function Settings({ settings, onSettingsChange, isPro, onUpgrade }: Props) {
  const [localName, setLocalName] = useState(settings.teamName)
  const [localPrimary, setLocalPrimary] = useState(settings.primaryColor)
  const [localSecondary, setLocalSecondary] = useState(settings.secondaryColor)
  const [saved, setSaved] = useState(false)

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

  return (
    <div className="overflow-y-auto p-4 max-w-lg mx-auto flex flex-col gap-5 pb-10">

      {/* Header */}
      <div className="text-center mt-4 mb-1">
        <p className="text-gray-500 text-xs uppercase tracking-widest mb-1">Settings</p>
        <h2 className="text-2xl font-bold text-white">App Settings</h2>
      </div>

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
          {/* Team Name */}
          <div>
            <label className="text-gray-400 text-xs font-semibold uppercase tracking-wide block mb-1.5">
              Team Name
            </label>
            {isPro ? (
              <div className="flex gap-2">
                <input
                  value={localName}
                  onChange={e => setLocalName(e.target.value)}
                  onBlur={() => commit({})}
                  maxLength={30}
                  placeholder="e.g. Viking Roots"
                  className="flex-1 bg-navy-700 border border-white/20 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-vr-500"
                />
              </div>
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

                {/* Custom pickers */}
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
            <p className="text-green-400 text-xs text-center font-semibold animate-pulse">✓ Saved</p>
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
            <p className="text-vr-300 text-xs mt-0.5">Custom team name, colors, practice stats, AI suggestions & more</p>
          </div>
          <span className="text-vr-400 text-lg ml-auto">›</span>
        </button>
      )}

      {/* General */}
      <section className="bg-navy-800 border border-white/10 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-white font-bold text-sm">General</p>
        </div>
        <div className="divide-y divide-white/5">
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-gray-300 text-sm">App Version</p>
            <p className="text-gray-600 text-sm">1.0.0</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-gray-300 text-sm">Storage</p>
            <p className="text-gray-600 text-sm">On-device</p>
          </div>
          <div className="px-4 py-3 flex items-center justify-between">
            <p className="text-gray-300 text-sm">Tier</p>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isPro ? 'bg-vr-800 border border-vr-500/40 text-vr-300' : 'bg-navy-700 border border-white/10 text-gray-400'}`}>
              {isPro ? '⚡ Pro' : 'Free'}
            </span>
          </div>
        </div>
      </section>

    </div>
  )
}
