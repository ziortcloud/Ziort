'use client'

// ─── Hardcoded stars (deterministic — no hydration issues) ────────────────────
// [left%, top%, diameter-px, twinkle-delay-s]
const STARS: [number, number, number, number][] = [
  [2,5,1,0.5],[7,18,1.5,1.8],[11,42,1,0.2],[14,73,2,2.5],[19,8,1,3.1],
  [23,55,1.5,0.8],[28,31,1,1.4],[33,88,1,2.9],[38,14,2,0.3],[42,67,1,1.7],
  [47,39,1.5,3.4],[51,92,1,0.6],[56,23,1,2.2],[61,79,2,1.1],[66,11,1,3.8],
  [70,46,1.5,0.4],[75,83,1,2.7],[79,28,1,1.5],[84,61,2,3.2],[88,7,1,0.9],
  [92,52,1.5,2.0],[96,35,1,1.3],[4,91,1,3.6],[9,64,2,0.7],[16,25,1,2.3],
  [22,80,1.5,1.0],[27,48,1,3.9],[31,15,1,0.1],[36,70,2,2.8],[41,33,1,1.6],
  [46,95,1.5,3.3],[50,58,1,0.5],[55,19,2,2.1],[59,84,1,1.4],[64,43,1.5,3.7],
  [68,72,1,0.8],[73,6,1,2.4],[77,57,2,1.2],[82,30,1,3.0],[86,89,1.5,0.6],
  [91,16,1,2.6],[95,74,1,1.9],[3,38,2,3.5],[8,82,1,0.3],[13,53,1.5,2.9],
  [18,7,1,1.7],[24,94,1,3.8],[29,62,2,0.2],[34,27,1.5,2.0],[39,75,1,1.5],
  [44,41,1,3.1],[49,10,2,0.9],[53,86,1.5,2.7],[58,55,1,1.1],[63,20,1,3.4],
  [67,90,2,0.4],[72,37,1,2.3],[76,68,1.5,1.8],[81,4,1,3.6],[85,77,1,0.7],
  [90,44,2,2.5],[94,22,1,1.3],[6,69,1.5,3.0],[20,96,1,0.1],[43,2,2,2.2],
  [57,50,1,1.6],[71,85,1.5,3.7],[87,60,1,0.5],[15,97,1,3.3],[35,3,2,1.0],
  [65,98,1,2.8],[93,1,1.5,1.4],[10,86,1,0.6],[48,77,1.5,2.1],[78,19,2,1.9],
]

// ─── Orbital ring config ──────────────────────────────────────────────────────
// [diameter-px, border-color opacity, border-glow, tiltX, tiltZ, duration-s]
const RINGS = [
  { d: 900, color: 'rgba(56,189,248,0.05)',  glow: 'rgba(56,189,248,0.03)',  tx: 72, tz: -12, dur: 55, dir: 1  },
  { d: 660, color: 'rgba(109,106,222,0.09)', glow: 'rgba(109,106,222,0.05)', tx: 68, tz:  20, dur: 38, dir: -1 },
  { d: 460, color: 'rgba(56,189,248,0.06)',  glow: 'rgba(56,189,248,0.04)',  tx: 76, tz:   5, dur: 28, dir: 1  },
  { d: 280, color: 'rgba(245,158,11,0.05)',  glow: 'rgba(245,158,11,0.03)',  tx: 70, tz: -30, dur: 20, dir: -1 },
]

// ─── Nebula blobs ─────────────────────────────────────────────────────────────
const BLOBS = [
  { w: 600, h: 600, left: '-8%',  top: '-10%', bg: 'radial-gradient(circle, rgba(109,106,222,0.14) 0%, transparent 65%)', dur: 22, delay: 0   },
  { w: 500, h: 500, left: '55%',  top: '-5%',  bg: 'radial-gradient(circle, rgba(56,189,248,0.09) 0%, transparent 65%)',  dur: 18, delay: 4   },
  { w: 450, h: 450, left: '-5%',  top: '55%',  bg: 'radial-gradient(circle, rgba(99,102,241,0.11) 0%, transparent 65%)',  dur: 26, delay: 8   },
  { w: 550, h: 550, left: '60%',  top: '50%',  bg: 'radial-gradient(circle, rgba(109,106,222,0.09) 0%, transparent 65%)', dur: 20, delay: 12  },
  { w: 300, h: 300, left: '40%',  top: '70%',  bg: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 65%)',  dur: 30, delay: 6   },
]

export default function SpaceBackground() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">

      {/* ── Nebula aurora blobs ─────────────────────────────────────────────── */}
      {BLOBS.map((b, i) => (
        <div
          key={i}
          className="absolute blur-[80px]"
          style={{
            width: b.w, height: b.h,
            left: b.left, top: b.top,
            background: b.bg,
            animation: `aurora-drift ${b.dur}s ease-in-out ${b.delay}s infinite`,
          }}
        />
      ))}

      {/* ── Dot grid overlay ────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.7) 1px, transparent 1px)',
          backgroundSize:  '40px 40px',
        }}
      />

      {/* ── Star field ──────────────────────────────────────────────────────── */}
      {STARS.map(([l, t, d, delay], i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${l}%`, top: `${t}%`,
            width: d, height: d,
            opacity: 0.6,
            animation: `twinkle ${2.5 + (delay % 2)}s ease-in-out ${delay}s infinite`,
          }}
        />
      ))}

      {/* ── Orbital rings ───────────────────────────────────────────────────── */}
      {RINGS.map((r, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: r.d, height: r.d,
            top: '50%', left: '50%',
            marginTop: -r.d / 2, marginLeft: -r.d / 2,
            border: `1px solid ${r.color}`,
            boxShadow: `0 0 20px ${r.glow} inset, 0 0 20px ${r.glow}`,
            transform: `perspective(700px) rotateX(${r.tx}deg) rotateZ(${r.tz}deg)`,
            animation: `orbit-spin ${r.dur}s linear infinite`,
            animationDirection: r.dir === 1 ? 'normal' : 'reverse',
          }}
        />
      ))}

      {/* ── Central glow (orbital hub) ───────────────────────────────────────── */}
      <div
        className="absolute rounded-full blur-2xl"
        style={{
          width: 160, height: 160,
          top: '50%', left: '50%',
          marginTop: -80, marginLeft: -80,
          background: 'radial-gradient(circle, rgba(56,189,248,0.12) 0%, rgba(109,106,222,0.06) 50%, transparent 70%)',
          animation: 'pulse-glow 4s ease-in-out infinite',
        }}
      />

      {/* ── Shooting star (runs every 8s) ────────────────────────────────────── */}
      <div
        className="absolute w-[120px] h-px opacity-0"
        style={{
          top: '15%', left: '-10%',
          background: 'linear-gradient(90deg, transparent, #38bdf8, transparent)',
          animation: 'shimmer-x 8s linear 3s infinite',
          transform: 'rotate(-25deg)',
        }}
      />
      <div
        className="absolute w-[80px] h-px opacity-0"
        style={{
          top: '70%', right: '-5%',
          background: 'linear-gradient(90deg, transparent, #6d6ade, transparent)',
          animation: 'shimmer-x 10s linear 7s infinite',
          transform: 'rotate(-20deg)',
        }}
      />
    </div>
  )
}
