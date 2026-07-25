'use client'

import Link from 'next/link'
import { Search, Sparkles } from 'lucide-react'

import { useAuthContext } from '@/providers/AuthProvider'
import { ROUTES } from '@/lib/constants'

export default function Hero() {
  const { profile, role } = useAuthContext()
  const firstName = profile?.firstName?.trim() || 'пользователь'
  const isTutor = role === 'tutor'

  return (
    <section className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 p-7 text-white shadow-xl sm:p-9">
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="relative max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm backdrop-blur">
          <Sparkles className="h-4 w-4" />
          MedStart
        </div>

        <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-5xl">
          Добро пожаловать, {firstName} 👋
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-violet-100 sm:text-lg">
          {isTutor
            ? 'Заполните профессиональный профиль. После проверки администратором анкета появится в каталоге.'
            : 'Выбирайте медицинского репетитора самостоятельно и записывайтесь на подходящее время.'}
        </p>

        {!isTutor && (
          <Link
            href={ROUTES.TUTORS}
            className="mt-7 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 font-semibold text-violet-700 transition hover:bg-violet-50"
          >
            <Search className="h-5 w-5" />
            Найти репетитора
          </Link>
        )}
      </div>
    </section>
  )
}
