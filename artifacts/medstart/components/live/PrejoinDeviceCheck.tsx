'use client'

import { useEffect, useRef, useState } from 'react'
import {
  AudioLines,
  Camera,
  CameraOff,
  CheckCircle2,
  LoaderCircle,
  Mic,
  RefreshCw,
  TriangleAlert,
  X,
} from 'lucide-react'

export interface DeviceSelection {
  cameraDeviceId: string
  microphoneDeviceId: string
}

interface PrejoinDeviceCheckProps {
  mode: 'video' | 'audio'
  initialSelection?: Partial<DeviceSelection>
  connectionError?: string
  onCancel: () => void
  onConfirm: (selection: DeviceSelection) => Promise<boolean>
}

function deviceErrorMessage(error: unknown, mode: 'video' | 'audio') {
  if (!(error instanceof DOMException)) {
    return 'Не удалось проверить устройства.'
  }
  if (error.name === 'NotAllowedError' || error.name === 'SecurityError') {
    return mode === 'video'
      ? 'Разрешите доступ к камере и микрофону в настройках браузера.'
      : 'Разрешите доступ к микрофону в настройках браузера.'
  }
  if (error.name === 'NotFoundError' || error.name === 'OverconstrainedError') {
    return mode === 'video'
      ? 'Камера или микрофон не найдены.'
      : 'Микрофон не найден.'
  }
  if (error.name === 'NotReadableError' || error.name === 'AbortError') {
    return 'Устройство занято другим приложением. Закройте его и повторите попытку.'
  }
  return 'Не удалось открыть камеру или микрофон.'
}

