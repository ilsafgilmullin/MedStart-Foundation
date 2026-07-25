'use client'

import { useCallback, useEffect, useState } from 'react'
import { BadgeCheck, ShieldAlert, UserCheck, UserX } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { approveTutor, getPendingTutors, rejectTutor } from '@/lib/admin'
import type { UserProfile } from '@/lib/user-profile'

export default function AdminPage() {
  const { role } = useAuth()
  const [tutors, setTutors] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [processingUid, setProcessingUid] = useState('')
  const [error, setError] = useState('')

  const allowed = role === 'admin' || role === 'owner'

  const loadTutors = useCallback(async () => {
    if (!allowed) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError('')
      setTutors(await getPendingTutors())
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось загрузить анкеты на модерацию.',
      )
    } finally {
      setLoading(false)
    }
  }, [allowed])

  useEffect(() => {
    void loadTutors()
  }, [loadTutors])

  async function moderate(uid: string, action: 'approve' | 'reject') {
    try {
      setProcessingUid(uid)
      setError('')
      if (action === 'approve') await approveTutor(uid)
      else await rejectTutor(uid)
      setTutors((current) => current.filter((item) => item.uid !== uid))
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось изменить статус анкеты.',
      )
    } finally {
      setProcessingUid('')
    }
  }

  if (!allowed) {
    return (
      <section className="rounded-[32px] border border-red-200 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">
          Доступ запрещён
        </h1>
        <p className="mt-3 text-slate-500">
          Этот раздел доступен только администратору платформы.
        </p>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Модерация</h1>
        <p className="mt-2 text-slate-500">
          Проверяйте анкеты перед публикацией в каталоге.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}

      {loading && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-500">
          Загружаем анкеты…
        </div>
      )}

      {!loading && tutors.length === 0 && (
        <section className="rounded-[32px] border border-dashed border-emerald-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-700">
            <BadgeCheck className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-slate-900">
            Новых анкет нет
          </h2>
          <p className="mt-3 text-slate-500">
            Все текущие заявки репетиторов обработаны.
          </p>
        </section>
      )}

      {!loading && tutors.length > 0 && (
        <div className="space-y-4">
          {tutors.map((tutor) => {
            const processing = processingUid === tutor.uid

            return (
              <article
                key={tutor.uid}
                className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">
                      {tutor.displayName || tutor.email}
                    </h2>
                    <p className="mt-1 font-medium text-violet-700">
                      {tutor.specialization || 'Специализация не указана'}
                    </p>
                    <p className="mt-2 text-sm text-slate-500">{tutor.email}</p>
                    {tutor.institution && (
                      <p className="mt-2 text-sm text-slate-500">
                        {tutor.institution}
                      </p>
                    )}
                    {tutor.bio && (
                      <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-6 text-slate-600">
                        {tutor.bio}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => moderate(tutor.uid, 'approve')}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-60"
                    >
                      <UserCheck className="h-4 w-4" />
                      Одобрить
                    </button>
                    <button
                      type="button"
                      disabled={processing}
                      onClick={() => moderate(tutor.uid, 'reject')}
                      className="inline-flex items-center gap-2 rounded-2xl border border-red-200 px-5 py-3 font-semibold text-red-600 disabled:opacity-60"
                    >
                      <UserX className="h-4 w-4" />
                      Отклонить
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
