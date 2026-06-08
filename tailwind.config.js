/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          red: '#bd0a0a',
          gold: '#f0a500',
          dark: '#1a1a2e',
          darker: '#12121f',
          card: '#1e1e35',
          border: '#2a2a45',
          muted: '#6b7280',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      }
    },
  },
  plugins: [],
}