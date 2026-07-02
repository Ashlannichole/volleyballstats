import { useState } from 'react'
import { saveTier } from '../utils/tier'

interface ModalProps {
  onClose: () => void
  onUpgrade: () => void
}

function UpgradeModal({ onClose, onUpgrade }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg mx-auto bg-navy-800 rounded-t-3xl p-6 pb-10"
        onClick={e => e.stopPropagation()}>

        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">⚡</div>
          <h2 className="text-2xl font-bold text-white mb-1">Upgrade to Pro</h2>
          <p className="text-gray-400 text-sm">Everything you need to run a full season</p>
        </div>

        <div className="space-y-3 mb-6">
          {[
            { icon: '🎽', label: 'Practice tab',         desc: 'Full court scrimmage tracking with rotations & subs' },
            { icon: '📊', label: 'Player stat breakdowns', desc: 'Per-player efficiency, pass avg, error breakdown' },
            { icon: '🏆', label: 'Awards & All-Stars',    desc: 'Season leaderboards + per-tournament MVP recognition' },
            { icon: '🤖', label: 'AI practice suggestions', desc: 'Drill recommendations based on your team\'s weak spots' },
            { icon: '🚫', label: 'No ads',                desc: 'Clean interface with no banners' },
          ].map(f => (
            <div key={f.label} className="flex items-start gap-3">
              <span className="text-xl mt-0.5">{f.icon}</span>
              <div>
                <p className="text-white font-semibold text-sm">{f.label}</p>
                <p className="text-gray-500 text-xs">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={onUpgrade}
          className="tap-btn w-full bg-vr-600 text-white font-bold py-4 rounded-2xl text-lg mb-3"
        >
          Upgrade — $4.99 / year
        </button>

        <p className="text-gray-600 text-xs text-center mb-4">
          Billed annually through the App Store or Google Play. Cancel any time.
        </p>

        <button onClick={onClose}
          className="tap-btn w-full text-gray-500 text-sm py-2">
          Maybe later
        </button>
      </div>
    </div>
  )
}

// Inline lock badge — drop this anywhere a feature is gated
export function LockBadge({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <button onClick={onUpgrade}
      className="tap-btn flex items-center gap-1 bg-vr-900/60 border border-vr-600/40 text-vr-300 text-xs font-bold px-2 py-1 rounded-lg">
      🔒 Pro
    </button>
  )
}

// Full locked-section overlay card
export function LockedSection({
  title, description, onUpgrade,
}: { title: string; description: string; onUpgrade: () => void }) {
  return (
    <div className="bg-navy-700/60 border border-white/10 border-dashed rounded-2xl p-6 flex flex-col items-center text-center gap-3">
      <span className="text-3xl">🔒</span>
      <div>
        <p className="text-white font-bold">{title}</p>
        <p className="text-gray-500 text-sm mt-1">{description}</p>
      </div>
      <button onClick={onUpgrade}
        className="tap-btn bg-vr-600 text-white font-bold px-5 py-2.5 rounded-xl text-sm">
        Unlock with Pro
      </button>
    </div>
  )
}

// Hook: manages modal visibility + tier upgrade
export function useUpgradeModal(onTierChange: (t: 'pro') => void) {
  const [open, setOpen] = useState(false)

  function handleUpgrade() {
    // In production this will trigger App Store / Google Play IAP via RevenueCat.
    // For development: toggle directly so all features can be previewed.
    saveTier('pro')
    onTierChange('pro')
    setOpen(false)
  }

  const modal = open
    ? <UpgradeModal onClose={() => setOpen(false)} onUpgrade={handleUpgrade} />
    : null

  return { openModal: () => setOpen(true), modal }
}
