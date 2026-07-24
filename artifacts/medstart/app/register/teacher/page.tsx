import type { Metadata } from 'next'
import Link from 'next/link'
import { GraduationCap } from 'lucide-react'
import { Logo }     from '@/components/common/logo'
import { Button }   from '@/components/ui/button'
import { Input }    from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select }   from '@/components/ui/select'
import { Badge }    from '@/components/ui/badge'
import { Alert }    from '@/components/ui/alert'
import { ROUTES }   from '@/lib/constants'

export const metadata: Metadata = { title: 'Регистрация преподавателя' }

const SPECIALIZATION_OPTIONS = [
  { label: 'Терапия',                        value: 'internal-medicine'     },
  { label: 'Кардиология',                    value: 'cardiology'            },
  { label: 'Неврология',                     value: 'neurology'             },
  { label: 'Хирургия',                       value: 'surgery'               },
  { label: 'Педиатрия',                      value: 'paediatrics'           },
  { label: 'Акушерство и гинекология',       value: 'obstetrics-gynaecology'},
  { label: 'Психиатрия',                     value: 'psychiatry'            },
  { label: 'Лучевая диагностика',            value: 'radiology'             },
  { label: 'Анестезиология',                 value: 'anaesthesiology'       },
  { label: 'Патологическая анатомия',        value: 'pathology'             },
  { label: 'Фармакология',                   value: 'pharmacology'          },
  { label: 'Общая врачебная практика',       value: 'general-practice'      },
  { label: 'Скорая медицинская помощь',      value: 'emergency-medicine'    },
  { label: 'Другое',                         value: 'other'                 },
]

const EXPERIENCE_OPTIONS = [
  { label: '1–3 года',           value: '1-3'  },
  { label: '3–5 лет',            value: '3-5'  },
  { label: '5–10 лет',           value: '5-10' },
  { label: '10–20 лет',          value: '10-20'},
  { label: '20 и более лет',     value: '20+'  },
]

// ─── Page ──────────────────────────────────────────────────────────────────
export default function RegisterTeacherPage() {
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
        <div className="w-full max-w-lg">
          {/* Переключатель роли */}
          <div className="mb-6 flex items-center justify-center gap-2">
            <Link
              href={ROUTES.REGISTER.STUDENT}
              className="text-sm text-foreground-muted hover:text-foreground transition-colors"
            >
              ← Регистрация студента
            </Link>
            <span className="text-foreground-subtle" aria-hidden="true">·</span>
            <Badge variant="brand" className="gap-1.5">
              <GraduationCap className="h-3 w-3" aria-hidden="true" />
              Преподаватель
            </Badge>
          </div>

          {/* Заголовок */}
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Стать преподавателем</h1>
            <p className="mt-2 text-sm text-foreground-muted">
              Делитесь клиническим опытом и формируйте профессионалов медицины будущего.
            </p>
          </div>

          {/* Уведомление о проверке */}
          <Alert variant="info" className="mb-6">
            <strong>Анкеты преподавателей проверяются вручную.</strong>{' '}
            Мы верифицируем документы перед публикацией профиля — это занимает 1–2 рабочих дня.
          </Alert>

          {/* Форма */}
          <div className="rounded-2xl border border-border bg-background p-8 shadow-sm">
            {/*
             * TODO: подключить логику регистрации преподавателя.
             * Обработчики, проверка документов и API-запросы будут добавлены отдельно.
             */}
            <form className="flex flex-col gap-5" noValidate>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Имя"
                  type="text"
                  placeholder="Анна"
                  autoComplete="given-name"
                  required
                />
                <Input
                  label="Фамилия"
                  type="text"
                  placeholder="Иванова"
                  autoComplete="family-name"
                  required
                />
              </div>

              <Input
                label="Профессиональное звание"
                type="text"
                placeholder="например, д-р мед. н., проф., доц."
                hint="Укажите ваше официальное звание или учёную степень."
              />

              <Input
                label="Электронная почта"
                type="email"
                placeholder="you@institution.org"
                autoComplete="email"
                required
              />

              <Input
                label="Место работы"
                type="text"
                placeholder="например, НМИЦ кардиологии, Первый МГМУ им. Сеченова"
                hint="Больница, университет или медицинская академия."
              />

              <Select
                label="Медицинская специализация"
                options={SPECIALIZATION_OPTIONS}
                placeholder="Выберите специализацию"
                required
              />

              <Select
                label="Стаж клинической практики"
                options={EXPERIENCE_OPTIONS}
                placeholder="Выберите диапазон стажа"
              />

              <Input
                label="Лицензия / регистрационный номер"
                type="text"
                placeholder="например, РЛН 123456"
                hint="Используется только для проверки квалификации — никогда не отображается публично."
              />

              <Textarea
                label="Краткая биография"
                placeholder="Расскажите студентам о вашем образовании, клинической практике и о том, чему вы планируете учить на MedStart..."
                hint="Рекомендуется 100–300 слов. Отображается в вашем публичном профиле."
                maxLength={500}
                showCount
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
                Подать заявку преподавателя
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
            . Заявки преподавателей рассматриваются согласно{' '}
            <Link href="#" className="underline hover:text-foreground-muted">
              Стандартам преподавателей
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  )
}
