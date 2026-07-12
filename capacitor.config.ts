import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.vikingvb.stats',
  appName: 'VB Stats',
  webDir: 'dist',
  server: {
    // Load the live Vercel app so all API routes work and coaches
    // always get the latest version without an App Store update.
    url: 'https://volleyballstats-ant03.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
  },
}

export default config
