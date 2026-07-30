'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Heart,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRoundCheck,
  Video,
} from 'lucide-react'
import { subscribeToPublicTutors } from '@/lib/firestore'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import PresenceBadge from '@/components/presence/PresenceBadge'
import { useAuth } from '@/hooks/useAuth'
import {
  SCHOOL_EXAM_LABELS,
  learnerTrackFor,
  tutorAudiencesFor,
} from '@/lib/education'
import type { LessonFormat, UserProfile } from '@/lib/user-profile'

type SortMode = 'recommended' | 'rating' | 'price-asc' | 'price-desc'

function normalized(value: string) {
  return value.toLocaleLowerCase('ru-RU').replace(/ё/g, 'е').trim()
}

function matchScore(tutor: UserProfile, profile: UserProfile | null) {
  if (!profile) return 0
  const needs = [...(profile.subjects ?? []), profile.fieldOfStudy ?? '']
    .map(normalized)
    .filter(Boolean)
  const tutorText = [
    ...(tutor.subjects ?? []),
    tutor.specialization ?? '',
    tutor.bio ?? '',
  ]
    .map(normalized)
    .join(' ')
  const subjectScore = needs.reduce(
    (score, need) => score + (tutorText.includes(need) ? 1 : 0),
    0,
  )
  const examScore =
    learnerTrackFor(profile) === 'school' &&
    profile.schoolExam &&
    tutor.examTypes?.includes(profile.schoolExam)
      ? 2
      : 0
  return subjectScore + examScore
}