export default function PrejoinDeviceCheck({
  mode,
  initialSelection,
  connectionError = '',
  onCancel,
  onConfirm,
}: PrejoinDeviceCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [cameraDeviceId, setCameraDeviceId] = useState(
    initialSelection?.cameraDeviceId ?? '',
  )
  const [microphoneDeviceId, setMicrophoneDeviceId] = useState(
    initialSelection?.microphoneDeviceId ?? '',
  )
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([])
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([])
  const [microphoneLevel, setMicrophoneLevel] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [confirming, setConfirming] = useState(false)
  const [previewVersion, setPreviewVersion] = useState(0)

  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Проверка устройств доступна только по HTTPS.')
      setLoading(false)
      return
    }

    let active = true
    let frame = 0
    let audioContext: AudioContext | null = null
    let stream: MediaStream | null = null

    setLoading(true)
    setError('')

    void navigator.mediaDevices
      .getUserMedia({
        audio: {
          deviceId: microphoneDeviceId
            ? { exact: microphoneDeviceId }
            : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        video:
          mode === 'video'
            ? {
                deviceId: cameraDeviceId
                  ? { exact: cameraDeviceId }
                  : undefined,
                facingMode: cameraDeviceId ? undefined : 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 24, max: 30 },
              }
            : false,
      })
      .then(async (nextStream) => {
        if (!active) {
          nextStream.getTracks().forEach((track) => track.stop())
          return
        }
        stream = nextStream
        streamRef.current = nextStream
        if (videoRef.current) videoRef.current.srcObject = nextStream

        const devices = await navigator.mediaDevices.enumerateDevices()
        if (!active) return
        const nextCameras = devices.filter(
          (device) => device.kind === 'videoinput',
        )
        const nextMicrophones = devices.filter(
          (device) => device.kind === 'audioinput',
        )
        setCameras(nextCameras)
        setMicrophones(nextMicrophones)

        const activeCamera =
          nextStream.getVideoTracks()[0]?.getSettings().deviceId ?? ''
        const activeMicrophone =
          nextStream.getAudioTracks()[0]?.getSettings().deviceId ?? ''
        if (!cameraDeviceId && activeCamera) setCameraDeviceId(activeCamera)
        if (!microphoneDeviceId && activeMicrophone) {
          setMicrophoneDeviceId(activeMicrophone)
        }

        const AudioContextClass =
          window.AudioContext ||
          (
            window as typeof window & {
              webkitAudioContext?: typeof AudioContext
            }
          ).webkitAudioContext
        if (AudioContextClass) {
          audioContext = new AudioContextClass()
          const source = audioContext.createMediaStreamSource(nextStream)
          const analyser = audioContext.createAnalyser()
          analyser.fftSize = 256
          source.connect(analyser)
          const samples = new Uint8Array(analyser.frequencyBinCount)
          const updateLevel = () => {
            analyser.getByteFrequencyData(samples)
            const average =
              samples.reduce((sum, sample) => sum + sample, 0) /
              Math.max(samples.length, 1)
            if (active) {
              setMicrophoneLevel(Math.min(100, Math.round(average * 1.8)))
              frame = window.requestAnimationFrame(updateLevel)
            }
          }
          updateLevel()
        }
        setLoading(false)
      })
      .catch((caught) => {
        if (active) {
          setError(deviceErrorMessage(caught, mode))
          setLoading(false)
        }
      })

    return () => {
      active = false
      if (frame) window.cancelAnimationFrame(frame)
      stream?.getTracks().forEach((track) => track.stop())
      if (streamRef.current === stream) streamRef.current = null
      void audioContext?.close()
    }
  }, [cameraDeviceId, microphoneDeviceId, mode, previewVersion])

  async function confirm() {
    setConfirming(true)
    setError('')
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    const successful = await onConfirm({
      cameraDeviceId,
      microphoneDeviceId,
    })
    if (!successful) {
      setConfirming(false)
      setPreviewVersion((value) => value + 1)
    }
  }

  return (
    <main className="min-h-dvh bg-slate-950 p-4 text-white sm:p-6">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-4xl items-center justify-center">
        <section className="w-full overflow-hidden rounded-[32px] border border-white/10 bg-slate-900 shadow-2xl">
          <header className="flex items-center justify-between gap-3 border-b border-white/10 px-5 py-4 sm:px-7">
            <div>
              <h1 className="text-lg font-bold">Проверка перед занятием</h1>
              <p className="mt-1 text-xs text-slate-400">
                Выберите устройства и убедитесь, что вас видно и слышно.
              </p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="ms-icon-btn ms-icon-btn-on-dark"
              aria-label="Закрыть проверку"
            >
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="grid gap-5 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-3xl bg-slate-950">
              {mode === 'video' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="h-full min-h-[280px] w-full object-cover [transform:scaleX(-1)]"
                />
              ) : (
                <div className="text-center">
                  <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
                    <AudioLines className="h-10 w-10" />
                  </div>
                  <p className="mt-4 text-sm font-semibold">
                    Вход только с голосом
                  </p>
                </div>
              )}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80">
                  <LoaderCircle className="h-7 w-7 animate-spin text-violet-300" />
                </div>
              )}
            </div>

            <aside className="space-y-4">
              {mode === 'video' && (
                <label className="block">
                  <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                    <Camera className="h-4 w-4 text-violet-300" />
                    Камера
                  </span>
                  <select
                    value={cameraDeviceId}
                    onChange={(event) => setCameraDeviceId(event.target.value)}
                    disabled={loading || !cameras.length}
                    className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-teal-400"
                  >
                    {cameras.map((device, index) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Камера ${index + 1}`}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="block">
                <span className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-300">
                  <Mic className="h-4 w-4 text-violet-300" />
                  Микрофон
                </span>
                <select
                  value={microphoneDeviceId}
                  onChange={(event) =>
                    setMicrophoneDeviceId(event.target.value)
                  }
                  disabled={loading || !microphones.length}
                  className="w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-teal-400"
                >
                  {microphones.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Микрофон ${index + 1}`}
                    </option>
                  ))}
                </select>
              </label>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-300">
                    <Mic className="h-4 w-4 text-teal-300" />
                    Уровень микрофона
                  </span>
                  <span className="font-semibold text-teal-200">
                    {microphoneLevel}%
                  </span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-300 transition-[width] duration-100"
                    style={{ width: `${microphoneLevel}%` }}
                  />
                </div>
              </div>

              {(error || connectionError) && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-xs leading-5 text-amber-100">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error || connectionError}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => setPreviewVersion((value) => value + 1)}
                disabled={loading || confirming}
                className="ms-btn ms-btn-on-dark ms-btn-block"
              >
                <RefreshCw className="h-4 w-4" />
                Проверить ещё раз
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={
                  loading ||
                  confirming ||
                  Boolean(error) ||
                  !microphoneDeviceId ||
                  (mode === 'video' && !cameraDeviceId)
                }
                className="ms-btn ms-btn-primary ms-btn-lg ms-btn-block"
              >
                {confirming ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : mode === 'video' ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <CameraOff className="h-5 w-5" />
                )}
                {confirming
                  ? 'Подключаем комнату…'
                  : mode === 'video'
                    ? 'Войти с этими устройствами'
                    : 'Войти только с голосом'}
              </button>
            </aside>
          </div>
        </section>
      </div>
    </main>
  )
}
