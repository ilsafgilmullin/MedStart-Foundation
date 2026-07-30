'use client'

import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  BookMarked,
  BookOpenCheck,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Clock3,
  Download,
  ExternalLink,
  FileCheck2,
  FileText,
  GraduationCap,
  Heart,
  LibraryBig,
  Link2,
  LoaderCircle,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  Stethoscope,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { SCHOOL_EXAM_LABELS, learnerTrackFor } from '@/lib/education'
import {
  createKnowledgeSubmission,
  createKnowledgeSubmissionId,
  deleteKnowledgeSubmission,
  moderateKnowledgeSubmission,
  setKnowledgeBookmark,
  subscribeToKnowledgeBookmarks,
  subscribeToKnowledgeModeration,
  subscribeToPublishedKnowledge,
  subscribeToTutorKnowledge,
  type KnowledgeModerationDecision,
} from '@/lib/knowledge-base'
import {
  KNOWLEDGE_DISCIPLINE_LABELS,
  KNOWLEDGE_KIND_LABELS,
  KNOWLEDGE_LEVEL_LABELS,
  OFFICIAL_KNOWLEDGE_RESOURCES,
} from '@/lib/official-library'
import type {
  KnowledgeDiscipline,
  KnowledgeLevel,
  KnowledgeResourceKind,
  KnowledgeSourceMode,
  KnowledgeSubmission,
  KnowledgeSubmissionStatus,
  OfficialKnowledgeResource,
} from '@/lib/domain'

type CatalogItem = OfficialKnowledgeResource | KnowledgeSubmission
type PageTab = 'catalog' | 'favorites' | 'my' | 'moderation'

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100'

const statusLabels: Record<KnowledgeSubmissionStatus, string> = {
  pending: 'На проверке',
  published: 'Опубликован',
  rejected: 'Отклонён',
}

const statusClasses: Record<KnowledgeSubmissionStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
}

const kindOptions = Object.entries(KNOWLEDGE_KIND_LABELS) as Array<
  [KnowledgeResourceKind, string]
>
const disciplineOptions = Object.entries(KNOWLEDGE_DISCIPLINE_LABELS) as Array<
  [KnowledgeDiscipline, string]
>
const levelOptions = Object.entries(KNOWLEDGE_LEVEL_LABELS) as Array<
  [KnowledgeLevel, string]
>

function normalized(value: string) {
  return value
    .toLocaleLowerCase('ru-RU')
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
    .trim()
}

function itemSearchText(item: CatalogItem) {
  if (item.origin === 'official') {
    return normalized(
      [
        item.title,
        item.description,
        item.author,
        item.sourceName,
        item.publicationLabel,
        ...item.tags,
      ].join(' '),
    )
  }
  return normalized(
    [
      item.title,
      item.description,
      item.author,
      item.submittedByName,
      item.publicationYear,
    ].join(' '),
  )
}

function KindIcon({
  kind,
  className = 'h-5 w-5',
}: {
  kind: KnowledgeResourceKind
  className?: string
}) {
  const Icon =
    kind === 'book'
      ? LibraryBig
      : kind === 'clinical_guideline'
        ? Stethoscope
        : kind === 'checklist'
          ? FileCheck2
          : kind === 'video'
            ? GraduationCap
            : FileText
  return <Icon className={className} />
}

function TrustBadge({ item }: { item: CatalogItem }) {
  if (item.origin === 'official') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-700">
        <ShieldCheck className="h-3.5 w-3.5" />
        Официальный источник
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-bold text-violet-700">
      <BadgeCheck className="h-3.5 w-3.5" />
      Проверено MedStart
    </span>
  )
}

function ErrorNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{children}</p>
    </div>
  )
}

function SuccessNotice({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm font-medium">{children}</p>
    </div>
  )
}

interface ResourceCardProps {
  item: CatalogItem
  favorite: boolean
  onFavorite: (item: CatalogItem) => void
  onDownload: (item: KnowledgeSubmission) => void
  downloading: boolean
}

