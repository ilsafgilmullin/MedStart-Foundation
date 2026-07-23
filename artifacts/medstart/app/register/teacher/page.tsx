import Link from 'next/link'
import type { Metadata } from 'next'
import { Container } from '@/components/layout/container'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Educator registration',
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function RegisterTeacherPage() {
  return (
    <div className="min-h-dvh bg-surface-50 flex flex-col">
      {/* Top bar */}
      <header className="border-b border-surface-200 bg-surface-0/80 backdrop-blur-md">
        <Container>
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
                <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white" aria-hidden="true">
                  <path d="M12 2L2 7v10l10 5 10-5V7L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
                  <path d="M9 12h6M12 9v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <span className="text-lg font-semibold text-surface-900 tracking-tight">MedStart</span>
            </Link>
            <span className="text-sm text-surface-500">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">
                Sign in
              </Link>
            </span>
          </div>
        </Container>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Role switcher */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <Link
              href="/register/student"
              className="text-sm text-surface-500 hover:text-surface-700 transition-colors"
            >
              ← Register as student
            </Link>
            <span className="text-surface-300">·</span>
            <Badge variant="primary" className="text-sm px-3 py-1">Educator</Badge>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Create your educator account</CardTitle>
              <CardDescription>
                Share your expertise and shape the next generation of medical professionals.
              </CardDescription>
            </CardHeader>

            <CardContent>
              {/*
               * TODO: wire up teacher registration.
               * Keep this form empty — no handlers, no business logic.
               */}
              <form className="flex flex-col gap-4" noValidate>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="First name"
                    type="text"
                    placeholder="Dr. Jane"
                    autoComplete="given-name"
                    required
                  />
                  <Input
                    label="Last name"
                    type="text"
                    placeholder="Smith"
                    autoComplete="family-name"
                    required
                  />
                </div>

                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@hospital.org"
                  autoComplete="email"
                  required
                />

                <Input
                  label="Institution"
                  type="text"
                  placeholder="e.g. Johns Hopkins University"
                  hint="Your current hospital, university, or medical school."
                />

                <Input
                  label="Specialization"
                  type="text"
                  placeholder="e.g. Cardiology, Internal Medicine"
                />

                <Input
                  label="Password"
                  type="password"
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  hint="Use at least 8 characters with a mix of letters and numbers."
                  required
                />

                <Input
                  label="Confirm password"
                  type="password"
                  placeholder="Repeat your password"
                  autoComplete="new-password"
                  required
                />

                <Button type="submit" fullWidth className="mt-2">
                  Create educator account
                </Button>
              </form>
            </CardContent>

            <CardFooter className="flex-col gap-2 text-center">
              <p className="text-xs text-surface-400">
                By creating an account you agree to our{' '}
                <Link href="#" className="underline hover:text-surface-600">Terms of Service</Link>{' '}
                and{' '}
                <Link href="#" className="underline hover:text-surface-600">Privacy Policy</Link>.
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
