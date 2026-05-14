import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        orbit: {
          midnight: '#0d0e14',
          deep:     '#13151f',
          navy:     '#1c1e2e',
        },
        zi: {
          blue:   '#6d6ade',
          cyan:   '#38bdf8',
          gold:   '#f59e0b',
          white:  '#e2e8f0',
          muted:  '#64748b',
        },
      },
      fontFamily: {
        display: ['Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'twinkle':      { '0%,100%': { opacity: '0.6' }, '50%': { opacity: '0.15' } },
        'orbit-spin':   { '0%': { transform: 'perspective(700px) rotateX(var(--rx)) rotateZ(0deg)' }, '100%': { transform: 'perspective(700px) rotateX(var(--rx)) rotateZ(360deg)' } },
        'aurora-drift': { '0%,100%': { transform: 'translate(0,0) scale(1)' }, '33%': { transform: 'translate(3%,4%) scale(1.04)' }, '66%': { transform: 'translate(-2%,2%) scale(0.97)' } },
        'pulse-glow':   { '0%,100%': { opacity: '0.6', transform: 'scale(1)' }, '50%': { opacity: '1', transform: 'scale(1.08)' } },
        'shimmer-x':    { '0%': { opacity: '0', transform: 'translateX(-100%) rotate(-25deg)' }, '10%': { opacity: '1' }, '40%': { opacity: '0' }, '100%': { opacity: '0', transform: 'translateX(200vw) rotate(-25deg)' } },
        'fade-in':      { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
        'slide-in-left':{ '0%': { opacity: '0', transform: 'translateX(-16px)' }, '100%': { opacity: '1', transform: 'translateX(0)' } },
      },
      animation: {
        'twinkle':       'twinkle 2.5s ease-in-out infinite',
        'aurora-drift':  'aurora-drift 22s ease-in-out infinite',
        'pulse-glow':    'pulse-glow 4s ease-in-out infinite',
        'shimmer-x':     'shimmer-x 8s linear 3s infinite',
        'fade-in':       'fade-in 0.3s ease-out',
        'slide-in-left': 'slide-in-left 0.25s ease-out',
      },
    },
  },
  plugins: [],
}

export default config
