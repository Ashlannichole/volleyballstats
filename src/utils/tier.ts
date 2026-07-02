export type Tier = 'free' | 'pro'

const TIER_KEY = 'vb_tier'

export function loadTier(): Tier {
  try {
    const v = localStorage.getItem(TIER_KEY)
    return v === 'pro' ? 'pro' : 'free'
  } catch {
    return 'free'
  }
}

export function saveTier(tier: Tier): void {
  localStorage.setItem(TIER_KEY, tier)
}
