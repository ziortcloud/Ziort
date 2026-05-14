import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Ziort brand palette — refined professional dark theme
        orbit: {
          midnight: '#0d0e14',  // page background — near-black, neutral
          deep:     '#13151f',  // section backgrounds — dark slate
          navy:     '#1c1e2e',  // cards, panels — elevated surface
        },
        zi: {
          blue:   '#6d6ade',  // primary brand — soft indigo, professional
          cyan:   '#38bdf8',  // accent — clean sky blue
          gold:   '#f59e0b',  // CTA buttons — amber
          white:  '#e2e8f0',  // body text — cool white
          muted:  '#64748b',  // secondary text — neutral slate
        },
        // Semantic aliases for components
        background:   'var(--background)',
        foreground:   'var(--foreground)',
        primary:      { DEFAULT: '#6d6ade', foreground: '#e2e8f0' },
        secondary:    { DEFAULT: '#13151f', foreground: '#e2e8f0' },
        accent:       { DEFAULT: '#38bdf8', foreground: '#0d0e14' },
        muted:        { DEFAULT: '#13151f', foreground: '#64748b' },
        destructive:  { DEFAULT: '#ef4444', foreground: '#e2e8f0' },
        border:       'rgba(255,255,255,0.06)',
        input:        'rgba(255,255,255,0.06)',
        ring:         '#6d6ade',
        card:         { DEFAULT: '#1c1e2e', foreground: '#e2e8f0' },
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],   // headings: weight 700-800
        body:    ['DM Sans', 'sans-serif'], // body: weight 300-500
        mono:    ['DM Mono', 'monospace'],  // code / ref codes
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      keyframes: {
        'orbit-spin': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'orbit-spin': 'orbit-spin 8s linear infinite',
        'fade-in':    'fade-in 0.3s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
