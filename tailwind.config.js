/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          DEFAULT: '#3b82f6', // Premium blue
          dark: '#1d4ed8',
          light: '#93c5fd',
        },
        'surface': {
          DEFAULT: 'rgba(255, 255, 255, 0.7)',
          dark: 'rgba(15, 23, 42, 0.7)',
        }
      },
      backdropBlur: {
        'glass': '12px',
      }
    },
  },
  plugins: [],
}
