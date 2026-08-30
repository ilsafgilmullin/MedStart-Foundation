'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  StartAudio,
  useConnectionQualityIndicator,
  useConnectionState,
  useLocalParticipant,
  useRoomContext,
} from '@livekit/components-react'
import {
  AudioPresets,
  ConnectionQuality,
  ConnectionState,
  VideoPresets,
} from 'livekit-client'
import {
  Activity,
  ArrowLeft,
  Clock3,
  LayoutDashboard,
  MessageCircle,
  PanelRightClose,
  PanelRightOpen,
  ShieldCheck,
  UsersRound,
} from 'lucide-react'
import DemoLessonRoom from './DemoLessonRoom'
import AnatomyViewer from './AnatomyViewer'
import LessonChat from './LessonChat'
import LessonControls from './LessonControls'
import MedicalWorkspace from './MedicalWorkspace'
import VideoStage from './VideoStage'
import { bookingDateTime, formatBookingDate, type Booking } from '@/lib/domain'
import { createWhiteboardRealtimeChannel } from '@/lib/live-whiteboard'

export interface LiveSessionCredentials {
  mode: 'live' | 'workspace'
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
  cameraDeviceId: string
  microphoneDeviceId: string
  onLeave: () => void
  onConnectionError: (message: string) => void
}

type MobileView = 'board' | 'anatomy' | 'video' | 'chat'
type SideView = 'video' | 'chat' | 'anatomy'

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
}: Omit<
  LiveLessonRoomProps,
  'credentials' | 'joinWithVideo' | 'cameraDeviceId' | 'microphoneDeviceId'
