'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CircleStop,
  LoaderCircle,
  Mic,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from 'lucide-react'
import { formatDuration } from '@/lib/medical-chat'
import { validateRecordedMedia } from '@/lib/chat-media'

interface MediaCaptureDialogProps {
  kind: 'voice' | 'video_note'
  onClose: () => void
  onSend: (file: File, durationMs: number) => Promise<void>
}

type Phase = 'ready' | 'recording' | 'preview' | 'sending'

function supportedMime(kind: 'voice' | 'video_note') {
  const candidates =
    kind === 'voice'
      ? [
          'audio/mp4',
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
        ]
      : [
          'video/mp4',
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ]
  if (typeof MediaRecorder === 'undefined') return ''
  return candidates.find((item) => MediaRecorder.isTypeSupported(item)) || ''
}

function extensionFor(type: string, kind: 'voice' | 'video_note') {
  if (type.includes('mp4')) return kind === 'voice' ? 'm4a' : 'mp4'
  if (type.includes('ogg')) return 'ogg'
  return 'webm'
}

export default function MediaCaptureDialog({
  kind,
  onClose,
  onSend,
}: MediaCaptureDialogProps) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [elapsedMs, setElapsedMs] = useState(0)
  const [recordedFile, setRecordedFile] = useState<File | null>(null)
  const [recordedUrl, setRecordedUrl] = useState('')
  const [error, setError] = useState('')
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef(0)
  const intervalRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const maxDurationMs = kind === 'voice' ? 120_000 : 60_000

  function clearTimers() {
    if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current)
    intervalRef.current = null
    timeoutRef.current = null
  }

  function stopStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }

  function cleanupPreview() {
    if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    setRecordedUrl('')
    setRecordedFile(null)
  }

  useEffect(() => {
    return () => {
      clearTimers()
      stopStream()
      if (recordedUrl) URL.revokeObjectURL(recordedUrl)
    }
  }, [recordedUrl])

  async function startRecording() {
    setError('')
    cleanupPreview()
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Запись недоступна в этом браузере. Откройте MedStart в актуальном Safari или Chrome.')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        kind === 'voice'
          ? { audio: true, video: false }
          : {
              audio: true,
              video: {
                facingMode: 'user',
                width: { ideal: 720 },
                height: { ideal: 720 },
                aspectRatio: { ideal: 1 },
              },
            },
      )
      streamRef.current = stream
      if (videoRef.current && kind === 'video_note') {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }

      const mimeType = supportedMime(kind)
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)
      recorderRef.current = recorder
      chunksRef.current = []
      startedAtRef.current = Date.now()

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setError('Не удалось записать сообщение. Проверьте доступ к микрофону или камере.')
        clearTimers()
        stopStream()
        setPhase('ready')
      }
      recorder.onstop = () => {
        const duration = Math.min(
          maxDurationMs,
          Math.max(1_000, Date.now() - startedAtRef.current),
        )
        const type = recorder.mimeType || mimeType || (kind === 'voice' ? 'audio/webm' : 'video/webm')
        const blob = new Blob(chunksRef.current, { type })
        const file = new File(
          [blob],
          `${kind === 'voice' ? 'voice' : 'video-note'}-${Date.now()}.${extensionFor(type, kind)}`,
          { type },
        )
        clearTimers()
        stopStream()
        try {
          validateRecordedMedia(file, kind)
          setElapsedMs(duration)
          setRecordedFile(file)
          setRecordedUrl(URL.createObjectURL(file))
          setPhase('preview')
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Запись не прошла проверку.')
          setPhase('ready')
        }
      }

      recorder.start(500)
      setElapsedMs(0)
      setPhase('recording')
      intervalRef.current = window.setInterval(() => {
        setElapsedMs(Math.min(maxDurationMs, Date.now() - startedAtRef.current))
      }, 250)
      timeoutRef.current = window.setTimeout(() => stopRecording(), maxDurationMs)
    } catch (caught) {
      stopStream()
      setError(
        caught instanceof DOMException && caught.name === 'NotAllowedError'
          ? 'Разрешите MedStart доступ к микрофону и камере в настройках браузера.'
          : 'Не удалось открыть микрофон или камеру на этом устройстве.',
      )
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') recorder.stop()
  }

  async function sendRecording() {
    if (!recordedFile) return
    setPhase('sending')
    setError('')
    try {
      await onSend(recordedFile, elapsedMs)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Не удалось отправить запись.')
      setPhase('preview')
    }
  }

  function reset() {
    cleanupPreview()
    setElapsedMs(0)
    setError('')
    setPhase('ready')
  }

  const isVideo = kind === 'video_note'

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center sm:p-6">
      <section className="w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-sm font-black text-slate-950">
              {isVideo ? 'Видеокружок' : 'Голосовое сообщение'}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              До {isVideo ? '60 секунд' : '2 минут'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === 'sending'}
            className="ms-icon-btn ms-icon-btn-neutral"
            aria-label="Закрыть запись"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="p-5 sm:p-7">
          <div className="flex min-h-64 flex-col items-center justify-center rounded-[28px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white">
            {isVideo ? (
              <div className="relative">
                <video
                  ref={videoRef}
                  src={phase === 'preview' || phase === 'sending' ? recordedUrl : undefined}
                  muted={phase === 'recording'}
                  controls={phase === 'preview' || phase === 'sending'}
                  playsInline
                  autoPlay={phase === 'recording'}
                  className="h-48 w-48 rounded-full border-4 border-white/20 bg-slate-900 object-cover shadow-2xl sm:h-56 sm:w-56"
                />
                {phase === 'recording' && (
                  <span className="absolute right-3 top-3 h-4 w-4 animate-pulse rounded-full bg-red-500 ring-4 ring-red-500/20" />
                )}
              </div>
            ) : phase === 'preview' || phase === 'sending' ? (
              <div className="w-full">
                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20">
                  <Mic className="h-10 w-10 text-cyan-200" />
                </div>
                <audio controls src={recordedUrl} className="w-full" />
              </div>
            ) : (
              <div className="text-center">
                <div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/20 ${phase === 'recording' ? 'animate-pulse' : ''}`}>
                  <Mic className="h-12 w-12 text-cyan-200" />
                </div>
                <p className="mt-6 text-3xl font-black tabular-nums">
                  {formatDuration(elapsedMs)}
                </p>
                <p className="mt-2 text-sm text-teal-50/70">
                  {phase === 'recording' ? 'Идёт запись' : 'Микрофон ещё не включён'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-cyan-900">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="text-xs leading-5">
              Не называйте ФИО, адрес, номер истории болезни и другие данные пациента. Запись доступна только участникам диалога и уполномоченному администратору MedStart.
            </p>
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
              {error}
            </p>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            {phase === 'ready' && (
              <button type="button" onClick={() => void startRecording()} className="ms-btn ms-btn-primary">
                {isVideo ? <Camera className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                Начать запись
              </button>
            )}
            {phase === 'recording' && (
              <button type="button" onClick={stopRecording} className="ms-btn ms-btn-danger">
                <CircleStop className="h-5 w-5" />
                Остановить
              </button>
            )}
            {phase === 'preview' && (
              <>
                <button type="button" onClick={reset} className="ms-btn ms-btn-secondary">
                  <RotateCcw className="h-5 w-5" />
                  Перезаписать
                </button>
                <button type="button" onClick={() => void sendRecording()} className="ms-btn ms-btn-primary">
                  <Send className="h-5 w-5" />
                  Отправить
                </button>
              </>
            )}
            {phase === 'sending' && (
              <button type="button" disabled className="ms-btn ms-btn-primary opacity-70">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Загружаем…
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
