import type { Metadata } from 'next'
import Link from 'next/link'
import { Logo }   from '@/components/common/logo'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { ROUTES } from '@/lib/constants'

export const metadata: Metadata = { title: 'Вход' }

// ─── Page ──────────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-dvh bg-surface flex flex-col">
      {/* Верхняя панель */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={ROUTES.HOME} aria-label="MedStart — главная">
            <Logo />
          </Link>
          <p className="text-sm text-foreground-muted">
            Нет аккаунта?{' '}
            <Link
              href={ROUTES.REGISTER.STUDENT}
              className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Зарегистрироваться
            </Link>
          </p>
        </div>
      </header>

      {/* Карточка авторизации */}
      <main className="flex flex-1 items-center justify-center py-12 px-4">
        <div className="w-full max-w-sm">
          {/* Заголовок */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">С возвращением</h1>
            <p className="mt-2 text-sm text-foreground-muted">Войдите в свой аккаунт MedStart</p>
          </div>

          {/* Форма */}
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            {/*
             * TODO: подключить аутентификацию.
             * Обработчики и валидация будут добавлены отдельно.
             */}
            <form className="flex flex-col gap-5" noValidate>
              <Input
                label="Электронная почта"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />

              <div className="flex flex-col gap-1.5">
                <Input
                  label="Пароль"
                  type="password"
                  placeholder="Введите пароль"
                  autoComplete="current-password"
                  required
                />
                <div className="flex justify-end">
                  <Link
                    href="#"
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Забыли пароль?
                  </Link>
                </div>
              </div>

              <Button type="submit" fullWidth className="mt-1">
                Войти
              </Button>
            </form>

            {/* Разделитель */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-background px-3 text-xs text-foreground-subtle">или</span>
              </div>
            </div>

            {/* SSO */}
            <Button variant="outline" fullWidth className="gap-2">
              <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Продолжить с Google
            </Button>
          </div>

          {/* Правовой блок */}
          <p className="mt-6 text-center text-xs text-foreground-subtle">
            Входя в систему, вы соглашаетесь с нашими{' '}
            <Link href="#" className="underline hover:text-foreground-muted transition-colors">
              Условиями использования
            </Link>
            {' '}и{' '}
            <Link href="#" className="underline hover:text-foreground-muted transition-colors">
              Политикой конфиденциальности
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
