import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Logo }    from '@/components/common/logo'
import { Button }  from '@/components/ui/button'
import { Input }   from '@/components/ui/input'
import { Select }  from '@/components/ui/select'
import { Badge }   from '@/components/ui/badge'
import { ROUTES }  from '@/lib/constants'

export const metadata: Metadata = { title: 'Student registration' }

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6].map((y) => ({
  label: `Year ${y}`,
  value: String(y),
}))

const FIELD_OPTIONS = [
  'Medicine (MBBS/MD)',
  'Nursing',
  'Pharmacy',
  'Dentistry',
  'Physiotherapy',
  'Biomedical Sciences',
  'Public Health',
  'Other',
].map((f) => ({ label: f, value: f.toLowerCase().replace(/\s+/g, '-') }))

// ─── Page ──────────────────────────────────────────────────────────────────
export default function RegisterStudentPage() {
  return (
    <div className="min-h-dvh bg-surface flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={ROUTES.HOME}>
            <Logo />
          </Link>
          <p className="text-sm text-foreground-muted">
            Already have an account?{' '}
            <Link href={ROUTES.LOGIN} className="font-medium text-brand-600 hover:text-brand-700 transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Role switcher */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <Badge variant="brand" className="gap-1.5">
              <BookOpen className="h-3 w-3" />
              Student
            </Badge>
            <span className="text-foreground-subtle">·</span>
            <Link
              href={ROUTES.REGISTER.TEACHER}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Register as educator →
            </Link>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-foreground-muted">Start your medical learning journey today — it's free.</p>
          </div>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            {/*
             * TODO: wire up student registration logic.
             * Handlers, validation, and API calls will be added separately.
             */}
            <form className="flex flex-col gap-5" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  type="text"
                  placeholder="Ada"
                  autoComplete="given-name"
                  required
                />
                <Input
                  label="Last name"
                  type="text"
                  placeholder="Lovelace"
                  autoComplete="family-name"
                  required
                />
              </div>

              <Input
                label="Email address"
                type="email"
                placeholder="you@university.edu"
                autoComplete="email"
                hint="We'll send a verification email."
                required
              />

              <Select
                label="Field of study"
                options={FIELD_OPTIONS}
                placeholder="Select your field"
              />

              <Select
                label="Year of study"
                options={YEAR_OPTIONS}
                placeholder="Select your year"
              />

              <Input
                label="Password"
                type="password"
                placeholder="Create a strong password"
                autoComplete="new-password"
                hint="At least 8 characters with letters and numbers."
                required
              />

              <Input
                label="Confirm password"
                type="password"
                placeholder="Repeat your password"
                autoComplete="new-password"
                required
              />

              <Button type="submit" fullWidth className="mt-1">
                Create student account
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-foreground-subtle">
            By creating an account you agree to our{' '}
            <Link href="#" className="underline hover:text-foreground-muted">Terms</Link>{' '}
            and{' '}
            <Link href="#" className="underline hover:text-foreground-muted">Privacy Policy</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
