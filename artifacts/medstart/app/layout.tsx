import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/providers/AuthProvider'

const inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-sans', display: 'swap' })

export const metadata: Metadata = {
  title: { default: 'MedStart', template: '%s · MedStart' },
  description: 'Маркетплейс медицинских репетиторов для студентов.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://medstart.app'),
}

export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#7c3aed' }

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru" className={inter.variable}><body className="min-h-dvh bg-white text-slate-900 antialiased"><AuthProvider>{children}</AuthProvider></body></html>
}
