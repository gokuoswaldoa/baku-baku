/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        baku: {
          orange: '#FF7A00',
          red: '#E53935',
          dark: '#1E1E1E',
          surface: '#242424',
          card: '#2A2A2A',
          border: '#3D3D3D',
          ivory: '#F7F2E8',
          muted: '#A29E96',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Syne', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
