/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-900': '#060a13',
        'dark-800': '#0b1120',
        'dark-700': '#111b2e',
        'dark-600': '#1a2740',
        'dark-500': '#243350',
        'accent': '#00d4aa',
        'accent-light': '#33e0be',
        'accent-dark': '#00a888',
        'danger': '#ff4757',
        'warn': '#ffa502',
      },
      fontFamily: { 
        display: ['Space Grotesk', 'sans-serif'], 
        body: ['DM Sans', 'sans-serif'] 
      }
    }
  },
  plugins: [],
}