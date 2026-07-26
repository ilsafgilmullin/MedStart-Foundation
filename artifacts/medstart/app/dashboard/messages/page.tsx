'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  LoaderCircle,
  MessageCircle,
  Send,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import {
  sendMessage,
  subscribeToConversations,
  subscribeToMessages,
} from '@/lib/conversations'
import {
  formatMessageTime,
  type ChatMessage,
  type Conversation,
} from '@/lib/domain'

function counterpart(conversation: Conversation, ownUid: string) {
  const uid =
    conversation.participantUids.find((item) => item !== ownUid) || ownUid
  return {
    uid,
    name: conversation.participantNames[uid] || 'Пользователь MedStart',
    avatar: conversation.participantAvatars[uid] || '',
  }
}

export default function MessagesPage() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
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
          if (current && items.some((item) => item.id === current))
            return current
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
    )
  }, [user])

  useEffect(() => {
    if (!selectedId) {
      setMessages([])
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

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const selected = useMemo(
    () => conversations.find((item) => item.id === selectedId) ?? null,
    [conversations, selectedId],
  )

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!user || !selectedId || !draft.trim()) return
    const text = draft
    setDraft('')
    setSending(true)
    setError('')
    try {
      await sendMessage(selectedId, user.uid, text)
    } catch (caught) {
      setDraft(text)
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось отправить сообщение.',
      )
    } finally {
      setSending(false)
    }
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Сообщения</h1>
        <p className="mt-2 text-slate-500">
          Диалоги создаются автоматически после заявки на занятие.
        </p>
      </div>

      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm lg:grid lg:h-[calc(100dvh-190px)] lg:min-h-[560px] lg:grid-cols-[340px_1fr]">
        <aside
          className={`border-r border-slate-200 ${
            selected ? 'hidden lg:block' : 'block'
          }`}
        >
          <div className="border-b border-slate-200 p-5">
            <h2 className="font-bold text-slate-900">Диалоги</h2>
            <p className="mt-1 text-sm text-slate-500">
              {conversations.length
                ? `${conversations.length} активных`
                : 'Нет активных диалогов'}
            </p>
          </div>
          <div className="max-h-[65dvh] overflow-y-auto lg:max-h-[calc(100%-77px)]">
            {loading ? (
              <div className="flex items-center gap-2 p-5 text-sm text-slate-500">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Загружаем…
              </div>
            ) : conversations.length ? (
              conversations.map((conversation) => {
                const other = counterpart(conversation, user.uid)
                const initials = other.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((item) => item.slice(0, 1))
                  .join('')
                  .toUpperCase()
                const active = selectedId === conversation.id
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => setSelectedId(conversation.id)}
                    className={`flex w-full items-start gap-3 border-b border-slate-100 p-4 text-left transition ${
                      active ? 'bg-violet-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    {other.avatar ? (
                      <ProfilePhoto
                        src={other.avatar}
                        size={48}
                        className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-100 font-bold text-violet-700">
                        {initials || 'MS'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-slate-900">
                          {other.name}
                        </p>
                        <span className="shrink-0 text-[11px] text-slate-400">
                          {formatMessageTime(conversation.lastMessageAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        {conversation.lastSenderUid === user.uid && 'Вы: '}
                        {conversation.lastMessage || 'Диалог создан'}
                      </p>
                    </div>
                  </button>
                )
              })
            ) : (
              <div className="p-8 text-center">
                <MessageCircle className="mx-auto h-10 w-10 text-violet-500" />
                <p className="mt-3 font-semibold text-slate-800">
                  Диалогов пока нет
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Первый чат появится после заявки.
                </p>
              </div>
            )}
          </div>
        </aside>

        <div
          className={`${selected ? 'flex' : 'hidden lg:flex'} min-h-[560px] flex-col`}
        >
          {selected ? (
            <>
              {(() => {
                const other = counterpart(selected, user.uid)
                const initials = other.name
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((item) => item.slice(0, 1))
                  .join('')
                  .toUpperCase()
                return (
                  <header className="flex h-[77px] shrink-0 items-center gap-3 border-b border-slate-200 px-4 sm:px-5">
                    <button
                      type="button"
                      onClick={() => setSelectedId('')}
                      className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
                      aria-label="Назад к диалогам"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </button>
                    {other.avatar ? (
                      <ProfilePhoto
                        src={other.avatar}
                        size={44}
                        className="h-11 w-11 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 font-bold text-violet-700">
                        {initials || 'MS'}
                      </div>
                    )}
                    <div>
                      <h2 className="font-bold text-slate-900">{other.name}</h2>
                      <p className="text-xs text-slate-500">
                        Личный диалог MedStart
                      </p>
                    </div>
                  </header>
                )
              })()}

              <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 sm:p-6">
                {messagesLoading ? (
                  <div className="flex h-full items-center justify-center text-slate-500">
                    <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
                    Загружаем сообщения…
                  </div>
                ) : messages.length ? (
                  messages.map((item) => {
                    const own = item.senderUid === user.uid
                    return (
                      <div
                        key={item.id}
                        className={`flex ${own ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[70%] ${
                            own
                              ? 'rounded-br-md bg-violet-600 text-white'
                              : 'rounded-bl-md border border-slate-200 bg-white text-slate-800'
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-6">
                            {item.text}
                          </p>
                          <p
                            className={`mt-1 text-right text-[10px] ${
                              own ? 'text-violet-200' : 'text-slate-400'
                            }`}
                          >
                            {formatMessageTime(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex h-full items-center justify-center text-center">
                    <div>
                      <MessageCircle className="mx-auto h-10 w-10 text-violet-500" />
                      <p className="mt-3 font-semibold text-slate-800">
                        Начните разговор
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Сообщения видны только участникам диалога.
                      </p>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={submit}
                className="flex shrink-0 items-end gap-3 border-t border-slate-200 bg-white p-3 sm:p-4"
              >
                <textarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
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
                  placeholder="Напишите сообщение…"
                  className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
                <button
                  disabled={sending || !draft.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-600 text-white disabled:opacity-50"
                  aria-label="Отправить"
                >
                  {sending ? (
                    <LoaderCircle className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="flex h-full items-center justify-center text-center">
              <div>
                <MessageCircle className="mx-auto h-12 w-12 text-violet-500" />
                <h2 className="mt-4 text-xl font-bold text-slate-900">
                  Выберите диалог
                </h2>
                <p className="mt-2 text-slate-500">
                  Переписка откроется в этом рабочем пространстве.
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
