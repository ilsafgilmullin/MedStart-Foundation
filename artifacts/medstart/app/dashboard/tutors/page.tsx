'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  MapPin,
  Search,
  Star,
  UserRoundCheck,
} from 'lucide-react'
import { subscribeToPublicTutors } from '@/lib/firestore'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import type { UserProfile } from '@/lib/user-profile'

export default function TutorsPage() {
  const [items, setItems] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [term, setTerm] = useState('')
  const [specialization, setSpecialization] = useState('all')

  useEffect(
    () =>
      subscribeToPublicTutors(
        (profiles) => {
          setItems(profiles)
          setError('')
          setLoading(false)
        },
        () => {
          setError(
            'Не удалось загрузить каталог. Попробуйте обновить страницу.',
          )
          setLoading(false)
        },
      ),
    [],
  )

  const specializations = useMemo(
    () =>
      [
        ...new Set(items.map((item) => item.specialization).filter(Boolean)),
      ].sort((left, right) => left!.localeCompare(right!, 'ru')) as string[],
    [items],
  )
  const normalizedTerm = term.trim().toLowerCase()
  const filtered = items.filter((item) => {
    const searchable = [
      item.displayName,
      item.specialization,
      item.institution,
      item.city,
      ...(item.subjects ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return (
      searchable.includes(normalizedTerm) &&
      (specialization === 'all' || item.specialization === specialization)
    )
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">
          Каталог репетиторов
        </h1>
        <p className="mt-2 text-slate-500">
          Только проверенные анкеты. Откройте профиль, выберите время и
          отправьте заявку.
        </p>
      </div>

      <div className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[1fr_260px]">
        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Имя, предмет или вуз"
            className="w-full bg-transparent outline-none"
          />
        </label>
        <select
          value={specialization}
          onChange={(event) => setSpecialization(event.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-500"
        >
          <option value="all">Все специализации</option>
          {specializations.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <div className="flex items-start gap-3 rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
        </div>
      ) : loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">
          Загружаем каталог…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-violet-300 bg-violet-50 p-10 text-center">
          <UserRoundCheck className="mx-auto h-11 w-11 text-violet-600" />
          <h2 className="mt-4 text-xl font-bold">
            {normalizedTerm || specialization !== 'all'
              ? 'Ничего не найдено'
              : 'Репетиторы пока не опубликованы'}
          </h2>
          <p className="mt-2 text-slate-500">
            {normalizedTerm || specialization !== 'all'
              ? 'Измените запрос или сбросьте фильтр специализации.'
              : 'Каталог заполнится после проверки первых анкет.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tutor) => (
            <article
              key={tutor.uid}
              className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6"
            >
              <div className="flex items-center gap-4">
                {tutor.avatar ? (
                  <ProfilePhoto
                    src={tutor.avatar}
                    size={64}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-xl font-bold text-violet-700">
                    {tutor.firstName.slice(0, 1)}
                    {tutor.lastName.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-slate-900">
                    {tutor.displayName}
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-violet-600">
                    {tutor.specialization || 'Медицинский репетитор'}
                  </p>
                </div>
              </div>

              {tutor.city && (
                <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                  <MapPin className="h-4 w-4" />
                  {tutor.city}
                </p>
              )}
              <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
                {tutor.bio || 'Описание профиля пока не добавлено.'}
              </p>
              {Boolean(tutor.subjects?.length) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {tutor.subjects!.slice(0, 3).map((subject) => (
                    <span
                      key={subject}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600"
                    >
                      {subject}
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-5 flex items-end justify-between gap-3 border-t border-slate-100 pt-5">
                <span className="flex items-center gap-1 text-sm text-slate-600">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {tutor.reviewsCount
                    ? `${tutor.rating?.toFixed(1)} · ${tutor.reviewsCount}`
                    : 'Новый профиль'}
                </span>
                <span className="text-right font-bold text-slate-900">
                  {tutor.lessonPrice
                    ? `${tutor.lessonPrice.toLocaleString('ru-RU')} ₽`
                    : 'Цена по запросу'}
                </span>
              </div>
              <Link
                href={`/dashboard/tutors/${tutor.uid}`}
                className="mt-5 ms-btn ms-btn-primary ms-btn-block"
              >
                Открыть профиль
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
