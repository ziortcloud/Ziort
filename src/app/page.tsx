import { redirect } from 'next/navigation'

// This server is the API backend. The user-facing web app is at app.ziort.com
export default function RootPage() {
  const webApp = process.env.NEXT_PUBLIC_WEB_URL || 'https://ziort-web-ziort-s-projects.vercel.app'
  redirect(webApp)
}