>) {
  const [mobileView, setMobileView] = useState<MobileView>('board')
  const [sideView, setSideView] = useState<SideView>('video')
  const [sideOpen, setSideOpen] = useState(true)
  const [now, setNow] = useState(Date.now())
  const state = useConnectionState()
  const room = useRoomContext()
  const realtime = useMemo(() => createWhiteboardRealtimeChannel(room), [room])
  const { localParticipant } = useLocalParticipant()
  const { quality } = useConnectionQualityIndicator({
    participant: localParticipant,
  })
  const connection = connectionLabel(state, quality)
  const counterpart =
    participantRole === 'tutor' ? booking.studentName : booking.tutorName
  const schoolLesson = booking.learnerTrack === 'school'
  const mobileTabs = [
    {
      view: 'board' as const,
      label: schoolLesson ? 'Доска' : 'Меддоска',
      icon: LayoutDashboard,
    },
    ...(schoolLesson
      ? []
      : [{ view: 'anatomy' as const, label: '3D', icon: Activity }]),
    { view: 'video' as const, label: 'Видео', icon: UsersRound },
    { view: 'chat' as const, label: 'Чат', icon: MessageCircle },
  ]

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
    <div className="flex h-dvh min-h-0 min-w-0 flex-col overflow-hidden bg-slate-950 text-white">
      <header className="shrink-0 border-b border-white/10 bg-slate-950/95 px-3 pb-3 pt-[calc(0.65rem+env(safe-area-inset-top))] backdrop-blur sm:px-5 md:pb-2">
        <div className="mx-auto flex max-w-[1900px] min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onLeave}
            aria-label="Вернуться в расписание"
            className="ms-icon-btn ms-icon-btn-on-dark"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <h1 className="truncate text-sm font-bold sm:text-base">
                {booking.subject}
              </h1>
              <span className="hidden rounded-full bg-violet-500/20 px-2 py-1 text-[10px] font-semibold text-violet-200 sm:inline">
                {schoolLesson
                  ? 'MedStart School Live'
                  : 'MedStart Medical Live'}
              </span>
            </div>
            <p className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-slate-400">
              <span className="min-w-0 truncate">С вами: {counterpart}</span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden shrink-0 items-center gap-1 sm:flex">
                <Clock3 className="h-3 w-3" />
                {timeLabel}
              </span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-full bg-white/5 px-3 py-2 text-[10px] font-semibold text-slate-200 sm:text-xs">
            <span className={`h-2 w-2 rounded-full ${connection.style}`} />
            <span className="hidden lg:inline">{connection.text}</span>
            <ShieldCheck className="h-3.5 w-3.5 text-violet-300" />
          </div>

          <button
            type="button"
            onClick={() => setSideOpen((current) => !current)}
            aria-label={
              sideOpen ? 'Скрыть боковую панель' : 'Показать боковую панель'
            }
            className="ms-icon-btn ms-icon-btn-on-dark hidden md:inline-flex"
          >
            {sideOpen ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </button>
        </div>

        <nav
          className={`mt-3 grid gap-1 rounded-xl bg-white/5 p-1 md:hidden ${
            schoolLesson ? 'grid-cols-3' : 'grid-cols-4'
          }`}
        >
          {mobileTabs.map(({ view, label, icon: Icon }) => (
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

      <main
        className={`mx-auto grid min-h-0 min-w-0 w-full max-w-[1900px] flex-1 gap-2 overflow-hidden p-1.5 sm:gap-3 sm:p-3 ${
          sideOpen
            ? 'md:grid-cols-[minmax(0,1fr)_minmax(280px,34vw)] xl:grid-cols-[minmax(0,1fr)_380px]'
            : 'md:grid-cols-1'
        }`}
      >
        <div
          className={`${mobileView === 'board' ? 'block' : 'hidden'} min-h-0 min-w-0 max-w-full overflow-hidden md:block`}
        >
          <MedicalWorkspace
            bookingId={booking.id}
            userUid={userUid}
            userName={userName}
            tutorUid={booking.tutorUid}
            canClear={participantRole === 'tutor'}
            participantRole={participantRole}
            realtime={realtime}
            learnerTrack={booking.learnerTrack}
          />
        </div>

        {sideOpen && (
          <aside className="hidden min-h-0 min-w-0 flex-col overflow-hidden rounded-[26px] border border-white/10 bg-slate-900/80 p-2 md:flex xl:rounded-3xl xl:p-3">
            <div
              className={`grid shrink-0 gap-1 rounded-xl bg-white/5 p-1 ${
                schoolLesson ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              <button
                type="button"
                onClick={() => setSideView('video')}
                aria-pressed={sideView === 'video'}
                className="ms-choice ms-choice-dark w-full text-xs"
              >
                <UsersRound className="h-4 w-4" />
                Видео
              </button>
              <button
                type="button"
                onClick={() => setSideView('chat')}
                aria-pressed={sideView === 'chat'}
                className="ms-choice ms-choice-dark w-full text-xs"
              >
                <MessageCircle className="h-4 w-4" />
                Чат
              </button>
              {!schoolLesson && (
                <button
                  type="button"
                  onClick={() => setSideView('anatomy')}
                  aria-pressed={sideView === 'anatomy'}
                  className="ms-choice ms-choice-dark w-full text-xs"
                >
                  <Activity className="h-4 w-4" />
                  3D
                </button>
              )}
            </div>
            <div className="mt-2 flex min-h-0 min-w-0 flex-1 overflow-hidden">
              {sideView === 'video' ? (
                <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                  <VideoStage booking={booking} />
                </div>
              ) : sideView === 'anatomy' && !schoolLesson ? (
                <AnatomyViewer compact />
              ) : (
                <LessonChat booking={booking} userUid={userUid} />
              )}
            </div>
          </aside>
        )}

        {!schoolLesson && mobileView === 'anatomy' && (
          <div className="min-h-0 min-w-0 overflow-hidden md:hidden">
            <AnatomyViewer />
          </div>
        )}

        {mobileView === 'video' && (
          <div className="min-h-0 min-w-0 overflow-y-auto rounded-[26px] border border-white/10 bg-slate-900 p-3 md:hidden">
            <VideoStage booking={booking} />
          </div>
        )}

        {mobileView === 'chat' && (
          <div className="flex min-h-0 min-w-0 md:hidden">
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
  cameraDeviceId,
  microphoneDeviceId,
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
        deviceId: microphoneDeviceId || undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }}
      video={
        joinWithVideo
          ? {
              deviceId: cameraDeviceId || undefined,
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
