import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { APP_NAME, APP_DESCRIPTION, APP_URL } from '@/lib/constants'

// ─── Font ──────────────────────────────────────────────────────────────────
const inter = Inter({
  subsets:  ['latin', 'cyrillic'],
  variable: '--font-sans',
  display:  'swap',
})

// ─── Metadata ──────────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default:  APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords:    [
    'медицинское образование', 'медицинская школа', 'здравоохранение',
    'онлайн-обучение', 'медицинские репетиторы', 'студенты-медики',
  ],
  authors:     [{ name: 'Команда MedStart' }],
  creator:     'MedStart',
  openGraph: {
    type:        'website',
    locale:      'ru_RU',
    url:         APP_URL,
    siteName:    APP_NAME,
    title:       APP_NAME,
    description: APP_DESCRIPTION,
  },
  twitter: {
    card:        'summary_large_image',
    title:       APP_NAME,
    description: APP_DESCRIPTION,
  },
  robots: {
    index:  true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  themeColor:   '#6366f1',
}

// ─── Root layout ───────────────────────────────────────────────────────────
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-dvh bg-background text-foreground antialiased">
        {children}
      </body>
    </html>
  )
}
