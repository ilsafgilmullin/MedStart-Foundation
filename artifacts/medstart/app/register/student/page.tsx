import type { Metadata } from 'next'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Logo }   from '@/components/common/logo'
import { Button } from '@/components/ui/button'
import { Input }  from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge }  from '@/components/ui/badge'
import { ROUTES } from '@/lib/constants'

export const metadata: Metadata = { title: 'Регистрация студента' }

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6].map((y) => ({
  label: `${y}-й курс`,
  value: String(y),
}))

const FIELD_OPTIONS = [
  { label: 'Лечебное дело (MBBS/MD)',           value: 'medicine'            },
  { label: 'Сестринское дело',                  value: 'nursing'             },
  { label: 'Фармация',                          value: 'pharmacy'            },
  { label: 'Стоматология',                      value: 'dentistry'           },
  { label: 'Физиотерапия',                      value: 'physiotherapy'       },
  { label: 'Биомедицинские науки',              value: 'biomedical-sciences' },
  { label: 'Общественное здравоохранение',      value: 'public-health'       },
  { label: 'Другое',                            value: 'other'               },
]

// ─── Page ──────────────────────────────────────────────────────────────────
export default function RegisterStudentPage() {
  return (
    <div className="min-h-dvh bg-surface flex flex-col">
      {/* Верхняя панель */}
      <header className="border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href={ROUTES.HOME} aria-label="MedStart — главная">
            <Logo />
          </Link>
          <p className="text-sm text-foreground-muted">
            Уже есть аккаунт?{' '}
            <Link
              href={ROUTES.LOGIN}
              className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Войти
            </Link>
          </p>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Переключатель роли */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <Badge variant="brand" className="gap-1.5">
              <BookOpen className="h-3 w-3" aria-hidden="true" />
              Студент
            </Badge>
            <span className="text-foreground-subtle" aria-hidden="true">·</span>
            <Link
              href={ROUTES.REGISTER.TEACHER}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              Регистрация преподавателя →
            </Link>
          </div>

          {/* Заголовок */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Создайте аккаунт</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Начните медицинское обучение сегодня — это бесплатно.
            </p>
          </div>

          {/* Форма */}
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            {/*
             * TODO: подключить логику регистрации студента.
             * Обработчики, валидация и API-запросы будут добавлены отдельно.
             */}
            <form className="flex flex-col gap-5" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Имя"
                  type="text"
                  placeholder="Иван"
                  autoComplete="given-name"
                  required
                />
                <Input
                  label="Фамилия"
                  type="text"
                  placeholder="Петров"
                  autoComplete="family-name"
                  required
                />
              </div>

              <Input
                label="Электронная почта"
                type="email"
                placeholder="you@university.edu"
                autoComplete="email"
                hint="Мы отправим письмо для подтверждения."
                required
              />

              <Select
                label="Направление подготовки"
                options={FIELD_OPTIONS}
                placeholder="Выберите направление"
              />

              <Select
                label="Курс обучения"
                options={YEAR_OPTIONS}
                placeholder="Выберите курс"
              />

              <Input
                label="Пароль"
                type="password"
                placeholder="Придумайте надёжный пароль"
                autoComplete="new-password"
                hint="Не менее 8 символов: буквы и цифры."
                required
              />

              <Input
                label="Подтвердите пароль"
                type="password"
                placeholder="Повторите пароль"
                autoComplete="new-password"
                required
              />

              <Button type="submit" fullWidth className="mt-1">
                Создать аккаунт студента
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-foreground-subtle">
            Создавая аккаунт, вы соглашаетесь с нашими{' '}
            <Link href="#" className="underline hover:text-foreground-muted">
              Условиями использования
            </Link>
            {' '}и{' '}
            <Link href="#" className="underline hover:text-foreground-muted">
              Политикой конфиденциальности
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
