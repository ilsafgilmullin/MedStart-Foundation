'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BadgeCheck, Star } from 'lucide-react'

import { ROUTES } from '@/lib/constants'
import { getPublicTutors, type TutorCardData } from '@/lib/tutors'

function formatPrice(value: number) {
  return value > 0 ? `${new Intl.NumberFormat('ru-RU').format(value)} ₽/занятие` : 'Цена не указана'
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'Р'
}

export default function RecommendedTutors() {
  const [tutors, setTutors] = useState<TutorCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    getPublicTutors(6)
      .then((items) => {
        if (active) setTutors(items)
      })
      .catch(() => {
        if (active) setError('Не удалось загрузить каталог репетиторов.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  return (
    <section className="space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Репетиторы</h2>
          <p className="mt-1 text-slate-500">Только проверенные и опубликованные анкеты</p>
        </div>
        <Link href={ROUTES.TUTORS} className="font-semibold text-violet-700 hover:text-violet-800">
          Открыть каталог
        </Link>
      </div>

      {loading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Загружаем репетиторов…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">{error}</div>
      )}

      {!loading && !error && tutors.length === 0 && (
        <div className="rounded-3xl border border-dashed border-violet-300 bg-violet-50 p-8 text-center">
          <h3 className="text-lg font-bold text-slate-900">В каталоге пока нет опубликованных анкет</h3>
          <p className="mt-2 text-sm text-slate-600">Репетиторы появятся здесь после проверки администратором.</p>
        </div>
      )}

      {!loading && !error && tutors.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {tutors.map((tutor) => (
            <article key={tutor.uid} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-lg font-bold text-violet-700">
                  {initials(tutor.displayName)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-lg font-bold text-slate-900">{tutor.displayName}</h3>
                    <BadgeCheck className="h-5 w-5 shrink-0 text-violet-600" />
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{tutor.specialization || 'Медицинский репетитор'}</p>
                </div>
              </div>

              <p className="mt-5 line-clamp-3 text-sm leading-6 text-slate-600">
                {tutor.bio || 'Репетитор ещё не добавил подробное описание.'}
              </p>

              <div className="mt-5 flex flex-wrap gap-3 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1.5">
                  <Star className="h-4 w-4 text-amber-500" />
                  {tutor.rating > 0 ? tutor.rating.toFixed(1) : 'Нет отзывов'}
                </span>
                {tutor.experience && <span className="rounded-full bg-slate-100 px-3 py-1.5">Опыт: {tutor.experience}</span>}
              </div>

              <div className="mt-6 flex items-center justify-between gap-4">
                <strong className="text-slate-900">{formatPrice(tutor.lessonPrice)}</strong>
                <Link
                  href={`${ROUTES.TUTORS}/${tutor.uid}`}
                  className="rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
                >
                  Подробнее
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
