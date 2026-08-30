'use client'

import {
  VideoTrack,
  isTrackReference,
  useConnectionQualityIndicator,
  useLocalParticipant,
  useParticipants,
  useTracks,
  type TrackReferenceOrPlaceholder,
} from '@livekit/components-react'
import { ConnectionQuality, Track } from 'livekit-client'
import { Hand, MicOff, MonitorUp, UserRound, UsersRound } from 'lucide-react'
import type { Booking } from '@/lib/domain'

function qualityStyle(quality: ConnectionQuality) {
  if (quality === ConnectionQuality.Excellent) {
    return { label: 'Отличная связь', dot: 'bg-emerald-400' }
  }
  if (quality === ConnectionQuality.Good) {
    return { label: 'Связь стабильна', dot: 'bg-emerald-400' }
  }
  if (quality === ConnectionQuality.Poor) {
    return { label: 'Слабая связь', dot: 'bg-amber-400' }
  }
  if (quality === ConnectionQuality.Lost) {
    return { label: 'Связь потеряна', dot: 'bg-red-400' }
  }
  return { label: 'Проверяем сеть', dot: 'bg-slate-400' }
}

function trustedParticipantName(booking: Booking, identity: string) {
  if (identity === booking.studentUid) return booking.studentName || 'Студент'
  if (identity === booking.tutorUid) return booking.tutorName || 'Репетитор'
  return 'Участник занятия'
}

function ParticipantVideo({
  track,
  booking,
}: {
  track: TrackReferenceOrPlaceholder
  booking: Booking
}) {
  const { quality } = useConnectionQualityIndicator({
    participant: track.participant,
  })
  const microphone = track.participant.getTrackPublication(
    Track.Source.Microphone,
  )
  const cameraAvailable =
    isTrackReference(track) &&
    !track.publication.isMuted &&
    Boolean(track.publication.track)
  // LiveKit allows a participant with canUpdateOwnMetadata to change their
  // display name. Never trust that mutable value for MedStart identity UI.
  const name = trustedParticipantName(booking, track.participant.identity)
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.slice(0, 1))
    .join('')
    .toUpperCase()
  const status = qualityStyle(quality)

  return (
    <article
      className={`relative aspect-video overflow-hidden rounded-2xl bg-slate-900 ring-2 transition ${
        track.participant.isSpeaking ? 'ring-emerald-400' : 'ring-transparent'
      }`}
    >
      {cameraAvailable && isTrackReference(track) ? (
        <VideoTrack
          trackRef={track}
          playsInline
          className={`h-full w-full object-cover ${
            track.participant.isLocal ? '-scale-x-100' : ''
          }`}
        />
      ) : (
        <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-950 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-500/25 text-lg font-bold text-violet-200">
            {initials || <UserRound className="h-6 w-6" />}
          </div>
          <p className="mt-2 text-xs text-slate-400">Камера выключена</p>
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2.5 pt-7 text-white">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold">
            {track.participant.isLocal ? `${name} · Вы` : name}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-300">
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </p>
        </div>
        {microphone?.isMuted && (
          <div
            className="rounded-lg bg-red-500/80 p-1.5"
            title="Микрофон выключен"
          >
            <MicOff className="h-3.5 w-3.5" />
          </div>
        )}
      </div>
      {track.participant.attributes['medstart.handRaised'] === 'true' && (
        <div
          className="absolute right-2 top-2 animate-pulse rounded-xl bg-amber-400 p-2 text-amber-950 shadow-lg"
          title="Поднята рука"
        >
          <Hand className="h-4 w-4" />
        </div>
      )}
    </article>
  )
}

export default function VideoStage({ booking }: { booking: Booking }) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ])
  const participants = useParticipants()
  const { localParticipant } = useLocalParticipant()
  const cameras = tracks.filter((track) => track.source === Track.Source.Camera)
  const screenShares = tracks.filter(
    (track) =>
      track.source === Track.Source.ScreenShare && isTrackReference(track),
  )
  const waiting = participants.length < 2

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <UsersRound className="h-4 w-4 text-violet-300" />
          Участники · {participants.length}
        </div>
        {localParticipant.isScreenShareEnabled && (
          <span className="flex items-center gap-1 rounded-full bg-violet-500/20 px-2.5 py-1 text-[10px] font-semibold text-violet-200">
            <MonitorUp className="h-3 w-3" />
            Ваш экран
          </span>
        )}
      </div>

      <div className="min-h-0 min-w-0 flex-1 space-y-3 overflow-x-hidden overflow-y-auto pr-1">
        {screenShares.map((track) =>
          isTrackReference(track) ? (
            <article
              key={`${track.participant.identity}-screen`}
              className="overflow-hidden rounded-2xl border border-violet-400/30 bg-black"
            >
              <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2 text-xs font-semibold text-white">
                <MonitorUp className="h-3.5 w-3.5 text-violet-300" />
                Экран ·{' '}
                {trustedParticipantName(booking, track.participant.identity)}
              </div>
              <VideoTrack
                trackRef={track}
                playsInline
                className="aspect-video h-auto w-full object-contain"
              />
            </article>
          ) : null,
        )}

        {cameras.map((track) => (
          <ParticipantVideo
            key={`${track.participant.identity}-camera`}
            track={track}
            booking={booking}
          />
        ))}

        {waiting && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-4 text-center">
            <UsersRound className="mx-auto h-6 w-6 text-violet-300" />
            <p className="mt-2 text-xs font-semibold text-white">
              Ожидаем второго участника
            </p>
            <p className="mt-1 text-[11px] leading-5 text-slate-400">
              Он появится здесь автоматически после входа.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
