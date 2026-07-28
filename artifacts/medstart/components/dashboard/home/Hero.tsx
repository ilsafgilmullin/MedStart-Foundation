'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  HeartPulse,
  Search,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getProfileCompletion } from '@/lib/profile-completion'

export default function Hero() {
  const { profile, role } = useAuth()
  const firstName = profile?.firstName || 'пользователь'
  const tutorPending = role === 'tutor' && profile?.status === 'pending'
  const tutorRejected = role === 'tutor' && profile?.status === 'rejected'
  const isModerator = role === 'admin' || role === 'owner'
  const completion = getProfileCompletion(profile)

  const description = isModerator
    ? 'Проверяйте анкеты репетиторов и управляйте доступом к каталогу MedStart.'
    : tutorPending
      ? 'Ваш профиль репетитора отправлен на проверку. После одобрения он появится в каталоге.'
      : tutorRejected
        ? `Анкета требует доработки${profile?.moderationNote ? `: ${profile.moderationNote}` : '.'}`
        : role === 'tutor'
          ? 'Управляйте занятиями, расписанием и материалами студентов из одного рабочего пространства.'
          : 'Соберите персональный маршрут: выберите преподавателя, подготовьте занятие и сохраняйте материалы в одном кабинете.'

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8 lg:p-10">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-cyan-300/15 blur-3xl" />
      <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-violet-400/15 blur-3xl" />
      <div className="relative grid gap-7 lg:grid-cols-[1fr_280px] lg:items-end">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm font-semibold ring-1 ring-white/15">
            <HeartPulse className="h-4 w-4 text-cyan-200" />
            MedStart · личный кабинет
          </div>
          <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
            Добро пожаловать,
            <br />
            {firstName} <span aria-hidden>👋</span>
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-teal-50/90 sm:text-lg">
            {description}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {isModerator && (
              <Link href="/dashboard/admin" className="ms-btn ms-btn-white">
                Открыть модерацию
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {role === 'student' && (
              <>
                <Link href="/dashboard/tutors" className="ms-btn ms-btn-white">
                  <Search className="h-4 w-4" />
                  Найти преподавателя
                </Link>
                <Link
                  href="/dashboard/knowledge"
                  className="ms-btn ms-btn-on-dark"
                >
                  <BookOpenCheck className="h-4 w-4" />
                  Учебная база
                </Link>
              </>
            )}
            {role === 'tutor' && profile?.status === 'active' && (
              <Link href="/dashboard/requests" className="ms-btn ms-btn-white">
                Проверить заявки
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            {role !== 'student' && (
              <Link href="/dashboard/profile" className="ms-btn ms-btn-on-dark">
                Открыть профиль
              </Link>
            )}
          </div>
        </div>

        {(role === 'student' || role === 'tutor') && (
          <Link
            href="/dashboard/profile"
            className="rounded-3xl border border-white/15 bg-white/10 p-5 backdrop-blur-sm transition hover:bg-white/15"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold text-white">
                <Sparkles className="h-4 w-4 text-cyan-200" />
                {role === 'tutor' ? 'Профиль преподавателя' : 'Профиль обучения'}
              </span>
              <span className="text-sm font-black text-cyan-100">
                {completion.percent}%
              </span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-cyan-300 transition-all"
                style={{ width: `${completion.percent}%` }}
              />
            </div>
            <p className="mt-3 text-sm leading-6 text-teal-50/80">
              {role === 'tutor'
                ? completion.percent >= 85
                  ? profile?.status === 'active'
                    ? 'Анкета готова к работе и полноценно представлена в каталоге.'
                    : 'Анкета заполнена и готова к проверке.'
                  : `Добавьте: ${completion.missing.slice(0, 2).join(' и ').toLowerCase()}.`
                : completion.percent >= 80
                  ? 'Профиль заполнен — рекомендации будут точнее.'
                  : 'Добавьте вуз, курс и сложные дисциплины для персональных рекомендаций.'}
            </p>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-white">
              {role === 'tutor' ? 'Улучшить анкету' : 'Дополнить профиль'}
              <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        )}
      </div>
    </section>
  )
}
