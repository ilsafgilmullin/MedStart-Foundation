import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-surface-200 bg-surface-0/80 backdrop-blur-md">
      <Container>
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="h-4 w-4 text-white"
                aria-hidden="true"
              >
                <path
                  d="M12 2L2 7v10l10 5 10-5V7L12 2z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 12h6M12 9v6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <span className="text-lg font-semibold text-surface-900 tracking-tight">
              MedStart
            </span>
          </Link>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
            <Link href="/#features" className="text-sm text-surface-600 hover:text-surface-900 transition-colors">
              Features
            </Link>
            <Link href="/#about" className="text-sm text-surface-600 hover:text-surface-900 transition-colors">
              About
            </Link>
          </nav>

          {/* Auth actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/register/student">Get started</Link>
            </Button>
          </div>
        </div>
      </Container>
    </header>
  )
}
