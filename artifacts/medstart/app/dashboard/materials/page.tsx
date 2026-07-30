'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  Check,
  CircleCheckBig,
  ExternalLink,
  FileText,
  Filter,
  FolderOpen,
  Link2,
  LoaderCircle,
  Plus,
  Search,
  StickyNote,
  Trash2,
  Video,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { subscribeToBookingsForUser } from '@/lib/bookings'
import {
  createMaterial,
  deleteMaterial,
  subscribeToMaterialsForUser,
} from '@/lib/materials'
import type { Booking, LearningMaterial, MaterialKind } from '@/lib/domain'

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100'

const kindLabels: Record<MaterialKind, string> = {
  link: 'Ссылка',
  document: 'Документ',
  video: 'Видео',
  note: 'Заметка',
}

function KindIcon({ kind }: { kind: MaterialKind }) {
  const Icon =
    kind === 'video'
      ? Video
      : kind === 'note'
        ? StickyNote
        : kind === 'document'
          ? FileText
          : Link2
  return <Icon className="h-5 w-5" />
}

export default function MaterialsPage() {
  const { user, profile, role } = useAuth()
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [bookingId, setBookingId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [url, setUrl] = useState('')
  const [kind, setKind] = useState<MaterialKind>('link')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [error, setError] = useState('')
  const [queryText, setQueryText] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | MaterialKind>('all')
  const [personFilter, setPersonFilter] = useState('all')
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set())
  const requestedStudent = useRef('')

  useEffect(() => {
    requestedStudent.current =
      new URLSearchParams(window.location.search).get('student') ?? ''
    try {
      const saved = JSON.parse(
        window.localStorage.getItem('medstart-completed-materials') || '[]',
      ) as string[]
      setCompletedIds(new Set(Array.isArray(saved) ? saved : []))
    } catch {
      setCompletedIds(new Set())
    }
  }, [])

  useEffect(() => {
    if (!user || !role) return
    return subscribeToMaterialsForUser(
      user.uid,
      role,
      (items) => {
        setMaterials(items)
        setLoading(false)
      },
      () => {
        setError('Не удалось загрузить материалы.')
        setLoading(false)
      },
    )
  }, [user, role])

  useEffect(() => {
    if (!user || role !== 'tutor') return
    return subscribeToBookingsForUser(
      user.uid,
      role,
      (items) => {
        const active = items.filter(
          (item) => item.status === 'accepted' || item.status === 'completed',
        )
        setBookings(active)
        setBookingId((current) => {
          if (current && active.some((item) => item.id === current)) {
            return current
          }
          return (
            active.find((item) => item.studentUid === requestedStudent.current)
              ?.id ??
            active[0]?.id ??
            ''
          )
        })
        if (requestedStudent.current && active.length) setOpen(true)
      },
      () => undefined,
    )
  }, [user, role])

  const bookingOptions = useMemo(() => {
    const seen = new Set<string>()
    return bookings.filter((booking) => {
      if (seen.has(booking.studentUid)) return false
      seen.add(booking.studentUid)
      return true
    })
  }, [bookings])

  const people = useMemo(
    () =>
      [
        ...new Set(
          materials
            .map((item) =>
              role === 'tutor' ? item.studentName : item.tutorName,
            )
            .filter(Boolean),
        ),
      ].sort((left, right) => left.localeCompare(right, 'ru')),
    [materials, role],
  )

  const filteredMaterials = useMemo(() => {
    const query = queryText.trim().toLocaleLowerCase('ru-RU')
    return materials.filter((material) => {
      const text = [
        material.title,
        material.description,
        material.tutorName,
        material.studentName,
      ]
        .join(' ')
        .toLocaleLowerCase('ru-RU')
      return (
        (!query || text.includes(query)) &&
        (kindFilter === 'all' || material.kind === kindFilter) &&
        (personFilter === 'all' ||
          (role === 'tutor'
            ? material.studentName === personFilter
            : material.tutorName === personFilter))
      )
    })
  }, [kindFilter, materials, personFilter, queryText, role])

  const completedCount = materials.filter((item) =>
    completedIds.has(item.id),
  ).length
  const videoCount = materials.filter((item) => item.kind === 'video').length
  const documentCount = materials.filter(
    (item) => item.kind === 'document' || item.kind === 'link',
  ).length
  const uniqueStudents = new Set(materials.map((item) => item.studentUid)).size
  const noteCount = materials.filter((item) => item.kind === 'note').length

  function toggleCompleted(materialId: string) {
    setCompletedIds((current) => {
      const next = new Set(current)
      if (next.has(materialId)) next.delete(materialId)
      else next.add(materialId)
      window.localStorage.setItem(
        'medstart-completed-materials',
        JSON.stringify([...next]),
      )
      return next
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !profile) return
    const booking = bookings.find((item) => item.id === bookingId)
    if (!booking) {
      setError('Сначала выберите ученика.')
      return
    }

    setSaving(true)
    setError('')
    try {
      await createMaterial({
        bookingId: booking.id,
        tutorUid: user.uid,
        tutorName: profile.displayName,
        studentUid: booking.studentUid,
        studentName: booking.studentName,
        title,
        description,
        url,
        kind,
      })
      setTitle('')
      setDescription('')
      setUrl('')
      setKind('link')
      setOpen(false)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось добавить материал.',
      )
    } finally {
      setSaving(false)
    }
  }

  async function remove(material: LearningMaterial) {
    if (!window.confirm(`Удалить материал «${material.title}»?`)) return
    setDeletingId(material.id)
    setError('')
    try {
      await deleteMaterial(material.id)
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось удалить материал.',
      )
    } finally {
      setDeletingId('')
    }
  }

  return (
    <div className="space-y-6">
      {role === 'tutor' ? (
        <header className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold ring-1 ring-white/15">
                <FolderOpen className="h-4 w-4 text-cyan-200" />
                Методический кабинет
              </span>
              <h1 className="mt-4 text-3xl font-black sm:text-4xl">
                Материалы ученикам
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-50/80 sm:text-base">
                Создавайте персональную библиотеку для каждого ученика:
                документы, видео, ссылки, памятки и задания после занятия.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(true)}
              disabled={!bookingOptions.length}
              className="ms-btn ms-btn-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Plus className="h-5 w-5" />
              Добавить материал
            </button>
          </div>
        </header>
      ) : (
        <header>
          <h1 className="text-3xl font-black text-slate-950">Материалы</h1>
          <p className="mt-2 max-w-2xl text-slate-500">
            Файлы, задания и рекомендации, которые преподаватели оставили после
            занятий.
          </p>
        </header>
      )}

      {role === 'student' && (
        <section className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Всего материалов
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {materials.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              От ваших преподавателей
            </p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Видео и документы
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {videoCount + documentCount}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Для самостоятельной работы
            </p>
          </article>
          <article className="rounded-3xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-teal-800">Изучено</p>
            <p className="mt-2 text-3xl font-black text-teal-950">
              {completedCount}
            </p>
            <p className="mt-1 text-xs text-teal-700">Отмечено вами</p>
          </article>
        </section>
      )}

      {role === 'tutor' && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Всего материалов
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {materials.length}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              В персональных библиотеках
            </p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Учеников</p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {uniqueStudents}
            </p>
            <p className="mt-1 text-xs text-slate-400">Получали материалы</p>
          </article>
          <article className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Видео и источники
            </p>
            <p className="mt-2 text-3xl font-black text-slate-950">
              {videoCount + documentCount}
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Для самостоятельной работы
            </p>
          </article>
          <article className="rounded-3xl border border-teal-200 bg-teal-50 p-5 shadow-sm">
            <p className="text-sm font-bold text-teal-800">
              Методические заметки
            </p>
            <p className="mt-2 text-3xl font-black text-teal-950">
              {noteCount}
            </p>
            <p className="mt-1 text-xs text-teal-700">Пояснения и задания</p>
          </article>
        </section>
      )}

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {role === 'tutor' && !bookings.length && !loading && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Добавить материал можно после подтверждения хотя бы одного занятия.
        </div>
      )}

      {open && role === 'tutor' && (
        <section className="rounded-[28px] border border-teal-200 bg-white p-5 shadow-lg sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Новый материал
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Материал увидит только выбранный ученик.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="ms-icon-btn ms-icon-btn-neutral"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={submit} className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Ученик
              <select
                className={inputClass}
                value={bookingId}
                onChange={(event) => setBookingId(event.target.value)}
                required
              >
                <option value="">Выберите ученика</option>
                {bookingOptions.map((booking) => (
                  <option key={booking.id} value={booking.id}>
                    {booking.studentName}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Тип
              <select
                className={inputClass}
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as MaterialKind)
                }
              >
                {Object.entries(kindLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-2">
              Название
              <input
                className={inputClass}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Например: Атлас по анатомии"
                required
              />
            </label>
            {kind !== 'note' && (
              <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-2">
                Ссылка
                <input
                  type="url"
                  className={inputClass}
                  value={url}
                  onChange={(event) => setUrl(event.target.value)}
                  placeholder="https://..."
                  required
                />
              </label>
            )}
            <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-2">
              Комментарий
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Что посмотреть или выполнить?"
              />
            </label>
            <button
              disabled={saving}
              className="ms-btn ms-btn-primary disabled:opacity-60 lg:col-span-2 lg:justify-self-end"
            >
              {saving ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Plus className="h-5 w-5" />
              )}
              Сохранить материал
            </button>
          </form>
        </section>
      )}

      {materials.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <Filter className="h-4 w-4 text-teal-700" />
            {role === 'tutor'
              ? 'Управление библиотекой учеников'
              : 'Найти нужный материал'}
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100">
              <Search className="h-5 w-5 text-slate-400" />
              <input
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder={
                  role === 'tutor'
                    ? 'Название, комментарий или ученик'
                    : 'Название, комментарий или преподаватель'
                }
                className="w-full bg-transparent outline-none"
              />
            </label>
            <select
              value={kindFilter}
              onChange={(event) =>
                setKindFilter(event.target.value as 'all' | MaterialKind)
              }
              className={inputClass}
            >
              <option value="all">Все типы</option>
              {Object.entries(kindLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              value={personFilter}
              onChange={(event) => setPersonFilter(event.target.value)}
              className={inputClass}
            >
              <option value="all">
                {role === 'tutor' ? 'Все ученики' : 'Все преподаватели'}
              </option>
              {people.map((personName) => (
                <option key={personName} value={personName}>
                  {personName}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-3 text-sm text-slate-500">
            Показано: {filteredMaterials.length} из {materials.length}
          </p>
        </section>
      )}

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-3xl bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      ) : filteredMaterials.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredMaterials.map((material) => {
            const completed = completedIds.has(material.id)
            return (
              <article
                key={material.id}
                className={`flex flex-col rounded-[28px] border bg-white p-5 shadow-sm ${completed ? 'border-teal-200' : 'border-slate-200'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${completed ? 'bg-teal-50 text-teal-700' : 'bg-sky-50 text-sky-700'}`}
                  >
                    <KindIcon kind={material.kind} />
                  </div>
                  <div className="flex items-center gap-2">
                    {completed && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
                        <Check className="h-3.5 w-3.5" />
                        Изучено
                      </span>
                    )}
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      {kindLabels[material.kind]}
                    </span>
                  </div>
                </div>
                <h2 className="mt-5 text-lg font-black text-slate-950">
                  {material.title}
                </h2>
                <p className="mt-1 text-sm font-bold text-teal-700">
                  {role === 'tutor' ? material.studentName : material.tutorName}
                </p>
                <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                  {material.description || 'Без дополнительного комментария.'}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {material.url && (
                    <a
                      href={material.url}
                      target="_blank"
                      rel="noreferrer"
                      className="ms-btn ms-btn-primary ms-btn-sm flex-1"
                    >
                      Открыть
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  {role === 'student' && (
                    <button
                      type="button"
                      onClick={() => toggleCompleted(material.id)}
                      className={`ms-btn ms-btn-sm ${completed ? 'ms-btn-soft' : 'ms-btn-secondary'}`}
                    >
                      {completed ? (
                        <CircleCheckBig className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {completed ? 'Изучено' : 'Отметить изученным'}
                    </button>
                  )}
                  {role === 'tutor' && (
                    <button
                      type="button"
                      onClick={() => void remove(material)}
                      disabled={deletingId === material.id}
                      className="ms-icon-btn ms-icon-btn-danger"
                      aria-label="Удалить материал"
                    >
                      {deletingId === material.id ? (
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-teal-300 bg-teal-50 p-10 text-center">
          <FolderOpen className="mx-auto h-11 w-11 text-teal-700" />
          <h2 className="mt-4 text-xl font-black text-slate-950">
            {materials.length
              ? 'По фильтрам ничего не найдено'
              : 'Материалов пока нет'}
          </h2>
          <p className="mt-2 text-slate-500">
            {materials.length
              ? 'Измените поисковый запрос или фильтры.'
              : role === 'tutor'
                ? 'Добавьте первый материал для одного из учеников.'
                : 'Преподаватель сможет отправить их после подтверждения занятия.'}
          </p>
        </div>
      )}
    </div>
  )
}
