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
  Activity,
  Bone,
  ClipboardList,
  FlaskConical,
  ImagePlus,
  LockKeyhole,
  Move,
  RotateCw,
  ShieldCheck,
  Stethoscope,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import Whiteboard from './Whiteboard'
import { sanitizeAndUploadClinicalImage } from '@/lib/medical-assets'

const MEDICAL_TOPIC = 'medstart.medical-board.v1'
const MAX_ITEMS = 60

type MedicalTool = 'image' | 'anatomy' | 'clinical' | 'labs' | 'ecg' | 'security'
type Modality = 'Рентген' | 'КТ' | 'МРТ' | 'УЗИ' | 'Фото' | 'Другое'
type AnatomySystem =
  | 'Опорно-двигательная'
  | 'Сердечно-сосудистая'
  | 'Нервная'
  | 'Дыхательная'
  | 'Пищеварительная'
type AnatomyView = 'Спереди' | 'Сзади' | 'Слева' | 'Справа'
type EcgRhythm = 'Синусовый ритм' | 'Фибрилляция предсердий' | 'СВТ' | 'Желудочковая тахикардия' | 'Асистолия'

type PatientDataStatus = 'synthetic' | 'deidentified'

interface MedicalBoardBase {
  id: string
  kind: Exclude<MedicalTool, 'security'>
  title: string
  authorUid: string
  authorName: string
  x: number
  y: number
  width: number
  createdAtMs: number
  patientDataStatus: PatientDataStatus
}

interface ImageItem extends MedicalBoardBase {
  kind: 'image'
  payload: {
    url: string
    storagePath: string
    modality: Modality
    label: string
    sourceWidth: number
    sourceHeight: number
    maskApplied: boolean
  }
}

interface AnatomyItem extends MedicalBoardBase {
  kind: 'anatomy'
  payload: {
    system: AnatomySystem
    view: AnatomyView
    rotation: number
  }
}

interface ClinicalItem extends MedicalBoardBase {
  kind: 'clinical'
  payload: {
    complaint: string
    history: string
    examination: string
    diagnosis: string
    plan: string
  }
}

interface LabRow {
  id: string
  name: string
  value: string
  unit: string
  reference: string
  flag: 'normal' | 'low' | 'high' | 'critical'
}

interface LabsItem extends MedicalBoardBase {
  kind: 'labs'
  payload: {
    rows: LabRow[]
    interpretation: string
  }
}

interface EcgItem extends MedicalBoardBase {
  kind: 'ecg'
  payload: {
    rhythm: EcgRhythm
    heartRate: number
    note: string
  }
}

type MedicalBoardItem = ImageItem | AnatomyItem | ClinicalItem | LabsItem | EcgItem

type MedicalMessage =
  | { type: 'snapshot-request' }
  | { type: 'snapshot'; items: MedicalBoardItem[] }
  | { type: 'upsert'; item: MedicalBoardItem }
  | { type: 'delete'; itemId: string }

interface MedicalBoardWorkbenchProps {
  bookingId: string
  userUid: string
  userName: string
  tutorUid: string
  canClear: boolean
}

interface DragState {
  itemId: string
  startClientX: number
  startClientY: number
  originX: number
  originY: number
}

const anatomySystems: AnatomySystem[] = [
  'Опорно-двигательная',
  'Сердечно-сосудистая',
  'Нервная',
  'Дыхательная',
  'Пищеварительная',
]

const anatomyViews: AnatomyView[] = ['Спереди', 'Сзади', 'Слева', 'Справа']
const modalities: Modality[] = ['Рентген', 'КТ', 'МРТ', 'УЗИ', 'Фото', 'Другое']
const ecgRhythms: EcgRhythm[] = [
  'Синусовый ритм',
  'Фибрилляция предсердий',
  'СВТ',
  'Желудочковая тахикардия',
  'Асистолия',
]

function newId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function isMedicalItem(value: unknown): value is MedicalBoardItem {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<MedicalBoardItem>
  return (
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.id.length <= 160 &&
    ['image', 'anatomy', 'clinical', 'labs', 'ecg'].includes(String(item.kind)) &&
    typeof item.authorUid === 'string' &&
    typeof item.authorName === 'string' &&
    typeof item.title === 'string' &&
    typeof item.x === 'number' &&
    typeof item.y === 'number' &&
    typeof item.width === 'number' &&
    typeof item.createdAtMs === 'number' &&
    (item.patientDataStatus === 'synthetic' || item.patientDataStatus === 'deidentified') &&
    typeof (item as { payload?: unknown }).payload === 'object'
  )
}

