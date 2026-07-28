'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import {
  BookOpenCheck,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ClipboardPen,
  FolderOpen,
  GraduationCap,
  History,
  LoaderCircle,
  MessageCircle,
  Search,
  Sparkles,
  UserRoundCheck,
  UsersRound,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import { subscribeToBookingsForUser } from '@/lib/bookings'
import { subscribeToMaterialsForUser } from '@/lib/materials'
import {
  bookingDateTime,
  formatBookingDate,
  type Booking,
  type LearningMaterial,
} from '@/lib/domain'

interface StudentSummary {
  uid: string
  name: string
  avatar: string
  conversationId: string
  lessonsCount: number
  completedCount: number
  cancelledCount: number
  nextLesson: Booking | null
  lastLesson: Booking | null
  subjects: string[]
  materialsCount: number
  completedValue: number
}

type StudentFilter = 'all' | 'upcoming' | 'followup' | 'experienced'
type SortMode = 'activity' | 'name' | 'lessons'

const NOTE_KEY = 'medstart-tutor-student-notes-v1'

function readNotes(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  try {
    const value = JSON.parse(window.localStorage.getItem(NOTE_KEY) || '{}')
    return value && typeof value === 'object' ? value : {}
  } catch {
    return {}
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((item) => item.slice(0, 1))
    .join('')
    .toUpperCase()
}

export default function TutorStudentsPage() {
  const { user, role } = useAuth()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [materials, setMaterials] = useState<LearningMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<StudentFilter>('all')
  const [sort, setSort] = useState<SortMode>('activity')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [selected, setSelected] = useState<StudentSummary | null>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => setNotes(readNotes()), [])

  useEffect(() => {
    if (!user || role !== 'tutor') {
      setLoading(false)
      return
    }
    return subscribeToBookingsForUser(
      user.uid,
      role,
      (items) => {
        setBookings(
          items.filter(
            (item) =>
              item.status === 'accepted' ||
              item.status === 'completed' ||
              item.status === 'cancelled',
          ),
        )
        setLoading(false)
      },
      () => setLoading(false),
    )
  }, [user, role])

  useEffect(() => {
    if (!user || role !== 'tutor') return
    return subscribeToMaterialsForUser(user.uid, role, setMaterials, () => undefined)
  }, [user, role])

  const students = useMemo(() => {
    const map = new Map<string, StudentSummary>()
    for (const booking of bookings) {
      const current = map.get(booking.studentUid) ?? {
        uid: booking.studentUid,
        name: booking.studentName,
        avatar: booking.studentAvatar,
        conversationId: booking.conversationId,
        lessonsCount: 0,
        completedCount: 0,
        cancelledCount: 0,
        nextLesson: null,
        lastLesson: null,
        subjects: [],
        materialsCount: 0,
        completedValue: 0,
      }
      current.lessonsCount += 1
      if (!current.subjects.includes(booking.subject)) {
        current.subjects.push(booking.subject)
      }
      const date = bookingDateTime(booking)
      if (booking.status === 'completed') {
        current.completedCount += 1
        current.completedValue += Math.max(0, Number(booking.price) || 0)
        if (!current.lastLesson || date > bookingDateTime(current.lastLesson)) {
          current.lastLesson = booking
        }
      }
      if (booking.status === 'cancelled') current.cancelledCount += 1
      if (
        booking.status === 'accepted' &&
        date >= Date.now() &&
        (!current.nextLesson || date < bookingDateTime(current.nextLesson))
      ) {
        current.nextLesson = booking
      }
      map.set(booking.studentUid, current)
    }
    for (const material of materials) {
      const current = map.get(material.studentUid)
      if (current) current.materialsCount += 1
    }
    return [...map.values()]
  }, [bookings, materials])

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('ru-RU')
    const filtered = students.filter((student) => {
      const text = `${student.name} ${student.subjects.join(' ')}`.toLocaleLowerCase('ru-RU')
      const matchesFilter =
        filter === 'all' ||
        (filter === 'upcoming' && Boolean(student.nextLesson)) ||
        (filter === 'followup' && !student.nextLesson && student.completedCount > 0) ||
        (filter === 'experienced' && student.completedCount >= 3)
      return (!normalized || text.includes(normalized)) && matchesFilter
    })
    return filtered.sort((left, right) => {
      if (sort === 'name') return left.name.localeCompare(right.name, 'ru')
      if (sort === 'lessons') return right.completedCount - left.completedCount
      const leftDate = left.nextLesson
        ? bookingDateTime(left.nextLesson)
        : left.lastLesson
          ? bookingDateTime(left.lastLesson)
          : 0
      const rightDate = right.nextLesson
        ? bookingDateTime(right.nextLesson)
        : right.lastLesson
          ? bookingDateTime(right.lastLesson)
          : 0
      return rightDate - leftDate
    })
  }, [filter, query, sort, students])

  const upcomingCount = students.filter((item) => item.nextLesson).length
  const followupCount = students.filter(
    (item) => !item.nextLesson && item.completedCount > 0,
  ).length
  const totalCompleted = students.reduce(
    (sum, item) => sum + item.completedCount,
    0,
  )
  const totalMaterials = students.reduce(
    (sum, item) => sum + item.materialsCount,
    0,
  )

  function openNote(student: StudentSummary) {
    setSelected(student)
    setNoteDraft(notes[student.uid] || '')
    setMessage('')
    window.setTimeout(() => {
      document.getElementById('student-note')?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }, 0)
  }

  function saveNote() {
    if (!selected) return
    const next = { ...notes, [selected.uid]: noteDraft.trim() }
    if (!noteDraft.trim()) delete next[selected.uid]
    setNotes(next)
    window.localStorage.setItem(NOTE_KEY, JSON.stringify(next))
    setMessage('Личная методическая заметка сохранена на этом устройстве.')
    setSelected(null)
  }

  if (role !== 'tutor') {
    return (
      <div className="rounded-3xl border border-amber-200 bg-amber-50 p-8 text-amber-800">
        Этот раздел доступен только репетиторам.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold ring-1 ring-white/15">
              <GraduationCap className="h-4 w-4 text-cyan-200" />
              Учебные отношения
            </span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Мои студенты</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-50/80 sm:text-base">
              История занятий, текущие дисциплины, материалы и следующий шаг
              по каждому студенту — в одном рабочем пространстве.
            </p>
          </div>
          <div className="rounded-2xl border border-white/15 bg-white/10 p-4">
            <p className="text-sm font-bold">Активная база</p>
            <p className="mt-1 text-3xl font-black text-cyan-100">{students.length}</p>
            <p className="mt-1 text-xs text-teal-50/70">
              С ближайшим занятием: {upcomingCount}
            </p>
          </div>
        </div>
      </header>

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          <p className="text-sm font-medium">{message}</p>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Всего студентов', students.length, UsersRound, 'bg-teal-50 text-teal-700'],
          ['Ближайшие занятия', upcomingCount, CalendarCheck2, 'bg-sky-50 text-sky-700'],
          ['Нужен следующий шаг', followupCount, UserRoundCheck, 'bg-amber-50 text-amber-700'],
          ['Материалов отправлено', totalMaterials, BookOpenCheck, 'bg-violet-50 text-violet-700'],
        ].map(([title, value, Icon, tone]) => {
          const IconComponent = Icon as typeof UsersRound
          return (
            <article key={String(title)} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{String(title)}</p>
                  <p className="mt-2 text-3xl font-black text-slate-950">{String(value)}</p>
                </div>
                <span className={`rounded-2xl p-3 ${String(tone)}`}>
                  <IconComponent className="h-5 w-5" />
                </span>
              </div>
            </article>
          )
        })}
      </section>

      {selected && (
        <section id="student-note" className="rounded-[28px] border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.12em] text-teal-700">
                Личная заметка преподавателя
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">{selected.name}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Зафиксируйте темы для повторения, план следующего занятия или
                особенности объяснения. Заметка хранится только на этом устройстве.
              </p>
            </div>
            <button type="button" onClick={() => setSelected(null)} className="ms-icon-btn ms-icon-btn-neutral" aria-label="Закрыть">
              <X className="h-5 w-5" />
            </button>
          </div>
          <textarea
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.target.value)}
            maxLength={2000}
            className="mt-5 min-h-36 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            placeholder="Например: повторить проводящую систему сердца, проверить домашнее задание…"
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setSelected(null)} className="ms-btn ms-btn-secondary">Отмена</button>
            <button type="button" onClick={saveNote} className="ms-btn ms-btn-primary">
              <ClipboardPen className="h-5 w-5" />
              Сохранить заметку
            </button>
          </div>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_190px]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Имя студента или дисциплина"
              className="w-full rounded-2xl border border-slate-200 py-3 pl-12 pr-4 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
            />
          </label>
          <select value={filter} onChange={(event) => setFilter(event.target.value as StudentFilter)} className="rounded-2xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
            <option value="all">Все студенты</option>
            <option value="upcoming">Есть занятие</option>
            <option value="followup">Нужен следующий шаг</option>
            <option value="experienced">3+ занятий</option>
          </select>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} className="rounded-2xl border border-slate-200 px-4 py-3 font-medium outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100">
            <option value="activity">По активности</option>
            <option value="lessons">По числу занятий</option>
            <option value="name">По имени</option>
          </select>
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-48 items-center justify-center rounded-3xl bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-teal-700" />
        </div>
      ) : visible.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((student) => {
            const completionRate = student.lessonsCount
              ? Math.round((student.completedCount / student.lessonsCount) * 100)
              : 0
            const currentBooking = student.nextLesson ?? student.lastLesson
            return (
              <article key={student.uid} className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <div className="flex items-center gap-4">
                  {student.avatar ? (
                    <ProfilePhoto src={student.avatar} size={56} className="h-14 w-14 rounded-2xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 font-black text-teal-700 ring-1 ring-teal-100">
                      {initials(student.name) || 'MS'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-black text-slate-950">{student.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {student.completedCount} завершено · {student.materialsCount} материалов
                    </p>
                  </div>
                  {notes[student.uid] && (
                    <span title="Есть личная заметка" className="rounded-full bg-amber-50 p-2 text-amber-700">
                      <ClipboardPen className="h-4 w-4" />
                    </span>
                  )}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {student.subjects.slice(0, 3).map((subjectName) => (
                    <span key={subjectName} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                      {subjectName}
                    </span>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.11em] text-slate-400">
                      {student.nextLesson ? 'Ближайшее занятие' : 'Последнее занятие'}
                    </p>
                    <span className="text-xs font-black text-teal-700">{completionRate}% завершено</span>
                  </div>
                  {currentBooking ? (
                    <>
                      <p className="mt-2 font-bold text-slate-900">{currentBooking.subject}</p>
                      <p className="mt-1 text-sm text-slate-500">{formatBookingDate(currentBooking)}</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-500">Данных пока нет.</p>
                  )}
                </div>

                {!student.nextLesson && student.completedCount > 0 && (
                  <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>Нет следующего занятия — можно предложить продолжение.</span>
                  </div>
                )}

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link href={`/dashboard/messages?conversation=${student.conversationId}`} className="ms-btn ms-btn-primary ms-btn-sm">
                    <MessageCircle className="h-4 w-4" />
                    Написать
                  </Link>
                  <Link href={`/dashboard/materials?student=${student.uid}`} className="ms-btn ms-btn-secondary ms-btn-sm">
                    <FolderOpen className="h-4 w-4" />
                    Материал
                  </Link>
                  <button type="button" onClick={() => openNote(student)} className="ms-btn ms-btn-soft ms-btn-sm col-span-2">
                    <ClipboardPen className="h-4 w-4" />
                    {notes[student.uid] ? 'Открыть заметку' : 'Добавить заметку'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <div className="rounded-[28px] border border-dashed border-teal-300 bg-teal-50 p-10 text-center">
          <UsersRound className="mx-auto h-11 w-11 text-teal-700" />
          <h2 className="mt-4 text-xl font-black text-slate-950">
            {students.length ? 'По выбранным условиям студентов нет' : 'Студентов пока нет'}
          </h2>
          <p className="mt-2 text-slate-500">
            {students.length
              ? 'Измените поиск или фильтр.'
              : 'После принятия первой заявки студент появится здесь.'}
          </p>
          {students.length ? (
            <button type="button" onClick={() => { setQuery(''); setFilter('all') }} className="mt-5 ms-btn ms-btn-secondary">
              Сбросить фильтры
            </button>
          ) : (
            <Link href="/dashboard/requests" className="mt-6 ms-btn ms-btn-primary">
              <CalendarDays className="h-5 w-5" />
              Проверить заявки
            </Link>
          )}
        </div>
      )}

      {students.length > 0 && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-teal-700">Практика преподавания</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">
                Проведено занятий: {totalCompleted}
              </h2>
              <p className="mt-2 text-sm text-slate-500">
                Используйте историю студентов, чтобы планировать повторение и выдавать материалы последовательно.
              </p>
            </div>
            <Link href="/dashboard/schedule" className="ms-btn ms-btn-secondary shrink-0">
              <History className="h-5 w-5" />
              История занятий
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
