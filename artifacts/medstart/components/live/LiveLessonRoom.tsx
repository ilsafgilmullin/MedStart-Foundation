'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useConnectionQualityIndicator,
  useConnectionState,
  useLocalParticipant,
} from '@livekit/components-react'
import {
  AudioPresets,
  ConnectionQuality,
  ConnectionState,
  VideoPresets,
} from 'livekit-client'
import {
  ArrowLeft,
  Clock3,
  LayoutDashboard,
  MessageCircle,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import DemoLessonRoom from './DemoLessonRoom'
import LessonChat from './LessonChat'
import LessonControls from './LessonControls'
import MedicalWorkspace from './MedicalWorkspace'
import VideoStage from './VideoStage'
import { bookingDateTime, formatBookingDate, type Booking } from '@/lib/domain'

export interface LiveSessionCredentials {
  serverUrl: string
  roomName: string
  participantToken: string
}

interface LiveLessonRoomProps {
  booking: Booking
  credentials: LiveSessionCredentials
  userUid: string
  userName: string
  participantRole: 'student' | 'tutor'
  joinWithVideo: boolean
  onLeave: () => void
  onConnectionError: (message: string) => void
}

type MobileView = 'board' | 'video' | 'chat'

function connectionLabel(state: ConnectionState, quality: ConnectionQuality) {
  if (
    state === ConnectionState.Reconnecting ||
    state === ConnectionState.SignalReconnecting
  ) {
    return { text: 'Переподключаемся…', style: 'bg-amber-400' }
  }
  if (state !== ConnectionState.Connected) {
    return { text: 'Подключение…', style: 'bg-slate-400' }
  }
  if (quality === ConnectionQuality.Poor) {
    return { text: 'Слабая сеть', style: 'bg-amber-400' }
  }
  if (quality === ConnectionQuality.Lost) {
    return { text: 'Сеть потеряна', style: 'bg-red-400' }
  }
  return { text: 'Связь защищена', style: 'bg-emerald-400' }
}

function Workspace({
  booking,
  userUid,
  userName,
  participantRole,
  onLeave,
  onConnectionError,
}: Omit<LiveLessonRoomProps, 'credentials' | 'joinWithVideo'>) {
  const [mobileView, setMobileView] = useState<MobileView>('board')
  const [now, setNow] = useState(Date.now())
  const state = useConnectionState()
  const { localParticipant } = useLocalParticipant()
  const { quality } = useConnectionQualityIndicator({
    participant: localParticipant,
  })
  const connection = connectionLabel(state, quality)
  const counterpart =
    participantRole === 'tutor' ? booking.studentName : booking.tutorName
  const schoolLesson = booking.learnerTrack === 'school'

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  const timeLabel = useMemo(() => {
    const startsAt = bookingDateTime(booking)
    if (!startsAt || now < startsAt) {
      return formatBookingDate(booking)
    }
    const elapsed = Math.max(0, Math.floor((now - startsAt) / 60_000))
    return `${elapsed} мин в занятии`
  }, [booking, now])

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-slate-950 text-white">
      <header className="shrink-0 border-b border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur sm:px-5">
        <div className="mx-auto flex max-w-[1800px] items-center gap-3">
          <button
            type="button"
            onClick={onLeave}
            aria-label="Вернуться в расписание"
            className="ms-icon-btn ms-icon-btn-on-dark"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-sm font-bold sm:text-base">
                {booking.subject}
              </h1>
              <span className="hidden rounded-full bg-violet-500/20 px-2 py-1 text-[10px] font-semibold text-violet-200 sm:inline">
                {schoolLesson
                  ? 'MedStart School Live'
                  : 'MedStart Medical Live'}
              </span>
            </div>
            <p className="mt-0.5 flex items-center gap-2 truncate text-[11px] text-slate-400">
              <span className="truncate">С вами: {counterpart}</span>
              <span>·</span>
              <span className="flex shrink-0 items-center gap-1">
                <Clock3 className="h-3 w-3" />
                {timeLabel}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-[10px] font-semibold text-slate-200 sm:text-xs">
            <span className={`h-2 w-2 rounded-full ${connection.style}`} />
            <span className="hidden sm:inline">{connection.text}</span>
            <ShieldCheck className="h-3.5 w-3.5 text-violet-300" />
          </div>
        </div>

        <nav className="mt-3 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1 lg:hidden">
          {(
            [
              ['board', schoolLesson ? 'Доска' : 'Меддоска', LayoutDashboard],
              ['video', 'Видео', UsersRound],
              ['chat', 'Чат', MessageCircle],
            ] as const
          ).map(([view, label, Icon]) => (
            <button
              key={view}
              type="button"
              onClick={() => setMobileView(view)}
              aria-pressed={mobileView === view}
              className="ms-choice ms-choice-dark w-full gap-1.5 px-2 py-2 text-[11px]"
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto grid min-h-0 w-full max-w-[1800px] flex-1 gap-3 overflow-hidden p-2 sm:p-3 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div
          className={`min-h-0 ${mobileView === 'board' ? 'block' : 'hidden'} lg:block`}
        >
          <MedicalWorkspace
            bookingId={booking.id}
            userUid={userUid}
            userName={userName}
            tutorUid={booking.tutorUid}
            canClear={participantRole === 'tutor'}
            participantRole={participantRole}
            learnerTrack={booking.learnerTrack}
          />
        </div>

        <aside className="hidden min-h-0 flex-col gap-3 overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 p-3 lg:flex">
          <div className="max-h-[48%] min-h-[250px] overflow-hidden">
            <VideoStage />
          </div>
          <LessonChat booking={booking} userUid={userUid} />
        </aside>

        {mobileView === 'video' && (
          <div className="min-h-0 overflow-y-auto rounded-3xl border border-white/10 bg-slate-900 p-3 lg:hidden">
            <VideoStage />
          </div>
        )}

        {mobileView === 'chat' && (
          <div className="flex min-h-0 lg:hidden">
            <LessonChat booking={booking} userUid={userUid} />
          </div>
        )}
      </main>

      <LessonControls onLeave={onLeave} onError={onConnectionError} />
    </div>
  )
}

export default function LiveLessonRoom({
  booking,
  credentials,
  userUid,
  userName,
  participantRole,
  joinWithVideo,
  onLeave,
  onConnectionError,
}: LiveLessonRoomProps) {
  if (credentials.serverUrl === 'demo://local') {
    return (
      <DemoLessonRoom
        booking={booking}
        userUid={userUid}
        userName={userName}
        participantRole={participantRole}
        onLeave={onLeave}
      />
    )
  }

  return (
    <LiveKitRoom
      token={credentials.participantToken}
      serverUrl={credentials.serverUrl}
      connect
      audio={{
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }}
      video={
        joinWithVideo
          ? {
              resolution: VideoPresets.h720.resolution,
              frameRate: 24,
            }
          : false
      }
      options={{
        adaptiveStream: {
          pixelDensity: 'screen',
          pauseVideoInBackground: true,
        },
        dynacast: true,
        disconnectOnPageLeave: true,
        videoCaptureDefaults: {
          resolution: VideoPresets.h720.resolution,
          frameRate: 24,
        },
        audioCaptureDefaults: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
        publishDefaults: {
          audioPreset: AudioPresets.speech,
          dtx: true,
          red: true,
          forceStereo: false,
          simulcast: true,
          videoSimulcastLayers: [VideoPresets.h180, VideoPresets.h360],
          degradationPreference: 'maintain-framerate',
          stopMicTrackOnMute: false,
        },
      }}
      connectOptions={{
        autoSubscribe: true,
        maxRetries: 8,
        websocketTimeout: 20_000,
        peerConnectionTimeout: 20_000,
      }}
      onError={(error) => onConnectionError(error.message)}
      onMediaDeviceFailure={() =>
        onConnectionError(
          'Нет доступа к камере или микрофону. Разрешите их в настройках браузера либо продолжайте голосом и на доске.',
        )
      }
    >
      <Workspace
        booking={booking}
        userUid={userUid}
        userName={userName}
        participantRole={participantRole}
        onLeave={onLeave}
        onConnectionError={onConnectionError}
      />
      <StartAudio
        label="Нажмите, чтобы включить звук занятия"
        className="fixed left-1/2 top-20 z-[120] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl border border-violet-300/30 bg-violet-600 px-5 py-3.5 text-sm font-semibold text-white shadow-2xl"
      />
      <RoomAudioRenderer />
    </LiveKitRoom>
  )
}
