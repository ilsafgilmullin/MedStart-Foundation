'use client'

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { useDataChannel } from '@livekit/components-react'
import {
  Brush,
  Circle,
  Download,
  Eraser,
  Highlighter,
  Minus,
  PenLine,
  Redo2,
  RectangleHorizontal,
  RotateCcw,
  Save,
  Trash2,
  Type,
  WifiOff,
} from 'lucide-react'
import type {
  WhiteboardElement,
  WhiteboardElementKind,
  WhiteboardPoint,
} from '@/lib/domain'
import {
  clearWhiteboard,
  deleteWhiteboardElement,
  saveWhiteboardElement,
  subscribeToWhiteboard,
} from '@/lib/whiteboard'

const WHITEBOARD_TOPIC = 'medstart.whiteboard.v1'
const CACHE_LIMIT = 400
const MAX_POINTS = 1_200
const PREVIEW_POINTS_PER_PACKET = 4
const RELIABLE_POINTS_PER_PACKET = 48

type BoardElementBase = Omit<
  WhiteboardElement,
  'points' | 'createdAt' | 'updatedAt'
>

type BoardMessage =
  | { type: 'preview'; element: WhiteboardElement }
  | {
      type: 'stroke-preview'
      element: BoardElementBase
      startIndex: number
      points: WhiteboardPoint[]
    }
  | { type: 'upsert'; element: WhiteboardElement }
  | {
      type: 'stroke-start'
      element: BoardElementBase
      pointCount: number
    }
  | {
      type: 'stroke-chunk'
      elementId: string
      startIndex: number
      points: WhiteboardPoint[]
    }
  | { type: 'stroke-end'; elementId: string; pointCount: number }
  | { type: 'delete'; elementId: string }
  | { type: 'clear' }

interface WhiteboardProps {
  bookingId: string
  userUid: string
  userName: string
  tutorUid: string
  canClear: boolean
}

const toolItems: Array<{
  kind: WhiteboardElementKind
  label: string
  icon: typeof PenLine
}> = [
  { kind: 'pen', label: 'Перо', icon: PenLine },
  { kind: 'marker', label: 'Маркер', icon: Highlighter },
  { kind: 'eraser', label: 'Ластик', icon: Eraser },
  { kind: 'line', label: 'Линия', icon: Minus },
  { kind: 'rectangle', label: 'Прямоугольник', icon: RectangleHorizontal },
  { kind: 'ellipse', label: 'Окружность', icon: Circle },
  { kind: 'text', label: 'Текст', icon: Type },
]

const colors = [
  '#111827',
  '#7c3aed',
  '#2563eb',
  '#059669',
  '#dc2626',
  '#f59e0b',
]

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function clamp(value: number) {
  return Math.max(0, Math.min(1, value))
}

function isStrokeKind(kind: WhiteboardElementKind) {
  return kind === 'pen' || kind === 'marker' || kind === 'eraser'
}

function isBoardPoint(value: unknown): value is WhiteboardPoint {
  if (!value || typeof value !== 'object') return false
  const point = value as Partial<WhiteboardPoint>
  return (
    typeof point.x === 'number' &&
    Number.isFinite(point.x) &&
    point.x >= 0 &&
    point.x <= 1 &&
    typeof point.y === 'number' &&
    Number.isFinite(point.y) &&
    point.y >= 0 &&
    point.y <= 1
  )
}

