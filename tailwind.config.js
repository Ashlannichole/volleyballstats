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
        // Viking Roots purple
        vr: {
          900: '#1a0a2e',
          800: '#2d1154',
          700: '#4a1d8a',
          600: '#6b35b8',
          500: '#8b52d4',
          400: '#a97ee0',
          300: '#c9acea',
        },
        // Viking Roots powder blue
        pb: {
          700: '#1e5f7a',
          600: '#2e87a8',
          500: '#5ab3d0',
          400: '#87cde3',
          300: '#b5e3f0',
        },
      },
    },
  },
  plugins: [],
}
