import { useState } from 'react'

interface Props {
  onDone: () => void
}

const SLIDES = [
  {
    emoji: '🏐',
    color: 'text-vr-400',
    title: 'Welcome to VB Stats',
    subtitle: 'Your all-in-one volleyball stats tracker',
    bullets: [
      'Track every kill, dig, ace, block, and serve — live during a match',
      'Works completely offline, perfect for gyms without WiFi',
      'Share live scores with parents from anywhere on the court',
    ],
  },
  {
    emoji: '👥',
    color: 'text-pb-400',
    title: 'Build Your Roster',
    subtitle: 'Set up your team before the first match',
    bullets: [
      'Add players with their jersey number and position (OH, S, MB, L...)',
      'Save and load lineups so you\'re court-ready in seconds',
      'Pro: manage two separate rosters for two-team programs',
    ],
  },
  {
    emoji: '📊',
    color: 'text-green-400',
    title: 'Track Stats Live',
    subtitle: 'One tap per stat — no lag, no paper',
    bullets: [
      'KILL, ERR, ATT, ACE, DIG, BS, BA, AST, SE all on each player card',
      'Pass ratings (0–3) with automatic average calculation',
      'Stats auto-score: a KILL adds a point and rotates the team on side-out',
    ],
  },
  {
    emoji: '🏐',
    color: 'text-orange-400',
    title: 'Serve Tracking',
    subtitle: 'Know your serve percentage and longest streaks',
    bullets: [
      'When your team serves, all cards dim — only the server shows a SERVE button',
      'Tap SERVE to log the attempt, then track the result (ACE, SE, or rally stats)',
      'Hit 5 serves in a row and watch the celebration 🔥',
    ],
  },
  {
    emoji: '📡',
    color: 'text-cyan-400',
    title: 'Live Score for Parents',
    subtitle: 'Share a link — they see everything in real time',
    bullets: [
      'Tap the 📡 button during a match to get a shareable spectator link',
      'Parents see the score, set number, and rotation — updates every 5 seconds',
      'Pro: add sponsor acknowledgments and timeout notifications to the live view',
    ],
  },
  {
    emoji: '📋',
    color: 'text-yellow-400',
    title: 'Match History',
    subtitle: 'Every match saved and ready to review',
    bullets: [
      'Set-by-set scores, full player stats, and error breakdowns per match',
      'Edit set scores after the fact if something was recorded wrong',
      'Serving streaks, attack errors, serve errors, and pass zeros all visible',
    ],
  },
  {
    emoji: '🏆',
    color: 'text-vr-300',
    title: 'Season Stats & Awards',
    subtitle: "See who's leading the team all season long",
    bullets: [
      'Kill leaders, ace leaders, dig queens, block leaders, top passers',
      '🔥 Serving Streak award — who had the longest run all season',
      'Pro: full per-player season breakdowns, tournament-by-tournament progress',
    ],
  },
  {
    emoji: '🚀',
    color: 'text-green-300',
    title: "You're All Set!",
    subtitle: 'Start by building your roster',
    bullets: [
      'Go to the Roster tab and add your players',
      'Set a lineup before your first match in Live Game',
      'Stats, history, and awards build automatically as you record matches',
    ],
  },
]

export default function Onboarding({ onDone }: Props) {
  const [idx, setIdx] = useState(0)
  const [dir, setDir] = useState<'forward' | 'back'>('forward')
  const [animating, setAnimating] = useState(false)

  const slide = SLIDES[idx]
  const isLast = idx === SLIDES.length - 1

  function go(next: number, direction: 'forward' | 'back') {
    if (animating) return
    setAnimating(true)
    setDir(direction)
    setTimeout(() => {
      setIdx(next)
      setAnimating(false)
    }, 220)
  }

  function next() {
    if (isLast) { onDone(); return }
    go(idx + 1, 'forward')
  }

  function prev() {
    if (idx === 0) return
    go(idx - 1, 'back')
  }

  return (
    <div className="fixed inset-0 z-[200] bg-navy-900 flex flex-col">
      <style>{`
        @keyframes ob-in-fwd  { from { opacity:0; transform: translateX(40px)  } to { opacity:1; transform: translateX(0) } }
        @keyframes ob-in-back { from { opacity:0; transform: translateX(-40px) } to { opacity:1; transform: translateX(0) } }
        @keyframes ob-out-fwd  { from { opacity:1 } to { opacity:0; transform: translateX(-20px) } }
        @keyframes ob-out-back { from { opacity:1 } to { opacity:0; transform: translateX(20px) } }
        .ob-enter-fwd  { animation: ob-in-fwd  0.22s ease-out forwards }
        .ob-enter-back { animation: ob-in-back 0.22s ease-out forwards }
        .ob-exit       { animation: ${dir === 'forward' ? 'ob-out-fwd' : 'ob-out-back'} 0.18s ease-in forwards }
      `}</style>

      {/* Progress dots + Skip */}
      <div className="flex items-center justify-between px-5 pt-safe pt-5 shrink-0">
        <div className="flex gap-1.5">
          {SLIDES.map((_, i) => (
            <div key={i} className={`rounded-full transition-all duration-300 ${
              i === idx ? 'w-5 h-2 bg-vr-400' : 'w-2 h-2 bg-white/20'
            }`} />
          ))}
        </div>
        {!isLast && (
          <button onClick={onDone} className="text-gray-500 text-sm font-semibold tap-btn">
            Skip
          </button>
        )}
      </div>

      {/* Slide content */}
      <div className={`flex-1 flex flex-col items-center justify-center px-8 text-center ${
        animating ? 'ob-exit' : dir === 'forward' ? 'ob-enter-fwd' : 'ob-enter-back'
      }`}>
        <div className="text-[88px] leading-none mb-6 select-none">{slide.emoji}</div>
        <h2 className={`text-2xl font-black mb-1 ${slide.color}`}>{slide.title}</h2>
        <p className="text-gray-400 text-sm mb-8">{slide.subtitle}</p>
        <div className="space-y-3 w-full max-w-sm">
          {slide.bullets.map((b, i) => (
            <div key={i} className="flex items-start gap-3 bg-navy-800 border border-white/8 rounded-2xl px-4 py-3 text-left">
              <span className={`text-lg mt-0.5 shrink-0 ${slide.color}`}>✓</span>
              <p className="text-gray-300 text-sm leading-snug">{b}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-10 shrink-0 flex gap-3">
        {idx > 0 && (
          <button
            onClick={prev}
            className="tap-btn flex-none px-6 py-4 rounded-2xl bg-navy-700 border border-white/10 text-gray-400 font-bold text-base"
          >
            ←
          </button>
        )}
        <button
          onClick={next}
          className={`tap-btn flex-1 py-4 rounded-2xl font-black text-base text-white transition-colors ${
            isLast ? 'bg-green-600 border border-green-400/30' : 'bg-vr-600 border border-vr-400/30'
          }`}
        >
          {isLast ? "Let's Go! 🚀" : 'Next →'}
        </button>
      </div>
    </div>
  )
}