function ResourceCard({
  item,
  favorite,
  onFavorite,
  onDownload,
  downloading,
}: ResourceCardProps) {
  const isOfficial = item.origin === 'official'
  const sourceName = isOfficial ? item.sourceName : item.submittedByName
  const publication = isOfficial
    ? item.publicationLabel
    : item.publicationYear || 'Год не указан'
  const isFile = !isOfficial && item.sourceMode === 'file'

  return (
    <article className="group flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
          <KindIcon kind={item.kind} />
        </div>
        <button
          type="button"
          onClick={() => onFavorite(item)}
          aria-pressed={favorite}
          className={`ms-icon-btn ${favorite ? 'ms-icon-btn-danger' : 'ms-icon-btn-neutral'}`}
          aria-label={
            favorite ? 'Убрать из избранного' : 'Добавить в избранное'
          }
        >
          <Heart className={`h-5 w-5 ${favorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <TrustBadge item={item} />
        {isOfficial && item.language === 'en' && (
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
            Английский
          </span>
        )}
      </div>

      <h2 className="mt-4 text-xl font-bold leading-7 text-slate-900">
        {item.title}
      </h2>
      <p className="mt-3 line-clamp-4 flex-1 text-sm leading-6 text-slate-600">
        {item.description}
      </p>

      <dl className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Раздел</dt>
          <dd className="text-right font-medium text-slate-700">
            {KNOWLEDGE_DISCIPLINE_LABELS[item.discipline]}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Тип</dt>
          <dd className="text-right font-medium text-slate-700">
            {KNOWLEDGE_KIND_LABELS[item.kind]}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Источник</dt>
          <dd className="text-right font-medium text-slate-700">
            {sourceName}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-slate-400">Версия</dt>
          <dd className="text-right font-medium text-slate-700">
            {publication}
          </dd>
        </div>
      </dl>

      {isOfficial && (
        <p className="mt-4 text-xs leading-5 text-slate-400">
          Источник проверен MedStart:{' '}
          {item.verifiedAt.split('-').reverse().join('.')}
        </p>
      )}

      {isFile ? (
        <button
          type="button"
          onClick={() => onDownload(item)}
          disabled={downloading}
          className="mt-5 ms-btn ms-btn-primary ms-btn-block disabled:opacity-60"
        >
          {downloading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Скачать PDF
        </button>
      ) : (
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 ms-btn ms-btn-primary ms-btn-block"
        >
          <ExternalLink className="h-4 w-4" />
          Открыть источник
        </a>
      )}
    </article>
  )
}

interface SubmissionFormProps {
  onClose: () => void
  onCreated: (message: string) => void
}

function SubmissionForm({ onClose, onCreated }: SubmissionFormProps) {
  const { user, profile } = useAuth()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [kind, setKind] = useState<KnowledgeResourceKind>('clinical_guideline')
  const [discipline, setDiscipline] = useState<KnowledgeDiscipline>('general')
  const [level, setLevel] = useState<KnowledgeLevel>('university')
  const [author, setAuthor] = useState('')
  const [publicationYear, setPublicationYear] = useState('')
  const [sourceMode, setSourceMode] = useState<KnowledgeSourceMode>('file')
  const [sourceUrl, setSourceUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [medicalConfirmed, setMedicalConfirmed] = useState(false)
  const [rightsConfirmed, setRightsConfirmed] = useState(false)
  const [noPatientDataConfirmed, setNoPatientDataConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !profile) return
    if (!medicalConfirmed || !rightsConfirmed || !noPatientDataConfirmed) {
      setError('Подтвердите все требования перед отправкой.')
      return
    }
    if (sourceMode === 'file' && !file) {
      setError('Выберите PDF-файл.')
      return
    }

    setSaving(true)
    setError('')
    const id = createKnowledgeSubmissionId()
    let uploadedPath = ''

    try {
      let uploadedName = ''
      if (sourceMode === 'file' && file) {
        const { uploadKnowledgePdf } = await import('@/lib/knowledge-upload')
        const uploaded = await uploadKnowledgePdf(user.uid, id, file)
        uploadedPath = uploaded.filePath
        uploadedName = uploaded.fileName
      }

      await createKnowledgeSubmission({
        id,
        title,
        description,
        kind,
        discipline,
        level,
        author,
        publicationYear,
        sourceMode,
        sourceUrl,
        filePath: uploadedPath,
        fileName: uploadedName,
        fileSize: sourceMode === 'file' && file ? file.size : 0,
        mimeType: sourceMode === 'file' ? 'application/pdf' : '',
        submittedByUid: user.uid,
        submittedByName: profile.displayName,
      })
      onCreated(
        'Материал отправлен на проверку. До одобрения его видите только вы и администрация.',
      )
      onClose()
    } catch (caught) {
      if (uploadedPath) {
        try {
          const { removeKnowledgePdf } = await import('@/lib/knowledge-upload')
          await removeKnowledgePdf(uploadedPath)
        } catch {
          // The unpublished orphan remains private and can be cleaned by an admin job.
        }
      }
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось отправить материал.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-[30px] border border-violet-200 bg-white p-5 shadow-lg sm:p-7">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            Предложить материал
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Принимаются только медицинские и фармацевтические материалы без
            данных пациентов. PDF или ссылка появятся в общей базе после ручной
            проверки.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="ms-icon-btn ms-icon-btn-neutral"
          aria-label="Закрыть форму"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mt-5">
          <ErrorNotice>{error}</ErrorNotice>
        </div>
      )}

      <form onSubmit={submit} className="mt-6 grid gap-5 lg:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold text-slate-700 lg:col-span-2">
          Название
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={180}
            className={inputClass}
            placeholder="Например: Алгоритм базовой сердечно-лёгочной реанимации"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Раздел
          <span className="relative block">
            <select
              value={discipline}
              onChange={(event) =>
                setDiscipline(event.target.value as KnowledgeDiscipline)
              }
              className={`${inputClass} appearance-none pr-11`}
            >
              {disciplineOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </span>
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Тип
          <span className="relative block">
            <select
              value={kind}
              onChange={(event) =>
                setKind(event.target.value as KnowledgeResourceKind)
              }
              className={`${inputClass} appearance-none pr-11`}
            >
              {kindOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </span>
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Уровень
          <span className="relative block">
            <select
              value={level}
              onChange={(event) =>
                setLevel(event.target.value as KnowledgeLevel)
              }
              className={`${inputClass} appearance-none pr-11`}
            >
              {levelOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </span>
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Автор или организация
          <input
            value={author}
            onChange={(event) => setAuthor(event.target.value)}
            maxLength={160}
            className={inputClass}
            placeholder="ФИО автора или название организации"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700 lg:col-span-2">
          Описание и учебная польза
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={4_000}
            rows={4}
            className={`${inputClass} resize-y`}
            placeholder="Что находится внутри, для кого предназначено и на каких источниках основано?"
            required
          />
        </label>

        <label className="space-y-2 text-sm font-semibold text-slate-700">
          Год или редакция
          <input
            value={publicationYear}
            onChange={(event) => setPublicationYear(event.target.value)}
            maxLength={20}
            className={inputClass}
            placeholder="Например: 2026 или 3-е издание"
          />
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold text-slate-700">
            Способ добавления
          </legend>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1.5">
            <button
              type="button"
              onClick={() => setSourceMode('file')}
              aria-pressed={sourceMode === 'file'}
              className="ms-choice ms-choice-block"
            >
              <Upload className="h-4 w-4" />
              PDF-файл
            </button>
            <button
              type="button"
              onClick={() => setSourceMode('link')}
              aria-pressed={sourceMode === 'link'}
              className="ms-choice ms-choice-block"
            >
              <Link2 className="h-4 w-4" />
              Ссылка
            </button>
          </div>
        </fieldset>

        {sourceMode === 'file' ? (
          <label className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/60 p-5 lg:col-span-2">
            <span className="flex items-center gap-3">
              <span className="rounded-xl bg-white p-2 text-violet-700">
                <Upload className="h-5 w-5" />
              </span>
              <span>
                <span className="block text-sm font-bold text-slate-800">
                  {file ? file.name : 'Выберите PDF-файл'}
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  Только PDF, до 25 МБ. Файл скачивается, а не запускается на
                  странице.
                </span>
              </span>
            </span>
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-teal-700 file:px-4 file:py-2.5 file:font-semibold file:text-white hover:file:bg-teal-800"
              required
            />
          </label>
        ) : (
          <label className="space-y-2 text-sm font-semibold text-slate-700 lg:col-span-2">
            HTTPS-ссылка на материал
            <input
              type="url"
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              maxLength={2_000}
              className={inputClass}
              placeholder="https://..."
              required
            />
          </label>
        )}

        <fieldset className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 lg:col-span-2">
          <legend className="px-2 text-sm font-bold text-amber-900">
            Обязательные подтверждения
          </legend>
          <Confirmation
            checked={medicalConfirmed}
            onChange={setMedicalConfirmed}
          >
            Материал относится только к медицине, фармации или медицинскому
            образованию.
          </Confirmation>
          <Confirmation checked={rightsConfirmed} onChange={setRightsConfirmed}>
            Я автор материала либо имею право предложить его для публикации.
          </Confirmation>
          <Confirmation
            checked={noPatientDataConfirmed}
            onChange={setNoPatientDataConfirmed}
          >
            В материале нет ФИО, фотографий, документов и иных персональных
            данных пациентов.
          </Confirmation>
        </fieldset>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end lg:col-span-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="ms-btn ms-btn-secondary"
          >
            Отмена
          </button>
          <button
            disabled={saving}
            className="ms-btn ms-btn-primary disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <ShieldCheck className="h-5 w-5" />
            )}
            Отправить на проверку
          </button>
        </div>
      </form>
    </section>
  )
}

function Confirmation({
  checked,
  onChange,
  children,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-amber-950">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-amber-300 text-teal-700 focus:ring-teal-500"
        required
      />
      <span>{children}</span>
    </label>
  )
}

function OwnSubmissionCard({
  item,
  onOpen,
  onDelete,
  busy,
}: {
  item: KnowledgeSubmission
  onOpen: (item: KnowledgeSubmission) => void
  onDelete: (item: KnowledgeSubmission) => void
  busy: boolean
}) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-2xl bg-violet-100 p-3 text-violet-700">
            <KindIcon kind={item.kind} />
          </span>
          <div>
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusClasses[item.status]}`}
            >
              {statusLabels[item.status]}
            </span>
            <p className="mt-1 text-xs text-slate-400">
              {item.sourceMode === 'file' ? 'PDF-файл' : 'HTTPS-ссылка'}
            </p>
          </div>
        </div>
        {(item.status === 'pending' || item.status === 'rejected') && (
          <button
            type="button"
            onClick={() => onDelete(item)}
            disabled={busy}
            className="ms-icon-btn ms-icon-btn-danger ms-icon-btn-sm"
            aria-label="Удалить материал"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      <h3 className="mt-5 text-xl font-bold text-slate-900">{item.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        {item.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1.5">
          {KNOWLEDGE_DISCIPLINE_LABELS[item.discipline]}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5">
          {KNOWLEDGE_KIND_LABELS[item.kind]}
        </span>
      </div>

      {item.status === 'rejected' && item.moderationNote && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-bold">Причина отклонения</p>
          <p className="mt-1 whitespace-pre-wrap">{item.moderationNote}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => onOpen(item)}
        disabled={busy}
        className="mt-5 ms-link-action disabled:opacity-50"
      >
        {item.sourceMode === 'file' ? (
          <Download className="h-4 w-4" />
        ) : (
          <ExternalLink className="h-4 w-4" />
        )}
        {item.sourceMode === 'file' ? 'Скачать PDF' : 'Открыть ссылку'}
      </button>
    </article>
  )
}

function ModerationCard({
  item,
  busy,
  rejectionOpen,
  rejectionReason,
  onRejectionReason,
  onDecision,
  onOpen,
  onStartReject,
  onCancelReject,
}: {
  item: KnowledgeSubmission
  busy: boolean
  rejectionOpen: boolean
  rejectionReason: string
  onRejectionReason: (value: string) => void
  onDecision: (
    item: KnowledgeSubmission,
    decision: KnowledgeModerationDecision,
  ) => void
  onOpen: (item: KnowledgeSubmission) => void
  onStartReject: () => void
  onCancelReject: () => void
}) {
  return (
    <article className="rounded-[28px] border border-amber-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-700">
            <Clock3 className="h-3.5 w-3.5" />
            На проверке
          </span>
          <h3 className="mt-3 text-xl font-bold text-slate-900">
            {item.title}
          </h3>
          <p className="mt-1 text-sm font-semibold text-violet-700">
            {item.submittedByName}
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpen(item)}
          disabled={busy}
          className="ms-btn ms-btn-secondary ms-btn-sm"
        >
          {item.sourceMode === 'file' ? (
            <Download className="h-4 w-4" />
          ) : (
            <ExternalLink className="h-4 w-4" />
          )}
          Проверить источник
        </button>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {item.description}
      </p>

      <dl className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Раздел
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {KNOWLEDGE_DISCIPLINE_LABELS[item.discipline]}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Тип
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {KNOWLEDGE_KIND_LABELS[item.kind]}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Автор
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">{item.author}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-400">
            Год / редакция
          </dt>
          <dd className="mt-1 font-semibold text-slate-800">
            {item.publicationYear || 'Не указан'}
          </dd>
        </div>
      </dl>

      <div className="mt-4 grid gap-2 text-sm text-emerald-800 sm:grid-cols-3">
        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          Медицинская тематика
        </p>
        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          Права подтверждены
        </p>
        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          Нет данных пациентов
        </p>
      </div>

      {rejectionOpen ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
          <label className="text-sm font-bold text-red-800">
            Причина отклонения
            <textarea
              value={rejectionReason}
              onChange={(event) => onRejectionReason(event.target.value)}
              maxLength={1_000}
              rows={3}
              autoFocus
              className="mt-2 w-full resize-y rounded-xl border border-red-200 bg-white px-3 py-2 text-slate-800 outline-none focus:border-red-400 focus:ring-4 focus:ring-red-100"
              placeholder="Что нужно исправить или почему материал нельзя публиковать?"
            />
          </label>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => onDecision(item, 'reject')}
              disabled={busy}
              className="ms-btn ms-btn-danger ms-btn-sm flex-1"
            >
              {busy ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              Отклонить
            </button>
            <button
              type="button"
              onClick={onCancelReject}
              disabled={busy}
              className="ms-btn ms-btn-danger-outline ms-btn-sm"
            >
              Отмена
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onDecision(item, 'approve')}
            disabled={busy}
            className="ms-btn ms-btn-primary"
          >
            {busy ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Check className="h-5 w-5" />
            )}
            Опубликовать
          </button>
          <button
            type="button"
            onClick={onStartReject}
            disabled={busy}
            className="ms-btn ms-btn-danger-outline"
          >
            <XCircle className="h-5 w-5" />
            Отклонить
          </button>
        </div>
      )}
    </article>
  )
}

