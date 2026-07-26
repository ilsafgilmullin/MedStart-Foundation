'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ExternalLink,
  FileText,
  FolderOpen,
  Link2,
  LoaderCircle,
  Plus,
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
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100'

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
  const requestedStudent = useRef('')

  useEffect(() => {
    requestedStudent.current =
      new URLSearchParams(window.location.search).get('student') ?? ''
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !profile) return
    const booking = bookings.find((item) => item.id === bookingId)
    if (!booking) {
      setError('Сначала выберите студента.')
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Материалы</h1>
          <p className="mt-2 text-slate-500">
            {role === 'tutor'
              ? 'Делитесь ссылками, видео, документами и заметками со студентами.'
              : 'Материалы, которыми поделились ваши репетиторы.'}
          </p>
        </div>
        {role === 'tutor' && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!bookingOptions.length}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-5 w-5" />
            Добавить материал
          </button>
        )}
      </div>

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
        <section className="rounded-[28px] border border-violet-200 bg-white p-5 shadow-lg sm:p-7">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Новый материал
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Материал увидит только выбранный студент.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-xl p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Закрыть"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <form onSubmit={submit} className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Студент
              <select
                className={inputClass}
                value={bookingId}
                onChange={(event) => setBookingId(event.target.value)}
                required
              >
                <option value="">Выберите студента</option>
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white disabled:opacity-60 lg:col-span-2 lg:justify-self-end"
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

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-3xl bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-violet-600" />
        </div>
      ) : materials.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => (
            <article
              key={material.id}
              className="flex flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <KindIcon kind={material.kind} />
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {kindLabels[material.kind]}
                </span>
              </div>
              <h2 className="mt-5 text-lg font-bold text-slate-900">
                {material.title}
              </h2>
              <p className="mt-1 text-sm font-medium text-violet-600">
                {role === 'tutor' ? material.studentName : material.tutorName}
              </p>
              <p className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-6 text-slate-500">
                {material.description || 'Без дополнительного комментария.'}
              </p>
              <div className="mt-5 flex gap-2">
                {material.url && (
                  <a
                    href={material.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    Открыть
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
                {role === 'tutor' && (
                  <button
                    type="button"
                    onClick={() => void remove(material)}
                    disabled={deletingId === material.id}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-red-200 text-red-600 disabled:opacity-60"
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
          ))}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-violet-300 bg-violet-50 p-10 text-center">
          <FolderOpen className="mx-auto h-11 w-11 text-violet-600" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">
            Материалов пока нет
          </h2>
          <p className="mt-2 text-slate-500">
            {role === 'tutor'
              ? 'Добавьте первый материал для одного из студентов.'
              : 'Репетитор сможет отправить их после подтверждения занятия.'}
          </p>
        </div>
      )}
    </div>
  )
}
