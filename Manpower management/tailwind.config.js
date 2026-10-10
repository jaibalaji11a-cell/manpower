/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary dark backgrounds
        dark: {
          950: '#050505',
          900: '#0A0A0A',
          800: '#111111',
          700: '#181818',
          600: '#1E1E1E',
          500: '#252525',
          400: '#2E2E2E',
          300: '#3A3A3A',
        },
        // Gold accents
        gold: {
          50:  '#FDF8E7',
          100: '#FAEFC4',
          200: '#F5DC88',
          300: '#EFC84D',
          400: '#E8B820',
          500: '#D4AF37',
          600: '#C9A227',
          700: '#A8841F',
          800: '#876A19',
          900: '#6B5214',
        },
        // Off-white text
        cream: {
          50:  '#FEFEFE',
          100: '#F8F6F0',
          200: '#F0EDD8',
          300: '#E8E3C8',
          400: '#D4CFA8',
          500: '#B8B090',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-in': 'slideIn 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'gold': '0 0 20px rgba(212, 175, 55, 0.15)',
        'gold-lg': '0 0 40px rgba(212, 175, 55, 0.25)',
        'dark': '0 4px 24px rgba(0, 0, 0, 0.6)',
        'card': '0 2px 12px rgba(0, 0, 0, 0.4)',
      },
      backgroundImage: {
        'gold-gradient': 'linear-gradient(135deg, #D4AF37 0%, #F0C040 50%, #C9A227 100%)',
        'dark-gradient': 'linear-gradient(135deg, #111111 0%, #1E1E1E 100%)',
        'card-gradient': 'linear-gradient(135deg, #181818 0%, #222222 100%)',
      },
    },
  },
  plugins: [],
}
