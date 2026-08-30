import { RoomEvent, type RemoteParticipant, type Room } from 'livekit-client'
import type { WhiteboardElement, WhiteboardPoint } from './domain'

const TOPIC = 'medstart.whiteboard.v1'
const MAX_LOSSY_BYTES = 1_300
const MAX_RELIABLE_BYTES = 15 * 1024

export type WhiteboardRealtimePacket =
  | { version: 1; type: 'draft' | 'commit'; element: WhiteboardElement }
  | { version: 1; type: 'delete'; elementId: string }
  | { version: 1; type: 'clear' }

export interface WhiteboardRealtimeChannel {
  publish: (
    packet: WhiteboardRealtimePacket,
    reliable: boolean,
  ) => Promise<void>
  subscribe: (
    listener: (packet: WhiteboardRealtimePacket, senderUid: string) => void,
  ) => () => void
}

export function canApplyRealtimeElement(
  existing: Pick<WhiteboardElement, 'authorUid'> | null | undefined,
  incoming: Pick<WhiteboardElement, 'authorUid'>,
  senderUid: string,
) {
  return (
    incoming.authorUid === senderUid &&
    (!existing || existing.authorUid === senderUid)
  )
}

function compactPoint(point: WhiteboardPoint): WhiteboardPoint {
  return {
    x: Math.round(point.x * 1_000) / 1_000,
    y: Math.round(point.y * 1_000) / 1_000,
  }
}

function samplePoints(points: WhiteboardPoint[], maximum: number) {
  if (points.length <= maximum) return points.map(compactPoint)
  const sampled: WhiteboardPoint[] = []
  for (let index = 0; index < maximum; index += 1) {
    const sourceIndex = Math.round(
      (index * (points.length - 1)) / Math.max(maximum - 1, 1),
    )
    sampled.push(compactPoint(points[sourceIndex]))
  }
  return sampled
}

export function compactRealtimeElement(
  element: WhiteboardElement,
  reliable: boolean,
): WhiteboardElement {
  const points = samplePoints(element.points, reliable ? 200 : 24)
  return {
    ...element,
    x: Math.round(element.x * 1_000) / 1_000,
    y: Math.round(element.y * 1_000) / 1_000,
    endX: Math.round(element.endX * 1_000) / 1_000,
    endY: Math.round(element.endY * 1_000) / 1_000,
    points,
  }
}

function isPacket(value: unknown): value is WhiteboardRealtimePacket {
  if (!value || typeof value !== 'object') return false
  const packet = value as Partial<WhiteboardRealtimePacket> & {
    element?: Partial<WhiteboardElement>
  }
  if (packet.version !== 1) return false
  if (packet.type === 'clear') return true
  if (packet.type === 'delete') {
    return (
      typeof packet.elementId === 'string' &&
      packet.elementId.length > 0 &&
      packet.elementId.length <= 160
    )
  }
  if (packet.type !== 'draft' && packet.type !== 'commit') return false
  return (
    typeof packet.element?.id === 'string' &&
    packet.element.id.length > 0 &&
    packet.element.id.length <= 160 &&
    typeof packet.element.authorUid === 'string' &&
    packet.element.authorUid.length > 0 &&
    Array.isArray(packet.element.points) &&
    packet.element.points.length <= 200
  )
}

export function createWhiteboardRealtimeChannel(
  room: Room,
): WhiteboardRealtimeChannel {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  return {
    async publish(packet, reliable) {
      const payload = encoder.encode(JSON.stringify(packet))
      const maximum = reliable ? MAX_RELIABLE_BYTES : MAX_LOSSY_BYTES
      if (payload.byteLength > maximum) {
        throw new Error('Пакет доски превышает безопасный сетевой размер.')
      }
      await room.localParticipant.publishData(payload, {
        reliable,
        topic: TOPIC,
      })
    },
    subscribe(listener) {
      const receive = (
        payload: Uint8Array,
        participant?: RemoteParticipant,
        _kind?: unknown,
        topic?: string,
      ) => {
        if (topic !== TOPIC || !participant?.identity) return
        if (!payload.byteLength || payload.byteLength > MAX_RELIABLE_BYTES)
          return
        try {
          const packet = JSON.parse(decoder.decode(payload)) as unknown
          if (isPacket(packet)) listener(packet, participant.identity)
        } catch {
          // Ignore malformed participant data without interrupting the room.
        }
      }

      room.on(RoomEvent.DataReceived, receive)
      return () => {
        room.off(RoomEvent.DataReceived, receive)
      }
    },
  }
}
