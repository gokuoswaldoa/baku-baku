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
        fire: {
          50: '#fff5ee',
          100: '#ffe8d7',
          200: '#ffd0b0',
          300: '#ffb07f',
          400: '#ff8143',
          500: '#FF5A00',
          600: '#e54700',
          700: '#ba3202',
          800: '#942909',
          900: '#78240c',
          950: '#410f04',
        },
        charcoal: {
          950: '#0A0A0C',
          900: '#111216',
          850: '#16181F',
          800: '#1D1F29',
          700: '#2A2C3A',
          600: '#3D4052',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'fire-sm': '0 0 15px -3px rgba(255, 90, 0, 0.3)',
        'fire-md': '0 0 25px -5px rgba(255, 90, 0, 0.45)',
        'fire-lg': '0 0 40px -8px rgba(255, 90, 0, 0.55)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.35s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