function mergeItem(current: MedicalBoardItem[], incoming: MedicalBoardItem) {
  const index = current.findIndex((item) => item.id === incoming.id)
  if (index === -1) return [...current, incoming].slice(-MAX_ITEMS)
  const next = [...current]
  next[index] = incoming
  return next
}

function defaultPosition(index: number) {
  const column = index % 3
  const row = Math.floor(index / 3) % 4
  return {
    x: 0.03 + column * 0.24,
    y: 0.04 + row * 0.19,
  }
}

function flagClass(flag: LabRow['flag']) {
  if (flag === 'critical') return 'bg-red-600 text-white'
  if (flag === 'high') return 'bg-amber-100 text-amber-800'
  if (flag === 'low') return 'bg-sky-100 text-sky-800'
  return 'bg-emerald-100 text-emerald-800'
}

function ecgPath(rhythm: EcgRhythm, heartRate: number) {
  const width = 520
  const baseY = 86
  if (rhythm === 'Асистолия') return `M 0 ${baseY} L ${width} ${baseY}`

  const beats = Math.max(3, Math.min(10, Math.round(heartRate / 12)))
  const beatWidth = width / beats
  const points: Array<[number, number]> = [[0, baseY]]

  for (let beat = 0; beat < beats; beat += 1) {
    const x = beat * beatWidth
    const irregular = rhythm === 'Фибрилляция предсердий' ? (beat % 3) * 5 : 0
    const amplitude = rhythm === 'Желудочковая тахикардия' ? 42 : 30
    if (rhythm === 'Фибрилляция предсердий') {
      points.push([x + beatWidth * 0.08, baseY - 3], [x + beatWidth * 0.16, baseY + 4])
    } else {
      points.push([x + beatWidth * 0.12, baseY], [x + beatWidth * 0.22, baseY - 8])
    }
    points.push(
      [x + beatWidth * 0.34 + irregular, baseY],
      [x + beatWidth * 0.42 + irregular, baseY + 12],
      [x + beatWidth * 0.48 + irregular, baseY - amplitude],
      [x + beatWidth * 0.54 + irregular, baseY + 22],
      [x + beatWidth * 0.62 + irregular, baseY],
      [x + beatWidth * 0.78 + irregular, baseY - 10],
      [x + beatWidth * 0.92, baseY],
    )
  }

  return points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' ')
}

