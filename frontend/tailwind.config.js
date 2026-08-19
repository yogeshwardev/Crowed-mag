/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        command: {
          bg: '#080c14',
          card: '#0e1626',
          border: '#1e293b',
          accent: '#06b6d4',
          cyan: '#22d3ee',
          green: '#10b981',
          orange: '#f59e0b',
          red: '#ef4444',
          purple: '#8b5cf6'
        }
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.3)',
        'glow-red': '0 0 20px -2px rgba(239, 68, 68, 0.4)',
        'glow-green': '0 0 15px -3px rgba(16, 185, 129, 0.3)'
      }
    },
  },
  plugins: [],
}
