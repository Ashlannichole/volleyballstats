/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#0a0f1e',
          800: '#0d1526',
          700: '#111d35',
          600: '#162344',
          500: '#1a2a52',
        },
        // Team primary (dynamic via CSS vars set by applyColorVars)
        vr: {
          900: 'rgb(var(--vr-900) / <alpha-value>)',
          800: 'rgb(var(--vr-800) / <alpha-value>)',
          700: 'rgb(var(--vr-700) / <alpha-value>)',
          600: 'rgb(var(--vr-600) / <alpha-value>)',
          500: 'rgb(var(--vr-500) / <alpha-value>)',
          400: 'rgb(var(--vr-400) / <alpha-value>)',
          300: 'rgb(var(--vr-300) / <alpha-value>)',
        },
        // Team secondary (dynamic via CSS vars set by applyColorVars)
        pb: {
          700: 'rgb(var(--pb-700) / <alpha-value>)',
          600: 'rgb(var(--pb-600) / <alpha-value>)',
          500: 'rgb(var(--pb-500) / <alpha-value>)',
          400: 'rgb(var(--pb-400) / <alpha-value>)',
          300: 'rgb(var(--pb-300) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
}
