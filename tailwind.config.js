// File: tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      /* ============================================================
         BREAKPOINTS — one extra small step for compact phones
         ============================================================ */
      screens: {
        xs: '420px',
      },

      colors: {
        /* ============================================================
           PRIMARY — Deep teal  ("hydro")
           Same token name as before, so every existing `text-hydro`,
           `bg-hydro/10`, `shadow-hydro` etc. is re-themed automatically.
           500 = DEFAULT is tuned to pass WCAG AA with white text (4.7:1).
           ============================================================ */
        hydro: {
          50:  '#E7F6F7',
          100: '#C5E9EC',
          200: '#92D6DC',
          300: '#4DB9C3',
          400: '#1699A6',
          500: '#0A7F8B',   /* base = Primary */
          600: '#086A74',
          700: '#07555D',
          800: '#054148',
          900: '#032E33',
          DEFAULT: '#0A7F8B',
          light:   '#0E98A6',  /* hover state */
          dark:    '#07555D',  /* gradients */
        },

        /* ============================================================
           SECONDARY — Bright aqua / cyan
           Accents, focus rings, links, highlights.
           ============================================================ */
        aqua: {
          50:  '#E6F9FC',
          100: '#C3F0F7',
          200: '#92E2EF',
          300: '#5FD2E5',
          400: '#36C3DB',
          500: '#22B8CF',   /* base = Secondary */
          600: '#1596AB',
          700: '#12788A',
          800: '#0F5C6B',
          900: '#0B3F4A',
          DEFAULT: '#22B8CF',
          light:   '#5FD2E5',
          dark:    '#1596AB',
        },

        /* ============================================================
           TERTIARY — Soft mint
           Positive highlights, soft accents.
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
           INK — Deep navy for text & headings (replaces slate usage
           in the redesigned components). Cool, slightly blue-green.
           ============================================================ */
        ink: {
          50:  '#F4F7FA',
          100: '#E8EEF4',
          200: '#D6E0EA',
          300: '#B5C4D3',
          400: '#8CA2B8',
          500: '#5B7A98',
          600: '#35597C',
          700: '#1E4468',
          800: '#123556',
          900: '#0B2A4A',
          DEFAULT: '#0B2A4A',
        },

        /* ============================================================
           STATUS — muted & elegant
           Dusty, desaturated tones instead of alarm-red / neon-green.
           coral = leak · sand = warning · sea = normal · fog = offline
           ============================================================ */
        coral: {
          50:  '#FDF1EF',
          100: '#FADDD8',
          200: '#F4BCB2',
          300: '#EC9A8D',
          400: '#E27F70',
          500: '#D4695A',   /* base = Leak */
          600: '#B84E40',
          700: '#943D32',
          800: '#722F27',
          900: '#4F211B',
          DEFAULT: '#D4695A',
        },
        sand: {
          50:  '#FCF7EA',
          100: '#F7EBCB',
          200: '#EFD99B',
          300: '#E6C46D',
          400: '#DCAE4B',
          500: '#C99A38',   /* base = Warning */
          600: '#A87A2A',
          700: '#855F20',
          800: '#654818',
          900: '#463110',
          DEFAULT: '#C99A38',
        },
        sea: {
          50:  '#EAF6F1',
          100: '#CDEBDF',
          200: '#9FD8C1',
          300: '#6FC3A2',
          400: '#4DB08A',
          500: '#3A9A76',   /* base = Normal / OK */
          600: '#2E7D5E',
          700: '#256349',
          800: '#1C4A37',
          900: '#133226',
          DEFAULT: '#3A9A76',
        },
        fog: {
          50:  '#F3F6F8',
          100: '#E4EAEF',
          200: '#CBD5DD',
          300: '#A9B7C3',
          400: '#8797A5',
          500: '#6B7C8B',   /* base = Offline */
          600: '#536370',
          700: '#3F4C57',
          800: '#2D3740',
          900: '#1E252B',
          DEFAULT: '#6B7C8B',
        },

        /* ============================================================
           CANVAS — pale aqua-mist page background
           ============================================================ */
        canvas: {
          DEFAULT: '#E4F4F6',
          soft:    '#EEF9FA',
          deep:    '#D3ECEF',
        },
      },

      fontFamily: {
        sans: [
          '"Plus Jakarta Sans"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },

      borderRadius: {
        '4xl': '2rem',
      },

      boxShadow: {
        /* Tinted shadows match the teal-ink palette. Every glass shadow
           carries a 1px inner top highlight for that "frosted edge". */
        'glass-sm': '0 2px 12px 0 rgba(8, 70, 85, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.70)',
        glass:      '0 8px 32px 0 rgba(8, 70, 85, 0.08), inset 0 1px 0 0 rgba(255, 255, 255, 0.70)',
        'glass-lg': '0 20px 56px -8px rgba(8, 70, 85, 0.16), inset 0 1px 0 0 rgba(255, 255, 255, 0.75)',
        /* NOTE: `shadow-<name>` is ambiguous when a colour has the same name
           (hydro, coral), so Tailwind treats it as a shadow *colour* and the
           soft tint below is lost. The design system therefore uses the
           collision-free names `brand`, `brand-lg` and `alert`. `hydro` and
           `hydro-lg` are kept only so existing pages keep compiling. */
        brand:      '0 10px 28px -10px rgba(10, 127, 139, 0.55)',
        'brand-lg': '0 18px 40px -12px rgba(10, 127, 139, 0.60)',
        alert:      '0 10px 28px -10px rgba(184, 78, 64, 0.50)',
        hydro:      '0 10px 28px -10px rgba(10, 127, 139, 0.55)',
        'hydro-lg': '0 18px 40px -12px rgba(10, 127, 139, 0.60)',
        glow:       '0 0 0 4px rgba(34, 184, 207, 0.18)',
      },

      backgroundImage: {
        /* Primary brand gradient — buttons, brand mark, hero accents */
        'hydro-gradient': 'linear-gradient(135deg, #0E98A6 0%, #0A7F8B 55%, #086A74 100%)',
        /* Aqua → mint, for soft accent panels */
        'aqua-mint':      'linear-gradient(135deg, #22B8CF 0%, #7FE7D6 100%)',
        /* Subtle diagonal sheen laid over glass cards */
        'glass-sheen':    'linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.10) 60%)',
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      keyframes: {
        /* Leak ripple (kept under the old name so existing usage works) */
        'pulse-alert': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(212, 105, 90, 0.40)' },
          '50%':      { boxShadow: '0 0 0 14px rgba(212, 105, 90, 0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96) translateY(4px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'slide-in-left': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        /* Water surface: the wave SVG is 200% wide, so -50% is a seamless loop */
        wave: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      animation: {
        'pulse-alert':   'pulse-alert 2.2s ease-out infinite',
        'fade-in':       'fade-in 0.25s ease-out both',
        'fade-in-up':    'fade-in-up 0.45s cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-in':      'scale-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-in-left': 'slide-in-left 0.32s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-in':      'toast-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
        wave:            'wave 7s linear infinite',
        'wave-slow':     'wave 12s linear infinite reverse',
        shimmer:         'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};