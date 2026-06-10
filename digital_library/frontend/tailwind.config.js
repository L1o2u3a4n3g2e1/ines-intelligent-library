/** @type {import('tailwindcss').Config} */
const twColors = require('tailwindcss/colors');

module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Semantic design tokens — maps exactly to the brand palette
        brand: twColors.violet,   // brand-600=#7C3AED, brand-500=#8B5CF6, brand-800=#5B21B6, brand-950=#2E1065
        audio: twColors.cyan,     // audio-600=#0891B2, audio-100=#E0F2FE
        lang:  twColors.emerald,  // lang-600=#059669,  lang-100=#D1FAE5
        // Legacy aliases kept for backward compat
        cream:  { DEFAULT: '#F5F3FF', 50: '#FAFAFF', 100: '#F5F3FF', 200: '#EDE9FE', 300: '#DDD6FE' },
        nude:   { DEFAULT: '#DDD6FE', 100: '#EDE9FE', 200: '#DDD6FE', 300: '#C4B5FD', 400: '#A78BFA' },
        brown:  { DEFAULT: '#7C3AED', light: '#8B5CF6', dark: '#5B21B6', darker: '#2E1065' },
        coffee: { DEFAULT: '#8B5CF6', light: '#A78BFA', dark: '#6D28D9' },
        warm:   { white: '#FAFAFF', gray: '#6B7280', muted: '#9CA3AF' },
        accent: { cyan: '#0891B2', emerald: '#059669', amber: '#D97706', rose: '#E11D48' },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        serif:   ['"Playfair Display"', 'Georgia', 'serif'],
        display: ['"Playfair Display"', 'serif'],
      },
      boxShadow: {
        'soft':       '0 2px 15px -3px rgba(124,58,237,0.08), 0 4px 6px -2px rgba(124,58,237,0.04)',
        'card':       '0 4px 20px -4px rgba(124,58,237,0.12), 0 2px 8px -2px rgba(124,58,237,0.06)',
        'card-hover': '0 12px 40px -8px rgba(124,58,237,0.22), 0 4px 12px -4px rgba(124,58,237,0.10)',
        'glass':      '0 8px 32px 0 rgba(124,58,237,0.10)',
        'glow':       '0 0 22px rgba(124,58,237,0.35)',
      },
      backdropBlur: { xs: '2px' },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem', '4xl': '2rem' },
      animation: {
        'float':          'float 6s ease-in-out infinite',
        'pulse-soft':     'pulseSoft 2s ease-in-out infinite',
        'slide-up':       'slideUp 0.5s ease-out',
        'fade-in':        'fadeIn 0.4s ease-out',
        'shimmer':        'shimmer 1.5s infinite',
        'mic-pulse':      'micPulse 1.5s ease-in-out infinite',
        'fade-slide-up':  'fadeSlideUp 0.45s ease-out both',
        'scale-in':       'scaleIn 0.3s ease-out both',
      },
      keyframes: {
        float:        { '0%,100%': { transform: 'translateY(0px)' }, '50%': { transform: 'translateY(-12px)' } },
        pulseSoft:    { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.7 } },
        slideUp:      { '0%': { transform: 'translateY(20px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        fadeIn:       { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        shimmer:      { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        micPulse:     { '0%,100%': { transform: 'scale(1)', boxShadow: '0 0 0 0 rgba(124,58,237,0.45)' }, '50%': { transform: 'scale(1.06)', boxShadow: '0 0 0 12px rgba(124,58,237,0)' } },
        fadeSlideUp:  { from: { opacity: '0', transform: 'translateY(16px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:      { from: { opacity: '0', transform: 'scale(0.94)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      spacing: { '18': '4.5rem', '88': '22rem', '112': '28rem', '128': '32rem' },
      screens: { 'xs': '475px' },
      zIndex: { '60': '60', '70': '70', '80': '80', '90': '90', '100': '100' },
    },
  },
  plugins: [],
};
