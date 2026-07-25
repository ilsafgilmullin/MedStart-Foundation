'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BadgeCheck, Search, Star } from 'lucide-react'

import { getPublicTutors, type TutorCardData } from '@/lib/tutors'
import { ROUTES } from '@/lib/constants'

function formatPrice(value: number) {
  return value > 0
    ? `${new Intl.NumberFormat('ru-RU').format(value)} ₽`
    : 'Цена не указана'
}

export default function TutorsPage() {
  const [items, setItems] = useState<TutorCardData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [term, setTerm] = useState('')

  useEffect(() => {
    let active = true

    getPublicTutors(50)
      .then((result) => {
        if (active) setItems(result)
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

  const filtered = useMemo(() => {
    const normalized = term.trim().toLowerCase()
    if (!normalized) return items

    return items.filter((item) =>
      `${item.displayName} ${item.specialization ?? ''} ${item.institution ?? ''}`
        .toLowerCase()
        .includes(normalized),
    )
  }, [items, term])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Каталог репетиторов</h1>
        <p className="mt-2 text-slate-500">
          Выберите проверенного специалиста по нужному направлению.
        </p>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <Search className="h-5 w-5 text-slate-400" />
        <span className="sr-only">Поиск репетитора</span>
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Имя, специализация или место работы"
          className="w-full bg-transparent outline-none"
        />
      </label>

      {loading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">
          Загружаем каталог…
        </div>
      )}

      {!loading && error && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="rounded-3xl border border-dashed border-violet-300 bg-violet-50 p-10 text-center">
          <h2 className="text-xl font-bold text-slate-900">
            Репетиторы пока не найдены
          </h2>
          <p className="mt-2 text-slate-500">
            Попробуйте изменить запрос. Новые анкеты появятся после проверки администратором.
          </p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tutor) => (
            <article
              key={tutor.uid}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-xl font-bold text-slate-900">
                      {tutor.displayName}
                    </h2>
                    <BadgeCheck className="h-5 w-5 shrink-0 text-violet-600" />
                  </div>
                  <p className="mt-1 text-violet-600">
                    {tutor.specialization || 'Медицинский репетитор'}
                  </p>
                  {tutor.institution && (
                    <p className="mt-1 text-sm text-slate-500">
                      {tutor.institution}
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
                {tutor.bio || 'Описание пока не добавлено.'}
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="flex items-center gap-1 text-sm text-slate-600">
                  <Star className="h-4 w-4 text-amber-500" />
                  {tutor.rating > 0 ? tutor.rating.toFixed(1) : 'Новый профиль'}
                </span>
                <span className="font-semibold text-slate-900">
                  {formatPrice(tutor.lessonPrice)}
                </span>
              </div>

              <Link
                href={`${ROUTES.TUTORS}/${tutor.uid}`}
                className="mt-6 block w-full rounded-2xl bg-violet-600 py-3 text-center font-semibold text-white hover:bg-violet-700"
              >
                Подробнее
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
