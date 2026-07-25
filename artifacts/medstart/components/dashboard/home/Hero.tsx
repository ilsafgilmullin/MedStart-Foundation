'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'

export default function Hero() {
  const { profile, role } = useAuth()
  const firstName = profile?.firstName?.trim() || 'пользователь'
  const tutorPending = role === 'tutor' && profile?.status === 'pending'
  const isAdmin = role === 'admin' || role === 'owner'

  const description = isAdmin
    ? 'Управляйте пользователями, проверяйте анкеты репетиторов и контролируйте работу платформы.'
    : tutorPending
      ? 'Ваш профиль репетитора отправлен на проверку. После одобрения он появится в каталоге.'
      : role === 'tutor'
        ? 'Управляйте занятиями, расписанием и общением со студентами в одном месте.'
        : 'Выберите медицинского репетитора, согласуйте время и начните обучение.'

  const primaryHref = isAdmin
    ? '/dashboard/admin'
    : role === 'tutor'
      ? '/dashboard/profile'
      : '/dashboard/tutors'

  const primaryLabel = isAdmin
    ? 'Открыть модерацию'
    : role === 'tutor'
      ? 'Открыть профиль'
      : 'Найти репетитора'

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 p-8 text-white shadow-xl lg:p-10">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm">
          <Sparkles className="h-4 w-4" />
          MedStart
        </div>
        <h1 className="mt-5 text-4xl font-bold leading-tight lg:text-5xl">
          Добро пожаловать,
          <br />
          {firstName} 👋
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-violet-100">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={primaryHref}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 font-semibold text-violet-700"
          >
            {primaryLabel}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!isAdmin && role !== 'tutor' && (
            <Link
              href="/dashboard/profile"
              className="rounded-2xl border border-white/25 bg-white/10 px-6 py-3 font-semibold"
            >
              Открыть профиль
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
