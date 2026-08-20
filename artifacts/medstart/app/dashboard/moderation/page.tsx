'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  X,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { downloadKnowledgePdf } from '@/lib/knowledge-upload'
import {
  fetchModerationOverview,
  moderateKnowledge,
  moderateTutor,
  type ModerationKnowledgeRecord,
  type ModerationOverview,
  type ModerationTutorRecord,
  type TutorModerationDecision,
} from '@/lib/moderation-control'
import {
  KNOWLEDGE_DISCIPLINE_LABELS,
  KNOWLEDGE_KIND_LABELS,
} from '@/lib/official-library'
import { LEARNER_TRACK_LABELS, SCHOOL_EXAM_LABELS } from '@/lib/education'

type Tab = 'tutors' | 'knowledge'

type PendingAction =
  | {
      kind: 'tutor'
      tutor: ModerationTutorRecord
      decision: TutorModerationDecision
    }
  | {
      kind: 'knowledge'
      item: ModerationKnowledgeRecord
      decision: 'approve' | 'reject'
    }

const statusLabel: Record<ModerationTutorRecord['status'], string> = {
  pending: 'На проверке',
  active: 'Активен',
  rejected: 'Отклонён',
  suspended: 'Приостановлен',
}

const statusTone: Record<ModerationTutorRecord['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  suspended: 'bg-slate-200 text-slate-800',
}

function actionNeedsReason(action: PendingAction | null) {
  return Boolean(
    action &&
      ((action.kind === 'tutor' &&
        (action.decision === 'reject' || action.decision === 'suspend')) ||
        (action.kind === 'knowledge' && action.decision === 'reject')),
  )
}

function actionTitle(action: PendingAction) {
  if (action.kind === 'knowledge') {
    return action.decision === 'approve'
      ? 'Одобрить учебный материал?'
      : 'Отклонить учебный материал?'
  }
  if (action.decision === 'approve') return 'Одобрить репетитора?'
  if (action.decision === 'reject') return 'Отклонить анкету?'
  if (action.decision === 'suspend') return 'Приостановить репетитора?'
  return 'Вернуть репетитора в каталог?'
}