function isBoardElementBase(value: unknown): value is BoardElementBase {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<BoardElementBase>
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.id.length <= 160 &&
    typeof item.kind === 'string' &&
    [
      'pen',
      'marker',
      'eraser',
      'line',
      'rectangle',
      'ellipse',
      'text',
    ].includes(item.kind) &&
    typeof item.authorUid === 'string' &&
    item.authorUid.length > 0 &&
    item.authorUid.length <= 160 &&
    typeof item.authorName === 'string' &&
    item.authorName.length <= 160 &&
    typeof item.color === 'string' &&
    item.color.length <= 32 &&
    typeof item.size === 'number' &&
    Number.isFinite(item.size) &&
    item.size > 0 &&
    item.size <= 64 &&
    typeof item.opacity === 'number' &&
    Number.isFinite(item.opacity) &&
    item.opacity >= 0 &&
    item.opacity <= 1 &&
    typeof item.x === 'number' &&
    Number.isFinite(item.x) &&
    typeof item.y === 'number' &&
    Number.isFinite(item.y) &&
    typeof item.endX === 'number' &&
    Number.isFinite(item.endX) &&
    typeof item.endY === 'number' &&
    Number.isFinite(item.endY) &&
    typeof item.text === 'string' &&
    item.text.length <= 500 &&
    typeof item.createdAtMs === 'number' &&
    Number.isFinite(item.createdAtMs)
  )
}

function isBoardElement(value: unknown): value is WhiteboardElement {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<WhiteboardElement>
  return (
    isBoardElementBase(value) &&
    Array.isArray(item.points) &&
    item.points.length <= MAX_POINTS &&
    item.points.every(isBoardPoint)
  )
}

function boardElementBase(element: WhiteboardElement): BoardElementBase {
  return {
    id: element.id,
    kind: element.kind,
    color: element.color,
    size: element.size,
    opacity: element.opacity,
    authorUid: element.authorUid,
    authorName: element.authorName,
    x: element.x,
    y: element.y,
    endX: element.endX,
    endY: element.endY,
    text: element.text,
    createdAtMs: element.createdAtMs,
  }
}

function elementFromBase(
  element: BoardElementBase,
  points: WhiteboardPoint[],
): WhiteboardElement {
  return { ...element, points }
}

function drawElement(
  context: CanvasRenderingContext2D,
  element: WhiteboardElement,
  width: number,
  height: number,
) {
  const x = element.x * width
  const y = element.y * height
  const endX = element.endX * width
  const endY = element.endY * height

  context.save()
  context.strokeStyle = element.kind === 'eraser' ? '#ffffff' : element.color
  context.fillStyle = element.color
  context.lineWidth = element.size
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.globalAlpha = element.opacity

  if (
    element.kind === 'pen' ||
    element.kind === 'marker' ||
    element.kind === 'eraser'
  ) {
    if (!element.points.length) {
      context.restore()
      return
    }
    context.beginPath()
    const first = element.points[0]
    context.moveTo(first.x * width, first.y * height)
    for (const point of element.points.slice(1)) {
      context.lineTo(point.x * width, point.y * height)
    }
    if (element.points.length === 1) {
      context.lineTo(first.x * width + 0.1, first.y * height + 0.1)
    }
    context.stroke()
    context.restore()
    return
  }

  if (element.kind === 'line') {
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(endX, endY)
    context.stroke()
  } else if (element.kind === 'rectangle') {
    context.strokeRect(x, y, endX - x, endY - y)
  } else if (element.kind === 'ellipse') {
    context.beginPath()
    context.ellipse(
      (x + endX) / 2,
      (y + endY) / 2,
      Math.abs(endX - x) / 2,
      Math.abs(endY - y) / 2,
      0,
      0,
      Math.PI * 2,
    )
    context.stroke()
  } else if (element.kind === 'text' && element.text) {
    context.globalAlpha = 1
    context.font = `600 ${Math.max(14, element.size * 3)}px ui-sans-serif, system-ui, sans-serif`
    context.textBaseline = 'top'
    const words = element.text.split(/\s+/)
    let line = ''
    let lineY = y
    const maxWidth = Math.max(160, width - x - 20)
    const lineHeight = Math.max(20, element.size * 3.8)

    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word
      if (context.measureText(candidate).width > maxWidth && line) {
        context.fillText(line, x, lineY)
        line = word
        lineY += lineHeight
      } else {
        line = candidate
      }
    }
    if (line) context.fillText(line, x, lineY)
  }

  context.restore()
}