function AnatomyGraphic({ system, view, rotation }: AnatomyItem['payload']) {
  const hue =
    system === 'Сердечно-сосудистая'
      ? '#dc2626'
      : system === 'Нервная'
        ? '#f59e0b'
        : system === 'Дыхательная'
          ? '#0ea5e9'
          : system === 'Пищеварительная'
            ? '#16a34a'
            : '#7c3aed'
  const rotateY =
    view === 'Сзади' ? 180 : view === 'Слева' ? -55 : view === 'Справа' ? 55 : 0

  return (
    <div className="flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-slate-950/95" style={{ perspective: 700 }}>
      <svg
        viewBox="0 0 180 250"
        className="h-36 w-32 transition-transform duration-300"
        style={{ transform: `rotateY(${rotateY + rotation}deg)` }}
        aria-label={`${system}, вид ${view}`}
      >
        <circle cx="90" cy="28" r="20" fill="#f8fafc" opacity="0.9" />
        <path d="M68 53 C48 75 48 113 58 145 L50 220 H72 L82 150 H98 L108 220 H130 L122 145 C132 113 132 75 112 53 Z" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="3" />
        <path d="M67 66 L24 126 L39 137 L77 92 M113 66 L156 126 L141 137 L103 92" fill="none" stroke="#cbd5e1" strokeWidth="14" strokeLinecap="round" />
        {system === 'Опорно-двигательная' && (
          <g fill="none" stroke={hue} strokeWidth="4" opacity="0.9">
            <path d="M90 53 L90 151 M66 82 L114 82 M82 151 L65 218 M98 151 L115 218" />
            <path d="M62 107 Q90 124 118 107 M75 64 Q90 72 105 64" />
          </g>
        )}
        {system === 'Сердечно-сосудистая' && (
          <g fill="none" stroke={hue} strokeWidth="4" opacity="0.95">
            <path d="M90 82 C75 67 62 90 90 112 C118 90 105 67 90 82 Z" fill={hue} />
            <path d="M90 110 L90 181 M90 127 L63 165 M90 127 L117 165" />
          </g>
        )}
        {system === 'Нервная' && (
          <g fill="none" stroke={hue} strokeWidth="3.5" opacity="0.95">
            <circle cx="90" cy="28" r="12" fill={hue} />
            <path d="M90 40 L90 161 M90 78 L62 118 M90 78 L118 118 M90 152 L67 207 M90 152 L113 207" />
          </g>
        )}
        {system === 'Дыхательная' && (
          <g fill={hue} opacity="0.85">
            <path d="M84 67 C58 68 58 119 83 126 Z" />
            <path d="M96 67 C122 68 122 119 97 126 Z" />
            <rect x="86" y="43" width="8" height="37" rx="4" />
          </g>
        )}
        {system === 'Пищеварительная' && (
          <g fill={hue} opacity="0.88">
            <path d="M84 72 C70 85 78 111 96 108 C112 105 111 84 98 82 C93 81 93 73 84 72 Z" />
            <path d="M69 116 C65 144 73 157 89 160 C108 163 119 143 111 118 C101 128 80 128 69 116 Z" opacity="0.75" />
          </g>
        )}
      </svg>
    </div>
  )
}

