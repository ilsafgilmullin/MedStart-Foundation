'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LoaderCircle, MessageCircle, Send, WifiOff } from 'lucide-react'
import { sendMessage, subscribeToMessages } from '@/lib/conversations'
import { formatMessageTime, type Booking, type ChatMessage } from '@/lib/domain'

interface LessonChatProps {
  booking: Booking
  userUid: string
}

export default function LessonChat({ booking, userUid }: LessonChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(
    () =>
      subscribeToMessages(
        booking.conversationId,
        (next) => {
          setMessages(next)
          setLoading(false)
          setError('')
        },
        () => {
          setLoading(false)
          setError('Чат временно недоступен. Доска и голос продолжат работать.')
        },
      ),
    [booking.conversationId],
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' })
  }, [messages])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const value = text.trim()
    if (!value || sending) return

    setSending(true)
    setError('')
    try {
      await sendMessage(booking.conversationId, userUid, value)
      setText('')
    } catch {
      setError(
        navigator.onLine
          ? 'Не удалось отправить сообщение.'
          : 'Нет сети. Сообщение можно отправить после восстановления связи.',
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <section className="flex min-h-0 max-w-full flex-1 flex-col overflow-hidden overscroll-contain rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
        <MessageCircle className="h-4 w-4 text-violet-300" />
        Чат занятия
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <LoaderCircle className="h-6 w-6 animate-spin text-violet-300" />
          </div>
        ) : messages.length ? (
          messages.map((message) => {
            const own = message.senderUid === userUid
            const sender =
              message.senderUid === booking.studentUid
                ? booking.studentName
                : booking.tutorName
            return (
              <article
                key={message.id}
                className={`max-w-[88%] rounded-2xl px-3 py-2.5 ${
                  own
                    ? 'ml-auto rounded-br-md bg-violet-600 text-white'
                    : 'rounded-bl-md bg-white/10 text-slate-100'
                }`}
              >
                {!own && (
                  <p className="mb-1 text-[10px] font-semibold text-violet-200">
                    {sender}
                  </p>
                )}
                <p className="whitespace-pre-wrap break-words text-xs leading-5">
                  {message.text}
                </p>
                <p
                  className={`mt-1 text-right text-[9px] ${
                    own ? 'text-violet-200' : 'text-slate-400'
                  }`}
                >
                  {formatMessageTime(message.createdAt)}
                </p>
              </article>
            )
          })
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-4 text-center">
            <MessageCircle className="h-7 w-7 text-violet-300" />
            <p className="mt-2 text-xs font-semibold text-white">
              Начните обсуждение
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              Переписка останется доступна после занятия.
            </p>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mx-3 mb-2 flex items-start gap-2 rounded-xl bg-amber-500/10 p-2.5 text-[10px] leading-4 text-amber-200">
          <WifiOff className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </div>
      )}

      <form
        onSubmit={submit}
        className="flex shrink-0 gap-2 border-t border-white/10 px-3 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]"
      >
        <input
          value={text}
          maxLength={2_000}
          onChange={(event) => setText(event.target.value)}
          placeholder="Сообщение…"
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2.5 text-base text-white outline-none placeholder:text-slate-500 focus:border-violet-400 sm:text-xs"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          aria-label="Отправить сообщение"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white disabled:opacity-40 sm:h-10 sm:w-10"
        >
          {sending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </form>
    </section>
  )
}
