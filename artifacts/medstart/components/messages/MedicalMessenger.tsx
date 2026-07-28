'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  BookOpenCheck,
  CalendarDays,
  Camera,
  FilePlus2,
  Info,
  LoaderCircle,
  MessageCircle,
  Mic,
  Paperclip,
  Search,
  Send,
  ShieldCheck,
  Smile,
  Sparkles,
  Stethoscope,
  X,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import PresenceBadge from '@/components/presence/PresenceBadge'
import MediaCaptureDialog from '@/components/messages/MediaCaptureDialog'
import MessageBubble from '@/components/messages/MessageBubble'
import {
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
  toggleMessageReaction,
  type ChatSender,
} from '@/lib/conversations'
import {
  deleteChatMedia,
  uploadChatMedia,
  validateChatAttachment,
  validateRecordedMedia,
} from '@/lib/chat-media'
import {
  MEDICAL_TAGS,
  MEDICAL_TEMPLATES,
  MEDICAL_TEXT_EMOJIS,
} from '@/lib/medical-chat'
import { getBooking } from '@/lib/bookings'
import {
  formatMessageTime,
  type Booking,
  type ChatMessage,
  type Conversation,
  type MedicalMessageTag,
  type MedicalReactionCode,
} from '@/lib/domain'

type MessageWithReactions = ChatMessage & {
  reactions?: Record<string, MedicalReactionCode>
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((item) => item.slice(0, 1))
      .join('')
      .toUpperCase() || 'MS'
  )
}

function presentation(
  conversation: Conversation,
  ownUid: string,
  moderatorMode: boolean,
) {
  const participantUids = [...new Set([
    ...conversation.participantUids,
    ...Object.keys(conversation.participantNames || {}),
    ...Object.keys(conversation.participantAvatars || {}),
  ])]
  const participants = participantUids.map((uid) => ({
    uid,
    name: conversation.participantNames[uid] || 'Пользователь MedStart',
    avatar: conversation.participantAvatars[uid] || '',
  }))
  if (moderatorMode && !conversation.participantUids.includes(ownUid)) {
    return {
      title: participants.map((item) => item.name).join(' ↔ '),
      subtitle: 'Учебный диалог · служебный доступ',
      avatar: participants[0]?.avatar || '',
      initials: participants
        .map((item) => initials(item.name).slice(0, 1))
        .join(''),
      participants,
      presenceUid: '',
    }
  }
  const other = participants.find((item) => item.uid !== ownUid) || participants[0]
  return {
    title: other?.name || 'Пользователь MedStart',
    subtitle: 'Личный учебный диалог',
    avatar: other?.avatar || '',
    initials: initials(other?.name || 'MedStart'),
    presenceUid: other?.uid || '',
    participants,
  }
}

type ConversationPresentation = ReturnType<typeof presentation>

function bookingStatus(status: Booking['status']) {
  const labels: Record<Booking['status'], string> = {
    pending: 'На согласовании',
    accepted: 'Подтверждено',
    declined: 'Отклонено',
    cancelled: 'Отменено',
    completed: 'Завершено',
  }
  return labels[status]
}

function prettyDate(value: string) {
  if (!value) return 'Дата не указана'
  const date = new Date(`${value}T12:00:00`)
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(date)
}

function friendlyMessengerError(error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message.trim() : ''
  if (/load failed|failed to fetch|network|networkerror|abort|timeout/i.test(message)) {
    return 'Связь с сервером MedStart прервалась. Проверьте интернет и повторите действие.'
  }
  return message || fallback
}

