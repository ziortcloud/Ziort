import { Link } from 'react-router-dom'

interface LogoProps {
  size?:   'sm' | 'md' | 'lg'
  linked?: boolean
  to?:     string
}

const sizes = {
  sm: { text: 'text-lg',  orbit: 20 },
  md: { text: 'text-2xl', orbit: 28 },
  lg: { text: 'text-4xl', orbit: 40 },
}

function LogoMark({ orbit }: { orbit: number }) {
  const r = orbit / 2
  return (
    <svg width={orbit} height={orbit} viewBox={`0 0 ${orbit} ${orbit}`} fill="none">
      <circle cx={r} cy={r} r={r - 2} stroke="#38bdf8" strokeWidth="1.5" opacity="0.35" />
      <circle cx={r} cy={r} r={r * 0.55} fill="#6d6ade" opacity="0.9" />
      <circle cx={r} cy={r} r={r * 0.25} fill="#38bdf8" />
      <circle cx={r} cy={2}  r="2.5" fill="#f59e0b" />
    </svg>
  )
}

export default function Logo({ size = 'md', linked = true, to = '/hub' }: LogoProps) {
  const { text, orbit } = sizes[size]

  const mark = (
    <span className={`flex items-center gap-2.5 ${text} font-display font-bold tracking-tight select-none`}>
      <LogoMark orbit={orbit} />
      <span>
        <span className="text-zi-cyan">Zi</span>
        <span className="text-zi-white">Orbit</span>
      </span>
    </span>
  )

  return linked ? <Link to={to}>{mark}</Link> : mark
}
