// Animated SVG product icons — one per Ziort product
// Ported & extended from zibizcore reference implementation

interface Props { slug: string; size?: number }

export default function ProductIcon({ slug, size = 32 }: Props) {
  const w = size, h = size
  switch (slug) {

    // ── ZiPawn: balance scale tilting ─────────────────────────────────────────
    case 'zipawn': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zp{0%,100%{transform:rotate(-13deg)}50%{transform:rotate(13deg)}}`}</style>
        <line x1="20" y1="9" x2="20" y2="33" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="13" y1="33" x2="27" y2="33" stroke="white" strokeWidth="2" strokeLinecap="round"/>
        <g style={{transformOrigin:'20px 13px',animation:'zp 2.6s ease-in-out infinite'}}>
          <line x1="7" y1="13" x2="33" y2="13" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="7" y1="13" x2="7" y2="20" stroke="rgba(255,255,255,0.55)" strokeWidth="1"/>
          <line x1="33" y1="13" x2="33" y2="20" stroke="rgba(255,255,255,0.55)" strokeWidth="1"/>
          <path d="M3.5 22 Q7 20 10.5 22" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M29.5 22 Q33 20 36.5 22" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          <polygon points="7,19.5 9.5,16.5 12,19.5 9.5,22.5" fill="rgba(180,220,255,0.95)"/>
          <circle cx="33" cy="19.5" r="2.2" fill="rgba(255,210,60,0.9)" stroke="white" strokeWidth="0.7"/>
          <line x1="31.5" y1="19.5" x2="34.5" y2="19.5" stroke="rgba(180,120,0,0.6)" strokeWidth="0.6"/>
        </g>
      </svg>
    )

    // ── ZiShop: cart with spinning wheels ────────────────────────────────────
    case 'zishop': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zsh{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        <path d="M7 13 L10 6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M7 13 L33 13 L29 26 L11 26 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.12)" strokeLinejoin="round"/>
        <rect x="14" y="16" width="4" height="4" rx="0.5" fill="rgba(255,255,255,0.65)"/>
        <rect x="20" y="16" width="4" height="4" rx="0.5" fill="rgba(255,255,255,0.45)"/>
        <rect x="26" y="16" width="3" height="4" rx="0.5" fill="rgba(255,255,255,0.55)"/>
        <circle cx="15" cy="31" r="3.5" stroke="white" strokeWidth="1.4" fill="rgba(255,255,255,0.08)"/>
        <g style={{transformOrigin:'15px 31px',animation:'zsh 1.4s linear infinite'}}>
          <line x1="15" y1="27.5" x2="15" y2="34.5" stroke="white" strokeWidth="1.1"/>
          <line x1="11.5" y1="31" x2="18.5" y2="31" stroke="white" strokeWidth="1.1"/>
        </g>
        <circle cx="28" cy="31" r="3.5" stroke="white" strokeWidth="1.4" fill="rgba(255,255,255,0.08)"/>
        <g style={{transformOrigin:'28px 31px',animation:'zsh 1.4s linear infinite'}}>
          <line x1="28" y1="27.5" x2="28" y2="34.5" stroke="white" strokeWidth="1.1"/>
          <line x1="24.5" y1="31" x2="31.5" y2="31" stroke="white" strokeWidth="1.1"/>
        </g>
      </svg>
    )

    // ── ZiLedger: open book with flipping page ───────────────────────────────
    case 'ziledger': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zl{0%,30%,100%{transform:scaleX(1)}50%,70%{transform:scaleX(0)}}`}</style>
        <rect x="6" y="6" width="13" height="27" rx="1.5" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.09)"/>
        {[11,15,19,23,26].map(y=><line key={y} x1="9" y1={y} x2="16" y2={y} stroke="rgba(255,255,255,0.38)" strokeWidth="0.9"/>)}
        <line x1="19" y1="6" x2="19" y2="33" stroke="white" strokeWidth="1.5"/>
        <g style={{transformOrigin:'19px 19.5px',animation:'zl 3.5s ease-in-out infinite'}}>
          <rect x="19" y="6" width="13" height="27" rx="1.5" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.09)"/>
          {[11,15,19,23,26].map(y=><line key={y} x1="22" y1={y} x2="29" y2={y} stroke="rgba(255,255,255,0.38)" strokeWidth="0.9"/>)}
        </g>
      </svg>
    )

    // ── ZiCalc: calculator with blinking cursor ──────────────────────────────
    case 'zicalc': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zcc{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>
        <rect x="6" y="4" width="28" height="32" rx="3" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.09)"/>
        <rect x="9" y="8" width="22" height="8" rx="1.5" fill="rgba(255,255,255,0.18)" stroke="white" strokeWidth="1"/>
        <text x="28" y="15" fontSize="5.5" fill="rgba(255,255,255,0.6)" textAnchor="end" fontFamily="monospace">3.14</text>
        <line x1="29" y1="10" x2="29" y2="14.5" stroke="white" strokeWidth="1.4" style={{animation:'zcc 1s step-start infinite'}}/>
        {[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2],[0,3],[1,3],[2,3]].map(([c,r],i)=>(
          <rect key={i} x={10+c*7} y={20+r*4} width="5" height="3" rx="0.8" fill="rgba(255,255,255,0.32)"/>
        ))}
      </svg>
    )

    // ── ZiReceipt: receipt printing from machine ─────────────────────────────
    case 'zireceipt': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zr{0%,100%{transform:translateY(0)}50%{transform:translateY(2.5px)}}`}</style>
        <rect x="8" y="3" width="24" height="11" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.14)"/>
        <rect x="12" y="6.5" width="5" height="1.5" rx="0.5" fill="rgba(255,255,255,0.45)"/>
        <rect x="19" y="6.5" width="5" height="1.5" rx="0.5" fill="rgba(255,255,255,0.45)"/>
        <circle cx="29" cy="7.5" r="1.5" fill="rgba(255,255,255,0.3)"/>
        <line x1="13" y1="14" x2="27" y2="14" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8"/>
        <g style={{animation:'zr 2s ease-in-out infinite'}}>
          <rect x="13" y="14" width="14" height="20" rx="1" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.08)"/>
          {[18,21,24,28].map(y=><line key={y} x1="16" y1={y} x2="24" y2={y} stroke="rgba(255,255,255,0.38)" strokeWidth="0.9"/>)}
          <path d="M13 34 L15.5 32 L18 34 L20.5 32 L23 34 L25.5 32 L27 33.5" stroke="white" strokeWidth="1" fill="none" strokeLinecap="round"/>
        </g>
      </svg>
    )

    // ── ZiInvoice: document with PAID stamp ──────────────────────────────────
    case 'ziinvoice': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zi{0%,55%{transform:scale(0) rotate(-25deg);opacity:0}70%{transform:scale(1.18) rotate(6deg);opacity:1}82%,100%{transform:scale(1) rotate(-7deg);opacity:1}}`}</style>
        <rect x="4" y="3" width="23" height="29" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.07)"/>
        <rect x="7" y="7" width="17" height="2.5" rx="0.8" fill="rgba(255,255,255,0.38)"/>
        {[13,17,21].map(y=><line key={y} x1="7" y1={y} x2="23" y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth="0.9"/>)}
        <line x1="7" y1="26" x2="19" y2="26" stroke="rgba(255,255,255,0.3)" strokeWidth="0.9"/>
        <g style={{transformOrigin:'28px 27px',animation:'zi 3.5s ease-out infinite'}}>
          <circle cx="28" cy="27" r="9.5" stroke="rgba(74,222,128,0.85)" strokeWidth="2" fill="rgba(0,15,5,0.5)"/>
          <text x="28" y="30" textAnchor="middle" fontSize="5.2" fontWeight="900" fill="rgba(74,222,128,0.9)" fontFamily="monospace">PAID</text>
        </g>
      </svg>
    )

    // ── ZiQuote: document with animated underline ────────────────────────────
    case 'ziquote': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zq{0%{stroke-dashoffset:20}65%,100%{stroke-dashoffset:0}}`}</style>
        <rect x="6" y="3" width="23" height="29" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.07)"/>
        <line x1="9" y1="10" x2="25" y2="10" stroke="rgba(255,255,255,0.32)" strokeWidth="0.9"/>
        <line x1="9" y1="14" x2="25" y2="14" stroke="rgba(255,255,255,0.32)" strokeWidth="0.9"/>
        <text x="9" y="24" fontSize="13" fill="rgba(255,255,255,0.75)" fontFamily="Georgia,serif">&quot;</text>
        <text x="18" y="24" fontSize="13" fill="rgba(255,255,255,0.75)" fontFamily="Georgia,serif">&quot;</text>
        <line x1="9" y1="28" x2="29" y2="28" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
        <line x1="9" y1="28" x2="29" y2="28" stroke="white" strokeWidth="1.6" strokeLinecap="round"
          style={{strokeDasharray:'20',strokeDashoffset:'20',animation:'zq 2.5s ease-in-out infinite'}}/>
      </svg>
    )

    // ── ZiScan: scan beam sweeping ────────────────────────────────────────────
    case 'ziscan': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zsb{0%,100%{transform:translateY(0);opacity:0.95}82%{transform:translateY(19px);opacity:0.35}}`}</style>
        <rect x="8" y="4" width="20" height="26" rx="2" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.07)"/>
        <path d="M22 4 L28 10 L22 10 Z" fill="rgba(255,255,255,0.2)" stroke="white" strokeWidth="1"/>
        {[13,17,21].map(y=><line key={y} x1="11" y1={y} x2="22" y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth="0.9"/>)}
        <line x1="6" y1="10" x2="30" y2="10" stroke="rgba(80,220,255,0.9)" strokeWidth="2" strokeLinecap="round"
          style={{filter:'drop-shadow(0 0 4px rgba(80,220,255,0.85))',animation:'zsb 2s ease-in-out infinite'}}/>
        <path d="M33 5 L37 5 L37 9" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M33 35 L37 35 L37 31" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )

    // ── ZiPost: megaphone with sound waves ───────────────────────────────────
    case 'zipost': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`
          @keyframes zw1{0%,100%{opacity:0.9;transform:scaleX(1)}50%{opacity:0.3;transform:scaleX(1.1)}}
          @keyframes zw2{0%,100%{opacity:0.65;transform:scaleX(1)}50%{opacity:0.15;transform:scaleX(1.15)}}
        `}</style>
        <path d="M5 16 L16 13 L16 27 L5 24 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.14)" strokeLinejoin="round"/>
        <path d="M16 12 L25 7 L25 33 L16 28 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.22)" strokeLinejoin="round"/>
        <line x1="4" y1="16" x2="4" y2="24" stroke="white" strokeWidth="2.2" strokeLinecap="round"/>
        <g style={{transformOrigin:'25px 20px',animation:'zw1 1.6s ease-in-out infinite'}}>
          <path d="M28 15 Q32 20 28 25" stroke="white" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
        </g>
        <g style={{transformOrigin:'25px 20px',animation:'zw2 1.6s ease-in-out infinite 0.35s'}}>
          <path d="M31 12 Q37 20 31 28" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" fill="none" strokeLinecap="round"/>
        </g>
      </svg>
    )

    // ── ZiFleet: truck with spinning wheels ───────────────────────────────────
    case 'zifleet': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zfl{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
        <rect x="2" y="13" width="22" height="12" rx="1" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.1)"/>
        <rect x="24" y="16" width="14" height="9" rx="1.5" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.16)"/>
        <rect x="27" y="18" width="6" height="4" rx="0.5" fill="rgba(135,210,255,0.35)" stroke="white" strokeWidth="0.8"/>
        <line x1="37" y1="21" x2="39" y2="21" stroke="rgba(255,220,80,0.8)" strokeWidth="2" strokeLinecap="round"/>
        {[9,20,30].map(cx=>(
          <g key={cx}>
            <circle cx={cx} cy="28" r="3.5" stroke="white" strokeWidth="1.3" fill="rgba(20,20,20,0.6)"/>
            <g style={{transformOrigin:`${cx}px 28px`,animation:'zfl 1.2s linear infinite'}}>
              <line x1={cx} y1="24.5" x2={cx} y2="31.5" stroke="white" strokeWidth="1"/>
              <line x1={cx-3.5} y1="28" x2={cx+3.5} y2="28" stroke="white" strokeWidth="1"/>
            </g>
          </g>
        ))}
      </svg>
    )

    // ── ZiLoad: package floating up ───────────────────────────────────────────
    case 'ziload': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zld{0%,100%{transform:translateY(0)}50%{transform:translateY(-4.5px)}}`}</style>
        <g style={{animation:'zld 2s ease-in-out infinite'}}>
          <rect x="9" y="19" width="22" height="16" rx="1" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.1)"/>
          <line x1="20" y1="19" x2="20" y2="35" stroke="rgba(255,255,255,0.42)" strokeWidth="1"/>
          <line x1="9" y1="27" x2="31" y2="27" stroke="rgba(255,255,255,0.42)" strokeWidth="1"/>
          <line x1="20" y1="4" x2="20" y2="17" stroke="white" strokeWidth="1.9" strokeLinecap="round"/>
          <path d="M14.5 9 L20 3.5 L25.5 9" stroke="white" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </g>
      </svg>
    )

    // ── ZiFood: cloche with rising steam ──────────────────────────────────────
    case 'zifood': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`
          @keyframes zst1{0%,100%{transform:translateY(0);opacity:0.75}70%{transform:translateY(-9px);opacity:0}}
          @keyframes zst2{0%,100%{transform:translateY(0);opacity:0.75}70%{transform:translateY(-9px);opacity:0}}
          @keyframes zst3{0%,100%{transform:translateY(0);opacity:0.75}70%{transform:translateY(-9px);opacity:0}}
        `}</style>
        <path d="M13 15 Q11 11 14 8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round"
          style={{animation:'zst1 2s ease-out infinite'}}/>
        <path d="M20 13 Q18 9 20 6" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round"
          style={{animation:'zst2 2s ease-out infinite 0.45s'}}/>
        <path d="M27 15 Q25 11 27 8" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" fill="none" strokeLinecap="round"
          style={{animation:'zst3 2s ease-out infinite 0.9s'}}/>
        <path d="M5 26 Q5 16 20 15 Q35 16 35 26 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.14)"/>
        <ellipse cx="20" cy="28" rx="15.5" ry="4" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.09)"/>
        <circle cx="20" cy="16.5" r="2" fill="white"/>
      </svg>
    )

    // ── ZiCare: pulsing heart + ECG ───────────────────────────────────────────
    case 'zicare': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`
          @keyframes zchr{0%,100%{transform:scale(1)}28%{transform:scale(1.14)}60%{transform:scale(0.96)}}
          @keyframes zcecg{0%{stroke-dashoffset:60}100%{stroke-dashoffset:0}}
        `}</style>
        <g style={{transformOrigin:'20px 16px',animation:'zchr 1.25s ease-in-out infinite'}}>
          <path d="M20 28 C8 20 5 15 5 12 A8 8 0 0 1 20 9 A8 8 0 0 1 35 12 C35 15 32 20 20 28Z"
            stroke="white" strokeWidth="1.5" fill="rgba(239,68,68,0.28)"/>
        </g>
        <path d="M3 24 L9 24 L12 20 L15 28 L18 14 L21 24 L24 24 L27 24 L30 19 L33 24 L37 24"
          stroke="rgba(74,222,128,0.9)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
          style={{strokeDasharray:'60',strokeDashoffset:'60',animation:'zcecg 2.2s linear infinite'}}/>
      </svg>
    )

    // ── ZiYield: swaying wheat stalks with sun ────────────────────────────────
    case 'ziyield': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`
          @keyframes zyw1{0%,100%{transform:rotate(-8deg)}50%{transform:rotate(8deg)}}
          @keyframes zyw2{0%,100%{transform:rotate(8deg)}50%{transform:rotate(-8deg)}}
        `}</style>
        <circle cx="31" cy="8" r="4" fill="rgba(255,225,0,0.82)"/>
        {[[31,1],[31,15],[24.5,3.5],[37.5,3.5],[36.5,12.5],[25.5,12.5]].map(([x,y],i)=>(
          <circle key={i} cx={x} cy={y} r="0.85" fill="rgba(255,225,0,0.65)"/>
        ))}
        <g style={{transformOrigin:'13px 34px',animation:'zyw1 2.3s ease-in-out infinite'}}>
          <line x1="13" y1="17" x2="13" y2="34" stroke="rgba(200,175,90,0.9)" strokeWidth="1.6" strokeLinecap="round"/>
          <ellipse cx="13" cy="12" rx="3" ry="5" fill="rgba(225,195,70,0.85)" stroke="rgba(190,155,40,0.9)" strokeWidth="0.8"/>
          <line x1="10" y1="14" x2="7" y2="12" stroke="rgba(225,195,70,0.6)" strokeWidth="1" strokeLinecap="round"/>
          <line x1="16" y1="14" x2="19" y2="12" stroke="rgba(225,195,70,0.6)" strokeWidth="1" strokeLinecap="round"/>
        </g>
        <g style={{transformOrigin:'23px 34px',animation:'zyw2 2.3s ease-in-out infinite 0.5s'}}>
          <line x1="23" y1="20" x2="23" y2="34" stroke="rgba(200,175,90,0.9)" strokeWidth="1.6" strokeLinecap="round"/>
          <ellipse cx="23" cy="15" rx="3" ry="5" fill="rgba(225,195,70,0.85)" stroke="rgba(190,155,40,0.9)" strokeWidth="0.8"/>
          <line x1="20" y1="17" x2="17" y2="15" stroke="rgba(225,195,70,0.6)" strokeWidth="1" strokeLinecap="round"/>
          <line x1="26" y1="17" x2="29" y2="15" stroke="rgba(225,195,70,0.6)" strokeWidth="1" strokeLinecap="round"/>
        </g>
        <line x1="3" y1="35" x2="37" y2="35" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    )

    // ── ZiChit: spinning coin with ₹ ─────────────────────────────────────────
    case 'zichit': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`
          @keyframes zcoin{0%,100%{transform:scaleX(1)}40%{transform:scaleX(0.1)}80%{transform:scaleX(1)}}
          @keyframes zcoinb{0%{opacity:1}35%{opacity:0}80%,100%{opacity:1}}
        `}</style>
        <g style={{transformOrigin:'20px 20px',animation:'zcoin 2.2s ease-in-out infinite'}}>
          <circle cx="20" cy="20" r="14" fill="rgba(234,179,8,0.18)" stroke="rgba(234,179,8,0.8)" strokeWidth="1.8"/>
          <circle cx="20" cy="20" r="10" fill="rgba(234,179,8,0.1)" stroke="rgba(234,179,8,0.4)" strokeWidth="1"/>
          <text x="20" y="25" textAnchor="middle" fontSize="11" fontWeight="bold" fill="rgba(234,179,8,0.9)" fontFamily="sans-serif"
            style={{animation:'zcoinb 2.2s ease-in-out infinite'}}>₹</text>
        </g>
        <ellipse cx="20" cy="34" rx="14" ry="2" fill="rgba(234,179,8,0.06)"/>
      </svg>
    )

    // ── ZiBuild: bouncing hard hat over bricks ────────────────────────────────
    case 'zibuild': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zb{0%,100%{transform:translateY(0)}38%{transform:translateY(-3.5px)}65%{transform:translateY(-1.5px)}}`}</style>
        <g style={{animation:'zb 2.4s ease-in-out infinite'}}>
          <path d="M7 22 Q7 9 20 8 Q33 9 33 22 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.16)"/>
          <path d="M4 22 Q4 25.5 20 25.5 Q36 25.5 36 22 Z" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.26)"/>
          <path d="M13 17 Q17 15 20 15 Q23 15 27 17" stroke="rgba(255,200,40,0.9)" strokeWidth="2" fill="none" strokeLinecap="round"/>
        </g>
        <rect x="5" y="29" width="13" height="5" rx="0.5" stroke="white" strokeWidth="1" fill="rgba(255,255,255,0.09)"/>
        <rect x="19" y="29" width="13" height="5" rx="0.5" stroke="white" strokeWidth="1" fill="rgba(255,255,255,0.09)"/>
        <rect x="12" y="34" width="13" height="4.5" rx="0.5" stroke="white" strokeWidth="1" fill="rgba(255,255,255,0.09)"/>
      </svg>
    )

    // ── ZiPartner: handshake with gold coin ───────────────────────────────────
    case 'zipartner': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`
          @keyframes znl{0%,100%{transform:translateX(0)}50%{transform:translateX(2.5px)}}
          @keyframes znr{0%,100%{transform:translateX(0)}50%{transform:translateX(-2.5px)}}
          @keyframes zng{0%,100%{transform:scale(1);opacity:0.85}50%{transform:scale(1.18);opacity:1}}
        `}</style>
        <g style={{animation:'znl 1.9s ease-in-out infinite'}}>
          <path d="M3 24 L3 21 C3 19 5 18 7 19.5 L8 18.5 C8 16.5 10 16.5 11 18.5 L12 17.5 C12 15.5 14 15.5 15 17.5 L15 23 L12 28 L3 28 Z"
            stroke="white" strokeWidth="1.3" fill="rgba(255,255,255,0.13)" strokeLinejoin="round"/>
        </g>
        <g style={{animation:'znr 1.9s ease-in-out infinite'}}>
          <path d="M37 24 L37 21 C37 19 35 18 33 19.5 L32 18.5 C32 16.5 30 16.5 29 18.5 L28 17.5 C28 15.5 26 15.5 25 17.5 L25 23 L28 28 L37 28 Z"
            stroke="white" strokeWidth="1.3" fill="rgba(255,255,255,0.13)" strokeLinejoin="round"/>
        </g>
        <path d="M15 22 L25 22" stroke="white" strokeWidth="2.6" strokeLinecap="round"/>
        <g style={{transformOrigin:'20px 10px',animation:'zng 2s ease-in-out infinite'}}>
          <circle cx="20" cy="10" r="6" fill="rgba(255,200,0,0.7)" stroke="rgba(255,215,0,0.88)" strokeWidth="1.3"/>
          <text x="20" y="13.5" textAnchor="middle" fontSize="7.5" fill="white" fontWeight="bold" fontFamily="sans-serif">₹</text>
        </g>
      </svg>
    )

    // ── ZiPulse: animated sine wave ───────────────────────────────────────────
    case 'zipulse': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`@keyframes zpls{0%{stroke-dashoffset:80}100%{stroke-dashoffset:0}}`}</style>
        <rect x="4" y="12" width="32" height="16" rx="3" stroke="rgba(139,92,246,0.5)" strokeWidth="1" fill="rgba(139,92,246,0.06)"/>
        <path d="M4 20 L9 20 L12 14 L15 26 L18 17 L21 23 L24 20 L36 20"
          stroke="rgba(139,92,246,0.9)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"
          style={{strokeDasharray:'80',strokeDashoffset:'80',animation:'zpls 2s ease-in-out infinite'}}/>
        <circle cx="36" cy="20" r="2.5" fill="rgba(139,92,246,0.9)" style={{animation:'zpls 2s ease-in-out infinite'}}/>
        {[8,16,24,32].map(x=>(
          <line key={x} x1={x} y1="12" x2={x} y2="28" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8"/>
        ))}
      </svg>
    )

    // ── ZiNeed: checklist with appearing ticks ────────────────────────────────
    case 'zineed': return (
      <svg viewBox="0 0 40 40" width={w} height={h} fill="none">
        <style>{`
          @keyframes zt1{0%,15%{opacity:0}25%,100%{opacity:1}}
          @keyframes zt2{0%,40%{opacity:0}55%,100%{opacity:1}}
          @keyframes zt3{0%,65%{opacity:0}80%,100%{opacity:1}}
        `}</style>
        <rect x="5" y="5" width="30" height="30" rx="3" stroke="white" strokeWidth="1.5" fill="rgba(255,255,255,0.07)"/>
        {[13,21,29].map(y=>(
          <rect key={y} x="10" y={y-2.5} width="7" height="5" rx="1" stroke="rgba(255,255,255,0.4)" strokeWidth="1" fill="rgba(255,255,255,0.05)"/>
        ))}
        {[13,21,29].map(y=>(
          <line key={y} x1="21" y1={y} x2="32" y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
        ))}
        <path d="M11.5 13 L12.8 14.5 L15.5 11" stroke="rgba(74,222,128,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{animation:'zt1 3s ease-in-out infinite'}}/>
        <path d="M11.5 21 L12.8 22.5 L15.5 19" stroke="rgba(74,222,128,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{animation:'zt2 3s ease-in-out infinite'}}/>
        <path d="M11.5 29 L12.8 30.5 L15.5 27" stroke="rgba(74,222,128,0.9)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          style={{animation:'zt3 3s ease-in-out infinite'}}/>
      </svg>
    )

    default: return (
      <div className="flex items-center justify-center w-full h-full">
        <span className="text-white font-black text-xs opacity-60">{slug.slice(2,4).toUpperCase()}</span>
      </div>
    )
  }
}
