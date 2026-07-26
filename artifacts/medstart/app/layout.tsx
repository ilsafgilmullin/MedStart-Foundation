import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegistration from '@/components/common/ServiceWorkerRegistration'
import { AuthProvider } from '@/providers/AuthProvider'

export const metadata: Metadata = {
  title: { default: 'MedStart', template: '%s · MedStart' },
  description:
    'Медицинские репетиторы, профессиональные онлайн-занятия и совместная умная доска.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? 'https://medstart.app',
  ),
  applicationName: 'MedStart',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MedStart',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#7c3aed',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className="min-h-dvh bg-white font-sans text-slate-900 antialiased">
        <AuthProvider>{children}</AuthProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  )
}
