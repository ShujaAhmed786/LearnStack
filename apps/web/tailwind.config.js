/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        'surface-hover': 'var(--surface-hover)',
        border: 'var(--border)',
        'border-hover': 'var(--border-hover)',
        text: 'var(--text)',
        'text-muted': 'var(--text-muted)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        accent: 'var(--accent)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        error: 'var(--danger)',
        navy: {
          DEFAULT: '#0A1628',
          dark: '#0A1628',
          surface: '#111E32',
          hover: '#1A2C46',
        },
        teal: {
          DEFAULT: '#14B8A6',
          hover: '#0D9488',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['"Space Grotesk"', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '12': ['12px', { lineHeight: '16px' }],
        '13': ['13px', { lineHeight: '18px' }],
        '14': ['14px', { lineHeight: '20px' }],
        '16': ['16px', { lineHeight: '1.6' }],
        '18': ['18px', { lineHeight: '24px' }],
        '20': ['20px', { lineHeight: '28px' }],
        '24': ['24px', { lineHeight: '32px', letterSpacing: '-0.02em' }],
        '28': ['28px', { lineHeight: '36px', letterSpacing: '-0.02em' }],
        '32': ['32px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        '40': ['40px', { lineHeight: '48px', letterSpacing: '-0.02em' }],
      },
      borderRadius: {
        DEFAULT: '8px',
        md: '8px',
        lg: '10px',
        xl: '12px',
        '2xl': '16px',
      },
      maxWidth: {
        content: '1200px',
      },
    },
  },
  plugins: [],
}
