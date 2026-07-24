import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/common/logo'
import { ROUTES } from '@/lib/constants'

const NAV_LINKS = [
  { label: 'Возможности',   href: '/#features'  },
  { label: 'Преподавателям', href: '/#educators' },
  { label: 'Тарифы',        href: '/#pricing'   },
] as const

export function Header() {
  return (
    <header className="sticky top-0 z-[200] w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <Container>
        <div className="flex h-14 items-center gap-6">
          {/* Логотип */}
          <Link href={ROUTES.HOME} className="shrink-0 flex items-center gap-2" aria-label="MedStart — главная">
            <Logo />
          </Link>

          {/* Навигация */}
          <nav className="hidden md:flex items-center gap-1 flex-1" aria-label="Главное меню">
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

          {/* Действия */}
          <div className="flex items-center gap-2 ml-auto">
            <Button href={ROUTES.LOGIN} variant="ghost" size="sm">
              Войти
            </Button>
            <Button href={ROUTES.REGISTER.STUDENT} size="sm">
              Начать
            </Button>
          </div>
        </div>
      </Container>
    </header>
  )
}