function mergeElement(
  current: WhiteboardElement[],
  incoming: WhiteboardElement,
) {
  const index = current.findIndex((item) => item.id === incoming.id)
  if (index === -1) {
    return [...current, incoming].sort(
      (left, right) => left.createdAtMs - right.createdAtMs,
    )
  }
  const next = [...current]
  next[index] = incoming
  return next
}

function mergePointChunk(
  current: WhiteboardElement[],
  elementId: string,
  startIndex: number,
  points: WhiteboardPoint[],
) {
  const element = current.find((item) => item.id === elementId)
  if (!element || !isStrokeKind(element.kind)) return current

  const nextPoints = [...element.points]
  if (startIndex > nextPoints.length) {
    // Lossy preview packets may arrive with a gap. Joining the visible pieces
    // is preferable to dropping the rest of the live stroke; the reliable
    // commit and Firestore snapshot replace it with the exact path afterward.
    nextPoints.push(...points)
  } else {
    nextPoints.splice(startIndex, points.length, ...points)
  }

  const limitedPoints = nextPoints.slice(0, MAX_POINTS)
  const lastPoint = limitedPoints[limitedPoints.length - 1]
  return mergeElement(current, {
    ...element,
    points: limitedPoints,
    endX: lastPoint?.x ?? element.endX,
    endY: lastPoint?.y ?? element.endY,
  })
}

