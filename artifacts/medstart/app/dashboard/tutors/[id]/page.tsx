'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  Clock3,
  Star,
} from 'lucide-react'

import { getPublicTutorById, type TutorCardData } from '@/lib/tutors'
import { ROUTES } from '@/lib/constants'

function formatPrice(value: number) {
  return value > 0
    ? `${new Intl.NumberFormat('ru-RU').format(value)} ₽ за занятие`
    : 'Стоимость уточняется'
}

export default function TutorProfilePage() {
  const params = useParams<{ id: string }>()
  const id = Array.isArray(params.id) ? params.id[0] : params.id
  const [tutor, setTutor] = useState<TutorCardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    if (!id) {
      setError('Некорректная ссылка на профиль.')
      setLoading(false)
      return
    }

    getPublicTutorById(id)
      .then((result) => {
        if (active) setTutor(result)
      })
      .catch(() => {
        if (active) setError('Не удалось загрузить профиль репетитора.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [id])

  return (
    <div className="space-y-6">
      <Link
        href={ROUTES.TUTORS}
        className="inline-flex items-center gap-2 font-medium text-violet-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Вернуться в каталог
      </Link>

      {loading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-slate-500">
          Загружаем профиль…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && !tutor && (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Профиль недоступен
          </h1>
          <p className="mt-3 text-slate-500">
            Анкета могла быть снята с публикации или ещё не прошла проверку.
          </p>
        </div>
      )}

      {!loading && !error && tutor && (
        <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm lg:p-9">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-violet-100 text-3xl font-bold text-violet-700">
                {tutor.displayName.slice(0, 1).toUpperCase()}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-bold text-slate-900">
                    {tutor.displayName}
                  </h1>
                  <BadgeCheck className="h-6 w-6 text-violet-600" />
                </div>
                <p className="mt-2 text-lg font-medium text-violet-700">
                  {tutor.specialization || 'Медицинский репетитор'}
                </p>
                {tutor.institution && (
                  <p className="mt-3 flex items-center gap-2 text-slate-500">
                    <Building2 className="h-4 w-4" />
                    {tutor.institution}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Star className="h-4 w-4 text-amber-500" />
                  Рейтинг
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {tutor.rating > 0
                    ? `${tutor.rating.toFixed(1)} · ${tutor.reviewCount} отзывов`
                    : 'Отзывов пока нет'}
                </p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="flex items-center gap-2 text-sm text-slate-500">
                  <Clock3 className="h-4 w-4 text-violet-600" />
                  Опыт
                </p>
                <p className="mt-2 text-xl font-bold text-slate-900">
                  {tutor.experience || 'Не указан'}
                </p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-bold text-slate-900">О репетиторе</h2>
              <p className="mt-3 whitespace-pre-line leading-7 text-slate-600">
                {tutor.bio || 'Подробное описание пока не добавлено.'}
              </p>
            </div>
          </section>

          <aside className="h-fit rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm text-slate-500">Стоимость</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {formatPrice(tutor.lessonPrice)}
            </p>
            <button
              type="button"
              disabled
              className="mt-6 w-full cursor-not-allowed rounded-2xl bg-violet-200 py-3 font-semibold text-violet-700"
            >
              Запись скоро будет доступна
            </button>
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
              На следующем этапе подключим выбор времени и отправку заявки.
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}
