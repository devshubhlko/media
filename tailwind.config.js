/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        gray: {
          850: '#151b28',
          950: '#0a0d14'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Devanagari', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        hindi: ['Noto Sans Devanagari', 'sans-serif']
      }
    },
  },
  plugins: [],
}