export default function ModerationPage() {
  const { role } = useAuth()
  const allowed = role === 'owner' || role === 'admin' || role === 'moderator'
  const [overview, setOverview] = useState<ModerationOverview | null>(null)
  const [tab, setTab] = useState<Tab>('tutors')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [downloadingId, setDownloadingId] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async (silent = false) => {
    if (!allowed) {
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    setError('')
    try {
      setOverview(await fetchModerationOverview())
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось загрузить очередь модерации.',
      )
    } finally {
      if (!silent) setLoading(false)
    }
  }, [allowed])

  useEffect(() => {
    void load()
  }, [load])

  const tutors = useMemo(() => overview?.tutors || [], [overview?.tutors])
  const knowledge = useMemo(
    () => overview?.knowledge || [],
    [overview?.knowledge],
  )

  if (!allowed) {
    return (
      <section className="rounded-[30px] border border-red-200 bg-red-50 p-6 text-red-800 sm:p-8">
        <div className="flex items-start gap-4">
          <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0" />
          <div>
            <h1 className="text-xl font-black">Доступ запрещён</h1>
            <p className="mt-2 text-sm leading-6">
              Этот раздел доступен только владельцу, администратору и назначенному модератору MedStart.
            </p>
          </div>
        </div>
      </section>
    )
  }

  async function execute() {
    if (!pendingAction) return
    const needsReason = actionNeedsReason(pendingAction)
    if (needsReason && reason.trim().length < 3) {
      setError('Укажите причину решения минимум из трёх символов.')
      return
    }

    setBusy(true)
    setError('')
    setMessage('')
    try {
      if (pendingAction.kind === 'tutor') {
        const result = await moderateTutor({
          targetUid: pendingAction.tutor.uid,
          decision: pendingAction.decision,
          note: reason.trim(),
        })
        setMessage(result.message || 'Решение по репетитору сохранено.')
      } else {
        const result = await moderateKnowledge({
          submissionId: pendingAction.item.id,
          decision: pendingAction.decision,
          note: reason.trim(),
        })
        setMessage(result.message || 'Решение по материалу сохранено.')
      }
      setPendingAction(null)
      setReason('')
      await load(true)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Операция не выполнена.')
    } finally {
      setBusy(false)
    }
  }

  async function download(item: ModerationKnowledgeRecord) {
    if (!item.filePath) return
    setDownloadingId(item.id)
    setError('')
    try {
      await downloadKnowledgePdf(item.filePath, item.fileName)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'PDF недоступен.')
    } finally {
      setDownloadingId('')
    }
  }

  return (
    <div className="space-y-6">
      <header className="overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.13em] ring-1 ring-white/15">
              <ShieldCheck className="h-4 w-4 text-cyan-200" />
              Контур модерации
            </span>
            <h1 className="mt-5 text-3xl font-black sm:text-4xl">Модерация MedStart</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-teal-50/85 sm:text-base">
              Проверка репетиторов и учебных материалов без доступа к паролям, сессиям, переписке и управлению занятиями.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading || busy}
            className="ms-btn ms-btn-white shrink-0"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            Обновить
          </button>
        </div>
      </header>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}
      {message && (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">{message}</p>
        </div>
      )}

      {overview && (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ['Анкеты на проверке', overview.stats.pendingTutors, Clock3],
            ['Активные репетиторы', overview.stats.activeTutors, UserCheck],
            ['Приостановлены', overview.stats.suspendedTutors, Stethoscope],
            ['Материалы на проверке', overview.stats.pendingKnowledge, BookOpenCheck],
          ].map(([label, value, Icon]) => (
            <article key={String(label)} className="rounded-[26px] border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="h-5 w-5 text-teal-700" />
              <p className="mt-4 text-3xl font-black text-slate-950">{String(value)}</p>
              <p className="mt-1 text-sm font-bold text-slate-500">{String(label)}</p>
            </article>
          ))}
        </section>
      )}

      <nav className="grid grid-cols-2 gap-2 rounded-[24px] border border-slate-200 bg-white p-2 shadow-sm">
        <button
          type="button"
          onClick={() => setTab('tutors')}
          aria-pressed={tab === 'tutors'}
          className="ms-choice ms-choice-pill justify-center"
        >
          <Stethoscope className="h-4 w-4" />
          Репетиторы
        </button>
        <button
          type="button"
          onClick={() => setTab('knowledge')}
          aria-pressed={tab === 'knowledge'}
          className="ms-choice ms-choice-pill justify-center"
        >
          <FileCheck2 className="h-4 w-4" />
          Материалы
        </button>
      </nav>

      {loading || !overview ? (
        <div className="flex min-h-72 items-center justify-center rounded-[30px] border border-slate-200 bg-white">
          <LoaderCircle className="h-9 w-9 animate-spin text-teal-700" />
        </div>
      ) : tab === 'tutors' ? (
        <TutorQueue tutors={tutors} onAction={setPendingAction} />
      ) : (
        <KnowledgeQueue
          items={knowledge}
          downloadingId={downloadingId}
          onDownload={(item) => void download(item)}
          onAction={setPendingAction}
        />
      )}

      {pendingAction && (
        <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:items-center sm:p-6">
          <section className="w-full max-w-lg rounded-[30px] bg-white p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">{actionTitle(pendingAction)}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Действие будет выполнено сервером и записано в журнал административных действий.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !busy && setPendingAction(null)}
                disabled={busy}
                className="ms-icon-btn ms-icon-btn-neutral shrink-0"
                aria-label="Закрыть подтверждение"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {actionNeedsReason(pendingAction) && (
              <label className="mt-5 block text-sm font-black text-slate-700">
                Причина
                <textarea
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  rows={4}
                  maxLength={1000}
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                  placeholder="Кратко укажите основание решения"
                  autoFocus
                />
              </label>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                disabled={busy}
                className="ms-btn ms-btn-secondary"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={() => void execute()}
                disabled={busy || (actionNeedsReason(pendingAction) && reason.trim().length < 3)}
                className="ms-btn ms-btn-primary"
              >
                {busy ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                Подтвердить
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function TutorQueue({
  tutors,
  onAction,
}: {
  tutors: ModerationTutorRecord[]
  onAction: (action: PendingAction) => void
}) {
  if (!tutors.length) {
    return (
      <div className="rounded-[30px] border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-700" />
        <h2 className="mt-4 text-xl font-black text-slate-950">Репетиторов для проверки нет</h2>
      </div>
    )
  }

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      {tutors.map((tutor) => (
        <article key={tutor.uid} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-black text-slate-950">{tutor.displayName}</h2>
                <span className={`rounded-full px-2.5 py-1 text-xs font-black ${statusTone[tutor.status]}`}>
                  {statusLabel[tutor.status]}
                </span>
              </div>
              <p className="mt-2 text-sm font-bold text-teal-800">{tutor.specialization || 'Специализация не указана'}</p>
              <p className="mt-1 text-sm text-slate-500">{tutor.institution || 'Учреждение не указано'}{tutor.city ? ` · ${tutor.city}` : ''}</p>
            </div>
            <Stethoscope className="h-6 w-6 shrink-0 text-teal-700" />
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Аудитория</p>
              <p className="mt-1 font-bold text-slate-800">
                {tutor.tutorAudiences.map((value) => LEARNER_TRACK_LABELS[value]).join(', ') || 'Не указана'}
              </p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Экзамены</p>
              <p className="mt-1 font-bold text-slate-800">
                {tutor.examTypes.map((value) => SCHOOL_EXAM_LABELS[value]).join(', ') || 'Не применимо'}
              </p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Предметы</p>
              <p className="mt-1 font-bold text-slate-800">{tutor.subjects.join(', ') || 'Не указаны'}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Подтверждение квалификации</p>
              <p className="mt-1 break-words font-bold text-slate-800">{tutor.qualificationReference || 'Не предоставлено'}</p>
            </div>
          </div>

          {tutor.moderationNote && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <span className="font-black">Последнее решение:</span> {tutor.moderationNote}
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {tutor.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={() => onAction({ kind: 'tutor', tutor, decision: 'approve' })}
                  className="ms-btn ms-btn-primary"
                >
                  <Check className="h-4 w-4" />Одобрить
                </button>
                <button
                  type="button"
                  onClick={() => onAction({ kind: 'tutor', tutor, decision: 'reject' })}
                  className="ms-btn ms-btn-danger-outline"
                >
                  <XCircle className="h-4 w-4" />Отклонить
                </button>
              </>
            )}
            {tutor.status === 'active' && (
              <button
                type="button"
                onClick={() => onAction({ kind: 'tutor', tutor, decision: 'suspend' })}
                className="ms-btn ms-btn-danger-outline sm:col-span-2"
              >
                <AlertTriangle className="h-4 w-4" />Приостановить публикацию
              </button>
            )}
            {tutor.status === 'suspended' && (
              <button
                type="button"
                onClick={() => onAction({ kind: 'tutor', tutor, decision: 'reinstate' })}
                className="ms-btn ms-btn-primary sm:col-span-2"
              >
                <UserCheck className="h-4 w-4" />Вернуть в каталог
              </button>
            )}
            {tutor.status === 'rejected' && (
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-sm font-bold text-slate-600 sm:col-span-2">
                Ожидается повторная отправка анкеты репетитором.
              </div>
            )}
          </div>
        </article>
      ))}
    </section>
  )
}

function KnowledgeQueue({
  items,
  downloadingId,
  onDownload,
  onAction,
}: {
  items: ModerationKnowledgeRecord[]
  downloadingId: string
  onDownload: (item: ModerationKnowledgeRecord) => void
  onAction: (action: PendingAction) => void
}) {
  if (!items.length) {
    return (
      <div className="rounded-[30px] border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center">
        <CheckCircle2 className="mx-auto h-11 w-11 text-emerald-700" />
        <h2 className="mt-4 text-xl font-black text-slate-950">Очередь материалов пуста</h2>
      </div>
    )
  }

  return (
    <section className="grid gap-5 xl:grid-cols-2">
      {items.map((item) => {
        const confirmationsReady =
          item.rightsConfirmed && item.medicalConfirmed && item.noPatientDataConfirmed
        return (
          <article key={item.id} className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">{item.title}</h2>
                <p className="mt-2 text-sm font-bold text-violet-700">{item.submittedByName}</p>
              </div>
              <FileCheck2 className="h-6 w-6 shrink-0 text-violet-700" />
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>

            <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Раздел</dt>
                <dd className="mt-1 font-bold text-slate-800">{KNOWLEDGE_DISCIPLINE_LABELS[item.discipline]}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Тип</dt>
                <dd className="mt-1 font-bold text-slate-800">{KNOWLEDGE_KIND_LABELS[item.kind]}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Автор</dt>
                <dd className="mt-1 font-bold text-slate-800">{item.author || 'Не указан'}</dd>
              </div>
              <div>
                <dt className="text-xs font-black uppercase tracking-[0.1em] text-slate-400">Безопасность</dt>
                <dd className="mt-1 font-bold text-slate-800">{item.securityStatus || 'Проверяется'}</dd>
              </div>
            </dl>

            <div className={`mt-4 rounded-2xl border p-4 text-sm ${confirmationsReady ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900'}`}>
              {confirmationsReady
                ? 'Автор подтвердил медицинскую направленность, права на публикацию и отсутствие данных пациентов.'
                : 'Не все обязательные подтверждения автора присутствуют.'}
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {item.sourceMode === 'file' ? (
                <button
                  type="button"
                  onClick={() => onDownload(item)}
                  disabled={!item.filePath || downloadingId === item.id}
                  className="ms-btn ms-btn-secondary"
                >
                  {downloadingId === item.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Проверить PDF
                </button>
              ) : (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ms-btn ms-btn-secondary"
                >
                  <ExternalLink className="h-4 w-4" />Проверить ссылку
                </a>
              )}
              <button
                type="button"
                onClick={() => onAction({ kind: 'knowledge', item, decision: 'approve' })}
                disabled={!confirmationsReady}
                className="ms-btn ms-btn-primary"
              >
                <Check className="h-4 w-4" />Одобрить
              </button>
              <button
                type="button"
                onClick={() => onAction({ kind: 'knowledge', item, decision: 'reject' })}
                className="ms-btn ms-btn-danger-outline sm:col-span-2"
              >
                <XCircle className="h-4 w-4" />Отклонить с причиной
              </button>
            </div>
          </article>
        )
      })}
    </section>
  )
}
