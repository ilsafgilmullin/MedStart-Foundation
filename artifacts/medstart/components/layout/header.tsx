import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/common/logo'
import { ROUTES } from '@/lib/constants'

const NAV_LINKS = [
  { label: 'Features',  href: '/#features' },
  { label: 'Educators', href: '/#educators' },
  { label: 'Pricing',   href: '/#pricing' },
] as const

export function Header() {
  return (
    <header className="sticky top-0 z-[200] w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Container>
        <div className="flex h-14 items-center gap-6">
          {/* Logo */}
          <Link href={ROUTES.HOME} className="shrink-0 flex items-center gap-2">
            <Logo />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Main">
            {NAV_LINKS.map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-surface transition-colors"
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <Button href={ROUTES.LOGIN} variant="ghost" size="sm">
              Sign in
            </Button>
            <Button href={ROUTES.REGISTER.STUDENT} size="sm">
              Get started
            </Button>
          </div>
        </div>
      </Container>
    </header>
  )
}