export default function MedicalMessenger() {
  const { user, profile, role } = useAuth()
  const moderatorMode = role === 'admin' || role === 'owner'
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<MessageWithReactions[]>([])
  const [booking, setBooking] = useState<Booking | null>(null)
  const [draft, setDraft] = useState('')
  const [medicalTag, setMedicalTag] = useState<MedicalMessageTag>('')
  const [queryText, setQueryText] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [medicalToolsOpen, setMedicalToolsOpen] = useState(false)
  const [contextOpen, setContextOpen] = useState(false)
  const [captureKind, setCaptureKind] = useState<
    'voice' | 'video_note' | null
  >(null)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [privacyConfirmed, setPrivacyConfirmed] = useState(false)
  const messageScrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const requestedConversation = useRef('')

  useEffect(() => {
    requestedConversation.current =
      new URLSearchParams(window.location.search).get('conversation') ?? ''
  }, [])

  useEffect(() => {
    if (!user) return
    return subscribeToConversations(
      user.uid,
      (items) => {
        setConversations(items)
        setSelectedId((current) => {
          if (current && items.some((item) => item.id === current)) return current
          if (
            requestedConversation.current &&
            items.some((item) => item.id === requestedConversation.current)
          ) {
            return requestedConversation.current
          }
          return items[0]?.id ?? ''
        })
        setLoading(false)
        setError('')
      },
      () => {
        setError('Не удалось загрузить диалоги.')
        setLoading(false)
      },
      { moderator: moderatorMode },
    )
  }, [moderatorMode, user])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
      setBooking(null)
      return
    }
    setMessagesLoading(true)
    return subscribeToMessages(
      selectedId,
      (items) => {
        setMessages(items)
        setMessagesLoading(false)
      },
      () => {
        setError('Не удалось загрузить сообщения.')
        setMessagesLoading(false)
      },
    )
  }, [selectedId])

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  )

  useEffect(() => {
    let active = true
    if (!selected?.latestBookingId) {
      setBooking(null)
      return
    }
    void getBooking(selected.latestBookingId)
      .then((item) => {
        if (active) setBooking(item)
      })
      .catch(() => {
        if (active) setBooking(null)
      })
    return () => {
      active = false
    }
  }, [selected?.latestBookingId])

  useEffect(() => {
    const container = messageScrollRef.current
    if (!container) return
    container.scrollTo({
      top: container.scrollHeight,
      behavior: messages.length > 1 ? 'smooth' : 'auto',
    })
  }, [messages])

  useEffect(() => {
    setMedicalTag('')
    setEmojiOpen(false)
    setMedicalToolsOpen(false)
    setContextOpen(false)
  }, [selectedId])

  const filteredConversations = useMemo(() => {
    const query = queryText.trim().toLocaleLowerCase('ru-RU')
    if (!query) return conversations
    return conversations.filter((item) => {
      const names = Object.values(item.participantNames).join(' ')
      return `${names} ${item.lastMessage}`
        .toLocaleLowerCase('ru-RU')
        .includes(query)
    })
  }, [conversations, queryText])

  const sender = useMemo<ChatSender | null>(() => {
    if (!user || !profile || !role) return null
    return {
      uid: user.uid,
      name: profile.displayName || user.email || 'Пользователь MedStart',
      role,
    }
  }, [profile, role, user])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!sender || !selectedId || !draft.trim()) return
    const text = draft
    const tag = medicalTag
    setDraft('')
    setMedicalTag('')
    setSending(true)
    setError('')
    try {
      await sendMessage(selectedId, sender, {
        kind: tag ? 'medical_note' : 'text',
        text,
        medicalTag: tag,
      })
    } catch (caught) {
      setDraft(text)
      setMedicalTag(tag)
      setError(
        caught instanceof Error
          ? friendlyMessengerError(caught, 'Не удалось отправить сообщение.')
          : 'Не удалось отправить сообщение.',
      )
    } finally {
      setSending(false)
    }
  }

  async function sendMedia(
    file: File,
    kind: 'voice' | 'video_note' | 'file',
    durationMs = 0,
  ) {
    if (!sender || !selectedId) return
    let mediaPath = ''
    setSending(true)
    setUploadProgress(1)
    setError('')
    try {
      if (kind === 'file') validateChatAttachment(file)
      else validateRecordedMedia(file, kind)
      mediaPath = await uploadChatMedia({
        conversationId: selectedId,
        uploaderUid: sender.uid,
        file,
        onProgress: setUploadProgress,
      })
      await sendMessage(selectedId, sender, {
        kind,
        mediaPath,
        mimeType: file.type,
        fileName: file.name,
        fileSize: file.size,
        durationMs,
      })
    } catch (caught) {
      if (mediaPath) await deleteChatMedia(mediaPath).catch(() => undefined)
      throw caught instanceof Error
        ? caught
        : new Error('Не удалось отправить медиафайл.')
    } finally {
      setSending(false)
      setUploadProgress(0)
    }
  }

  function chooseAttachment(file: File | undefined) {
    if (!file) return
    try {
      validateChatAttachment(file)
      setPendingFile(file)
      setPrivacyConfirmed(false)
      setError('')
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'Вложение не прошло проверку.',
      )
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function confirmAttachment() {
    if (!pendingFile || !privacyConfirmed) return
    const file = pendingFile
    try {
      await sendMedia(file, 'file')
      setPendingFile(null)
      setPrivacyConfirmed(false)
    } catch (caught) {
      setError(
        friendlyMessengerError(caught, 'Не удалось отправить вложение.'),
      )
    }
  }

  async function react(messageId: string, code: MedicalReactionCode) {
    if (!user || !selectedId) return
    try {
      await toggleMessageReaction({
        conversationId: selectedId,
        messageId,
        uid: user.uid,
        code,
      })
    } catch {
      setError('Не удалось сохранить реакцию.')
    }
  }

  function applyTemplate(template: (typeof MEDICAL_TEMPLATES)[number]) {
    setDraft(template.text)
    setMedicalTag(template.tag)
    setMedicalToolsOpen(false)
  }

  if (!user || !profile) return null

  const selectedPresentation = selected
    ? presentation(selected, user.uid, moderatorMode)
    : null

  return (
    <div className="flex h-[calc(100dvh-108px)] min-h-[560px] w-full min-w-0 max-w-full flex-col gap-3 overflow-hidden sm:h-[calc(100dvh-96px)] sm:min-h-[650px]">
      <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-teal-700">
            <Stethoscope className="h-4 w-4" />
            MedStart Messages
          </div>
          <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">
            Учебные сообщения
          </h1>
        </div>
        {moderatorMode && (
          <div className="flex items-center gap-2 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-2.5 text-sm font-bold text-teal-800">
            <ShieldCheck className="h-5 w-5" />
            Служебный режим администратора
          </div>
        )}
      </header>

      {error && (
        <div className="flex shrink-0 items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1 text-sm font-medium">{error}</p>
          <button
            type="button"
            onClick={() => setError('')}
            className="ms-icon-btn ms-icon-btn-neutral h-8 w-8"
            aria-label="Закрыть ошибку"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="relative grid min-h-0 min-w-0 w-full max-w-full flex-1 overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-xl sm:rounded-[30px] lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <ConversationList
          conversations={filteredConversations}
          total={conversations.length}
          loading={loading}
          selectedId={selectedId}
          ownUid={user.uid}
          moderatorMode={moderatorMode}
          queryText={queryText}
          onQueryChange={setQueryText}
          onSelect={setSelectedId}
          hidden={Boolean(selected)}
        />

        <main
          className={`${selected ? 'flex' : 'hidden lg:flex'} min-h-0 min-w-0 max-w-full flex-col overflow-hidden bg-slate-50`}
        >
          {selected && selectedPresentation ? (
            <>
              <ConversationHeader
                item={selectedPresentation}
                moderatorMode={moderatorMode}
                onBack={() => setSelectedId('')}
                onInfo={() => setContextOpen(true)}
              />

              {moderatorMode && !selected.participantUids.includes(user.uid) && (
                <div className="flex shrink-0 items-start gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  Вы открыли учебный диалог в служебном режиме. Ваши сообщения
                  будут явно помечены как сообщения MedStart.
                </div>
              )}

              <div ref={messageScrollRef} className="min-h-0 min-w-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto overscroll-contain bg-[radial-gradient(circle_at_top_right,_rgba(13,148,136,0.08),_transparent_38%),linear-gradient(to_bottom,_#f8fafc,_#f1f5f9)] p-3 sm:p-5 lg:p-6">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    Загружаем сообщения…
                  </div>
                ) : messages.length ? (
                  messages.map((item) => (
                    <MessageBubble
                      key={item.id}
                      message={item}
                      own={item.senderUid === user.uid}
                      currentUid={user.uid}
                      moderatorView={moderatorMode}
                      onReact={(code) => react(item.id, code)}
                    />
                  ))
                ) : (
                  <EmptyConversation />
                )}
                <div aria-hidden="true" />
              </div>

              <Composer
                moderatorMode={moderatorMode}
                draft={draft}
                medicalTag={medicalTag}
                sending={sending}
                uploadProgress={uploadProgress}
                emojiOpen={emojiOpen}
                medicalToolsOpen={medicalToolsOpen}
                fileInputRef={fileInputRef}
                onSubmit={submit}
                onDraftChange={setDraft}
                onTagClear={() => setMedicalTag('')}
                onChooseAttachment={chooseAttachment}
                onToggleMedical={() => {
                  setMedicalToolsOpen((current) => !current)
                  setEmojiOpen(false)
                }}
                onToggleEmoji={() => {
                  setEmojiOpen((current) => !current)
                  setMedicalToolsOpen(false)
                }}
                onEmoji={(emoji) => setDraft((current) => `${current}${emoji}`)}
                onTemplate={applyTemplate}
                onVoice={() => setCaptureKind('voice')}
                onVideo={() => setCaptureKind('video_note')}
              />
            </>
          ) : (
            <NoConversationSelected />
          )}
        </main>

        <aside className="hidden min-h-0 flex-col border-l border-slate-200 bg-white xl:flex">
          {selected && selectedPresentation ? (
            <ContextPanel
              booking={booking}
              item={selectedPresentation}
              onTemplate={applyTemplate}
              moderatorMode={moderatorMode}
            />
          ) : (
            <div className="p-6 text-center text-sm text-slate-500">
              Выберите диалог, чтобы увидеть контекст занятия.
            </div>
          )}
        </aside>
      </section>

      {captureKind && (
        <MediaCaptureDialog
          kind={captureKind}
          onClose={() => setCaptureKind(null)}
          onSend={(file, durationMs) =>
            sendMedia(file, captureKind, durationMs)
          }
        />
      )}

      {pendingFile && (
        <AttachmentReviewDialog
          file={pendingFile}
          confirmed={privacyConfirmed}
          sending={sending}
          onConfirmed={setPrivacyConfirmed}
          onClose={() => setPendingFile(null)}
          onSend={() => void confirmAttachment()}
        />
      )}

      {contextOpen && selectedPresentation && (
        <div className="fixed inset-0 z-[75] flex justify-end bg-slate-950/50 backdrop-blur-sm xl:hidden">
          <div className="h-full w-full max-w-sm overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-4">
              <p className="font-black text-slate-950">Контекст диалога</p>
              <button
                type="button"
                onClick={() => setContextOpen(false)}
                className="ms-icon-btn ms-icon-btn-neutral"
                aria-label="Закрыть"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ContextPanel
              booking={booking}
              item={selectedPresentation}
              onTemplate={(template) => {
                applyTemplate(template)
                setContextOpen(false)
              }}
              moderatorMode={moderatorMode}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function ConversationList({
  conversations,
  total,
  loading,
  selectedId,
  ownUid,
  moderatorMode,
  queryText,
  onQueryChange,
  onSelect,
  hidden,
}: {
  conversations: Conversation[]
  total: number
  loading: boolean
  selectedId: string
  ownUid: string
  moderatorMode: boolean
  queryText: string
  onQueryChange: (value: string) => void
  onSelect: (value: string) => void
  hidden: boolean
}) {
  return (
    <aside
      className={`${hidden ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col border-r border-slate-200 bg-white`}
    >
      <div className="border-b border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-slate-950">Диалоги</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {moderatorMode
                ? 'Все учебные диалоги платформы'
                : `${total} активных`}
            </p>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-black text-teal-700">
            {total}
          </span>
        </div>
        <label className="mt-4 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2.5 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={queryText}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Имя или сообщение"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center gap-2 p-5 text-sm text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Загружаем диалоги…
          </div>
        ) : conversations.length ? (
          conversations.map((conversation) => {
            const item = presentation(conversation, ownUid, moderatorMode)
            return (
              <button
                key={conversation.id}
                type="button"
                onClick={() => onSelect(conversation.id)}
                data-active={selectedId === conversation.id}
                className="ms-row-action w-full gap-3 border-b border-slate-100 p-4 text-left"
              >
                {item.avatar ? (
                  <ProfilePhoto
                    src={item.avatar}
                    size={50}
                    className="h-[50px] w-[50px] shrink-0 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 font-black text-teal-800">
                    {item.initials}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-black text-slate-900">
                      {item.title}
                    </p>
                    <span className="shrink-0 text-[10px] text-slate-400">
                      {formatMessageTime(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {conversation.lastSenderUid === ownUid && 'Вы: '}
                    {conversation.lastMessage || 'Диалог создан'}
                  </p>
                  {!moderatorMode && item.presenceUid && (
                    <PresenceBadge uid={item.presenceUid} compact className="mt-1" />
                  )}
                  {moderatorMode && (
                    <p className="mt-1 truncate text-[11px] font-bold text-teal-700">
                      {item.subtitle}
                    </p>
                  )}
                </div>
              </button>
            )
          })
        ) : (
          <div className="p-8 text-center">
            <MessageCircle className="mx-auto h-10 w-10 text-teal-500" />
            <p className="mt-3 font-black text-slate-800">
              Диалогов не найдено
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Попробуйте изменить запрос поиска.
            </p>
          </div>
        )}
      </div>
    </aside>
  )
}

function ConversationHeader({
  item,
  moderatorMode,
  onBack,
  onInfo,
}: {
  item: ConversationPresentation
  moderatorMode: boolean
  onBack: () => void
  onInfo: () => void
}) {
  return (
    <header className="flex h-[74px] shrink-0 items-center gap-3 border-b border-slate-200 bg-white px-3 sm:px-5">
      <button
        type="button"
        onClick={onBack}
        className="ms-icon-btn ms-icon-btn-neutral lg:hidden"
        aria-label="Назад к диалогам"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      {item.avatar ? (
        <ProfilePhoto
          src={item.avatar}
          size={44}
          className="h-11 w-11 rounded-2xl object-cover"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-100 font-black text-teal-800">
          {item.initials}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-black text-slate-950">{item.title}</h2>
        {!moderatorMode && item.presenceUid ? (
          <PresenceBadge uid={item.presenceUid} compact />
        ) : (
          <p className="truncate text-xs text-slate-500">{item.subtitle}</p>
        )}
      </div>
      {moderatorMode && (
        <span className="hidden items-center gap-1 rounded-full bg-teal-50 px-3 py-1.5 text-xs font-black text-teal-700 sm:flex">
          <ShieldCheck className="h-3.5 w-3.5" />
          Проверено MedStart
        </span>
      )}
      <button
        type="button"
        onClick={onInfo}
        className="ms-icon-btn ms-icon-btn-neutral xl:hidden"
        aria-label="Информация о диалоге"
      >
        <Info className="h-5 w-5" />
      </button>
    </header>
  )
}

function Composer({
  moderatorMode,
  draft,
  medicalTag,
  sending,
  uploadProgress,
  emojiOpen,
  medicalToolsOpen,
  fileInputRef,
  onSubmit,
  onDraftChange,
  onTagClear,
  onChooseAttachment,
  onToggleMedical,
  onToggleEmoji,
  onEmoji,
  onTemplate,
  onVoice,
  onVideo,
}: {
  moderatorMode: boolean
  draft: string
  medicalTag: MedicalMessageTag
  sending: boolean
  uploadProgress: number
  emojiOpen: boolean
  medicalToolsOpen: boolean
  fileInputRef: React.RefObject<HTMLInputElement | null>
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onDraftChange: (value: string) => void
  onTagClear: () => void
  onChooseAttachment: (file: File | undefined) => void
  onToggleMedical: () => void
  onToggleEmoji: () => void
  onEmoji: (emoji: string) => void
  onTemplate: (template: (typeof MEDICAL_TEMPLATES)[number]) => void
  onVoice: () => void
  onVideo: () => void
}) {
  return (
    <div className="shrink-0 border-t border-slate-200 bg-white">
      {medicalTag && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-2">
          <div className="flex items-center gap-2 text-xs font-black text-teal-800">
            <Stethoscope className="h-4 w-4" />
            Медицинская заметка:{' '}
            {MEDICAL_TAGS.find((item) => item.value === medicalTag)?.label}
          </div>
          <button
            type="button"
            onClick={onTagClear}
            className="ms-icon-btn ms-icon-btn-neutral h-7 w-7"
            aria-label="Убрать медицинскую метку"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {medicalToolsOpen && (
        <div className="border-b border-slate-200 bg-teal-50/60 p-3 sm:p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-black text-slate-900">
              Медицинские шаблоны
            </p>
            <button
              type="button"
              onClick={onToggleMedical}
              className="ms-icon-btn ms-icon-btn-neutral h-8 w-8"
              aria-label="Закрыть шаблоны"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {MEDICAL_TEMPLATES.map((template) => (
              <button
                key={template.label}
                type="button"
                onClick={() => onTemplate(template)}
                className="ms-choice ms-choice-pill shrink-0 px-3 py-2 text-xs"
              >
                {MEDICAL_TAGS.find((item) => item.value === template.tag)?.emoji}{' '}
                {template.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {emojiOpen && (
        <div className="border-b border-slate-200 bg-white p-3">
          <div className="flex flex-wrap gap-2">
            {MEDICAL_TEXT_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onEmoji(emoji)}
                className="ms-icon-btn ms-icon-btn-neutral h-10 w-10 text-xl"
                aria-label={`Добавить ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {uploadProgress > 0 && (
        <div className="px-4 pt-3">
          <div className="flex items-center justify-between text-xs font-bold text-teal-800">
            <span>Защищённая загрузка</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-teal-100">
            <div
              className="h-full bg-teal-600 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="min-w-0 p-3 sm:p-4">
        <div className="min-w-0 rounded-[22px] border border-slate-200 bg-slate-50 p-2 focus-within:border-teal-500 focus-within:ring-4 focus-within:ring-teal-100 sm:rounded-[24px]">
          <textarea
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === 'Enter' &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing
              ) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            rows={1}
            maxLength={2_000}
            placeholder={
              moderatorMode
                ? 'Напишите служебное сообщение MedStart…'
                : 'Напишите сообщение…'
            }
            className="max-h-32 min-h-12 w-full min-w-0 resize-none bg-transparent px-2 py-2.5 text-sm leading-6 outline-none [overflow-wrap:anywhere]"
          />
          <div className="mt-1 flex min-w-0 items-center justify-between gap-2 border-t border-slate-200/80 pt-2">
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto overscroll-x-contain pb-0.5">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={(event) => onChooseAttachment(event.target.files?.[0])}
              />
              <button type="button" onClick={() => fileInputRef.current?.click()} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Прикрепить файл">
                <Paperclip className="h-5 w-5" />
              </button>
              <button type="button" onClick={onToggleMedical} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Медицинские инструменты">
                <Stethoscope className="h-5 w-5" />
              </button>
              <button type="button" onClick={onToggleEmoji} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Медицинские эмодзи">
                <Smile className="h-5 w-5" />
              </button>
              <button type="button" onClick={onVoice} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Записать голосовое">
                <Mic className="h-5 w-5" />
              </button>
              <button type="button" onClick={onVideo} disabled={sending} className="ms-icon-btn ms-icon-btn-neutral shrink-0" aria-label="Записать видеокружок">
                <Camera className="h-5 w-5" />
              </button>
            </div>
            <button disabled={sending || !draft.trim()} className="ms-icon-btn ms-icon-btn-primary shrink-0" aria-label="Отправить">
              {sending ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </button>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-end gap-3 px-1 text-[11px] text-slate-400 sm:justify-between">
          <span className="hidden sm:inline">Enter — отправить · Shift+Enter — новая строка</span>
          <span>{draft.length}/2000</span>
        </div>
      </form>
    </div>
  )
}

function ContextPanel({
  booking,
  item,
  onTemplate,
  moderatorMode,
}: {
  booking: Booking | null
  item: ConversationPresentation
  onTemplate: (template: (typeof MEDICAL_TEMPLATES)[number]) => void
  moderatorMode: boolean
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-5">
      <div className="text-center">
        {item.avatar ? (
          <ProfilePhoto
            src={item.avatar}
            size={72}
            className="mx-auto h-[72px] w-[72px] rounded-[24px] object-cover"
          />
        ) : (
          <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-[24px] bg-teal-100 text-xl font-black text-teal-800">
            {item.initials}
          </div>
        )}
        <h3 className="mt-3 font-black text-slate-950">{item.title}</h3>
        <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
      </div>

      {booking && (
        <section className="mt-6 rounded-3xl border border-teal-100 bg-teal-50/70 p-4">
          <div className="flex items-center gap-2 text-sm font-black text-teal-900">
            <CalendarDays className="h-4 w-4" /> Текущее занятие
          </div>
          <p className="mt-3 font-black text-slate-950">{booking.subject}</p>
          <p className="mt-1 text-sm text-slate-600">
            {prettyDate(booking.requestedDate)} · {booking.requestedTime}
          </p>
          <span className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-black text-teal-700 ring-1 ring-teal-100">
            {bookingStatus(booking.status)}
          </span>
          {booking.goal && (
            <p className="mt-3 line-clamp-4 text-xs leading-5 text-slate-600">
              {booking.goal}
            </p>
          )}
          <div className="mt-4 grid gap-2">
            <Link href="/dashboard/schedule" className="ms-btn ms-btn-secondary w-full">
              <CalendarDays className="h-4 w-4" /> Открыть занятие
            </Link>
            <Link href="/dashboard/materials" className="ms-btn ms-btn-secondary w-full">
              <BookOpenCheck className="h-4 w-4" /> Материалы
            </Link>
          </div>
        </section>
      )}

      <section className="mt-5">
        <div className="flex items-center gap-2 text-sm font-black text-slate-900">
          <Sparkles className="h-4 w-4 text-teal-600" /> Быстрые медицинские
          действия
        </div>
        <div className="mt-3 grid gap-2">
          {MEDICAL_TEMPLATES.slice(0, 5).map((template) => (
            <button
              key={template.label}
              type="button"
              onClick={() => onTemplate(template)}
              className="ms-row-action w-full rounded-2xl border border-slate-200 p-3 text-left"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-lg">
                {MEDICAL_TAGS.find((tag) => tag.value === template.tag)?.emoji}
              </span>
              <span className="text-sm font-bold text-slate-800">
                {template.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 rounded-3xl border border-red-100 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-sm font-black text-red-800">
          <AlertTriangle className="h-4 w-4" /> Не для экстренной помощи
        </div>
        <p className="mt-2 text-xs leading-5 text-red-700">
          MedStart предназначен для обучения. При угрозе жизни необходимо
          обращаться в экстренную медицинскую службу, а не ждать ответа в чате.
        </p>
      </section>

      <section className="mt-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-2 text-sm font-black text-slate-800">
          <ShieldCheck className="h-4 w-4 text-teal-600" /> Конфиденциальность
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Не пересылайте данные реальных пациентов.{' '}
          {moderatorMode
            ? 'Уполномоченный администратор может открыть диалог только в служебном режиме.'
            : 'Диалог доступен участникам и уполномоченной службе безопасности MedStart.'}
        </p>
      </section>
    </div>
  )
}

function AttachmentReviewDialog({
  file,
  confirmed,
  sending,
  onConfirmed,
  onClose,
  onSend,
}: {
  file: File
  confirmed: boolean
  sending: boolean
  onConfirmed: (value: boolean) => void
  onClose: () => void
  onSend: () => void
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section className="w-full max-w-lg rounded-[30px] bg-white p-5 shadow-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <FilePlus2 className="h-6 w-6" />
            </div>
            <h2 className="mt-4 text-xl font-black text-slate-950">
              Проверка вложения
            </h2>
            <p className="mt-1 break-all text-sm font-medium text-slate-600">
              {file.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ms-icon-btn ms-icon-btn-neutral"
            aria-label="Закрыть"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          Перед отправкой удалите ФИО, дату рождения, адрес, номер полиса, номер
          истории болезни, подписи на снимках и другие идентификаторы пациента.
        </div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(event) => onConfirmed(event.target.checked)}
            className="mt-1 h-5 w-5 accent-teal-600"
          />
          <span className="text-sm font-bold leading-6 text-slate-700">
            Подтверждаю, что файл не содержит персональных данных пациента и у
            меня есть право его отправить.
          </span>
        </label>
        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="ms-btn ms-btn-secondary">
            Отмена
          </button>
          <button
            type="button"
            onClick={onSend}
            disabled={!confirmed || sending}
            className="ms-btn ms-btn-primary disabled:opacity-50"
          >
            {sending ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}{' '}
            Отправить защищённо
          </button>
        </div>
      </section>
    </div>
  )
}

function EmptyConversation() {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <div className="max-w-sm rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <MessageCircle className="h-7 w-7" />
        </div>
        <p className="mt-4 font-black text-slate-900">
          Начните учебный разговор
        </p>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Обсуждайте занятие, отправляйте голосовые, видеокружки и медицинские
          заметки без персональных данных пациентов.
        </p>
      </div>
    </div>
  )
}

function NoConversationSelected() {
  return (
    <div className="flex h-full items-center justify-center text-center">
      <div className="max-w-sm p-8">
        <MessageCircle className="mx-auto h-12 w-12 text-teal-500" />
        <h2 className="mt-4 text-xl font-black text-slate-900">
          Выберите диалог
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Список переписок находится слева. На телефоне откройте нужного
          собеседника из списка.
        </p>
      </div>
    </div>
  )
}
