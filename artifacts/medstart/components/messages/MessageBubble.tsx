'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Download,
  FileText,
  LoaderCircle,
  PlayCircle,
  ShieldCheck,
  SmilePlus,
  Video,
  Volume2,
} from 'lucide-react'
import { downloadChatMedia, loadChatMediaBlob } from '@/lib/chat-media'
import { MEDICAL_REACTIONS, medicalTagMeta } from '@/lib/medical-chat'
import {
  formatMessageTime,
  type ChatMessage,
  type MedicalReactionCode,
} from '@/lib/domain'

type MessageWithReactions = ChatMessage & {
  reactions?: Record<string, MedicalReactionCode>
}

interface MessageBubbleProps {
  message: MessageWithReactions
  own: boolean
  currentUid: string
  onReact: (code: MedicalReactionCode) => Promise<void>
  moderatorView?: boolean
}

function roleLabel(role: ChatMessage['senderRole']) {
  if (role === 'owner') return 'Владелец MedStart'
  if (role === 'admin') return 'Администратор MedStart'
  if (role === 'tutor') return 'Репетитор'
  return 'Студент'
}

function humanSize(bytes: number) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

function SecureMedia({ message }: { message: MessageWithReactions }) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const mimeType = message.mimeType || ''
  const isImage = message.kind === 'file' && mimeType.startsWith('image/')
  const shouldLoad =
    message.kind === 'voice' || message.kind === 'video_note' || isImage

  useEffect(() => {
    if (!message.mediaPath || !shouldLoad) {
      setLoading(false)
      return
    }
    let active = true
    let objectUrl = ''
    setLoading(true)
    setError('')
    void loadChatMediaBlob(message.mediaPath)
      .then((blob) => {
        if (!active) return
        objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)
      })
      .catch(() => {
        if (active) setError('Не удалось открыть защищённый файл.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [message.mediaPath, shouldLoad])

  if (message.kind === 'file' && !isImage) {
    return (
      <button
        type="button"
        onClick={() =>
          void downloadChatMedia(message.mediaPath, message.fileName)
        }
        className="ms-row-action mt-2 w-full rounded-2xl border border-current/15 bg-white/10 p-3 text-left"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
          <FileText className="h-5 w-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-black">
            {message.fileName || 'Документ'}
          </span>
          <span className="mt-0.5 block text-xs opacity-70">
            {humanSize(message.fileSize)} · защищённое вложение
          </span>
        </span>
        <Download className="h-5 w-5 shrink-0" />
      </button>
    )
  }

  if (loading) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-2xl bg-black/5 px-4 py-3 text-sm opacity-70">
        <LoaderCircle className="h-4 w-4 animate-spin" />
        Открываем защищённое медиа…
      </div>
    )
  }
  if (error || !url) {
    return (
      <p className="mt-2 rounded-2xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
        {error || 'Медиафайл недоступен.'}
      </p>
    )
  }
  if (message.kind === 'voice') {
    return (
      <div className="mt-2 w-[min(260px,calc(100vw-96px))] min-w-0 max-w-full rounded-2xl bg-white/10 p-3">
        <div className="mb-2 flex items-center gap-2 text-xs font-bold opacity-75">
          <Volume2 className="h-4 w-4" />
          Голосовое сообщение
        </div>
        <audio
          controls
          preload="metadata"
          src={url}
          className="block h-10 w-full min-w-0 max-w-full"
        />
      </div>
    )
  }
  if (message.kind === 'video_note') {
    return (
      <div className="mt-2 flex justify-center">
        <div className="relative">
          <video
            controls
            playsInline
            preload="metadata"
            src={url}
            className="h-40 w-40 max-w-full rounded-full border-4 border-white/20 bg-slate-950 object-cover shadow-xl sm:h-52 sm:w-52"
          />
          <span className="pointer-events-none absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/70 text-white">
            <Video className="h-4 w-4" />
          </span>
        </div>
      </div>
    )
  }
  return (
    <button
      type="button"
      onClick={() => void downloadChatMedia(message.mediaPath, message.fileName)}
      className="ms-row-action mt-2 block overflow-hidden rounded-2xl border border-current/10 bg-slate-100/70 p-0"
      aria-label="Открыть изображение"
    >
      {/* Blob URL создаётся только после серверной проверки доступа. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={message.fileName || 'Медицинское изображение'}
        className="max-h-80 w-full object-contain"
      />
      <span className="flex items-center justify-between gap-3 px-3 py-2 text-xs font-bold">
        <span className="truncate">{message.fileName || 'Изображение'}</span>
        <Download className="h-4 w-4 shrink-0" />
      </span>
    </button>
  )
}

export default function MessageBubble({
  message,
  own,
  currentUid,
  onReact,
  moderatorView = false,
}: MessageBubbleProps) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [reacting, setReacting] = useState(false)
  const tag = medicalTagMeta(message.medicalTag)
  const grouped = useMemo(() => {
    const values = message.reactions || {}
    return MEDICAL_REACTIONS.map((item) => ({
      ...item,
      users: Object.entries(values)
        .filter(([, code]) => code === item.code)
        .map(([uid]) => uid),
    })).filter((item) => item.users.length > 0)
  }, [message.reactions])
  const administrative =
    message.senderRole === 'admin' || message.senderRole === 'owner'

  async function react(code: MedicalReactionCode) {
    setReacting(true)
    try {
      await onReact(code)
      setPickerOpen(false)
    } finally {
      setReacting(false)
    }
  }

  return (
    <article className={`group flex min-w-0 max-w-full ${own ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`flex min-w-0 max-w-[92%] flex-col sm:max-w-[78%] xl:max-w-[70%] ${
          own ? 'items-end' : 'items-start'
        }`}
      >
        {(moderatorView || administrative) && (
          <div
            className={`mb-1 flex items-center gap-1.5 px-1 text-[11px] font-bold ${
              administrative ? 'text-teal-700' : 'text-slate-500'
            }`}
          >
            {administrative && <ShieldCheck className="h-3.5 w-3.5" />}
            {message.senderName || 'Пользователь MedStart'} ·{' '}
            {roleLabel(message.senderRole)}
          </div>
        )}

        <div
          className={`relative max-w-full overflow-hidden rounded-[22px] px-4 py-3 shadow-sm [overflow-wrap:anywhere] ${
            administrative
              ? 'rounded-bl-md border border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 text-slate-900'
              : own
                ? 'rounded-br-md bg-gradient-to-br from-teal-700 to-cyan-700 text-white'
                : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
          }`}
        >
          {tag && (
            <div
              className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${tag.className}`}
            >
              <span>{tag.emoji}</span>
              {tag.label}
            </div>
          )}
          {message.kind === 'voice' && !message.text && (
            <div className="flex items-center gap-2 text-sm font-bold opacity-80">
              <PlayCircle className="h-4 w-4" /> Голосовое сообщение
            </div>
          )}
          {message.kind === 'video_note' && !message.text && (
            <div className="flex items-center gap-2 text-sm font-bold opacity-80">
              <Video className="h-4 w-4" /> Видеокружок
            </div>
          )}
          {message.text && (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 sm:text-[15px]">
              {message.text}
            </p>
          )}
          {message.mediaPath && <SecureMedia message={message} />}
          <div
            className={`mt-1.5 flex items-center justify-end gap-2 text-[10px] ${
              own && !administrative ? 'text-cyan-100' : 'text-slate-400'
            }`}
          >
            {message.durationMs > 0 && (
              <span>{Math.round(message.durationMs / 1_000)} сек.</span>
            )}
            <span>{formatMessageTime(message.createdAt)}</span>
          </div>
        </div>

        <div
          className={`mt-1 flex flex-wrap items-center gap-1.5 ${
            own ? 'justify-end' : 'justify-start'
          }`}
        >
          {grouped.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => void react(item.code)}
              disabled={reacting}
              data-active={item.users.includes(currentUid)}
              className="ms-choice ms-choice-pill min-h-8 px-2.5 py-1 text-xs"
              title={`${item.label}: ${item.users.length}`}
            >
              <span>{item.emoji}</span>
              <span>{item.users.length}</span>
            </button>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => setPickerOpen((current) => !current)}
              className="ms-icon-btn ms-icon-btn-neutral h-8 w-8 opacity-70 transition group-hover:opacity-100"
              aria-label="Добавить медицинскую реакцию"
            >
              <SmilePlus className="h-4 w-4" />
            </button>
            {pickerOpen && (
              <div
                className={`absolute bottom-10 z-20 flex max-w-[calc(100vw-2rem)] gap-1 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl ${
                  own ? 'right-0' : 'left-0'
                }`}
              >
                {MEDICAL_REACTIONS.map((item) => (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => void react(item.code)}
                    disabled={reacting}
                    className="ms-icon-btn ms-icon-btn-neutral h-10 w-10 text-xl"
                    title={item.label}
                  >
                    {item.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
