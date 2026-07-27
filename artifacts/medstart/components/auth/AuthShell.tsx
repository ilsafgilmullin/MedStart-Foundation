import Link from 'next/link'
import { HeartPulse, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import { AuthHealthBanner } from '@/components/auth/AuthHealthBanner'
import { ROUTES } from '@/lib/constants'

interface AuthShellProps {
  eyebrow: string
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
  wide?: boolean
}

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
  wide = false,
}: AuthShellProps) {
  return (
    <main className="min-h-dvh bg-slate-950 px-4 py-6 text-slate-900 sm:px-6 sm:py-10">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" />
      </div>

      <div
        className={`relative mx-auto grid min-h-[calc(100dvh-3rem)] overflow-hidden rounded-[32px] border border-white/10 bg-white shadow-2xl shadow-black/30 lg:grid-cols-[0.9fr_1.1fr] ${
          wide ? 'max-w-6xl' : 'max-w-5xl'
        }`}
      >
        <aside className="relative hidden overflow-hidden bg-gradient-to-br from-cyan-950 via-teal-900 to-violet-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:28px_28px]" />
          <div className="relative">
            <Link href={ROUTES.HOME} className="inline-flex items-center gap-3 text-xl font-bold">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 backdrop-blur">
                <HeartPulse className="h-6 w-6" />
              </span>
              MedStart
            </Link>
            <div className="mt-16 max-w-sm">
              <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                <Sparkles className="h-3.5 w-3.5" />
                Медицинское обучение
              </p>
              <h2 className="mt-6 text-4xl font-bold leading-tight">
                Учитесь и преподавайте в защищённой среде.
              </h2>
              <p className="mt-5 text-base leading-7 text-cyan-50/75">
                Личный кабинет, проверенные репетиторы, расписание, материалы и профессиональные онлайн-занятия в одном сервисе.
              </p>
            </div>
          </div>

          <div className="relative grid gap-3 text-sm text-cyan-50/85">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <ShieldCheck className="h-5 w-5 shrink-0 text-cyan-200" />
              Проверка статуса аккаунта до входа
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
              <LockKeyhole className="h-5 w-5 shrink-0 text-cyan-200" />
              Пароль обрабатывается сервером MedStart
            </div>
          </div>
        </aside>

        <section className="flex items-center justify-center bg-gradient-to-b from-white to-slate-50 px-5 py-8 sm:px-10 lg:px-14">
          <div className={`w-full ${wide ? 'max-w-3xl' : 'max-w-md'}`}>
            <Link
              href={ROUTES.HOME}
              className="mb-8 inline-flex items-center gap-2 text-lg font-bold text-teal-800 lg:hidden"
            >
              <HeartPulse className="h-6 w-6" />
              MedStart
            </Link>

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">
              {eyebrow}
            </p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              {description}
            </p>

            <div className="mt-8">
              <AuthHealthBanner />
              {children}
            </div>
            {footer && <div className="mt-7 border-t border-slate-200 pt-6">{footer}</div>}
          </div>
        </section>
      </div>
    </main>
  )
}

export const authInputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-base text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500 sm:text-sm'

export const authPrimaryButtonClass =
  'ms-btn ms-btn-primary ms-btn-lg ms-btn-block disabled:cursor-wait'
