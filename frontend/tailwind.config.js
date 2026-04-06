/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gym: {
          bg: '#0a0f1a',
          sidebar: '#0d1424',
          card: '#111827',
          border: '#1e2d45',
          cyan: '#00e5ff',
          'cyan-dim': '#00b8d4',
          green: '#00ff88',
          yellow: '#ffd60a',
          text: '#e2e8f0',
          muted: '#64748b',
          accent: '#1a2744',
        }
      },
      fontFamily: {
  display: ['Nunito', 'sans-serif'],
  body:    ['Nunito', 'sans-serif'],
  mono:    ['JetBrains Mono', 'monospace'],
},
    },
  },
  plugins: [],
}