export default function KnowledgePage() {
  const { user, profile, role } = useAuth()
  const isTutor = role === 'tutor'
  const isModerator = role === 'admin' || role === 'owner'
  const isSchoolLearner =
    role === 'student' && learnerTrackFor(profile) === 'school'
  const [activeTab, setActiveTab] = useState<PageTab>('catalog')
  const [published, setPublished] = useState<KnowledgeSubmission[]>([])
  const [own, setOwn] = useState<KnowledgeSubmission[]>([])
  const [moderation, setModeration] = useState<KnowledgeSubmission[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [queryText, setQueryText] = useState('')
  const [discipline, setDiscipline] = useState<'all' | KnowledgeDiscipline>(
    'all',
  )
  const [kind, setKind] = useState<'all' | KnowledgeResourceKind>('all')
  const [level, setLevel] = useState<'all-filter' | KnowledgeLevel>(
    'all-filter',
  )
  const [formOpen, setFormOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [busyId, setBusyId] = useState('')
  const [rejectingId, setRejectingId] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    let settled = false
    const unsubscribe = subscribeToPublishedKnowledge(
      (items) => {
        setPublished(items)
        setLoading(false)
        settled = true
      },
      () => {
        setError(
          'Официальная база доступна, но публикации репетиторов загрузить не удалось. После обновления проекта нужно опубликовать новые правила Firebase.',
        )
        setLoading(false)
        settled = true
      },
    )
    const fallback = window.setTimeout(() => {
      if (!settled) setLoading(false)
    }, 8_000)
    return () => {
      unsubscribe()
      window.clearTimeout(fallback)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    return subscribeToKnowledgeBookmarks(
      user.uid,
      setFavoriteIds,
      () => undefined,
    )
  }, [user])

  useEffect(() => {
    if (!user || !isTutor) {
      setOwn([])
      return
    }
    return subscribeToTutorKnowledge(user.uid, setOwn, () =>
      setError('Не удалось загрузить ваши публикации.'),
    )
  }, [user, isTutor])

  useEffect(() => {
    if (!isModerator) {
      setModeration([])
      return
    }
    return subscribeToKnowledgeModeration(setModeration, () =>
      setError('Не удалось загрузить очередь модерации.'),
    )
  }, [isModerator])

  const catalog = useMemo<CatalogItem[]>(
    () =>
      isSchoolLearner
        ? OFFICIAL_KNOWLEDGE_RESOURCES.filter((item) =>
            item.tags.some((tag) => tag === 'ОГЭ' || tag === 'ЕГЭ'),
          )
        : [...OFFICIAL_KNOWLEDGE_RESOURCES, ...published],
    [isSchoolLearner, published],
  )

  const recommendedCatalog = useMemo(() => {
    if (role !== 'student') return []
    const interests = [
      ...(profile?.subjects || []),
      profile?.fieldOfStudy || '',
      profile?.studyYear || '',
      profile?.schoolExam ? SCHOOL_EXAM_LABELS[profile.schoolExam] : '',
    ]
      .map(normalized)
      .filter((value) => value.length >= 3)

    return catalog
      .map((item, index) => {
        const haystack = itemSearchText(item)
        const matches = interests.filter((interest) =>
          haystack.includes(interest),
        )
        const featuredBonus =
          item.origin === 'official' && item.featured ? 2 : 0
        const officialBonus = item.origin === 'official' ? 1 : 0
        return {
          item,
          score:
            matches.length * 5 + featuredBonus + officialBonus - index / 1000,
        }
      })
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map(({ item }) => item)
  }, [
    catalog,
    profile?.fieldOfStudy,
    profile?.schoolExam,
    profile?.studyYear,
    profile?.subjects,
    role,
  ])

  const ownPublishedCount = own.filter(
    (item) => item.status === 'published',
  ).length
  const ownPendingCount = own.filter((item) => item.status === 'pending').length
  const ownRejectedCount = own.filter(
    (item) => item.status === 'rejected',
  ).length

  const filteredCatalog = useMemo(() => {
    const search = normalized(queryText)
    return catalog.filter((item) => {
      if (discipline !== 'all' && item.discipline !== discipline) return false
      if (kind !== 'all' && item.kind !== kind) return false
      if (
        level !== 'all-filter' &&
        item.level !== 'all' &&
        item.level !== level
      ) {
        return false
      }
      if (activeTab === 'favorites' && !favoriteIds.has(item.id)) return false
      return !search || itemSearchText(item).includes(search)
    })
  }, [activeTab, catalog, discipline, favoriteIds, kind, level, queryText])

  const tabs = useMemo(() => {
    const result: Array<{ id: PageTab; label: string; count?: number }> = [
      { id: 'catalog', label: 'Вся база', count: catalog.length },
      { id: 'favorites', label: 'Избранное', count: favoriteIds.size },
    ]
    if (isTutor) {
      result.push({ id: 'my', label: 'Мои публикации', count: own.length })
    }
    if (isModerator) {
      result.push({
        id: 'moderation',
        label: 'На модерации',
        count: moderation.length,
      })
    }
    return result
  }, [
    catalog.length,
    favoriteIds.size,
    isModerator,
    isTutor,
    moderation.length,
    own.length,
  ])

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) setActiveTab('catalog')
  }, [activeTab, tabs])

  async function toggleFavorite(item: CatalogItem) {
    if (!user) return
    const enabled = !favoriteIds.has(item.id)
    setFavoriteIds((current) => {
      const next = new Set(current)
      if (enabled) next.add(item.id)
      else next.delete(item.id)
      return next
    })
    try {
      await setKnowledgeBookmark(user.uid, item.id, enabled)
    } catch {
      setFavoriteIds((current) => {
        const next = new Set(current)
        if (enabled) next.delete(item.id)
        else next.add(item.id)
        return next
      })
      setError('Не удалось изменить избранное.')
    }
  }

  async function openSubmission(item: KnowledgeSubmission) {
    if (item.sourceMode === 'link') {
      window.open(item.sourceUrl, '_blank', 'noopener,noreferrer')
      return
    }
    setBusyId(item.id)
    setError('')
    try {
      const { downloadKnowledgePdf } = await import('@/lib/knowledge-upload')
      await downloadKnowledgePdf(item.filePath, item.fileName)
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Не удалось скачать PDF.',
      )
    } finally {
      setBusyId('')
    }
  }

  async function removeOwnSubmission(item: KnowledgeSubmission) {
    if (
      !window.confirm(
        `Удалить материал «${item.title}»? Это действие нельзя отменить.`,
      )
    ) {
      return
    }
    setBusyId(item.id)
    setError('')
    setMessage('')
    try {
      if (item.filePath) {
        const { removeKnowledgePdf } = await import('@/lib/knowledge-upload')
        await removeKnowledgePdf(item.filePath)
      }
      await deleteKnowledgeSubmission(item.id)
      setMessage('Материал удалён.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось удалить материал.',
      )
    } finally {
      setBusyId('')
    }
  }

  async function decide(
    item: KnowledgeSubmission,
    decision: KnowledgeModerationDecision,
  ) {
    if (!user) return
    if (
      decision === 'approve' &&
      !window.confirm(
        `Опубликовать «${item.title}» с отметкой «Проверено MedStart»?`,
      )
    ) {
      return
    }

    setBusyId(item.id)
    setError('')
    setMessage('')
    try {
      await moderateKnowledgeSubmission(
        item.id,
        user.uid,
        decision,
        rejectionReason,
      )
      setMessage(
        decision === 'approve'
          ? 'Материал опубликован в общей учебной базе.'
          : 'Материал отклонён, причина сохранена для репетитора.',
      )
      setRejectingId('')
      setRejectionReason('')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось выполнить модерацию.',
      )
    } finally {
      setBusyId('')
    }
  }

  return (
    <div className="space-y-7">
      <header className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-3 py-1.5 text-sm font-semibold ring-1 ring-white/20">
              <BookOpenCheck className="h-4 w-4" />
              {isSchoolLearner
                ? 'Официальные материалы ФИПИ'
                : 'Достоверные медицинские материалы'}
            </span>
            <h1 className="mt-5 max-w-3xl text-3xl font-bold sm:text-4xl">
              Учебная материальная база
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-teal-50/80 sm:text-base">
              {isSchoolLearner
                ? 'Демоверсии, спецификации и кодификаторы ОГЭ и ЕГЭ — с прямой ссылкой на актуальную редакцию у ФИПИ.'
                : 'Книги, инструкции, клинические рекомендации и материалы для аккредитации — в одном месте, с понятным источником и уровнем доверия.'}
            </p>
          </div>
          {isTutor && (
            <button
              type="button"
              onClick={() => {
                setFormOpen(true)
                setMessage('')
              }}
              className="ms-btn ms-btn-white"
            >
              <Plus className="h-5 w-5" />
              Предложить материал
            </button>
          )}
        </div>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <Stat
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Официальных ресурсов"
            value={
              isSchoolLearner
                ? catalog.length
                : OFFICIAL_KNOWLEDGE_RESOURCES.length
            }
          />
          <Stat
            icon={<BadgeCheck className="h-5 w-5" />}
            label={isSchoolLearner ? 'Ваш экзамен' : 'Проверено от репетиторов'}
            value={
              isSchoolLearner
                ? profile?.schoolExam
                  ? SCHOOL_EXAM_LABELS[profile.schoolExam]
                  : 'ОГЭ / ЕГЭ'
                : published.length
            }
          />
          <Stat
            icon={<Heart className="h-5 w-5" />}
            label="Сохранено вами"
            value={favoriteIds.size}
          />
        </div>
      </header>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-bold">Как читать отметки</p>
            <p className="mt-1 text-sm leading-6">
              {isSchoolLearner
                ? '«Официальный источник» ведёт непосредственно на ФИПИ. MedStart хранит ссылку и описание, а не неофициальную копию экзаменационного материала.'
                : '«Официальный источник» — государственная или международная организация. «Проверено MedStart» — медицинский материал репетитора, прошедший нашу модерацию, но не официальный документ.'}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold">Проверяйте редакцию</p>
            <p className="mt-1 text-sm leading-6">
              {isSchoolLearner
                ? 'Перед подготовкой проверяйте год и редакцию на странице ФИПИ: структура и требования экзамена могут обновляться.'
                : 'Для клинического решения открывайте актуальную версию на странице первоисточника. Учебная база не заменяет клинические рекомендации, локальные протоколы и решение врача.'}
            </p>
          </div>
        </div>
      </section>

      {role === 'student' && recommendedCatalog.length > 0 && (
        <section className="rounded-[30px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-teal-700 ring-1 ring-teal-100">
                <Sparkles className="h-4 w-4" />
                Подобрано по вашему профилю
              </span>
              <h2 className="mt-4 text-2xl font-black text-slate-950">
                С чего продолжить подготовку
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                {isSchoolLearner
                  ? 'Рекомендации учитывают выбранный экзамен и предметы. Сохраняйте материалы ФИПИ в избранное, чтобы быстро к ним вернуться.'
                  : 'Рекомендации учитывают предметы, направление и курс, указанные в профиле. Сохраняйте полезное в избранное, чтобы быстро вернуться.'}
              </p>
            </div>
            <a
              href="/dashboard/profile"
              className="ms-btn ms-btn-secondary ms-btn-sm"
            >
              <Target className="h-4 w-4" />
              Уточнить цели
            </a>
          </div>
          <div className="mt-6 grid gap-5 lg:grid-cols-3">
            {recommendedCatalog.map((item) => (
              <ResourceCard
                key={`recommended-${item.id}`}
                item={item}
                favorite={favoriteIds.has(item.id)}
                onFavorite={(selected) => void toggleFavorite(selected)}
                onDownload={(selected) => void openSubmission(selected)}
                downloading={busyId === item.id}
              />
            ))}
          </div>
        </section>
      )}

      {isTutor && (
        <section className="rounded-[30px] border border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 p-5 shadow-sm sm:p-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-teal-700 ring-1 ring-teal-100">
                <LibraryBig className="h-4 w-4" />
                Вклад преподавателя
              </span>
              <h2 className="mt-4 text-2xl font-black text-slate-950">
                Ваши материалы в учебной базе
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Публикуйте только медицинские источники, на которые у вас есть
                право. Каждый материал проходит проверку тематики, актуальности
                и безопасности.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setFormOpen(true)
                setMessage('')
              }}
              className="ms-btn ms-btn-primary shrink-0"
            >
              <Plus className="h-5 w-5" />
              Предложить материал
            </button>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
              <div className="flex items-center gap-2 text-emerald-700">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-bold">Опубликовано</span>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {ownPublishedCount}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
              <div className="flex items-center gap-2 text-amber-700">
                <Clock3 className="h-5 w-5" />
                <span className="font-bold">На проверке</span>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {ownPendingCount}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="h-5 w-5" />
                <span className="font-bold">Нужна доработка</span>
              </div>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {ownRejectedCount}
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {[
              [
                'Укажите первоисточник',
                'Ссылка должна вести на автора, издателя или официальную организацию.',
              ],
              [
                'Не загружайте данные пациентов',
                'Удалите ФИО, номера историй болезни, снимки с идентификаторами.',
              ],
              [
                'Проверьте право публикации',
                'Авторский материал или документ с разрешённым распространением.',
              ],
            ].map(([title, description]) => (
              <div
                key={title}
                className="rounded-2xl border border-teal-100 bg-white/80 p-4"
              >
                <p className="font-black text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {formOpen && isTutor && (
        <SubmissionForm
          onClose={() => setFormOpen(false)}
          onCreated={(text) => {
            setMessage(text)
            setActiveTab('my')
          }}
        />
      )}

      {error && <ErrorNotice>{error}</ErrorNotice>}
      {message && <SuccessNotice>{message}</SuccessNotice>}

      <section className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className="ms-choice ms-choice-pill shrink-0"
            >
              {tab.id === 'favorites' && <BookMarked className="h-4 w-4" />}
              {tab.id === 'moderation' && <ShieldCheck className="h-4 w-4" />}
              {tab.label}
              {typeof tab.count === 'number' && (
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-white text-slate-500'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {(activeTab === 'catalog' || activeTab === 'favorites') && (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_repeat(3,minmax(160px,220px))]">
              <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100">
                <Search className="h-5 w-5 shrink-0 text-slate-400" />
                <input
                  value={queryText}
                  onChange={(event) => setQueryText(event.target.value)}
                  placeholder="Поиск по названию, теме или автору"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>

              <FilterSelect
                icon={<Stethoscope className="h-4 w-4" />}
                value={discipline}
                onChange={(value) =>
                  setDiscipline(value as 'all' | KnowledgeDiscipline)
                }
              >
                <option value="all">Все дисциплины</option>
                {disciplineOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                icon={<FileText className="h-4 w-4" />}
                value={kind}
                onChange={(value) =>
                  setKind(value as 'all' | KnowledgeResourceKind)
                }
              >
                <option value="all">Все типы</option>
                {kindOptions.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </FilterSelect>

              <FilterSelect
                icon={<GraduationCap className="h-4 w-4" />}
                value={level}
                onChange={(value) =>
                  setLevel(value as 'all-filter' | KnowledgeLevel)
                }
              >
                <option value="all-filter">Все уровни</option>
                {levelOptions
                  .filter(([value]) => value !== 'all')
                  .map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
              </FilterSelect>
            </div>
          </section>

          {loading ? (
            <div className="flex min-h-56 items-center justify-center rounded-[28px] border border-slate-200 bg-white">
              <LoaderCircle className="h-8 w-8 animate-spin text-violet-600" />
            </div>
          ) : filteredCatalog.length ? (
            <section className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
              {filteredCatalog.map((item) => (
                <ResourceCard
                  key={`${item.origin}-${item.id}`}
                  item={item}
                  favorite={favoriteIds.has(item.id)}
                  onFavorite={(selected) => void toggleFavorite(selected)}
                  onDownload={(selected) => void openSubmission(selected)}
                  downloading={busyId === item.id}
                />
              ))}
            </section>
          ) : (
            <EmptyState
              icon={<Search className="h-10 w-10" />}
              title={
                activeTab === 'favorites'
                  ? 'В избранном пока пусто'
                  : 'Ничего не найдено'
              }
              description={
                activeTab === 'favorites'
                  ? 'Нажмите сердечко на нужном материале, и он сохранится здесь.'
                  : 'Измените запрос или сбросьте один из фильтров.'
              }
            />
          )}
        </>
      )}

      {activeTab === 'my' && isTutor && (
        <section>
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Мои публикации
              </h2>
              <p className="mt-1 text-slate-500">
                Статус предложенных материалов и замечания модератора.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFormOpen(true)}
              className="ms-btn ms-btn-primary"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>
          {own.length ? (
            <div className="grid gap-5 md:grid-cols-2">
              {own.map((item) => (
                <OwnSubmissionCard
                  key={item.id}
                  item={item}
                  onOpen={(selected) => void openSubmission(selected)}
                  onDelete={(selected) => void removeOwnSubmission(selected)}
                  busy={busyId === item.id}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Upload className="h-10 w-10" />}
              title="Вы ещё не предлагали материалы"
              description="Добавьте собственный медицинский PDF или безопасную ссылку. После проверки материал станет доступен студентам."
            />
          )}
        </section>
      )}

      {activeTab === 'moderation' && isModerator && (
        <section>
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900">
              Модерация учебной базы
            </h2>
            <p className="mt-1 text-slate-500">
              Проверьте медицинскую тематику, актуальность, первоисточник,
              авторские права и отсутствие данных пациентов.
            </p>
          </div>
          {moderation.length ? (
            <div className="grid gap-5 xl:grid-cols-2">
              {moderation.map((item) => (
                <ModerationCard
                  key={item.id}
                  item={item}
                  busy={busyId === item.id}
                  rejectionOpen={rejectingId === item.id}
                  rejectionReason={rejectionReason}
                  onRejectionReason={setRejectionReason}
                  onDecision={(selected, decision) =>
                    void decide(selected, decision)
                  }
                  onOpen={(selected) => void openSubmission(selected)}
                  onStartReject={() => {
                    setRejectingId(item.id)
                    setRejectionReason('')
                  }}
                  onCancelReject={() => {
                    setRejectingId('')
                    setRejectionReason('')
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CheckCircle2 className="h-10 w-10" />}
              title="Очередь пуста"
              description="Все предложенные репетиторами материалы проверены."
              success
            />
          )}
        </section>
      )}
    </div>
  )
}

function FilterSelect({
  icon,
  value,
  onChange,
  children,
}: {
  icon: ReactNode
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <label className="relative flex items-center gap-2 rounded-2xl border border-slate-200 px-3">
      <span className="text-slate-400">{icon}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 appearance-none bg-transparent py-3 pr-7 text-sm font-medium text-slate-700 outline-none"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-slate-400" />
    </label>
  )
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
      <span className="rounded-xl bg-white/15 p-2">{icon}</span>
      <div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-violet-100">{label}</p>
      </div>
    </div>
  )
}

function EmptyState({
  icon,
  title,
  description,
  success = false,
}: {
  icon: ReactNode
  title: string
  description: string
  success?: boolean
}) {
  return (
    <div
      className={`rounded-[28px] border border-dashed p-10 text-center ${
        success
          ? 'border-emerald-300 bg-emerald-50'
          : 'border-slate-300 bg-white'
      }`}
    >
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl ${
          success
            ? 'bg-emerald-100 text-emerald-600'
            : 'bg-violet-100 text-violet-600'
        }`}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-xl font-bold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">
        {description}
      </p>
    </div>
  )
}
