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
        ship: {
          dark: '#1a1a2e',
          primary: '#16213e',
          accent: '#4fc3f7',
          light: '#e3f2fd',
          success: '#4caf50',
          warning: '#ff9800',
          danger: '#f44336',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}