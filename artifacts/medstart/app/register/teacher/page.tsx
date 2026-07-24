import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { Logo }      from '@/components/common/logo'
import { Button }    from '@/components/ui/button'
import { Input }     from '@/components/ui/input'
import { Textarea }  from '@/components/ui/textarea'
import { Select }    from '@/components/ui/select'
import { Badge }     from '@/components/ui/badge'
import { Alert }     from '@/components/ui/alert'
import { ROUTES }    from '@/lib/constants'

export const metadata: Metadata = { title: 'Educator registration' }

const SPECIALIZATION_OPTIONS = [
  'Internal Medicine', 'Cardiology', 'Neurology', 'Surgery',
  'Paediatrics', 'Obstetrics & Gynaecology', 'Psychiatry',
  'Radiology', 'Anaesthesiology', 'Pathology', 'Pharmacology',
  'General Practice', 'Emergency Medicine', 'Other',
].map((s) => ({ label: s, value: s.toLowerCase().replace(/\s+/g, '-') }))

const EXPERIENCE_OPTIONS = [
  { label: '1–3 years',   value: '1-3'  },
  { label: '3–5 years',   value: '3-5'  },
  { label: '5–10 years',  value: '5-10' },
  { label: '10–20 years', value: '10-20'},
  { label: '20+ years',   value: '20+'  },
]

// ─── Page ──────────────────────────────────────────────────────────────────
export default function RegisterTeacherPage() {
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
        <div className="w-full max-w-lg">
          {/* Role switcher */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <Link
              href={ROUTES.REGISTER.STUDENT}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              ← Register as student
            </Link>
            <span className="text-foreground-subtle">·</span>
            <Badge variant="brand" className="gap-1.5">
              <GraduationCap className="h-3 w-3" />
              Educator
            </Badge>
          </div>

          {/* Heading */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Become an educator</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Share your clinical expertise and shape future medical professionals.
            </p>
          </div>

          {/* Verification notice */}
          <Alert variant="info" className="mb-6">
            <strong>Educator profiles are manually reviewed.</strong> We verify credentials before your profile goes live — this usually takes 1–2 business days.
          </Alert>

          {/* Form card */}
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            {/*
             * TODO: wire up educator registration logic.
             * Handlers, credential verification, and API calls will be added separately.
             */}
            <form className="flex flex-col gap-5" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  type="text"
                  placeholder="Jane"
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
                label="Professional title"
                type="text"
                placeholder="e.g. Dr., Prof., Assoc. Prof."
                hint="Include your recognised title."
              />

              <Input
                label="Email address"
                type="email"
                placeholder="you@institution.org"
                autoComplete="email"
                required
              />

              <Input
                label="Current institution"
                type="text"
                placeholder="e.g. Mayo Clinic, UCL"
                hint="Hospital, university, or medical school."
              />

              <Select
                label="Medical specialization"
                options={SPECIALIZATION_OPTIONS}
                placeholder="Select specialization"
                required
              />

              <Select
                label="Years of clinical experience"
                options={EXPERIENCE_OPTIONS}
                placeholder="Select experience range"
              />

              <Input
                label="Medical licence / registration number"
                type="text"
                placeholder="e.g. GMC 1234567"
                hint="Used for credential verification only — never shown publicly."
              />

              <Textarea
                label="Short biography"
                placeholder="Tell students about your background, clinical experience, and what you plan to teach on MedStart..."
                hint="Aim for 100–300 words. This appears on your public profile."
                maxLength={500}
                showCount
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
                Submit educator application
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-foreground-subtle">
            By creating an account you agree to our{' '}
            <Link href="#" className="underline hover:text-foreground-muted">Terms</Link>
            {' '}and{' '}
            <Link href="#" className="underline hover:text-foreground-muted">Privacy Policy</Link>.
            Educator applications are subject to our{' '}
            <Link href="#" className="underline hover:text-foreground-muted">Educator Standards</Link>.
          </p>
        </div>
      </main>
    </div>
  )
}
