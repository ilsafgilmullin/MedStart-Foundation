import Link from 'next/link'
import type { Metadata } from 'next'
import { Container } from '@/components/layout/container'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'Sign in',
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default function LoginPage() {
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
              No account?{' '}
              <Link href="/register/student" className="font-medium text-primary-600 hover:text-primary-700">
                Sign up
              </Link>
            </span>
          </div>
        </Container>
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <Card>
            <CardHeader>
              <CardTitle>Welcome back</CardTitle>
              <CardDescription>Sign in to your MedStart account</CardDescription>
            </CardHeader>

            <CardContent>
              {/*
               * TODO: wire up authentication.
               * Keep this form empty — no handlers, no business logic.
               */}
              <form className="flex flex-col gap-4" noValidate>
                <Input
                  label="Email address"
                  type="email"
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />

                <div className="flex flex-col gap-1.5">
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <div className="flex justify-end">
                    <Link
                      href="#"
                      className="text-xs text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>

                <Button type="submit" fullWidth className="mt-2">
                  Sign in
                </Button>
              </form>
            </CardContent>

            <CardFooter className="justify-center">
              <p className="text-sm text-surface-500">
                New to MedStart?{' '}
                <Link href="/register/student" className="font-medium text-primary-600 hover:text-primary-700">
                  Create an account
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  )
}
