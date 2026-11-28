/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },

      colors: {
        /* PRIMARY — deep teal (used as the single accent colour) */
        hydro: {
          50:  '#E7F6F7',
          100: '#C5E9EC',
          200: '#92D6DC',
          300: '#4DB9C3',
          400: '#1699A6',
          500: '#0A7F8B',
          600: '#086A74',
          700: '#07555D',
          800: '#054148',
          900: '#032E33',
          DEFAULT: '#0A7F8B',
          light:   '#0E98A6',
          dark:    '#07555D',
        },

        /* SECONDARY — aqua (focus rings, info chips) */
        aqua: {
          50:  '#E6F9FC',
          100: '#C3F0F7',
          200: '#92E2EF',
          300: '#5FD2E5',
          400: '#36C3DB',
          500: '#22B8CF',
          600: '#1596AB',
          700: '#12788A',
          800: '#0F5C6B',
          900: '#0B3F4A',
          DEFAULT: '#22B8CF',
          light:   '#5FD2E5',
          dark:    '#1596AB',
        },

        mint: {
          50:  '#F0FCF9',
          100: '#D6F7EF',
          200: '#B2EFE1',
          300: '#8BE9D8',
          400: '#7FE7D6',
          500: '#4DD9C2',
          600: '#2DC2AA',
          700: '#1F9A87',
          800: '#167265',
          900: '#0E4A42',
          DEFAULT: '#7FE7D6',
          light:   '#A0EFE2',
          dark:    '#4DD9C2',
        },

        /* INK — neutral text / border greys */
        ink: {
          50:  '#F6F8FA',
          100: '#EBEFF3',
          200: '#DCE3EA',
          300: '#C0CBD6',
          400: '#8D9BAA',
          500: '#5F6F80',
          600: '#46566A',
          700: '#2F3E51',
          800: '#1C2B3D',
          900: '#0F1C2B',
          DEFAULT: '#0F1C2B',
        },

        /* STATUS — monitoring convention
           sea = normal (green) · sand = warning (amber)
           coral = leak / critical (red) · fog = offline (grey) */
        coral: {
          50:  '#FEF2F1',
          100: '#FCE0DD',
          200: '#F8C2BC',
          300: '#F19C93',
          400: '#E8776B',
          500: '#D9534A',
          600: '#BC3F37',
          700: '#982F2A',
          800: '#742420',
          900: '#4F1815',
          DEFAULT: '#D9534A',
        },
        sand: {
          50:  '#FFF8EB',
          100: '#FDEDC9',
          200: '#F9DA97',
          300: '#F2C35F',
          400: '#E8AC37',
          500: '#D4951C',
          600: '#B07714',
          700: '#8A5C11',
          800: '#6A4610',
          900: '#47300B',
          DEFAULT: '#D4951C',
        },
        sea: {
          50:  '#ECF8F1',
          100: '#D0EFDE',
          200: '#A3DEBF',
          300: '#72C99D',
          400: '#47B27C',
          500: '#2F9A64',
          600: '#237D50',
          700: '#1D6340',
          800: '#174C33',
          900: '#103625',
          DEFAULT: '#2F9A64',
        },
        fog: {
          50:  '#F4F6F8',
          100: '#E6EAEE',
          200: '#CDD5DC',
          300: '#AAB6C1',
          400: '#8896A3',
          500: '#6B7A88',
          600: '#546270',
          700: '#3F4B57',
          800: '#2D3741',
          900: '#1E252C',
          DEFAULT: '#6B7A88',
        },

        /* CANVAS — base tone under the glass mesh background (see index.css) */
        canvas: {
          DEFAULT: '#F3F6F9',
          soft:    '#F8FAFC',
          deep:    '#E8EDF2',
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

      /* Soft glass radii. Cards use `rounded-lg`; icon tiles / notices use 2xl+.
         Small controls (buttons, inputs, nav items) use `md`.
         In browsers that support CSS `corner-shape`, index.css turns the
         lg-and-up radii into a gentle squircle. */
      borderRadius: {
        md:  '8px',
        lg:  '16px',
        xl:  '12px',
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '28px',
      },

      /* Soft teal-tinted elevation for floating glass. Names are kept so
         existing classes keep compiling. */
      boxShadow: {
        'glass-sm': '0 2px 10px -3px rgba(7, 85, 93, 0.16)',
        glass:      '0 8px 30px -10px rgba(7, 85, 93, 0.22)',
        'glass-lg': '0 18px 48px -14px rgba(7, 85, 93, 0.32)',
        brand:      '0 6px 16px -6px rgba(10, 127, 139, 0.55)',
        'brand-lg': '0 14px 32px -10px rgba(10, 127, 139, 0.55)',
        alert:      '0 6px 16px -6px rgba(217, 83, 74, 0.5)',
        hydro:      '0 6px 16px -6px rgba(10, 127, 139, 0.55)',
        'hydro-lg': '0 14px 32px -10px rgba(10, 127, 139, 0.55)',
        glow:       '0 0 0 3px rgba(10, 127, 139, 0.18)',
      },

      backgroundImage: {
        'hydro-gradient': 'linear-gradient(135deg, #0E98A6 0%, #0A7F8B 55%, #086A74 100%)',
        'aqua-mint':      'linear-gradient(135deg, #E6F9FC 0%, #D6F7EF 100%)',
        'glass-sheen':    'none',
      },

      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      keyframes: {
        'pulse-alert': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(217, 83, 74, 0.35)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(217, 83, 74, 0)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%':   { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-left': {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'toast-in': {
          '0%':   { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
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
        'fade-in':       'fade-in 0.2s ease-out both',
        'fade-in-up':    'fade-in-up 0.25s ease-out both',
        'scale-in':      'scale-in 0.18s ease-out both',
        'slide-in-left': 'slide-in-left 0.25s cubic-bezier(0.16, 1, 0.3, 1) both',
        'toast-in':      'toast-in 0.2s ease-out both',
        wave:            'wave 7s linear infinite',
        'wave-slow':     'wave 12s linear infinite reverse',
        shimmer:         'shimmer 1.8s linear infinite',
      },
    },
  },
  plugins: [],
};