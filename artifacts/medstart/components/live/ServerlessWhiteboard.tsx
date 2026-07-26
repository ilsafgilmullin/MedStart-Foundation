'use client'

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import {
  Brush,
  Circle,
  Download,
  Eraser,
  Highlighter,
  Image as ImageIcon,
  Minus,
  PenLine,
  Redo2,
  RectangleHorizontal,
  RotateCcw,
  Save,
  Trash2,
  Type,
  WifiOff,
  X,
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

interface ServerlessWhiteboardProps {
  bookingId: string
  userUid: string
  userName: string
  tutorUid: string
  canClear: boolean
  backgroundImageUrl?: string
  backgroundLabel?: string
  onClearBackground?: () => void
}

const CACHE_LIMIT = 400
const MAX_POINTS = 1_200

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

function isBoardElement(value: unknown): value is WhiteboardElement {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<WhiteboardElement>
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.id.length <= 160 &&
    typeof item.kind === 'string' &&
    ['pen', 'marker', 'eraser', 'line', 'rectangle', 'ellipse', 'text'].includes(
      item.kind,
    ) &&
    typeof item.authorUid === 'string' &&
    typeof item.authorName === 'string' &&
    typeof item.color === 'string' &&
    typeof item.size === 'number' &&
    Number.isFinite(item.size) &&
    typeof item.opacity === 'number' &&
    Number.isFinite(item.opacity) &&
    typeof item.x === 'number' &&
    Number.isFinite(item.x) &&
    typeof item.y === 'number' &&
    Number.isFinite(item.y) &&
    typeof item.endX === 'number' &&
    Number.isFinite(item.endX) &&
    typeof item.endY === 'number' &&
    Number.isFinite(item.endY) &&
    typeof item.text === 'string' &&
    typeof item.createdAtMs === 'number' &&
    Number.isFinite(item.createdAtMs) &&
    Array.isArray(item.points) &&
    item.points.length <= MAX_POINTS &&
    item.points.every(isBoardPoint)
  )
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

function drawElement(
  context: CanvasRenderingContext2D,
  element: WhiteboardElement,
  width: number,
  height: number,
  exportMode = false,
) {
  const x = element.x * width
  const y = element.y * height
  const endX = element.endX * width
  const endY = element.endY * height

  context.save()
  if (element.kind === 'eraser') {
    context.globalCompositeOperation = exportMode
      ? 'source-over'
      : 'destination-out'
    context.strokeStyle = '#ffffff'
  } else {
    context.globalCompositeOperation = 'source-over'
    context.strokeStyle = element.color
  }
  context.fillStyle = element.color
  context.lineWidth = element.size
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.globalAlpha = element.opacity

  if (isStrokeKind(element.kind)) {
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

function loadCanvasImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

function drawContainedImage(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight)
  const drawWidth = image.naturalWidth * scale
  const drawHeight = image.naturalHeight * scale
  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  )
}

export default function ServerlessWhiteboard({
  bookingId,
  userUid,
  userName,
  canClear,
  backgroundImageUrl = '',
  backgroundLabel = '',
  onClearBackground,
}: ServerlessWhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const elementsRef = useRef<WhiteboardElement[]>([])
  const draftRef = useRef<WhiteboardElement | null>(null)
  const redoRef = useRef<WhiteboardElement[]>([])
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

  useEffect(() => {
    const cacheKey = `medstart-board-${bookingId}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as unknown
        if (Array.isArray(parsed)) setElements(parsed.filter(isBoardElement))
      }
    } catch {
      // Private mode can disable local storage.
    }

    return subscribeToWhiteboard(
      bookingId,
      (next) => {
        setElements(next.filter(isBoardElement))
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
      // Private mode can disable local storage.
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

    render()

    const observer = new ResizeObserver(render)
    observer.observe(container)
    return () => observer.disconnect()
  }, [draft, elements])

  const status = useMemo(() => {
    if (!online || syncState === 'offline') {
      return { label: 'Офлайн — изменения в очереди', icon: WifiOff }
    }
    if (syncState === 'saving') {
      return { label: 'Сохраняем…', icon: RotateCcw }
    }
    if (syncState === 'error') {
      return { label: 'Сохранение будет повторено', icon: WifiOff }
    }
    return { label: 'Доска сохранена', icon: Save }
  }, [online, syncState])

  const currentColor = tool === 'eraser' ? '#ffffff' : color
  const currentSize =
    tool === 'eraser' ? Math.max(14, size * 3) : tool === 'marker' ? 14 : size

  function pointFromEvent(event: ReactPointerEvent<HTMLCanvasElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    return {
      x: clamp((event.clientX - bounds.left) / Math.max(bounds.width, 1)),
      y: clamp((event.clientY - bounds.top) / Math.max(bounds.height, 1)),
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
      points: isStrokeKind(tool) ? [point] : [],
      x: point.x,
      y: point.y,
      endX: point.x,
      endY: point.y,
      text: tool === 'text' ? text.trim() : '',
      createdAtMs: Date.now(),
    }
  }

  async function persistElement(element: WhiteboardElement, clearRedo = true) {
    setElements((current) => mergeElement(current, element))
    if (clearRedo) redoRef.current = []
    setSyncState(navigator.onLine ? 'saving' : 'offline')
    try {
      await saveWhiteboardElement(bookingId, element)
      setSyncState(navigator.onLine ? 'saved' : 'offline')
    } catch {
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }
  }

  function updateDraft(next: WhiteboardElement | null) {
    draftRef.current = next
    setDraft(next)
  }

  function pointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0 && event.pointerType === 'mouse') return
    const point = pointFromEvent(event)
    if (tool === 'text' && !text.trim()) return
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Some embedded mobile browsers do not expose pointer capture reliably.
    }
    const element = makeElement(point)
    if (tool === 'text') {
      void persistElement(element)
      setText('')
      return
    }
    updateDraft(element)
  }

  function pointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const current = draftRef.current
    if (!current) return
    const point = pointFromEvent(event)
    let next: WhiteboardElement
    if (isStrokeKind(current.kind)) {
      const last = current.points[current.points.length - 1]
      if (last && Math.hypot(point.x - last.x, point.y - last.y) < 0.0015) return
      const points =
        current.points.length >= MAX_POINTS
          ? current.points
          : [...current.points, point]
      next = { ...current, points, endX: point.x, endY: point.y }
    } else {
      next = { ...current, endX: point.x, endY: point.y }
    }
    updateDraft(next)
  }

  function pointerUp(event: ReactPointerEvent<HTMLCanvasElement>) {
    const current = draftRef.current
    if (!current) return
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    } catch {
      // Ignore pointer-capture inconsistencies in embedded browsers.
    }
    updateDraft(null)
    void persistElement(current)
  }

  async function removeElement(element: WhiteboardElement) {
    setElements((current) => current.filter((item) => item.id !== element.id))
    setSyncState(navigator.onLine ? 'saving' : 'offline')
    try {
      await deleteWhiteboardElement(bookingId, element.id)
      setSyncState(navigator.onLine ? 'saved' : 'offline')
    } catch {
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }
  }

  function undo() {
    const ownElement = [...elementsRef.current]
      .reverse()
      .find((element) => element.authorUid === userUid)
    if (!ownElement) return
    redoRef.current.push(ownElement)
    void removeElement(ownElement)
  }

  function redo() {
    const element = redoRef.current.pop()
    if (!element) return
    void persistElement({ ...element, id: newId(), createdAtMs: Date.now() }, false)
  }

  async function clearAll() {
    if (
      !canClear ||
      !window.confirm(
        'Очистить все аннотации у обоих участников? Медицинский фон останется.',
      )
    ) {
      return
    }
    setElements([])
    redoRef.current = []
    setSyncState(navigator.onLine ? 'saving' : 'offline')
    try {
      await clearWhiteboard(bookingId)
      setSyncState(navigator.onLine ? 'saved' : 'offline')
    } catch {
      setSyncState(navigator.onLine ? 'error' : 'offline')
    }
  }

  async function exportBoard() {
    const canvas = document.createElement('canvas')
    canvas.width = 1600
    canvas.height = 1000
    const context = canvas.getContext('2d')
    if (!context) return
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    if (backgroundImageUrl) {
      try {
        const image = await loadCanvasImage(backgroundImageUrl)
        drawContainedImage(context, image, canvas.width, canvas.height)
      } catch {
        // Export annotations even if a protected image cannot be read.
      }
    }
    for (const element of elementsRef.current) {
      drawElement(context, element, canvas.width, canvas.height, true)
    }
    const anchor = document.createElement('a')
    anchor.href = canvas.toDataURL('image/png')
    anchor.download = `MedStart-доска-${bookingId}.png`
    anchor.click()
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
      <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-xl bg-violet-100 p-2 text-violet-700">
              <Brush className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-slate-900">
                Умная медицинская доска
              </h2>
              <p className="text-[11px] text-slate-500">
                {elements.length} аннотаций · синхронизация через Firebase
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

        {backgroundImageUrl && (
          <div className="mt-3 flex items-center gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
            <ImageIcon className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              Фон: {backgroundLabel || 'медицинский материал'}
            </span>
            {onClearBackground && (
              <button
                type="button"
                onClick={onClearBackground}
                className="rounded-lg p-1 hover:bg-violet-100"
                aria-label="Снять медицинский фон"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

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
            onClick={() => void exportBoard()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <Download className="h-4 w-4" />
          </button>
          {canClear && (
            <button
              type="button"
              title="Очистить аннотации"
              aria-label="Очистить аннотации"
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
              className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500"
            />
          </div>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative min-h-0 flex-1 overflow-hidden bg-white"
        style={{
          backgroundImage: backgroundImageUrl
            ? undefined
            : 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
          backgroundSize: backgroundImageUrl ? undefined : '24px 24px',
        }}
      >
        {backgroundImageUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/5 p-3">
            <img
              src={backgroundImageUrl}
              alt={backgroundLabel || 'Медицинский фон доски'}
              className="h-full w-full select-none object-contain"
            />
          </div>
        )}
        <canvas
          ref={canvasRef}
          aria-label="Совместная медицинская доска MedStart"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerCancel={pointerUp}
          className={`absolute inset-0 h-full w-full touch-none ${
            tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
          }`}
        />
        {!elements.length && !draft && !backgroundImageUrl && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-8 text-center">
            <div className="rounded-3xl border border-violet-100 bg-white/90 px-6 py-5 shadow-sm backdrop-blur">
              <PenLine className="mx-auto h-7 w-7 text-violet-600" />
              <p className="mt-3 font-bold text-slate-800">
                Доска готова к работе
              </p>
              <p className="mt-1 max-w-xs text-sm text-slate-500">
                Рисуйте вместе или наложите снимок и анатомическую модель из медицинских инструментов.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
