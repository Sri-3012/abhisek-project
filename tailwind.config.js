/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'buy': '#10b981',
        'sell': '#ef4444',
        'profit': '#22c55e',
        'loss': '#f87171',
      }
    },
  },
  plugins: [],
}
