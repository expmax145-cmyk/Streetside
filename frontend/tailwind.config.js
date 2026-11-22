/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Offer card colours are stored in the database as class strings (e.g.
  // "from-brand-500 to-rose-500"), so Tailwind can't see them in the source.
  // Without this the gradient is never generated and white text on the card
  // becomes unreadable.
  safelist: [
    { pattern: /^(from|to)-(brand|rose|gold|teal|charcoal)-(400|500|600|700|900)$/ },
  ],
  theme: {
    extend: {
      colors: {
        // Primary orange scale — the core monochromatic brand ramp.
        brand: {
          50: '#fff3e6',
          100: '#ffe0c2',
          200: '#ffc894',
          300: '#ffa35c',
          400: '#ff8730',
          500: '#f97316', // primary orange
          600: '#e35d0a', // rich orange
          700: '#c2410c', // dark orange
          800: '#9a3412', // burnt orange
          900: '#7c2d12', // deep orange
          950: '#3a1405', // deepest — replaces black everywhere
        },
        // Deep red-orange (vermillion) — used sparingly for favorites/alerts,
        // kept inside the orange family instead of a pink/magenta hue.
        rose: {
          50: '#fff1ea',
          100: '#ffdccb',
          200: '#ffb899',
          300: '#ff8f5e',
          400: '#f26430',
          500: '#d9491c',
          600: '#b93712',
          700: '#92290d',
          800: '#6e1e09',
          900: '#4a1406',
        },
        // No longer used decoratively (was teal); remapped into the orange
        // family so any lingering references stay on-palette.
        teal: {
          50: '#fff3e6',
          100: '#ffe0c2',
          200: '#ffc894',
          300: '#ffa35c',
          400: '#ff8730',
          500: '#e35d0a',
          600: '#c2410c',
          700: '#9a3412',
          800: '#7c2d12',
          900: '#5c2109',
        },
        // Golden-orange — used for ratings/highlights, already on-family.
        gold: {
          50: '#fff9eb',
          100: '#ffefc7',
          200: '#ffdd8a',
          300: '#ffc94d',
          400: '#f7ae1f',
          500: '#e8a317',
          600: '#c27f0d',
          700: '#96600a',
          800: '#6f4708',
          900: '#4a2f06',
        },
        // Deep burnt-orange/brown neutrals — stands in for "charcoal"/black
        // across all text, borders, and dark surfaces site-wide.
        charcoal: {
          50: '#fbf3ec',
          100: '#f3e4d6',
          200: '#e8cdb4',
          300: '#d6a97d',
          400: '#b87f52',
          500: '#8f5a34',
          600: '#6e4224',
          700: '#55311a',
          800: '#3a1e10',
          900: '#2a150a',
        },
        // Soft peach-orange surfaces/backgrounds.
        cream: {
          50: '#fffdfb',
          100: '#fff8f0',
          200: '#fdeedd',
          300: '#fbe0c4',
          400: '#f0cba0',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        warning: {
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(58, 20, 5, 0.06), 0 4px 16px -4px rgba(58, 20, 5, 0.14), inset 0 1px 0 rgba(255, 232, 209, 0.5)',
        'card-hover': '0 10px 28px -6px rgba(58, 20, 5, 0.2), 0 18px 44px -12px rgba(227, 93, 10, 0.28), inset 0 1px 0 rgba(255, 232, 209, 0.6)',
        warm: '0 4px 14px -2px rgba(227, 93, 10, 0.4), inset 0 1px 0 rgba(255, 224, 194, 0.4)',
        'warm-lg': '0 10px 28px -6px rgba(227, 93, 10, 0.45), inset 0 1px 0 rgba(255, 224, 194, 0.45)',
        soft: '0 2px 8px -2px rgba(58, 20, 5, 0.1)',
        nav: '0 1px 0 rgba(255, 224, 194, 0.5) inset, 0 10px 30px -14px rgba(58, 20, 5, 0.35)',
        // 3D system: raised surface, recessed/inset surface, and press state.
        'raised-3d': '0 1px 0 rgba(255, 232, 209, 0.6) inset, 0 -2px 6px rgba(58, 20, 5, 0.18) inset, 0 10px 24px -8px rgba(58, 20, 5, 0.35)',
        'inset-3d': 'inset 0 2px 5px rgba(58, 20, 5, 0.35), inset 0 -1px 0 rgba(255, 224, 194, 0.3)',
        'press-3d': 'inset 0 2px 6px rgba(58, 20, 5, 0.4)',
        'glow-focus': '0 0 0 4px rgba(249, 115, 22, 0.22), inset 0 1px 3px rgba(58, 20, 5, 0.25)',
      },
      borderRadius: {
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      backgroundImage: {
        'hero-mesh':
          'radial-gradient(at 15% 20%, rgba(249, 115, 22, 0.16) 0px, transparent 45%), radial-gradient(at 85% 15%, rgba(217, 73, 28, 0.1) 0px, transparent 40%), radial-gradient(at 55% 85%, rgba(232, 163, 23, 0.08) 0px, transparent 45%)',
        'warm-gradient': 'linear-gradient(135deg, #ff8730 0%, #f97316 45%, #c2410c 100%)',
        'mesh-soft':
          'radial-gradient(at 25% 20%, rgba(251, 146, 60, 0.09) 0px, transparent 50%), radial-gradient(at 80% 80%, rgba(194, 65, 12, 0.06) 0px, transparent 45%)',
        // 3D surface gradients — layered shades simulating a physical light source (upper-left).
        'header-3d': 'linear-gradient(160deg, #ff8730 0%, #e35d0a 45%, #9a3412 100%)',
        'surface-3d': 'linear-gradient(160deg, #ffa35c 0%, #f97316 55%, #c2410c 100%)',
        'surface-3d-deep': 'linear-gradient(160deg, #7c2d12 0%, #5c2109 55%, #3a1405 100%)',
        'btn-3d': 'linear-gradient(180deg, #ff8730 0%, #e35d0a 55%, #c2410c 100%)',
        'btn-3d-hover': 'linear-gradient(180deg, #ffa35c 0%, #f97316 55%, #c2410c 100%)',
        'inset-3d-fill': 'linear-gradient(180deg, #fdeedd 0%, #fff8f0 100%)',
        'bg-orange-deep': 'radial-gradient(at 20% 0%, rgba(255, 135, 48, 0.08) 0px, transparent 50%), radial-gradient(at 80% 100%, rgba(227, 93, 10, 0.06) 0px, transparent 45%), linear-gradient(180deg, #2a150a 0%, #3a1405 100%)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'heart-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.28)' },
          '100%': { transform: 'scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.28s ease-out',
        'fade-in-up': 'fade-in-up 0.25s ease-out both',
        'slide-in-right': 'slide-in-right 0.28s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'heart-pop': 'heart-pop 0.35s ease-out',
        shimmer: 'shimmer 1.5s infinite linear',
        'spin-slow': 'spin-slow 3s linear infinite',
        float: 'float 5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
