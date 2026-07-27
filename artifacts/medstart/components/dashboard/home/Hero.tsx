'use client'

import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function Hero() {
  const { profile, role } = useAuth()
  const firstName = profile?.firstName || 'пользователь'
  const tutorPending = role === 'tutor' && profile?.status === 'pending'
  const tutorRejected = role === 'tutor' && profile?.status === 'rejected'
  const isModerator = role === 'admin' || role === 'owner'

  const description = isModerator
    ? 'Проверяйте анкеты репетиторов и управляйте доступом к каталогу MedStart.'
    : tutorPending
      ? 'Ваш профиль репетитора отправлен на проверку. После одобрения он появится в каталоге.'
      : tutorRejected
        ? `Анкета требует доработки${profile?.moderationNote ? `: ${profile.moderationNote}` : '.'}`
        : role === 'tutor'
          ? 'Управляйте занятиями, расписанием и общением со студентами в одном месте.'
          : 'Выберите медицинского репетитора, согласуйте время и начните обучение.'

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
          {isModerator && (
            <Link
              href="/dashboard/admin"
              className="ms-btn ms-btn-white"
            >
              Открыть модерацию
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {role === 'student' && (
            <Link
              href="/dashboard/tutors"
              className="ms-btn ms-btn-white"
            >
              Найти репетитора
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          {role === 'tutor' && profile?.status === 'active' && (
            <Link
              href="/dashboard/requests"
              className="ms-btn ms-btn-white"
            >
              Проверить заявки
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <Link
            href="/dashboard/profile"
            className="ms-btn ms-btn-on-dark"
          >
            Открыть профиль
          </Link>
        </div>
      </div>
    </section>
  )
}