export default function TutorsPage() {
  const { profile } = useAuth()
  const [items, setItems] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [term, setTerm] = useState('')
  const [specialization, setSpecialization] = useState('all')
  const [format, setFormat] = useState<'all' | LessonFormat>('all')
  const [maxPrice, setMaxPrice] = useState('')
  const [sort, setSort] = useState<SortMode>('recommended')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const learnerTrack = learnerTrackFor(profile)
  const isSchoolLearner =
    profile?.role === 'student' && learnerTrack === 'school'

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

  useEffect(() => {
    try {
      const saved = JSON.parse(
        window.localStorage.getItem('medstart-favorite-tutors') || '[]',
      ) as string[]
      setFavoriteIds(new Set(Array.isArray(saved) ? saved : []))
    } catch {
      setFavoriteIds(new Set())
    }
  }, [])

  function toggleFavorite(tutorUid: string) {
    setFavoriteIds((current) => {
      const next = new Set(current)
      if (next.has(tutorUid)) next.delete(tutorUid)
      else next.add(tutorUid)
      window.localStorage.setItem(
        'medstart-favorite-tutors',
        JSON.stringify([...next]),
      )
      return next
    })
  }

  const eligibleItems = useMemo(
    () =>
      profile?.role === 'student'
        ? items.filter(
            (item) =>
              tutorAudiencesFor(item).includes(learnerTrack) &&
              (!isSchoolLearner ||
                !profile.schoolExam ||
                item.examTypes?.includes(profile.schoolExam) === true),
          )
        : items,
    [isSchoolLearner, items, learnerTrack, profile?.role, profile?.schoolExam],
  )

  const specializations = useMemo(
    () =>
      [
        ...new Set(
          eligibleItems.map((item) => item.specialization).filter(Boolean),
        ),
      ].sort((left, right) => left!.localeCompare(right!, 'ru')) as string[],
    [eligibleItems],
  )

  const filtered = useMemo(() => {
    const normalizedTerm = normalized(term)
    const priceLimit = Number(maxPrice) || Number.POSITIVE_INFINITY
    return eligibleItems
      .filter((item) => {
        const searchable = [
          item.displayName,
          item.specialization,
          item.institution,
          item.city,
          ...(item.examTypes ?? []).map((exam) => SCHOOL_EXAM_LABELS[exam]),
          ...(item.subjects ?? []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('ru-RU')
        return (
          searchable.includes(normalizedTerm) &&
          (specialization === 'all' ||
            item.specialization === specialization) &&
          (format === 'all' || item.lessonFormats?.includes(format)) &&
          (!item.lessonPrice || item.lessonPrice <= priceLimit) &&
          (!favoritesOnly || favoriteIds.has(item.uid))
        )
      })
      .sort((left, right) => {
        if (sort === 'rating') {
          return (right.rating ?? 0) - (left.rating ?? 0)
        }
        if (sort === 'price-asc') {
          return (
            (left.lessonPrice || Number.POSITIVE_INFINITY) -
            (right.lessonPrice || Number.POSITIVE_INFINITY)
          )
        }
        if (sort === 'price-desc') {
          return (right.lessonPrice ?? 0) - (left.lessonPrice ?? 0)
        }
        const score = matchScore(right, profile) - matchScore(left, profile)
        return score || (right.rating ?? 0) - (left.rating ?? 0)
      })
  }, [
    eligibleItems,
    favoriteIds,
    favoritesOnly,
    format,
    maxPrice,
    profile,
    sort,
    specialization,
    term,
  ])

  const activeFilters =
    Boolean(term.trim()) ||
    specialization !== 'all' ||
    format !== 'all' ||
    Boolean(maxPrice) ||
    favoritesOnly

  function resetFilters() {
    setTerm('')
    setSpecialization('all')
    setFormat('all')
    setMaxPrice('')
    setFavoritesOnly(false)
    setSort('recommended')
  }

  const profileNeeds = [
    ...(profile?.subjects?.filter(Boolean) ?? []),
    ...(isSchoolLearner && profile?.schoolExam
      ? [
          `${SCHOOL_EXAM_LABELS[profile.schoolExam]}${
            profile.schoolGrade ? ` · ${profile.schoolGrade} класс` : ''
          }`,
        ]
      : []),
  ].slice(0, 5)

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold ring-1 ring-white/15">
              <UserRoundCheck className="h-4 w-4 text-cyan-200" />
              Проверенные преподаватели
            </span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">
              {isSchoolLearner
                ? `Подготовка к ${
                    profile?.schoolExam
                      ? SCHOOL_EXAM_LABELS[profile.schoolExam]
                      : 'ОГЭ и ЕГЭ'
                  } с подходящим преподавателем`
                : 'Найдите преподавателя под вашу задачу'}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-teal-50/85 sm:text-base">
              {isSchoolLearner
                ? 'Сравнивайте предметы, экзамены, формат, стоимость и опыт. В выдаче остаются только преподаватели, которые работают со школьниками.'
                : 'Сравнивайте дисциплины, формат, стоимость и опыт. Заявка не требует оплаты — преподаватель сначала подтверждает время.'}
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm">
            <p className="font-bold text-white">В каталоге</p>
            <p className="mt-1 text-2xl font-black text-cyan-100">
              {eligibleItems.length}
            </p>
          </div>
        </div>
      </header>

      {profileNeeds.length > 0 && (
        <section className="rounded-[28px] border border-teal-200 bg-teal-50 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 text-sm font-bold text-teal-800">
                <Sparkles className="h-4 w-4" />
                Персональные совпадения
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Сначала показываем преподавателей по вашим дисциплинам:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profileNeeds.map((subject) => (
                  <span
                    key={subject}
                    className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-teal-800 ring-1 ring-teal-200"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
            <Link
              href="/dashboard/profile"
              className="ms-btn ms-btn-secondary shrink-0"
            >
              Изменить запрос
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <SlidersHorizontal className="h-4 w-4 text-teal-700" />
          Поиск и фильтры
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(240px,1fr)_repeat(4,minmax(150px,210px))]">
          <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Имя, предмет или учреждение"
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
          <select
            value={format}
            onChange={(event) =>
              setFormat(event.target.value as 'all' | LessonFormat)
            }
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-500"
          >
            <option value="all">Любой формат</option>
            <option value="online">Онлайн</option>
            <option value="in_person">Очно</option>
          </select>
          <input
            type="number"
            min="0"
            step="100"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="Цена до, ₽"
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-500"
          />
          <select
            value={sort}
            onChange={(event) => setSort(event.target.value as SortMode)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-teal-500"
          >
            <option value="recommended">Сначала подходящие</option>
            <option value="rating">По рейтингу</option>
            <option value="price-asc">Сначала дешевле</option>
            <option value="price-desc">Сначала дороже</option>
          </select>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((current) => !current)}
            className="ms-choice ms-choice-pill"
          >
            <Heart
              className={`h-4 w-4 ${favoritesOnly ? 'fill-current' : ''}`}
            />
            Только избранные
            {favoriteIds.size > 0 && <span>{favoriteIds.size}</span>}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              Найдено:{' '}
              <strong className="text-slate-900">{filtered.length}</strong>
            </span>
            {activeFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="ms-link-action text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Сбросить
              </button>
            )}
          </div>
        </div>
      </section>

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
        <div className="rounded-3xl border border-dashed border-teal-300 bg-teal-50 p-10 text-center">
          <UserRoundCheck className="mx-auto h-11 w-11 text-teal-700" />
          <h2 className="mt-4 text-xl font-black text-slate-950">
            {activeFilters
              ? 'Ничего не найдено'
              : 'Преподаватели пока не опубликованы'}
          </h2>
          <p className="mt-2 text-slate-500">
            {activeFilters
              ? 'Измените запрос или сбросьте часть фильтров.'
              : 'Каталог заполнится после проверки первых анкет.'}
          </p>
          {activeFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="mt-5 ms-btn ms-btn-primary"
            >
              Сбросить фильтры
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tutor) => {
            const score = matchScore(tutor, profile)
            const favorite = favoriteIds.has(tutor.uid)
            return (
              <article
                key={tutor.uid}
                className="relative flex flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-200 hover:shadow-lg sm:p-6"
              >
                <button
                  type="button"
                  onClick={() => toggleFavorite(tutor.uid)}
                  aria-pressed={favorite}
                  aria-label={
                    favorite ? 'Убрать из избранного' : 'Добавить в избранное'
                  }
                  className={`absolute right-4 top-4 ms-icon-btn ${favorite ? 'ms-icon-btn-danger' : 'ms-icon-btn-neutral'}`}
                >
                  <Heart
                    className={`h-5 w-5 ${favorite ? 'fill-current' : ''}`}
                  />
                </button>

                <div className="flex items-center gap-4 pr-12">
                  {tutor.avatar ? (
                    <ProfilePhoto
                      src={tutor.avatar}
                      size={64}
                      className="h-16 w-16 rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-xl font-black text-teal-700">
                      {tutor.firstName.slice(0, 1)}
                      {tutor.lastName.slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-black text-slate-950">
                      {tutor.displayName}
                    </h2>
                    <p className="mt-1 line-clamp-2 text-sm font-bold text-teal-700">
                      {tutor.specialization || 'Преподаватель'}
                    </p>
                    <PresenceBadge uid={tutor.uid} compact className="mt-2" />
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Проверен
                  </span>
                  {score > 0 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                      <Sparkles className="h-3.5 w-3.5" />
                      Подходит вам
                    </span>
                  )}
                  {tutor.examTypes?.map((exam) => (
                    <span
                      key={exam}
                      className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700"
                    >
                      {SCHOOL_EXAM_LABELS[exam]}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">
                  {tutor.city && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4" />
                      {tutor.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Video className="h-4 w-4" />
                    {tutor.lessonFormats?.includes('in_person')
                      ? 'Онлайн и очно'
                      : 'Онлайн'}
                  </span>
                </div>

                <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-slate-500">
                  {tutor.bio || 'Описание профиля пока не добавлено.'}
                </p>
                {Boolean(tutor.subjects?.length) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tutor.subjects!.slice(0, 4).map((subject) => (
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
                  <span className="text-right font-black text-slate-950">
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
            )
          })}
        </div>
      )}
    </div>
  )
}
