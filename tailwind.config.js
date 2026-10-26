/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        /* ============================================================
           PRIMARY — Deep navy blue
           #0B3D91 (base), used for headings, primary buttons, brand
           ============================================================ */
        hydro: {
          50:  '#EAF0FA',
          100: '#C9D8F0',
          200: '#9CB8E4',
          300: '#6E97D8',
          400: '#4176CC',
          500: '#0B3D91',   /* base = Primary */
          600: '#093478',
          700: '#072A60',
          800: '#052048',
          900: '#031630',
          DEFAULT: '#0B3D91',
          light:   '#1557C7',  /* hover state */
          dark:    '#072A60',  /* gradients */
        },

        /* ============================================================
           SECONDARY — Bright sky blue
           #3BA7F2 (base), used for accents, info states, links
           ============================================================ */
        aqua: {
          50:  '#E8F4FE',
          100: '#C7E4FD',
          200: '#9DD0FA',
          300: '#73BDF7',
          400: '#55B2F4',
          500: '#3BA7F2',   /* base = Secondary */
          600: '#1C8FE0',
          700: '#1571B4',
          800: '#0E5388',
          900: '#09355B',
          DEFAULT: '#3BA7F2',
          light:   '#5FB8F5',
          dark:    '#1C8FE0',
        },

        /* ============================================================
           TERTIARY — Soft mint / aqua
           #7FE7D6 (base), used for success states, soft highlights
           ============================================================ */
        mint: {
          50:  '#F0FCF9',
          100: '#D6F7EF',
          200: '#B2EFE1',
          300: '#8BE9D8',
          400: '#7FE7D6',   /* base = Tertiary */
          500: '#4DD9C2',
          600: '#2DC2AA',
          700: '#1F9A87',
          800: '#167265',
          900: '#0E4A42',
          DEFAULT: '#7FE7D6',
          light:   '#A0EFE2',
          dark:    '#4DD9C2',
        },

        /* ============================================================
           BACKGROUND — Soft cyan-tinted white
           #E8F6FF
           ============================================================ */
        canvas: {
          DEFAULT: '#E8F6FF',
          soft:    '#F2FAFF',   /* slightly lighter, for cards */
          deep:    '#D6EBFA',   /* slightly deeper, for canvas accents */
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },

      boxShadow: {
        /* Tinted shadows match the navy primary */
        glass:      '0 8px 32px 0 rgba(11, 61, 145, 0.08)',
        'glass-lg': '0 16px 48px 0 rgba(11, 61, 145, 0.12)',
        hydro:      '0 10px 30px -10px rgba(11, 61, 145, 0.40)',
        'hydro-lg': '0 20px 50px -12px rgba(11, 61, 145, 0.50)',
      },

      backgroundImage: {
        /* Primary → dark-primary gradient */
        'hydro-gradient': 'linear-gradient(135deg, #0B3D91 0%, #072A60 100%)',
        /* Secondary → tertiary, for accent panels */
        'aqua-mint':      'linear-gradient(135deg, #3BA7F2 0%, #7FE7D6 100%)',
      },

      keyframes: {
        'pulse-alert': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.45)' },
          '50%':      { boxShadow: '0 0 0 14px rgba(239,68,68,0)' },
        },
      },
      animation: {
        'pulse-alert': 'pulse-alert 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
};