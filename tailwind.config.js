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
          orange: '#FF7A00', // Naranja fuego principal
          'orange-hover': '#E66E00',
          'orange-active': '#CC6200',
          red: '#E53935',    // Rojo pasión (bandana y estados destacados)
          carbon: '#1E1E1E', // Carbón (encabezados, textos fuertes)
          ivory: '#F7F2E8',  // Marfil (fondo gastronómico cálido)
          white: '#FFFFFF',  // Blanco (tarjetas y superficies)
          neutral: '#6B625D', // Gris neutro (texto secundario y descripciones)
          border: '#E6DFD5', // Borde sutil para tarjetas
          tint: '#FFF7EE',   // Fondo sutil al seleccionar
          subtle: '#EDE6DA', // Separadores y fondos secundarios
        },
      },
      fontFamily: {
        sans: ['Manrope', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Manrope', 'Plus Jakarta Sans', 'sans-serif'],
      },
      boxShadow: {
        'baku-card': '0 2px 10px -2px rgba(30, 30, 30, 0.05)',
        'baku-card-hover': '0 6px 18px -4px rgba(30, 30, 30, 0.08)',
        'baku-selected': '0 0 0 2px #FF7A00, 0 4px 12px -2px rgba(255, 122, 0, 0.15)',
        'baku-btn': '0 4px 14px -3px rgba(255, 122, 0, 0.4)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'scale(0.99)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}
