import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: '#0a0b0f',
          card: '#12141a',
          elevated: '#1a1d26',
          border: '#242730',
        },
        primary: {
          DEFAULT: '#6366f1',
          hover: '#5558e3',
          muted: '#6366f11a',
        },
        profit: {
          DEFAULT: '#10b981',
          muted: '#10b9811a',
        },
        loss: {
          DEFAULT: '#f43f5e',
          muted: '#f43f5e1a',
        },
        warning: {
          DEFAULT: '#f59e0b',
          muted: '#f59e0b1a',
        },
        text: {
          primary: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#475569',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'card-gradient': 'linear-gradient(135deg, #12141a 0%, #1a1d26 100%)',
      },
    },
  },
  plugins: [],
}

export default config