export default function Whiteboard({
  bookingId,
  userUid,
  userName,
  tutorUid,
  canClear,
}: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const elementsRef = useRef<WhiteboardElement[]>([])
  const draftRef = useRef<WhiteboardElement | null>(null)
  const redoRef = useRef<WhiteboardElement[]>([])
  const previewTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const incomingStrokeAuthors = useRef(new Map<string, string>())
  const lastPreviewAt = useRef(0)
  const previewPointIndex = useRef(0)
  const [elements, setElements] = useState<WhiteboardElement[]>([])
  const [draft, setDraft] = useState<WhiteboardElement | null>(null)
  const [tool, setTool] = useState<WhiteboardElementKind>('pen')
  const [color, setColor] = useState(colors[1])
  const [size, setSize] = useState(4)
  const [text, setText] = useState('')
  const [online, setOnline] = useState(true)
  const [syncState, setSyncState] = useState<
    'loading' | 'saved' | 'saving' | 'offline' | 'error'
  >('loading')

  useEffect(() => {
    elementsRef.current = elements
  }, [elements])

  const handleMessage = useCallback(
    (message: { payload: Uint8Array; from?: { identity: string } }) => {
      const senderUid = message.from?.identity
      if (!senderUid || senderUid === userUid) return

      let parsed: BoardMessage
      try {
        parsed = JSON.parse(
          new TextDecoder().decode(message.payload),
        ) as BoardMessage
      } catch {
        return
      }

      if (parsed.type === 'stroke-preview') {
        if (
          !isBoardElementBase(parsed.element) ||
          !isStrokeKind(parsed.element.kind) ||
          parsed.element.authorUid !== senderUid ||
          !Number.isInteger(parsed.startIndex) ||
          parsed.startIndex < 0 ||
          parsed.startIndex >= MAX_POINTS ||
          !Array.isArray(parsed.points) ||
          parsed.points.length === 0 ||
          parsed.points.length > PREVIEW_POINTS_PER_PACKET ||
          !parsed.points.every(isBoardPoint)
        ) {
          return
        }

        const existingTimer = previewTimers.current.get(parsed.element.id)
        if (existingTimer) clearTimeout(existingTimer)
        setElements((current) => {
          const hasElement = current.some(
            (item) => item.id === parsed.element.id,
          )
          const withElement = hasElement
            ? current
            : mergeElement(current, elementFromBase(parsed.element, []))
          return mergePointChunk(
            withElement,
            parsed.element.id,
            parsed.startIndex,
            parsed.points,
          )
        })

        const timer = setTimeout(() => {
          setElements((current) =>
            current.filter((item) => item.id !== parsed.element.id),
          )
          previewTimers.current.delete(parsed.element.id)
        }, 5_000)
        previewTimers.current.set(parsed.element.id, timer)
        return
      }

      if (parsed.type === 'preview' || parsed.type === 'upsert') {
        if (
          !isBoardElement(parsed.element) ||
          parsed.element.authorUid !== senderUid
        ) {
          return
        }

        const existingTimer = previewTimers.current.get(parsed.element.id)
        if (existingTimer) clearTimeout(existingTimer)
        setElements((current) => mergeElement(current, parsed.element))

        if (parsed.type === 'preview') {
          const timer = setTimeout(() => {
            setElements((current) =>
              current.filter((item) => item.id !== parsed.element.id),
            )
            previewTimers.current.delete(parsed.element.id)
          }, 5_000)
          previewTimers.current.set(parsed.element.id, timer)
        } else {
          previewTimers.current.delete(parsed.element.id)
        }
        return
      }

      if (parsed.type === 'stroke-start') {
        if (
          !isBoardElementBase(parsed.element) ||
          !isStrokeKind(parsed.element.kind) ||
          parsed.element.authorUid !== senderUid ||
          !Number.isInteger(parsed.pointCount) ||
          parsed.pointCount < 1 ||
          parsed.pointCount > MAX_POINTS
        ) {
          return
        }

        const existingTimer = previewTimers.current.get(parsed.element.id)
        if (existingTimer) clearTimeout(existingTimer)
        previewTimers.current.delete(parsed.element.id)
        incomingStrokeAuthors.current.set(parsed.element.id, senderUid)
        setElements((current) =>
          mergeElement(current, elementFromBase(parsed.element, [])),
        )
        return
      }

      if (parsed.type === 'stroke-chunk') {
        if (
          incomingStrokeAuthors.current.get(parsed.elementId) !== senderUid ||
          !Number.isInteger(parsed.startIndex) ||
          parsed.startIndex < 0 ||
          parsed.startIndex >= MAX_POINTS ||
          !Array.isArray(parsed.points) ||
          parsed.points.length === 0 ||
          parsed.points.length > RELIABLE_POINTS_PER_PACKET ||
          parsed.startIndex + parsed.points.length > MAX_POINTS ||
          !parsed.points.every(isBoardPoint)
        ) {
          return
        }
        setElements((current) => {
          const target = current.find((item) => item.id === parsed.elementId)
          if (
            !target ||
            target.authorUid !== senderUid ||
            !isStrokeKind(target.kind)
          ) {
            return current
          }
          return mergePointChunk(
            current,
            parsed.elementId,
            parsed.startIndex,
            parsed.points,
          )
        })
        return
      }

      if (parsed.type === 'stroke-end') {
        if (
          incomingStrokeAuthors.current.get(parsed.elementId) !== senderUid ||
          !Number.isInteger(parsed.pointCount) ||
          parsed.pointCount < 1 ||
          parsed.pointCount > MAX_POINTS
        ) {
          return
        }
        incomingStrokeAuthors.current.delete(parsed.elementId)
        const existingTimer = previewTimers.current.get(parsed.elementId)
        if (existingTimer) clearTimeout(existingTimer)
        previewTimers.current.delete(parsed.elementId)
        return
      }

      if (parsed.type === 'delete') {
        const target = elementsRef.current.find(
          (item) => item.id === parsed.elementId,
        )
        if (senderUid === tutorUid || target?.authorUid === senderUid) {
          incomingStrokeAuthors.current.delete(parsed.elementId)
          setElements((current) =>
            current.filter((item) => item.id !== parsed.elementId),
          )
        }
        return
      }

      if (parsed.type === 'clear' && senderUid === tutorUid) {
        incomingStrokeAuthors.current.clear()
        setElements([])
      }
    },
    [tutorUid, userUid],
  )

  const { send, isSending } = useDataChannel(WHITEBOARD_TOPIC, handleMessage)

  const sendMessage = useCallback(
    async (message: BoardMessage, reliable: boolean) => {
      try {
        await send(new TextEncoder().encode(JSON.stringify(message)), {
          reliable,
          topic: WHITEBOARD_TOPIC,
        })
      } catch {
        // Firestore remains the durable fallback when the realtime channel drops.
      }
    },
    [send],
  )

  const sendCommittedElement = useCallback(
    async (element: WhiteboardElement) => {
      if (!isStrokeKind(element.kind)) {
        await sendMessage(
          {
            type: 'upsert',
            element: elementFromBase(boardElementBase(element), element.points),
          },
          true,
        )
        return
      }

      const base = boardElementBase(element)
      await sendMessage(
        {
          type: 'stroke-start',
          element: base,
          pointCount: element.points.length,
        },
        true,
      )

      for (
        let startIndex = 0;
        startIndex < element.points.length;
        startIndex += RELIABLE_POINTS_PER_PACKET
      ) {
        await sendMessage(
          {
            type: 'stroke-chunk',
            elementId: element.id,
            startIndex,
            points: element.points.slice(
              startIndex,
              startIndex + RELIABLE_POINTS_PER_PACKET,
            ),
          },
          true,
        )
      }

      await sendMessage(
        {
          type: 'stroke-end',
          elementId: element.id,
          pointCount: element.points.length,
        },
        true,
      )
    },
    [sendMessage],
  )

  useEffect(() => {
    const cacheKey = `medstart-board-${bookingId}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as unknown
        if (Array.isArray(parsed)) {
          setElements(parsed.filter(isBoardElement))
        }
      }
    } catch {
      // A damaged local cache must never block the lesson.
    }

    return subscribeToWhiteboard(
      bookingId,
      (next) => {
        setElements(next)
        setSyncState(navigator.onLine ? 'saved' : 'offline')
      },
      () => setSyncState(navigator.onLine ? 'error' : 'offline'),
    )
  }, [bookingId])

  useEffect(() => {
    try {
      localStorage.setItem(
        `medstart-board-${bookingId}`,
        JSON.stringify(elements.slice(-CACHE_LIMIT)),
      )
    } catch {
      // Private browsing can disable storage. The realtime room still works.
    }
  }, [bookingId, elements])

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine)
      if (!navigator.onLine) setSyncState('offline')
    }
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(
    () => () => {
      for (const timer of previewTimers.current.values()) clearTimeout(timer)
      incomingStrokeAuthors.current.clear()
    },
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const render = () => {
      const rect = container.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const ratio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.floor(rect.width * ratio)
      canvas.height = Math.floor(rect.height * ratio)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`

      const context = canvas.getContext('2d')
      if (!context) return
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, rect.width, rect.height)

      for (const element of elements) {
        drawElement(context, element, rect.width, rect.height)
      }
      if (draft) drawElement(context, draft, rect.width, rect.height)
    }

    const observer = new ResizeObserver(render)
    observer.observe(container)
    render()
    return () => observer.disconnect()
  }, [draft, elements])

  const currentColor = tool === 'eraser' ? '#ffffff' : color
  const currentSize =
    tool === 'eraser' ? Math.max(14, size * 3) : tool === 'marker' ? 14 : size

  const status = useMemo(() => {
    if (!online || syncState === 'offline') {
      return { label: 'Офлайн — изменения в очереди', icon: WifiOff }
    }
    if (syncState === 'saving' || isSending) {
      return { label: 'Сохраняем…', icon: RotateCcw }
    }
    if (syncState === 'error') {
      return { label: 'Сохранение будет повторено', icon: WifiOff }
    }
    return { label: 'Доска сохранена', icon: Save }
  }, [isSending, online, syncState])

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: clamp((event.clientX - bounds.left) / bounds.width),
      y: clamp((event.clientY - bounds.top) / bounds.height),
    }
  }

  function makeElement(point: WhiteboardPoint): WhiteboardElement {
    return {
      id: newId(),
      kind: tool,
      color: currentColor,
      size: currentSize,
      opacity: tool === 'marker' ? 0.3 : 1,
      authorUid: userUid,
      authorName: userName,
      points:
        tool === 'pen' || tool === 'marker' || tool === 'eraser' ? [point] : [],
      x: point.x,
      y: point.y,
      endX: point.x,
      endY: point.y,
      text: tool === 'text' ? text.trim().slice(0, 500) : '',
      createdAtMs: Date.now(),
    }
  }

  const persistElement = useCallback(
    async (element: WhiteboardElement, clearRedo = true) => {
      const timer = previewTimers.current.get(element.id)
      if (timer) clearTimeout(timer)
      previewTimers.current.delete(element.id)
      setElements((current) => mergeElement(current, element))
      if (clearRedo) redoRef.current = []
      void sendCommittedElement(element)
      setSyncState(navigator.onLine ? 'saving' : 'offline')

      try {
        await saveWhiteboardElement(bookingId, element)
        setSyncState(navigator.onLine ? 'saved' : 'offline')
      } catch {
        setSyncState(navigator.onLine ? 'error' : 'offline')
      }
    },
    [bookingId, sendCommittedElement],
  )

  function updateDraft(next: WhiteboardElement | null) {
    draftRef.current = next
    setDraft(next)
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    const point = pointFromEvent(event)
    if (tool === 'text' && !text.trim()) return

    event.currentTarget.setPointerCapture(event.pointerId)
    const element = makeElement(point)
    previewPointIndex.current = 0
    if (tool === 'text') {
      void persistElement(element)
      setText('')
      return
    }
    updateDraft(element)
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const current = draftRef.current
    if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) {
      return
    }

    const point = pointFromEvent(event)
    let next: WhiteboardElement
    if (
      current.kind === 'pen' ||
      current.kind === 'marker' ||
      current.kind === 'eraser'
    ) {
      const last = current.points[current.points.length - 1]
      const distance = Math.hypot(point.x - last.x, point.y - last.y)
      if (distance < 0.0015) return
      const points =
        current.points.length >= MAX_POINTS
          ? current.points
          : [...current.points, point]
      next = { ...current, points, endX: point.x, endY: point.y }
    } else {
      next = { ...current, endX: point.x, endY: point.y }
    }
    updateDraft(next)

    const now = Date.now()
    if (now - lastPreviewAt.current >= 70) {
      lastPreviewAt.current = now
      if (isStrokeKind(next.kind)) {
        const base = boardElementBase(next)
        const firstUnsentPoint = previewPointIndex.current
        for (
          let startIndex = firstUnsentPoint;
          startIndex < next.points.length;
          startIndex += PREVIEW_POINTS_PER_PACKET
        ) {
          void sendMessage(
            {
              type: 'stroke-preview',
              element: base,
              startIndex,
              points: next.points.slice(
                startIndex,
                startIndex + PREVIEW_POINTS_PER_PACKET,
              ),
            },
            false,
          )
        }
        previewPointIndex.current = next.points.length
      } else {
        void sendMessage(
          {
            type: 'preview',
            element: elementFromBase(boardElementBase(next), next.points),
          },
          false,
        )
      }
    }
  }

  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const current = draftRef.current
    if (!current) return
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    updateDraft(null)
    void persistElement(current)
  }

  async function removeElement(element: WhiteboardElement) {
    setElements((current) => current.filter((item) => item.id !== element.id))
    void sendMessage({ type: 'delete', elementId: element.id }, true)
    setSyncState(navigator.onLine ? 'saving' : 'offline')
    try {
      await deleteWhiteboardElement(bookingId, element.id)
      setSyncState(navigator.onLine ? 'saved' : 'offline')
    } catch {
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }
  }

  function undo() {
    const ownElements = [...elementsRef.current]
      .reverse()
      .find((element) => element.authorUid === userUid)
    if (!ownElements) return
    redoRef.current.push(ownElements)
    void removeElement(ownElements)
  }

  function redo() {
    const element = redoRef.current.pop()
    if (!element) return
    void persistElement({ ...element, createdAtMs: Date.now() }, false)
  }

  async function clearAll() {
    if (
      !canClear ||
      !window.confirm(
        'Очистить всю доску у обоих участников? Отменить это действие нельзя.',
      )
    ) {
      return
    }

    setElements([])
    redoRef.current = []
    void sendMessage({ type: 'clear' }, true)
    setSyncState(navigator.onLine ? 'saving' : 'offline')
    try {
      await clearWhiteboard(bookingId)
      setSyncState(navigator.onLine ? 'saved' : 'offline')
    } catch {
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }
  }

  function exportBoard() {
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 1000
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    for (const element of elementsRef.current) {
      drawElement(context, element, canvas.width, canvas.height)
    }

    const anchor = document.createElement('a')
    anchor.href = canvas.toDataURL('image/png')
    anchor.download = `MedStart-доска-${bookingId}.png`
    anchor.click()
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
              <Brush className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900">
                Умная доска
              </h2>
              <p className="text-[11px] text-slate-500">
                {elements.length} элементов
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <status.icon
              className={`h-3.5 w-3.5 ${syncState === 'saving' ? 'animate-spin' : ''}`}
            />
            <span className="hidden sm:inline">{status.label}</span>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
          {toolItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.kind}
                type="button"
                title={item.label}
                aria-label={item.label}
                onClick={() => setTool(item.kind)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition ${
                  tool === item.kind
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="h-4 w-4" />
              </button>
            )
          })}

          <div className="mx-1 h-7 w-px shrink-0 bg-slate-200" />

          {colors.map((item) => (
            <button
              key={item}
              type="button"
              aria-label={`Цвет ${item}`}
              onClick={() => setColor(item)}
              className={`h-7 w-7 shrink-0 rounded-full border-2 ${
                color === item
                  ? 'border-violet-600 ring-2 ring-violet-200'
                  : 'border-white'
              }`}
              style={{ backgroundColor: item }}
            />
          ))}

          <input
            aria-label="Толщина линии"
            type="range"
            min="2"
            max="10"
            value={size}
            onChange={(event) => setSize(Number(event.target.value))}
            className="ml-1 w-20 shrink-0 accent-violet-600"
          />

          <div className="mx-1 h-7 w-px shrink-0 bg-slate-200" />

          <button
            type="button"
            title="Отменить"
            aria-label="Отменить"
            onClick={undo}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Повторить"
            aria-label="Повторить"
            onClick={redo}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Скачать PNG"
            aria-label="Скачать доску"
            onClick={exportBoard}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <Download className="h-4 w-4" />
          </button>
          {canClear && (
            <button
              type="button"
              title="Очистить доску"
              aria-label="Очистить доску"
              onClick={() => void clearAll()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {tool === 'text' && (
          <div className="mt-2 flex items-center gap-2">
            <Type className="h-4 w-4 shrink-0 text-violet-600" />
            <input
              value={text}
              maxLength={500}
              onChange={(event) => setText(event.target.value)}
              placeholder="Введите текст, затем коснитесь доски"
              className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-white"
        style={{
          backgroundImage:
            'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      >
        <canvas
          ref={canvasRef}
          aria-label="Совместная доска MedStart"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          className={`absolute inset-0 h-full w-full touch-none ${
            tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
          }`}
        />
        {!elements.length && !draft && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center">
            <div className="rounded-3xl border border-violet-100 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
              <PenLine className="mx-auto h-7 w-7 text-violet-600" />
              <p className="mt-3 font-bold text-slate-800">
                Доска готова к работе
              </p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                Рисуйте вместе — изменения появятся у второго участника и
                сохранятся автоматически.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