function MedicalItemBody({ item }: { item: MedicalBoardItem }) {
  if (item.kind === 'image') {
    return (
      <div className="overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.payload.url} alt={item.payload.label || item.payload.modality} className="h-48 w-full object-contain" />
        <div className="flex flex-wrap items-center gap-2 border-t border-white/10 bg-slate-950 px-3 py-2 text-[10px] font-semibold text-slate-200">
          <span className="rounded-full bg-violet-500/25 px-2 py-1 text-violet-200">{item.payload.modality}</span>
          <span>{item.payload.sourceWidth}×{item.payload.sourceHeight}</span>
          {item.payload.maskApplied && <span className="text-emerald-300">Шапка скрыта</span>}
        </div>
      </div>
    )
  }

  if (item.kind === 'anatomy') {
    return (
      <div>
        <AnatomyGraphic {...item.payload} />
        <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
          <span>{item.payload.system}</span>
          <span>{item.payload.view}</span>
        </div>
      </div>
    )
  }

  if (item.kind === 'clinical') {
    const rows = [
      ['Жалоба', item.payload.complaint],
      ['Анамнез', item.payload.history],
      ['Осмотр', item.payload.examination],
      ['Диагноз', item.payload.diagnosis],
      ['План', item.payload.plan],
    ]
    return (
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">{label}</p>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{value || '—'}</p>
          </div>
        ))}
      </div>
    )
  }

  if (item.kind === 'labs') {
    return (
      <div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-[360px] text-left text-[11px]">
            <thead className="bg-slate-100 text-slate-500">
              <tr><th className="px-2 py-2">Показатель</th><th className="px-2 py-2">Значение</th><th className="px-2 py-2">Референс</th><th className="px-2 py-2">Флаг</th></tr>
            </thead>
            <tbody>
              {item.payload.rows.map((row) => (
                <tr key={row.id} className="border-t border-slate-100">
                  <td className="px-2 py-2 font-semibold text-slate-800">{row.name}</td>
                  <td className="px-2 py-2 text-slate-700">{row.value} {row.unit}</td>
                  <td className="px-2 py-2 text-slate-500">{row.reference}</td>
                  <td className="px-2 py-2"><span className={`rounded-full px-2 py-1 font-bold ${flagClass(row.flag)}`}>{row.flag}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {item.payload.interpretation && <p className="mt-2 rounded-xl bg-violet-50 px-3 py-2 text-xs text-violet-900">{item.payload.interpretation}</p>}
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-red-100 bg-[#fffdf8] p-2">
      <svg viewBox="0 0 520 150" className="h-32 w-full" role="img" aria-label={`Учебная ЭКГ: ${item.payload.rhythm}`}>
        <defs>
          <pattern id={`smallGrid-${item.id}`} width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="#fecaca" strokeWidth="0.5" /></pattern>
          <pattern id={`grid-${item.id}`} width="50" height="50" patternUnits="userSpaceOnUse"><rect width="50" height="50" fill={`url(#smallGrid-${item.id})`} /><path d="M 50 0 L 0 0 0 50" fill="none" stroke="#fca5a5" strokeWidth="1" /></pattern>
        </defs>
        <rect width="520" height="150" fill={`url(#grid-${item.id})`} />
        <path d={ecgPath(item.payload.rhythm, item.payload.heartRate)} fill="none" stroke="#111827" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-1 text-[11px]">
        <span className="font-bold text-slate-800">{item.payload.rhythm}</span>
        <span className="rounded-full bg-red-100 px-2 py-1 font-bold text-red-700">{item.payload.heartRate} уд/мин</span>
      </div>
      <p className="px-2 pb-1 text-[10px] text-slate-500">Учебная модель, не предназначена для диагностики.</p>
      {item.payload.note && <p className="mt-1 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-700">{item.payload.note}</p>}
    </div>
  )
}

export default function MedicalBoardWorkbench({
  bookingId,
  userUid,
  userName,
  tutorUid,
  canClear,
}: MedicalBoardWorkbenchProps) {
  const overlayRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<MedicalBoardItem[]>([])
  const [items, setItems] = useState<MedicalBoardItem[]>([])
  const [activeTool, setActiveTool] = useState<MedicalTool | null>(null)
  const [snapshotNonce, setSnapshotNonce] = useState(0)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const [imageFile, setImageFile] = useState<File | null>(null)
  const [modality, setModality] = useState<Modality>('Рентген')
  const [imageLabel, setImageLabel] = useState('')
  const [maskHeader, setMaskHeader] = useState(true)
  const [deidentifiedConfirmed, setDeidentifiedConfirmed] = useState(false)

  const [anatomySystem, setAnatomySystem] = useState<AnatomySystem>('Сердечно-сосудистая')
  const [anatomyView, setAnatomyView] = useState<AnatomyView>('Спереди')
  const [anatomyRotation, setAnatomyRotation] = useState(0)

  const [clinical, setClinical] = useState({ complaint: '', history: '', examination: '', diagnosis: '', plan: '' })
  const [labRows, setLabRows] = useState<LabRow[]>([
    { id: newId(), name: 'Гемоглобин', value: '', unit: 'г/л', reference: '120–160', flag: 'normal' },
    { id: newId(), name: 'Лейкоциты', value: '', unit: '×10⁹/л', reference: '4–9', flag: 'normal' },
  ])
  const [labInterpretation, setLabInterpretation] = useState('')
  const [ecgRhythm, setEcgRhythm] = useState<EcgRhythm>('Синусовый ритм')
  const [heartRate, setHeartRate] = useState(72)
  const [ecgNote, setEcgNote] = useState('')

  useEffect(() => {
    itemsRef.current = items
  }, [items])

  const handleMessage = useCallback(
    (message: { payload: Uint8Array; from?: { identity: string } }) => {
      const senderUid = message.from?.identity
      if (!senderUid || senderUid === userUid) return
      let parsed: MedicalMessage
      try {
        parsed = JSON.parse(new TextDecoder().decode(message.payload)) as MedicalMessage
      } catch {
        return
      }

      if (parsed.type === 'snapshot-request') {
        if (userUid === tutorUid) setSnapshotNonce((value) => value + 1)
        return
      }
      if (parsed.type === 'snapshot') {
        if (senderUid !== tutorUid || !Array.isArray(parsed.items)) return
        setItems(parsed.items.filter(isMedicalItem).slice(-MAX_ITEMS))
        return
      }
      if (parsed.type === 'upsert') {
        if (!isMedicalItem(parsed.item) || parsed.item.authorUid !== senderUid) return
        setItems((current) => mergeItem(current, parsed.item))
        return
      }
      if (parsed.type === 'delete') {
        const target = itemsRef.current.find((item) => item.id === parsed.itemId)
        if (senderUid === tutorUid || target?.authorUid === senderUid) {
          setItems((current) => current.filter((item) => item.id !== parsed.itemId))
        }
      }
    },
    [tutorUid, userUid],
  )

  const { send, isSending } = useDataChannel(MEDICAL_TOPIC, handleMessage)

  const sendMessage = useCallback(
    async (message: MedicalMessage) => {
      try {
        await send(new TextEncoder().encode(JSON.stringify(message)), { reliable: true, topic: MEDICAL_TOPIC })
      } catch {
        // Local cache remains available; another participant can request a snapshot after reconnect.
      }
    },
    [send],
  )

  useEffect(() => {
    const cacheKey = `medstart-medical-board-${bookingId}`
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const parsed = JSON.parse(cached) as unknown
        if (Array.isArray(parsed)) setItems(parsed.filter(isMedicalItem).slice(-MAX_ITEMS))
      }
    } catch {
      // Corrupt local cache must not block a lesson.
    }
    const timer = window.setTimeout(() => void sendMessage({ type: 'snapshot-request' }), 700)
    return () => window.clearTimeout(timer)
  }, [bookingId, sendMessage])

  useEffect(() => {
    try {
      localStorage.setItem(`medstart-medical-board-${bookingId}`, JSON.stringify(items.slice(-MAX_ITEMS)))
    } catch {
      // Private mode can disable storage; realtime still works.
    }
  }, [bookingId, items])

  useEffect(() => {
    if (!snapshotNonce || userUid !== tutorUid) return
    void sendMessage({ type: 'snapshot', items: itemsRef.current.slice(-MAX_ITEMS) })
  }, [sendMessage, snapshotNonce, tutorUid, userUid])

  useEffect(() => {
    if (!drag) return
    const move = (event: PointerEvent) => {
      const bounds = overlayRef.current?.getBoundingClientRect()
      if (!bounds?.width || !bounds.height) return
      const nextX = clamp(drag.originX + (event.clientX - drag.startClientX) / bounds.width, 0, 0.78)
      const nextY = clamp(drag.originY + (event.clientY - drag.startClientY) / bounds.height, 0, 0.82)
      setItems((current) => current.map((item) => (item.id === drag.itemId ? { ...item, x: nextX, y: nextY } : item)))
    }
    const up = () => {
      const item = itemsRef.current.find((entry) => entry.id === drag.itemId)
      if (item) void sendMessage({ type: 'upsert', item })
      setDrag(null)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up, { once: true })
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [drag, sendMessage])

  const syncLabel = useMemo(() => (isSending ? 'Синхронизация…' : `${items.length} медицинских объектов`), [isSending, items.length])

  function createItem<K extends MedicalBoardItem['kind']>(kind: K, title: string, payload: Extract<MedicalBoardItem, { kind: K }>['payload'], patientDataStatus: PatientDataStatus, width = 0.38) {
    const position = defaultPosition(itemsRef.current.length)
    const item = {
      id: newId(),
      kind,
      title: title.slice(0, 160),
      authorUid: userUid,
      authorName: userName,
      x: position.x,
      y: position.y,
      width,
      createdAtMs: Date.now(),
      patientDataStatus,
      payload,
    } as Extract<MedicalBoardItem, { kind: K }>
    setItems((current) => mergeItem(current, item))
    void sendMessage({ type: 'upsert', item })
    setActiveTool(null)
    setError('')
  }

  async function insertImage() {
    if (!imageFile || !deidentifiedConfirmed) {
      setError('Выберите снимок и подтвердите, что он обезличен.')
      return
    }
    setUploading(true)
    setError('')
    try {
      const uploaded = await sanitizeAndUploadClinicalImage({ file: imageFile, bookingId, userUid, maskHeader })
      createItem('image', imageLabel.trim() || `${modality}: учебный снимок`, {
        url: uploaded.url,
        storagePath: uploaded.storagePath,
        modality,
        label: imageLabel.trim(),
        sourceWidth: uploaded.width,
        sourceHeight: uploaded.height,
        maskApplied: uploaded.maskApplied,
      }, 'deidentified', 0.42)
      setImageFile(null)
      setImageLabel('')
      setDeidentifiedConfirmed(false)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не удалось загрузить снимок.')
    } finally {
      setUploading(false)
    }
  }

  function deleteItem(item: MedicalBoardItem) {
    if (!canClear && item.authorUid !== userUid) return
    setItems((current) => current.filter((entry) => entry.id !== item.id))
    void sendMessage({ type: 'delete', itemId: item.id })
  }

  const tools: Array<{ id: MedicalTool; label: string; icon: typeof ImagePlus }> = [
    { id: 'image', label: 'Снимки', icon: ImagePlus },
    { id: 'anatomy', label: '3D-анатомия', icon: Bone },
    { id: 'clinical', label: 'Клинический шаблон', icon: ClipboardList },
    { id: 'labs', label: 'Лаборатория', icon: FlaskConical },
    { id: 'ecg', label: 'ЭКГ', icon: Activity },
    { id: 'security', label: 'Безопасность', icon: LockKeyhole },
  ]

  return (
    <section className="flex h-full min-h-0 flex-col gap-2">
      <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-900/95 px-2 py-2 text-white shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <div className="mr-1 flex shrink-0 items-center gap-2 rounded-xl bg-violet-500/15 px-3 py-2">
            <Stethoscope className="h-4 w-4 text-violet-300" />
            <div><p className="text-[11px] font-bold">Медицинская доска</p><p className="text-[9px] text-slate-400">{syncLabel}</p></div>
          </div>
          {tools.map((tool) => {
            const Icon = tool.icon
            return (
              <button key={tool.id} type="button" onClick={() => { setError(''); setActiveTool(tool.id) }} className="flex h-10 shrink-0 items-center gap-2 rounded-xl bg-white/5 px-3 text-[11px] font-semibold text-slate-200 transition hover:bg-violet-600">
                <Icon className="h-4 w-4" />{tool.label}
              </button>
            )
          })}
          <span className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-2 text-[10px] font-semibold text-emerald-300"><ShieldCheck className="h-3.5 w-3.5" />Обезличивание включено</span>
        </div>
      </div>

      <div className="relative min-h-0 flex-1">
        <Whiteboard bookingId={bookingId} userUid={userUid} userName={userName} tutorUid={tutorUid} canClear={canClear} />
        <div ref={overlayRef} className="pointer-events-none absolute inset-x-0 bottom-0 top-[116px] z-20 overflow-hidden rounded-b-3xl">
          {items.map((item) => (
            <article key={item.id} className="pointer-events-auto absolute max-h-[76%] min-w-[230px] overflow-auto rounded-2xl border border-slate-200 bg-white p-3 text-slate-900 shadow-2xl" style={{ left: `${item.x * 100}%`, top: `${item.y * 100}%`, width: `${item.width * 100}%`, minWidth: 230, maxWidth: '92%' }}>
              <header className="mb-2 flex cursor-move items-start gap-2" onPointerDown={(event: ReactPointerEvent<HTMLElement>) => { event.preventDefault(); setDrag({ itemId: item.id, startClientX: event.clientX, startClientY: event.clientY, originX: item.x, originY: item.y }) }}>
                <Move className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1"><h3 className="truncate text-xs font-bold">{item.title}</h3><p className="mt-0.5 text-[9px] text-slate-400">{item.authorName} · {item.patientDataStatus === 'deidentified' ? 'обезличено' : 'учебные данные'}</p></div>
                {(canClear || item.authorUid === userUid) && <button type="button" aria-label="Удалить объект" onPointerDown={(event) => event.stopPropagation()} onClick={() => deleteItem(item)} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
              </header>
              <MedicalItemBody item={item} />
            </article>
          ))}
        </div>
      </div>

      {activeTool && (
        <div className="absolute inset-0 z-[90] flex items-end justify-center bg-slate-950/55 p-2 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92%] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-3"><div><h2 className="text-xl font-bold">{tools.find((tool) => tool.id === activeTool)?.label}</h2><p className="mt-1 text-sm text-slate-500">Объект появится поверх совместной доски у обоих участников.</p></div><button type="button" onClick={() => setActiveTool(null)} className="rounded-xl bg-slate-100 p-2"><X className="h-5 w-5" /></button></div>
            {error && <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

            {activeTool === 'image' && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Важно:</strong> исходный файл не загружается. MedStart повторно кодирует пиксели в WebP, удаляя EXIF и контейнерные метаданные. DICOM пока принимается только как предварительно обезличенный экспорт PNG/JPEG/WebP.</div>
                <label className="block text-sm font-semibold">Модальность<select value={modality} onChange={(event) => setModality(event.target.value as Modality)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">{modalities.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="block text-sm font-semibold">Название снимка<input value={imageLabel} onChange={(event) => setImageLabel(event.target.value)} maxLength={120} placeholder="Например: КТ органов грудной клетки" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 px-4 py-6 text-sm font-semibold text-violet-700"><UploadCloud className="h-5 w-5" />{imageFile ? imageFile.name : 'Выбрать PNG, JPEG или WebP'}<input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} /></label>
                <label className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm"><input type="checkbox" checked={maskHeader} onChange={(event) => setMaskHeader(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-600" /><span><strong>Закрыть верхние 14% изображения</strong><br /><span className="text-slate-500">Помогает скрыть ФИО, дату рождения и номер исследования, нанесённые поверх снимка.</span></span></label>
                <label className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm"><input type="checkbox" checked={deidentifiedConfirmed} onChange={(event) => setDeidentifiedConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-emerald-600" /><span>Подтверждаю, что на изображении нет ФИО, даты рождения, телефона, номера полиса, номера истории болезни и других идентификаторов пациента.</span></label>
                <button type="button" disabled={uploading} onClick={() => void insertImage()} className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white disabled:opacity-50">{uploading ? 'Обрабатываем и загружаем…' : 'Добавить обезличенный снимок'}</button>
              </div>
            )}

            {activeTool === 'anatomy' && (
              <div className="mt-5 grid gap-5 sm:grid-cols-[1fr_240px]">
                <div className="space-y-4"><label className="block text-sm font-semibold">Система<select value={anatomySystem} onChange={(event) => setAnatomySystem(event.target.value as AnatomySystem)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">{anatomySystems.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-sm font-semibold">Проекция<select value={anatomyView} onChange={(event) => setAnatomyView(event.target.value as AnatomyView)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">{anatomyViews.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-sm font-semibold">Дополнительный поворот: {anatomyRotation}°<input type="range" min="-35" max="35" value={anatomyRotation} onChange={(event) => setAnatomyRotation(Number(event.target.value))} className="mt-2 w-full accent-violet-600" /></label><button type="button" onClick={() => createItem('anatomy', anatomySystem, { system: anatomySystem, view: anatomyView, rotation: anatomyRotation }, 'synthetic', 0.3)} className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white">Наложить анатомический слой</button></div>
                <div><AnatomyGraphic system={anatomySystem} view={anatomyView} rotation={anatomyRotation} /><p className="mt-2 text-xs text-slate-500">Векторный 3D-контур работает без внешнего CDN. Полноценные валидированные GLTF-модели подключаются отдельным локальным атласом.</p></div>
              </div>
            )}

            {activeTool === 'clinical' && (
              <div className="mt-5 space-y-3">{([
                ['complaint', 'Жалоба'], ['history', 'Анамнез'], ['examination', 'Осмотр'], ['diagnosis', 'Рабочий диагноз'], ['plan', 'План'],
              ] as const).map(([key, label]) => <label key={key} className="block text-sm font-semibold">{label}<textarea value={clinical[key]} onChange={(event) => setClinical((current) => ({ ...current, [key]: event.target.value }))} rows={key === 'history' || key === 'plan' ? 3 : 2} maxLength={1200} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label>)}<button type="button" onClick={() => createItem('clinical', 'Клинический разбор', clinical, 'synthetic', 0.4)} className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white">Добавить структурированный случай</button></div>
            )}

            {activeTool === 'labs' && (
              <div className="mt-5 space-y-4"><div className="space-y-3">{labRows.map((row, index) => <div key={row.id} className="grid gap-2 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr_1fr_0.9fr_auto]"><input value={row.name} onChange={(event) => setLabRows((current) => current.map((item) => item.id === row.id ? { ...item, name: event.target.value } : item))} placeholder="Показатель" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={row.value} onChange={(event) => setLabRows((current) => current.map((item) => item.id === row.id ? { ...item, value: event.target.value } : item))} placeholder="Значение" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={row.unit} onChange={(event) => setLabRows((current) => current.map((item) => item.id === row.id ? { ...item, unit: event.target.value } : item))} placeholder="Ед." className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><input value={row.reference} onChange={(event) => setLabRows((current) => current.map((item) => item.id === row.id ? { ...item, reference: event.target.value } : item))} placeholder="Референс" className="rounded-xl border border-slate-200 px-3 py-2 text-sm" /><select value={row.flag} onChange={(event) => setLabRows((current) => current.map((item) => item.id === row.id ? { ...item, flag: event.target.value as LabRow['flag'] } : item))} className="rounded-xl border border-slate-200 px-2 py-2 text-sm"><option value="normal">Норма</option><option value="low">Низко</option><option value="high">Высоко</option><option value="critical">Критично</option></select><button type="button" aria-label={`Удалить строку ${index + 1}`} onClick={() => setLabRows((current) => current.filter((item) => item.id !== row.id))} className="rounded-xl p-2 text-red-500"><Trash2 className="h-4 w-4" /></button></div>)}</div><button type="button" onClick={() => setLabRows((current) => [...current, { id: newId(), name: '', value: '', unit: '', reference: '', flag: 'normal' }].slice(0, 12))} className="rounded-xl border border-violet-200 px-4 py-2 text-sm font-semibold text-violet-700">+ Добавить показатель</button><label className="block text-sm font-semibold">Интерпретация<textarea value={labInterpretation} onChange={(event) => setLabInterpretation(event.target.value)} rows={3} maxLength={1000} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label><button type="button" onClick={() => createItem('labs', 'Лабораторные данные', { rows: labRows.filter((row) => row.name.trim()).slice(0, 12), interpretation: labInterpretation }, 'synthetic', 0.48)} className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white">Добавить таблицу на доску</button></div>
            )}

            {activeTool === 'ecg' && (
              <div className="mt-5 space-y-4"><label className="block text-sm font-semibold">Ритм<select value={ecgRhythm} onChange={(event) => setEcgRhythm(event.target.value as EcgRhythm)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3">{ecgRhythms.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block text-sm font-semibold">ЧСС: {heartRate} уд/мин<input type="range" min="20" max="220" value={heartRate} onChange={(event) => setHeartRate(Number(event.target.value))} className="mt-2 w-full accent-violet-600" /></label><div className="rounded-2xl border border-red-100 bg-[#fffdf8] p-2"><svg viewBox="0 0 520 150" className="h-36 w-full"><path d={ecgPath(ecgRhythm, heartRate)} fill="none" stroke="#111827" strokeWidth="3" /></svg></div><label className="block text-sm font-semibold">Комментарий<textarea value={ecgNote} onChange={(event) => setEcgNote(event.target.value)} rows={3} maxLength={800} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3" /></label><button type="button" onClick={() => createItem('ecg', `ЭКГ: ${ecgRhythm}`, { rhythm: ecgRhythm, heartRate, note: ecgNote }, 'synthetic', 0.46)} className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-bold text-white">Добавить учебную кривую</button></div>
            )}

            {activeTool === 'security' && (
              <div className="mt-5 space-y-3"><div className="rounded-2xl bg-emerald-50 p-4"><h3 className="flex items-center gap-2 font-bold text-emerald-900"><ShieldCheck className="h-5 w-5" />Контур обезличивания</h3><ul className="mt-3 space-y-2 text-sm text-emerald-900"><li>✓ Исходные изображения не отправляются на сервер.</li><li>✓ EXIF удаляется повторным кодированием пикселей.</li><li>✓ Можно закрыть область с нанесёнными идентификаторами.</li><li>✓ В метаданных хранения нет исходного имени файла.</li><li>✓ Доступ к файлу ограничивается участниками подтверждённого занятия.</li></ul></div><div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Не загружайте:</strong> ФИО, дату рождения, номер полиса, адрес, телефон, номер истории болезни, штрихкоды, QR-коды и лица пациента. Автоматическое распознавание не заменяет ручную проверку.</div><div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">MedStart V6 предназначен для обучения. Клинические решения должны приниматься в медицинской информационной системе и в соответствии с локальными регламентами.</div></div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
