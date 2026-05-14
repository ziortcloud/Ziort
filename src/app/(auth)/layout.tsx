import SpaceBackground from './_components/SpaceBackground'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden"
      style={{
        background: 'radial-gradient(ellipse at 35% 55%, #050a22 0%, #020410 55%, #000008 100%)',
      }}
    >
      {/* Animated space scene — client component */}
      <SpaceBackground />

      {/* Auth card — scrollable on small screens */}
      <div className="relative z-10 w-full max-w-[440px] py-8">
        {children}
      </div>
    </div>
  )
}
