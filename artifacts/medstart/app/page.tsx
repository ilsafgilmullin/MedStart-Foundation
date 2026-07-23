import Link from 'next/link'
import type { Metadata } from 'next'
import { Header } from '@/components/layout/header'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'MedStart — Modern Medical Education',
}

// ─── Feature cards data ────────────────────────────────────────────────────
const features = [
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
    ),
    title: 'Structured Learning',
    description: 'Curated curricula designed by leading medical educators aligned with international standards.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    ),
    title: 'Expert Teachers',
    description: 'Connect with verified medical professionals who bring real-world clinical expertise to every lesson.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: 'Progress Tracking',
    description: 'Visualise your growth with detailed analytics and personalised study insights.',
  },
  {
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    title: 'Interactive Content',
    description: 'Case studies, simulations, and multimedia resources that go beyond the textbook.',
  },
]

// ─── Page ──────────────────────────────────────────────────────────────────
export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-surface-0 py-24 sm:py-32" id="hero">
          {/* Background gradient blob */}
          <div
            className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary-100 opacity-40 blur-3xl"
            aria-hidden="true"
          />

          <Container size="narrow">
            <div className="flex flex-col items-center text-center gap-6">
              <Badge variant="primary">Now in beta</Badge>

              <h1 className="text-4xl font-bold tracking-tight text-surface-900 sm:text-5xl lg:text-6xl leading-tight">
                Where medical education
                <br />
                <span className="text-primary-600">begins.</span>
              </h1>

              <p className="max-w-xl text-lg text-surface-500 leading-relaxed">
                MedStart connects students and educators on a single platform built for the demands of modern healthcare training.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button asChild size="lg">
                  <Link href="/register/student">Join as a student</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/register/teacher">I&apos;m an educator</Link>
                </Button>
              </div>
            </div>
          </Container>
        </section>

        {/* Features */}
        <section className="py-20 bg-surface-50" id="features">
          <Container>
            <div className="mb-12 text-center">
              <h2 className="text-3xl font-bold text-surface-900 tracking-tight">
                Everything you need to learn smarter
              </h2>
              <p className="mt-3 text-surface-500">
                A complete toolkit for students and educators in one place.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <Card key={f.title}>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                      {f.icon}
                    </div>
                    <h3 className="font-semibold text-surface-900">{f.title}</h3>
                    <p className="text-sm text-surface-500 leading-relaxed">{f.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </Container>
        </section>

        {/* CTA */}
        <section className="py-20 bg-primary-600" id="cta">
          <Container size="narrow">
            <div className="flex flex-col items-center text-center gap-6">
              <h2 className="text-3xl font-bold text-white tracking-tight">
                Ready to get started?
              </h2>
              <p className="text-primary-200 max-w-md">
                Join thousands of medical students and educators already using MedStart.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button asChild variant="secondary" size="lg">
                  <Link href="/register/student">Create account</Link>
                </Button>
                <Button asChild variant="ghost" size="lg" className="text-white hover:text-white hover:bg-primary-700">
                  <Link href="/login">Sign in</Link>
                </Button>
              </div>
            </div>
          </Container>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-200 bg-surface-0 py-10">
        <Container>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-surface-400">
            <p>© {new Date().getFullYear()} MedStart. All rights reserved.</p>
            <div className="flex gap-6">
              <Link href="#" className="hover:text-surface-600 transition-colors">Privacy</Link>
              <Link href="#" className="hover:text-surface-600 transition-colors">Terms</Link>
              <Link href="#" className="hover:text-surface-600 transition-colors">Contact</Link>
            </div>
          </div>
        </Container>
      </footer>
    </>
  )
}
