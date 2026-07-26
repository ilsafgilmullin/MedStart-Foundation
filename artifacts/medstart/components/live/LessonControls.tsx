'use client'

import { useEffect, useRef, useState } from 'react'
import {
  useConnectionQualityIndicator,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react'
import { ConnectionQuality, VideoPresets } from 'livekit-client'
import {
  AudioLines,
  Hand,
  LoaderCircle,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Video,
  VideoOff,
} from 'lucide-react'

interface LessonControlsProps {
  onLeave: () => void
  onError: (message: string) => void
}

interface ControlButtonProps {
  label: string
  active?: boolean
  danger?: boolean
  disabled?: boolean
  busy?: boolean
  onClick: () => void
  icon: typeof Mic
}

function ControlButton({
  label,
  active = false,
  danger = false,
  disabled = false,
  busy = false,
  onClick,
  icon: Icon,
}: ControlButtonProps) {
  const color = danger
    ? 'bg-red-600 text-white hover:bg-red-700'
    : active
      ? 'bg-white text-slate-950 hover:bg-slate-100'
      : 'bg-white/10 text-white hover:bg-white/15'

  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled || busy}
      onClick={onClick}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition disabled:cursor-not-allowed disabled:opacity-40 sm:h-auto sm:w-auto sm:gap-2 sm:px-4 sm:py-3 ${color}`}
    >
      {busy ? (
        <LoaderCircle className="h-5 w-5 animate-spin" />
      ) : (
        <Icon className="h-5 w-5" />
      )}
      <span className="hidden text-xs font-semibold sm:inline">{label}</span>
    </button>
  )
}

export default function LessonControls({
  onLeave,
  onError,
}: LessonControlsProps) {
  const room = useRoomContext()
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant()
  const { quality } = useConnectionQualityIndicator({
    participant: localParticipant,
  })
  const autoFallbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const handRaised =
    localParticipant.attributes['medstart.handRaised'] === 'true'
  const screenShareSupported =
    typeof navigator !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getDisplayMedia)
  const weakConnection =
    quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost

  useEffect(() => {
    if (!weakConnection || (!isCameraEnabled && !isScreenShareEnabled)) {
      if (autoFallbackTimer.current) {
        clearTimeout(autoFallbackTimer.current)
        autoFallbackTimer.current = null
      }
      return
    }

    autoFallbackTimer.current = setTimeout(() => {
      void Promise.allSettled([
        isCameraEnabled
          ? localParticipant.setCameraEnabled(false)
          : Promise.resolve(),
        isScreenShareEnabled
          ? localParticipant.setScreenShareEnabled(false)
          : Promise.resolve(),
      ]).then(() =>
        onError(
          'MedStart отключил видео из-за слабой сети. Голос и доска продолжают работать.',
        ),
      )
      autoFallbackTimer.current = null
    }, 8_000)

    return () => {
      if (autoFallbackTimer.current) {
        clearTimeout(autoFallbackTimer.current)
        autoFallbackTimer.current = null
      }
    }
  }, [
    isCameraEnabled,
    isScreenShareEnabled,
    localParticipant,
    onError,
    weakConnection,
  ])

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key)
    onError('')
    try {
      await action()
    } catch (error) {
      const detail = error instanceof Error ? error.message : ''
      onError(
        detail ||
          'Браузер не дал доступ к устройству. Проверьте разрешения камеры и микрофона.',
      )
    } finally {
      setBusy(null)
    }
  }

  function toggleMicrophone() {
    void run('microphone', () =>
      localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      }),
    )
  }

  function toggleCamera() {
    void run('camera', () =>
      localParticipant.setCameraEnabled(
        !isCameraEnabled,
        {
          resolution: VideoPresets.h720.resolution,
          frameRate: 24,
        },
        {
          simulcast: true,
          degradationPreference: 'maintain-framerate',
        },
      ),
    )
  }

  function toggleScreenShare() {
    void run('screen', () =>
      localParticipant.setScreenShareEnabled(!isScreenShareEnabled, {
        audio: false,
        resolution: VideoPresets.h720.resolution,
      }),
    )
  }

  function toggleHand() {
    void run('hand', () =>
      localParticipant.setAttributes({
        'medstart.handRaised': handRaised ? 'false' : 'true',
      }),
    )
  }

  function useAudioOnly() {
    if (!isCameraEnabled && !isScreenShareEnabled) return
    void run('audio', () =>
      Promise.all([
        isCameraEnabled
          ? localParticipant.setCameraEnabled(false)
          : Promise.resolve(),
        isScreenShareEnabled
          ? localParticipant.setScreenShareEnabled(false)
          : Promise.resolve(),
      ]),
    )
  }

  async function leave() {
    setBusy('leave')
    try {
      await room.disconnect()
    } finally {
      onLeave()
    }
  }

  return (
    <div className="border-t border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur sm:px-5">
      {weakConnection && (isCameraEnabled || isScreenShareEnabled) && (
        <button
          type="button"
          onClick={useAudioOnly}
          className="mx-auto mb-3 flex max-w-xl items-center justify-center gap-2 rounded-xl bg-amber-500/15 px-4 py-2 text-center text-xs font-semibold text-amber-200"
        >
          <AudioLines className="h-4 w-4" />
          Связь слабая — перейти на голос и доску
        </button>
      )}

      <div className="mx-auto flex max-w-4xl items-center justify-center gap-2 overflow-x-auto">
        <ControlButton
          label={isMicrophoneEnabled ? 'Выключить звук' : 'Включить звук'}
          active={isMicrophoneEnabled}
          busy={busy === 'microphone'}
          onClick={toggleMicrophone}
          icon={isMicrophoneEnabled ? Mic : MicOff}
        />
        <ControlButton
          label={isCameraEnabled ? 'Выключить видео' : 'Включить видео'}
          active={isCameraEnabled}
          busy={busy === 'camera'}
          onClick={toggleCamera}
          icon={isCameraEnabled ? Video : VideoOff}
        />
        <ControlButton
          label={isScreenShareEnabled ? 'Остановить экран' : 'Показать экран'}
          active={isScreenShareEnabled}
          disabled={!screenShareSupported}
          busy={busy === 'screen'}
          onClick={toggleScreenShare}
          icon={MonitorUp}
        />
        <ControlButton
          label={handRaised ? 'Опустить руку' : 'Поднять руку'}
          active={handRaised}
          busy={busy === 'hand'}
          onClick={toggleHand}
          icon={Hand}
        />
        <ControlButton
          label="Только аудио"
          disabled={!isCameraEnabled && !isScreenShareEnabled}
          busy={busy === 'audio'}
          onClick={useAudioOnly}
          icon={AudioLines}
        />
        <ControlButton
          label="Завершить"
          danger
          busy={busy === 'leave'}
          onClick={() => void leave()}
          icon={PhoneOff}
        />
      </div>
    </div>
  )
}
