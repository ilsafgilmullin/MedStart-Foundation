'use client'

import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  Activity,
  AlertTriangle,
  Box,
  CheckCircle2,
  ClipboardList,
  Contrast,
  FileWarning,
  FlaskConical,
  Image as ImageIcon,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import Whiteboard from './Whiteboard'
import {
  deleteMedicalAsset,
  emptyMedicalWorkspace,
  loadMedicalAssetObjectUrl,
  newLabRow,
  redactMedicalText,
  saveMedicalWorkspacePatch,
  scanMedicalText,
  subscribeToMedicalAssets,
  subscribeToMedicalWorkspace,
  type AnatomyLayer,
  type AnatomyView,
  type ClinicalCaseData,
  type EcgData,
  type ImagingModality,
  type LabRow,
  type MedicalAsset,
  type MedicalModule,
  type MedicalWorkspaceData,
  type PrivacyChecklist,
} from '@/lib/medical-workspace'

interface MedicalWorkspaceProps {
  bookingId: string
  userUid: string
  userName: string
  tutorUid: string
  canClear: boolean
  participantRole: 'student' | 'tutor'
}

type SaveState = 'loading' | 'saved' | 'saving' | 'error'

const moduleItems: Array<{
  id: MedicalModule
  label: string
  shortLabel: string
  icon: typeof LayoutDashboard
}> = [
  { id: 'board', label: 'Умная доска', shortLabel: 'Доска', icon: LayoutDashboard },
  { id: 'imaging', label: 'Медицинские снимки', shortLabel: 'Снимки', icon: ImageIcon },
  { id: 'anatomy', label: '3D-анатомия', shortLabel: 'Анатомия', icon: Box },
  { id: 'case', label: 'Клинический кейс', shortLabel: 'Кейс', icon: ClipboardList },
  { id: 'labs', label: 'Лаборатория', shortLabel: 'Лаб.', icon: FlaskConical },
  { id: 'ecg', label: 'ЭКГ и ритмы', shortLabel: 'ЭКГ', icon: Activity },
  { id: 'privacy', label: 'Безопасность', shortLabel: 'Защита', icon: ShieldCheck },
]

const modalityLabels: Record<ImagingModality, string> = {
  xray: 'Рентген',
  ct: 'КТ',
  mri: 'МРТ',
  ultrasound: 'УЗИ',
  ecg: 'ЭКГ-изображение',
  other: 'Другое',
}

const casePresets: Array<{
  name: string
  data: Partial<ClinicalCaseData>
}> = [
  {
    name: 'Боль в груди',
    data: {
      complaint: 'Боль или дискомфорт в грудной клетке.',
      anamnesis:
        'Уточнить начало, длительность, характер, локализацию, иррадиацию, связь с нагрузкой и сопутствующие симптомы.',
      examination:
        'АД на обеих руках, ЧСС, SpO₂, аускультация сердца и лёгких, оценка признаков гипоперфузии.',
      differential:
        'ОКС, ТЭЛА, расслоение аорты, перикардит, пневмоторакс, некардиальная боль.',
      plan: 'ЭКГ в 12 отведениях, тропонин в динамике, мониторинг, оценка срочности помощи.',
      teachingGoal: 'Разобрать опасные причины боли в груди и порядок первичной оценки.',
    },
  },
  {
    name: 'Одышка',
    data: {
      complaint: 'Одышка, ощущение нехватки воздуха.',
      anamnesis:
        'Уточнить острое или постепенное начало, ортопноэ, кашель, боль в груди, лихорадку, отёки и факторы риска тромбоза.',
      examination:
        'ЧДД, SpO₂, работа дыхательной мускулатуры, аускультация, оценка отёков и гемодинамики.',
      differential:
        'Пневмония, бронхообструкция, отёк лёгких, ТЭЛА, пневмоторакс, анемия.',
      plan: 'Пульсоксиметрия, ЭКГ, рентген/УЗИ лёгких, ОАК и биохимия по показаниям.',
      teachingGoal: 'Построить синдромный подход к пациенту с одышкой.',
    },
  },
  {
    name: 'Боль в животе',
    data: {
      complaint: 'Боль в животе.',
      anamnesis:
        'Локализация, миграция, интенсивность, связь с пищей, рвота, стул, мочеиспускание, менструальный и лекарственный анамнез.',
      examination:
        'Общее состояние, температура, пальпация, перитонеальные симптомы, грыжевые ворота, оценка обезвоживания.',
      differential:
        'Аппендицит, холецистит, панкреатит, кишечная непроходимость, перфорация, урологическая и гинекологическая патология.',
      plan: 'ОАК, СРБ, биохимия, анализ мочи, УЗИ/КТ по клиническим показаниям.',
      teachingGoal: 'Научиться отделять неотложную хирургическую патологию от других причин.',
    },
  },
]

const anatomyRegions = [
  { id: 'brain', label: 'Головной мозг' },
  { id: 'thorax', label: 'Грудная клетка' },
  { id: 'heart', label: 'Сердце' },
  { id: 'lungs', label: 'Лёгкие' },
  { id: 'abdomen', label: 'Брюшная полость' },
  { id: 'pelvis', label: 'Таз' },
]

const anatomyLayers: Array<{ id: AnatomyLayer; label: string }> = [
  { id: 'organs', label: 'Органы' },
  { id: 'skeleton', label: 'Скелет' },
  { id: 'vessels', label: 'Сосуды' },
]

const anatomyViews: Array<{ id: AnatomyView; label: string; rotation: number }> = [
  { id: 'front', label: 'Спереди', rotation: 0 },
  { id: 'left', label: 'Слева', rotation: -42 },
  { id: 'back', label: 'Сзади', rotation: -180 },
  { id: 'right', label: 'Справа', rotation: 42 },
]

function anatomySvgMarkup(layer: AnatomyLayer, region: string, view: AnatomyView) {
  const highlight = '#8b5cf6'
  const muted = '#cbd5e1'
  const organ = layer === 'organs' ? '#fb7185' : '#d8b4fe'
  const vessel = layer === 'vessels' ? '#ef4444' : '#c4b5fd'
  const bone = layer === 'skeleton' ? '#f8fafc' : '#e2e8f0'
  const selected = (id: string, fallback: string) =>
    region === id ? highlight : fallback
  const back = view === 'back'

  return `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="980" viewBox="0 0 720 980">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f8fafc"/><stop offset="1" stop-color="#ede9fe"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#312e81" flood-opacity=".18"/></filter>
  </defs>
  <rect width="720" height="980" rx="48" fill="url(#bg)"/>
  <text x="42" y="62" font-family="system-ui" font-size="28" font-weight="700" fill="#0f172a">MedStart 3D-анатомия</text>
  <text x="42" y="100" font-family="system-ui" font-size="18" fill="#64748b">${back ? 'Вид сзади' : 'Вид спереди'} · ${layer}</text>
  <g filter="url(#shadow)" transform="translate(110 125)">
    <ellipse cx="250" cy="82" rx="70" ry="82" fill="${selected('brain', '#ddd6fe')}" stroke="#7c3aed" stroke-width="5"/>
    <path d="M182 158 C115 205 95 330 118 475 C128 555 155 640 178 720 L322 720 C345 640 372 555 382 475 C405 330 385 205 318 158 Z" fill="#ffffff" stroke="#94a3b8" stroke-width="6"/>
    <path d="M190 170 L145 300 L92 510" fill="none" stroke="${bone}" stroke-width="34" stroke-linecap="round"/>
    <path d="M310 170 L355 300 L408 510" fill="none" stroke="${bone}" stroke-width="34" stroke-linecap="round"/>
    <path d="M205 705 L170 855" fill="none" stroke="${bone}" stroke-width="44" stroke-linecap="round"/>
    <path d="M295 705 L330 855" fill="none" stroke="${bone}" stroke-width="44" stroke-linecap="round"/>
    <g opacity="${layer === 'skeleton' ? 1 : .45}">
      <path d="M250 170 L250 690" stroke="${bone}" stroke-width="16"/>
      ${Array.from({ length: 9 }, (_, index) => `<path d="M250 ${220 + index * 36} Q${index % 2 ? 150 : 350} ${235 + index * 36} 250 ${250 + index * 36}" fill="none" stroke="${bone}" stroke-width="10"/>`).join('')}
      <path d="M190 665 Q250 735 310 665" fill="none" stroke="${selected('pelvis', bone)}" stroke-width="20"/>
    </g>
    <g opacity="${layer === 'organs' ? 1 : .5}">
      <ellipse cx="202" cy="330" rx="62" ry="118" fill="${selected('lungs', organ)}" opacity=".78"/>
      <ellipse cx="298" cy="330" rx="62" ry="118" fill="${selected('lungs', organ)}" opacity=".78"/>
      <path d="M248 340 C205 290 190 380 250 430 C310 380 295 290 252 340 Z" fill="${selected('heart', '#ef4444')}"/>
      <path d="M165 480 Q250 430 335 480 L315 590 Q250 635 185 590 Z" fill="${selected('abdomen', '#f59e0b')}" opacity=".74"/>
    </g>
    <g opacity="${layer === 'vessels' ? 1 : .36}" fill="none" stroke-linecap="round">
      <path d="M250 178 L250 700" stroke="${vessel}" stroke-width="13"/>
      <path d="M250 260 C190 270 160 315 135 370" stroke="${vessel}" stroke-width="9"/>
      <path d="M250 260 C310 270 340 315 365 370" stroke="${vessel}" stroke-width="9"/>
      <path d="M250 690 L175 850 M250 690 L325 850" stroke="#2563eb" stroke-width="10"/>
    </g>
    <rect x="118" y="205" width="264" height="290" rx="42" fill="none" stroke="${selected('thorax', muted)}" stroke-width="6" stroke-dasharray="14 12"/>
  </g>
  <text x="42" y="942" font-family="system-ui" font-size="16" fill="#64748b">Учебная модель. Не использовать для диагностики или планирования лечения.</text>
</svg>`
}

function anatomyDataUri(layer: AnatomyLayer, region: string, view: AnatomyView) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    anatomySvgMarkup(layer, region, view),
  )}`
}

function parseOptionalNumber(value: string) {
  const normalized = value.trim().replace(',', '.')
  if (!normalized) return null
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function SectionShell({
  title,
  description,
  icon,
  children,
}: {
  title: string
  description: string
  icon: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900 text-white shadow-xl">
      <header className="shrink-0 border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-violet-500/15 p-3 text-violet-300">
            {icon}
          </div>
          <div>
            <h2 className="text-base font-bold sm:text-lg">{title}</h2>
            <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
              {description}
            </p>
          </div>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">{children}</div>
    </section>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  rows?: number
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <textarea
        value={value}
        rows={rows}
        maxLength={6000}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base leading-6 text-white outline-none placeholder:text-slate-600 focus:border-violet-400 sm:text-sm"
      />
    </label>
  )
}

function ecgPath(rate: number) {
  const safeRate = Math.max(35, Math.min(190, rate || 70))
  const cycle = 6400 / safeRate
  const points: string[] = ['M 0 90']
  let x = 0
  while (x < 920) {
    points.push(
      `L ${x + cycle * 0.12} 90`,
      `Q ${x + cycle * 0.18} 76 ${x + cycle * 0.24} 90`,
      `L ${x + cycle * 0.38} 90`,
      `L ${x + cycle * 0.42} 104`,
      `L ${x + cycle * 0.46} 20`,
      `L ${x + cycle * 0.5} 132`,
      `L ${x + cycle * 0.56} 90`,
      `L ${x + cycle * 0.7} 90`,
      `Q ${x + cycle * 0.8} 62 ${x + cycle * 0.92} 90`,
      `L ${x + cycle} 90`,
    )
    x += cycle
  }
  return points.join(' ')
}

export default function MedicalWorkspace({
  bookingId,
  userUid,
  userName,
  tutorUid,
  canClear,
  participantRole,
}: MedicalWorkspaceProps) {
  const [activeModule, setActiveModule] = useState<MedicalModule>('board')
  const [workspace, setWorkspace] = useState<MedicalWorkspaceData>(() =>
    emptyMedicalWorkspace(bookingId),
  )
  const [assets, setAssets] = useState<MedicalAsset[]>([])
  const [saveState, setSaveState] = useState<SaveState>('loading')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [assetObjectUrl, setAssetObjectUrl] = useState('')
  const [brightness, setBrightness] = useState(100)
  const [contrast, setContrast] = useState(100)
  const [zoom, setZoom] = useState(100)
  const [rotation, setRotation] = useState(0)
  const [invert, setInvert] = useState(false)
  const [grayscale, setGrayscale] = useState(false)
  const [anatomyLayer, setAnatomyLayer] = useState<AnatomyLayer>('organs')
  const [anatomyView, setAnatomyView] = useState<AnatomyView>('front')
  const [anatomyRegion, setAnatomyRegion] = useState('thorax')

  useEffect(() => {
    setSaveState('loading')
    return subscribeToMedicalWorkspace(
      bookingId,
      (next) => {
        setWorkspace(next)
        setSaveState('saved')
      },
      () => {
        setSaveState('error')
        setError('Не удалось синхронизировать медицинское рабочее пространство.')
      },
    )
  }, [bookingId])

  useEffect(
    () =>
      subscribeToMedicalAssets(
        bookingId,
        (next) => {
          setAssets(next)
          setSelectedAssetId((current) => current || next[0]?.id || '')
        },
        () => setError('Не удалось загрузить список медицинских файлов.'),
      ),
    [bookingId],
  )

  const selectedAsset = assets.find((asset) => asset.id === selectedAssetId)

  useEffect(() => {
    let active = true
    let objectUrl = ''
    setAssetObjectUrl('')
    if (!selectedAsset || selectedAsset.mimeType === 'application/dicom') return
    void loadMedicalAssetObjectUrl(selectedAsset)
      .then((url) => {
        objectUrl = url
        if (active) setAssetObjectUrl(url)
      })
      .catch(() => {
        if (active) setError('Не удалось открыть выбранный медицинский снимок.')
      })
    return () => {
      active = false
      if (objectUrl.startsWith('blob:')) URL.revokeObjectURL(objectUrl)
    }
  }, [selectedAsset])

  const boardBackground = useMemo(() => {
    if (workspace.boardBackground.kind === 'anatomy') {
      return {
        url: anatomyDataUri(
          workspace.boardBackground.anatomyLayer,
          workspace.boardBackground.anatomyRegion,
          workspace.boardBackground.anatomyView,
        ),
        label: workspace.boardBackground.label || '3D-анатомия',
      }
    }
    if (workspace.boardBackground.kind === 'image') {
      const asset = assets.find(
        (item) => item.id === workspace.boardBackground.assetId,
      )
      if (asset && asset.id === selectedAsset?.id && assetObjectUrl) {
        return { url: assetObjectUrl, label: workspace.boardBackground.label }
      }
    }
    return { url: '', label: '' }
  }, [assetObjectUrl, assets, selectedAsset?.id, workspace.boardBackground])

  async function commitPatch(
    patch: Parameters<typeof saveMedicalWorkspacePatch>[2],
    successMessage: string,
  ) {
    setSaveState('saving')
    setError('')
    setNotice('')
    setWorkspace((current) => ({ ...current, ...patch }))
    try {
      await saveMedicalWorkspacePatch(bookingId, userUid, patch)
      setSaveState('saved')
      setNotice(successMessage)
    } catch (caught) {
      setSaveState('error')
      setError(
        caught instanceof Error ? caught.message : 'Не удалось сохранить данные.',
      )
    }
  }

  function updateClinicalCase(field: keyof ClinicalCaseData, value: string) {
    setWorkspace((current) => ({
      ...current,
      clinicalCase: { ...current.clinicalCase, [field]: value },
    }))
  }

  function updateEcg(field: keyof EcgData, value: string) {
    setWorkspace((current) => ({
      ...current,
      ecg: { ...current.ecg, [field]: value },
    }))
  }

  function updatePrivacy(field: keyof PrivacyChecklist, value: boolean | string) {
    setWorkspace((current) => ({
      ...current,
      privacy: { ...current.privacy, [field]: value },
    }))
  }

  function updateLab(id: string, field: keyof LabRow, value: string) {
    setWorkspace((current) => ({
      ...current,
      labs: current.labs.map((row) =>
        row.id === id ? { ...row, [field]: value } : row,
      ),
    }))
  }


  async function removeAsset(asset: MedicalAsset) {
    const allowed = participantRole === 'tutor' || asset.uploaderUid === userUid
    if (!allowed || !window.confirm(`Удалить файл «${asset.fileName}»?`)) return
    setError('')
    try {
      await deleteMedicalAsset(asset)
      if (workspace.boardBackground.assetId === asset.id) {
        await commitPatch(
          {
            boardBackground: {
              ...workspace.boardBackground,
              kind: 'none',
              assetId: '',
              label: '',
            },
          },
          'Фон доски удалён.',
        )
      }
      setSelectedAssetId('')
      setNotice('Файл удалён.')
    } catch {
      setError('Не удалось удалить файл.')
    }
  }

  const scanText = useMemo(
    () =>
      [
        ...Object.values(workspace.clinicalCase),
        ...workspace.labs.flatMap((row) => [row.name, row.value, row.note]),
        ...Object.values(workspace.ecg),
      ].join('\n'),
    [workspace.clinicalCase, workspace.ecg, workspace.labs],
  )
  const identifierFindings = useMemo(() => scanMedicalText(scanText), [scanText])

  const statusLabel =
    saveState === 'loading'
      ? 'Загружаем данные…'
      : saveState === 'saving'
        ? 'Сохраняем…'
        : saveState === 'error'
          ? 'Требуется повторное сохранение'
          : 'Данные занятия сохранены'

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="shrink-0 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-xl">
        <div className="flex snap-x snap-mandatory items-center gap-2 overflow-x-auto overscroll-x-contain pb-1">
          {moduleItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                aria-pressed={activeModule === item.id}
                className={`flex snap-start shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition sm:px-4 ${
                  activeModule === item.id
                    ? 'bg-violet-600 text-white'
                    : 'bg-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="sm:hidden">{item.shortLabel}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </button>
            )
          })}
          <div className="ml-auto hidden shrink-0 items-center gap-2 px-3 text-[11px] text-slate-400 xl:flex">
            {saveState === 'saving' || saveState === 'loading' ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : saveState === 'error' ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-300" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
            )}
            {statusLabel}
          </div>
        </div>
      </div>

      {(error || notice) && (
        <div
          className={`shrink-0 rounded-2xl border px-4 py-3 text-sm ${
            error
              ? 'border-red-400/20 bg-red-500/10 text-red-100'
              : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
          }`}
        >
          <div className="flex items-start gap-2">
            {error ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <p className="flex-1">{error || notice}</p>
            <button
              type="button"
              aria-label="Закрыть уведомление"
              onClick={() => {
                setError('')
                setNotice('')
              }}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1">
        {activeModule === 'board' && (
          <Whiteboard
            bookingId={bookingId}
            userUid={userUid}
            userName={userName}
            tutorUid={tutorUid}
            canClear={canClear}
            backgroundImageUrl={boardBackground.url}
            backgroundLabel={boardBackground.label}
            onClearBackground={
              workspace.boardBackground.kind !== 'none'
                ? () =>
                    void commitPatch(
                      {
                        boardBackground: {
                          ...workspace.boardBackground,
                          kind: 'none',
                          assetId: '',
                          label: '',
                        },
                      },
                      'Медицинский фон снят с доски.',
                    )
                : undefined
            }
          />
        )}

        {activeModule === 'imaging' && (
          <SectionShell
            title="Работа со снимками"
            description="Просмотр учебных снимков, настройка отображения и наложение ранее проверенных материалов на совместную доску."
            icon={<ImagePlus className="h-5 w-5" />}
          >
            <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
              <aside className="space-y-4">
                <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 p-4 text-amber-100">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold">Загрузка временно отключена</p>
                      <p className="mt-2 text-xs leading-5 text-amber-100/75">
                        Новые снимки станут доступны после подключения серверного обезличивания,
                        проверки метаданных и антивирусного сканирования. Ранее проверенные учебные
                        материалы можно продолжать просматривать.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  {assets.length ? (
                    assets.map((asset) => (
                      <div
                        key={asset.id}
                        className={`w-full rounded-2xl border p-3 ${
                          selectedAssetId === asset.id
                            ? 'border-violet-400 bg-violet-500/15'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAssetId(asset.id)}
                            className="flex min-w-0 flex-1 items-start gap-3 text-left"
                          >
                            <ImageIcon className="mt-0.5 h-5 w-5 shrink-0 text-violet-300" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold">
                                {asset.fileName}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {modalityLabels[asset.modality]} ·{' '}
                                {(asset.fileSize / 1024 / 1024).toFixed(1)} МБ
                              </p>
                            </div>
                          </button>
                          {(participantRole === 'tutor' ||
                            asset.uploaderUid === userUid) && (
                            <button
                              type="button"
                              onClick={() => void removeAsset(asset)}
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-300"
                              aria-label={`Удалить файл ${asset.fileName}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-white/15 p-5 text-center text-sm text-slate-500">
                      Снимков в занятии пока нет.
                    </div>
                  )}
                </div>
              </aside>

              <div className="min-h-[430px] overflow-hidden rounded-3xl border border-white/10 bg-black">
                {selectedAsset ? (
                  <div className="flex h-full min-h-[430px] flex-col">
                    <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-950 px-3 py-3">
                      <button
                        type="button"
                        onClick={() => setZoom((value) => Math.max(50, value - 10))}
                        className="rounded-lg bg-white/10 p-2"
                        title="Уменьшить"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setZoom((value) => Math.min(250, value + 10))}
                        className="rounded-lg bg-white/10 p-2"
                        title="Увеличить"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRotation((value) => (value + 90) % 360)}
                        className="rounded-lg bg-white/10 p-2"
                        title="Повернуть"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvert((value) => !value)}
                        className={`rounded-lg p-2 ${invert ? 'bg-violet-600' : 'bg-white/10'}`}
                        title="Инверсия"
                      >
                        <Contrast className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrayscale((value) => !value)}
                        className={`rounded-lg p-2 ${grayscale ? 'bg-violet-600' : 'bg-white/10'}`}
                        title="Оттенки серого"
                      >
                        <SlidersHorizontal className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBrightness(100)
                          setContrast(100)
                          setZoom(100)
                          setRotation(0)
                          setInvert(false)
                          setGrayscale(false)
                        }}
                        className="rounded-lg bg-white/10 p-2"
                        title="Сбросить отображение"
                      >
                        <RotateCcw className="h-4 w-4" />
                      </button>
                      <div className="ml-auto flex gap-2">
                        {selectedAsset.mimeType !== 'application/dicom' && (
                          <button
                            type="button"
                            disabled={!assetObjectUrl}
                            onClick={() =>
                              void commitPatch(
                                {
                                  boardBackground: {
                                    ...workspace.boardBackground,
                                    kind: 'image',
                                    assetId: selectedAsset.id,
                                    label: `${modalityLabels[selectedAsset.modality]} · ${selectedAsset.fileName}`,
                                  },
                                },
                                'Снимок наложен на совместную доску.',
                              )
                            }
                            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold disabled:opacity-50"
                          >
                            Наложить на доску
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 border-b border-white/10 bg-slate-950/80 px-4 py-3 sm:grid-cols-2">
                      <label className="text-xs text-slate-400">
                        Яркость: {brightness}%
                        <input
                          type="range"
                          min="40"
                          max="180"
                          value={brightness}
                          onChange={(event) => setBrightness(Number(event.target.value))}
                          className="mt-1 block w-full accent-violet-500"
                        />
                      </label>
                      <label className="text-xs text-slate-400">
                        Контраст: {contrast}%
                        <input
                          type="range"
                          min="40"
                          max="220"
                          value={contrast}
                          onChange={(event) => setContrast(Number(event.target.value))}
                          className="mt-1 block w-full accent-violet-500"
                        />
                      </label>
                    </div>
                    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-5">
                      {selectedAsset.mimeType === 'application/dicom' ? (
                        <div className="max-w-md rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 text-center text-amber-100">
                          <FileWarning className="mx-auto h-10 w-10 text-amber-300" />
                          <h3 className="mt-4 font-bold">DICOM сохранён защищённо</h3>
                          <p className="mt-2 text-sm leading-6 text-amber-100/75">
                            В этой версии доступно хранение DICOM и работа с
                            экспортированными кадрами. Полноценный покадровый
                            DICOM-стек будет подключён отдельным визуализатором.
                          </p>
                        </div>
                      ) : assetObjectUrl ? (
                        <img
                          src={assetObjectUrl}
                          alt={selectedAsset.fileName}
                          className="max-h-full max-w-full select-none object-contain transition-transform"
                          style={{
                            filter: `brightness(${brightness}%) contrast(${contrast}%) invert(${invert ? 1 : 0}) grayscale(${grayscale ? 1 : 0})`,
                            transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                          }}
                        />
                      ) : (
                        <LoaderCircle className="h-8 w-8 animate-spin text-violet-300" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[430px] items-center justify-center p-8 text-center text-slate-500">
                    Выберите или загрузите медицинский снимок.
                  </div>
                )}
              </div>
            </div>
          </SectionShell>
        )}

        {activeModule === 'anatomy' && (
          <SectionShell
            title="3D-анатомия"
            description="Интерактивные слои и проекции для объяснения анатомических ориентиров с возможностью переноса изображения на доску."
            icon={<Box className="h-5 w-5" />}
          >
            <div className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
              <aside className="space-y-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Слой
                  </p>
                  <div className="mt-2 grid gap-2">
                    {anatomyLayers.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAnatomyLayer(item.id)}
                        className={`rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                          anatomyLayer === item.id
                            ? 'bg-violet-600'
                            : 'bg-white/5 text-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Проекция
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {anatomyViews.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAnatomyView(item.id)}
                        className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                          anatomyView === item.id
                            ? 'bg-violet-600'
                            : 'bg-white/5 text-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Область
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {anatomyRegions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAnatomyRegion(item.id)}
                        className={`rounded-full px-3 py-2 text-xs font-semibold ${
                          anatomyRegion === item.id
                            ? 'bg-violet-600'
                            : 'bg-white/5 text-slate-300'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void commitPatch(
                      {
                        boardBackground: {
                          kind: 'anatomy',
                          assetId: '',
                          label: `3D-анатомия · ${anatomyRegions.find((item) => item.id === anatomyRegion)?.label ?? anatomyRegion}`,
                          anatomyLayer,
                          anatomyView,
                          anatomyRegion,
                        },
                      },
                      'Анатомическая модель наложена на доску.',
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-4 py-3 font-semibold"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  Наложить на доску
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const label =
                      anatomyRegions.find((item) => item.id === anatomyRegion)?.label ??
                      anatomyRegion
                    updateClinicalCase(
                      'examination',
                      `${workspace.clinicalCase.examination}${workspace.clinicalCase.examination ? '\n' : ''}Анатомический ориентир: ${label}.`,
                    )
                    setActiveModule('case')
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold"
                >
                  <ClipboardList className="h-4 w-4" />
                  Добавить ориентир в кейс
                </button>
              </aside>

              <div className="relative flex min-h-[560px] items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-slate-950 to-indigo-950 p-5 [perspective:1100px]">
                <div
                  className="h-full max-h-[650px] w-full max-w-[480px] transition-transform duration-700 [transform-style:preserve-3d]"
                  style={{
                    transform: `rotateY(${anatomyViews.find((item) => item.id === anatomyView)?.rotation ?? 0}deg)`,
                  }}
                >
                  <img
                    src={anatomyDataUri(anatomyLayer, anatomyRegion, anatomyView)}
                    alt="Интерактивная анатомическая модель"
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>
            </div>
          </SectionShell>
        )}

        {activeModule === 'case' && (
          <SectionShell
            title="Структурированный клинический кейс"
            description="Единая логика занятия: жалоба → анамнез → осмотр → диагноз → план."
            icon={<Stethoscope className="h-5 w-5" />}
          >
            <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
              {casePresets.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() =>
                    setWorkspace((current) => ({
                      ...current,
                      clinicalCase: { ...current.clinicalCase, ...preset.data },
                    }))
                  }
                  className="shrink-0 rounded-full border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-semibold text-violet-200"
                >
                  Шаблон: {preset.name}
                </button>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field
                label="Жалобы"
                value={workspace.clinicalCase.complaint}
                onChange={(value) => updateClinicalCase('complaint', value)}
                placeholder="Основная жалоба, локализация, выраженность…"
              />
              <Field
                label="Анамнез"
                value={workspace.clinicalCase.anamnesis}
                onChange={(value) => updateClinicalCase('anamnesis', value)}
                placeholder="Развитие симптомов, факторы риска, лекарства…"
              />
              <Field
                label="Осмотр и объективные данные"
                value={workspace.clinicalCase.examination}
                onChange={(value) => updateClinicalCase('examination', value)}
                placeholder="Витальные показатели, осмотр, пальпация, аускультация…"
              />
              <Field
                label="Рабочий диагноз"
                value={workspace.clinicalCase.diagnosis}
                onChange={(value) => updateClinicalCase('diagnosis', value)}
                placeholder="Диагноз и его обоснование…"
              />
              <Field
                label="Дифференциальный ряд"
                value={workspace.clinicalCase.differential}
                onChange={(value) => updateClinicalCase('differential', value)}
                placeholder="Альтернативные диагнозы и признаки против/за…"
              />
              <Field
                label="План"
                value={workspace.clinicalCase.plan}
                onChange={(value) => updateClinicalCase('plan', value)}
                placeholder="Обследование, тактика, контрольные точки…"
              />
              <div className="lg:col-span-2">
                <Field
                  label="Учебная цель"
                  value={workspace.clinicalCase.teachingGoal}
                  onChange={(value) => updateClinicalCase('teachingGoal', value)}
                  placeholder="Какой навык должен освоить студент к концу занятия?"
                  rows={2}
                />
              </div>
            </div>
            <button
              type="button"
              onClick={() =>
                void commitPatch(
                  { clinicalCase: workspace.clinicalCase },
                  'Клинический кейс сохранён для обоих участников.',
                )
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold sm:w-auto"
            >
              <Save className="h-4 w-4" />
              Сохранить клинический кейс
            </button>
          </SectionShell>
        )}

        {activeModule === 'labs' && (
          <SectionShell
            title="Лабораторные и числовые данные"
            description="Структурированная таблица показателей с референсами и визуальным выделением отклонений."
            icon={<FlaskConical className="h-5 w-5" />}
          >
            <div className="space-y-3">
              {workspace.labs.map((row) => {
                const numericValue = parseOptionalNumber(row.value)
                const low = parseOptionalNumber(row.referenceLow)
                const high = parseOptionalNumber(row.referenceHigh)
                const flag =
                  numericValue === null
                    ? 'Не заполнено'
                    : low !== null && numericValue < low
                      ? 'Ниже нормы'
                      : high !== null && numericValue > high
                        ? 'Выше нормы'
                        : low === null && high === null
                          ? 'Нет референсов'
                          : 'В пределах диапазона'
                return (
                  <div
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="grid gap-3 md:grid-cols-6">
                      {(
                        [
                          ['name', 'Показатель'],
                          ['value', 'Значение'],
                          ['unit', 'Единица'],
                          ['referenceLow', 'Нижняя граница'],
                          ['referenceHigh', 'Верхняя граница'],
                        ] as Array<[keyof LabRow, string]>
                      ).map(([field, label]) => (
                        <label
                          key={field}
                          className={field === 'name' ? 'md:col-span-2' : ''}
                        >
                          <span className="mb-1 block text-[10px] font-semibold uppercase text-slate-500">
                            {label}
                          </span>
                          <input
                            value={row[field]}
                            onChange={(event) =>
                              updateLab(row.id, field, event.target.value)
                            }
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                          />
                        </label>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                      <input
                        value={row.note}
                        onChange={(event) =>
                          updateLab(row.id, 'note', event.target.value)
                        }
                        placeholder="Комментарий к показателю"
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-violet-400"
                      />
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          flag === 'В пределах диапазона'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : flag === 'Ниже нормы' || flag === 'Выше нормы'
                              ? 'bg-amber-500/15 text-amber-200'
                              : 'bg-slate-500/15 text-slate-300'
                        }`}
                      >
                        {flag}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setWorkspace((current) => ({
                            ...current,
                            labs: current.labs.filter((item) => item.id !== row.id),
                          }))
                        }
                        className="rounded-xl bg-red-500/10 p-2.5 text-red-300"
                        aria-label="Удалить показатель"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
              {!workspace.labs.length && (
                <div className="rounded-3xl border border-dashed border-white/15 p-8 text-center text-slate-500">
                  Добавьте первый лабораторный или числовой показатель.
                </div>
              )}
            </div>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  setWorkspace((current) => ({
                    ...current,
                    labs: [...current.labs, newLabRow()].slice(0, 100),
                  }))
                }
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 font-semibold"
              >
                <Plus className="h-4 w-4" />
                Добавить показатель
              </button>
              <button
                type="button"
                onClick={() =>
                  void commitPatch(
                    { labs: workspace.labs },
                    'Лабораторные данные сохранены.',
                  )
                }
                className="flex items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-semibold"
              >
                <Save className="h-4 w-4" />
                Сохранить таблицу
              </button>
            </div>
          </SectionShell>
        )}

        {activeModule === 'ecg' && (
          <SectionShell
            title="ЭКГ, ритмы и кривые"
            description="Учебная разметка основных интервалов, ритма и заключения с динамической кривой."
            icon={<Activity className="h-5 w-5" />}
          >
            <div className="overflow-hidden rounded-3xl border border-red-400/20 bg-[#fff7f7] p-3">
              <svg viewBox="0 0 920 180" className="w-full" role="img" aria-label="Учебная ЭКГ-кривая">
                <defs>
                  <pattern id="smallGrid" width="10" height="10" patternUnits="userSpaceOnUse">
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#fecaca" strokeWidth="0.6" />
                  </pattern>
                  <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                    <rect width="50" height="50" fill="url(#smallGrid)" />
                    <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#fca5a5" strokeWidth="1.2" />
                  </pattern>
                </defs>
                <rect width="920" height="180" fill="url(#grid)" />
                <path
                  d={ecgPath(Number(workspace.ecg.heartRate))}
                  fill="none"
                  stroke="#be123c"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 text-xs leading-5 text-amber-100">
              Кривая генерируется как учебная иллюстрация и не является клинической ЭКГ, диагностикой или медицинским заключением.
            </p>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {(
                [
                  ['rhythm', 'Ритм'],
                  ['heartRate', 'ЧСС, уд/мин'],
                  ['axis', 'ЭОС'],
                  ['prMs', 'PR, мс'],
                  ['qrsMs', 'QRS, мс'],
                  ['qtMs', 'QT, мс'],
                  ['qtcMs', 'QTc, мс'],
                ] as Array<[keyof EcgData, string]>
              ).map(([field, label]) => (
                <label key={field}>
                  <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    {label}
                  </span>
                  <input
                    value={workspace.ecg[field]}
                    onChange={(event) => updateEcg(field, event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-violet-400"
                  />
                </label>
              ))}
            </div>
            <div className="mt-4">
              <Field
                label="Заключение и учебный разбор"
                value={workspace.ecg.conclusion}
                onChange={(value) => updateEcg('conclusion', value)}
                placeholder="Последовательно опишите ритм, частоту, интервалы, проводимость, изменения ST–T…"
              />
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              {[
                ['Синусовая тахикардия', '110'],
                ['Синусовая брадикардия', '48'],
                ['Фибрилляция предсердий', '125'],
              ].map(([rhythm, rate]) => (
                <button
                  key={rhythm}
                  type="button"
                  onClick={() =>
                    setWorkspace((current) => ({
                      ...current,
                      ecg: { ...current.ecg, rhythm, heartRate: rate },
                    }))
                  }
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300"
                >
                  {rhythm}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                void commitPatch({ ecg: workspace.ecg }, 'Разбор ЭКГ сохранён.')
              }
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold sm:w-auto"
            >
              <Save className="h-4 w-4" />
              Сохранить разбор ЭКГ
            </button>
          </SectionShell>
        )}

        {activeModule === 'privacy' && (
          <SectionShell
            title="Безопасность и обезличивание"
            description="Контроль персональных данных перед использованием реальных снимков и клинических сведений."
            icon={<ShieldCheck className="h-5 w-5" />}
          >
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="space-y-3">
                {(
                  [
                    ['deidentified', 'ФИО и другие прямые идентификаторы удалены'],
                    ['identifiersRemoved', 'На изображениях удалены подписи, номера карт и даты рождения'],
                    ['consentConfirmed', 'Есть законное основание для учебного использования'],
                    ['educationalUseOnly', 'Материалы используются только в рамках занятия'],
                  ] as Array<[keyof PrivacyChecklist, string]>
                ).map(([field, label]) => (
                  <label
                    key={field}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(workspace.privacy[field])}
                      onChange={(event) => updatePrivacy(field, event.target.checked)}
                      className="mt-1 h-5 w-5 accent-violet-600"
                    />
                    <span>
                      <strong className="text-sm">{label}</strong>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        Подтверждение фиксируется в защищённом рабочем пространстве занятия.
                      </span>
                    </span>
                  </label>
                ))}
                <label className="block rounded-2xl border border-white/10 bg-white/5 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Безопасная метка пациента
                  </span>
                  <input
                    value={workspace.privacy.patientLabel}
                    maxLength={80}
                    onChange={(event) => updatePrivacy('patientLabel', event.target.value)}
                    placeholder="Например: Учебный пациент A-01"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-violet-400"
                  />
                </label>
                <button
                  type="button"
                  onClick={() =>
                    void commitPatch(
                      { privacy: workspace.privacy },
                      'Проверка обезличивания сохранена.',
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold sm:w-auto"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Подтвердить безопасность
                </button>
              </div>

              <aside className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-start gap-3">
                  <FileWarning className="h-6 w-6 shrink-0 text-amber-300" />
                  <div>
                    <h3 className="font-bold">Автоматическая проверка текста</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Поиск возможных телефонов, почты, дат, номеров документов и ФИО. Результат требует ручной проверки.
                    </p>
                  </div>
                </div>
                {identifierFindings.length ? (
                  <div className="mt-5 space-y-2">
                    {identifierFindings.map((finding, index) => (
                      <div
                        key={`${finding.type}-${finding.match}-${index}`}
                        className="rounded-xl border border-amber-300/15 bg-amber-500/10 p-3 text-xs"
                      >
                        <p className="font-semibold text-amber-200">{finding.label}</p>
                        <p className="mt-1 break-all text-amber-100/70">{finding.match}</p>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const clinicalCase = Object.fromEntries(
                          Object.entries(workspace.clinicalCase).map(([key, value]) => [
                            key,
                            redactMedicalText(value),
                          ]),
                        ) as unknown as ClinicalCaseData
                        const labs = workspace.labs.map((row) => ({
                          ...row,
                          name: redactMedicalText(row.name),
                          note: redactMedicalText(row.note),
                        }))
                        const ecg = {
                          ...workspace.ecg,
                          conclusion: redactMedicalText(workspace.ecg.conclusion),
                        }
                        setWorkspace((current) => ({
                          ...current,
                          clinicalCase,
                          labs,
                          ecg,
                          privacy: {
                            ...current.privacy,
                            deidentified: true,
                            identifiersRemoved: true,
                          },
                        }))
                        void commitPatch(
                          {
                            clinicalCase,
                            labs,
                            ecg,
                            privacy: {
                              ...workspace.privacy,
                              deidentified: true,
                              identifiersRemoved: true,
                            },
                          },
                          'Найденные идентификаторы заменены. Проверьте текст вручную.',
                        )
                      }}
                      className="mt-2 w-full rounded-xl border border-amber-300/20 bg-amber-500/10 px-3 py-2.5 text-xs font-semibold text-amber-100"
                    >
                      Обезличить найденные фрагменты
                    </button>
                  </div>
                ) : (
                  <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                    Автоматическая проверка не нашла явных идентификаторов.
                  </div>
                )}
                <div className="mt-5 rounded-2xl border border-red-400/15 bg-red-500/10 p-4 text-xs leading-5 text-red-100/80">
                  MedStart не предназначен для хранения медицинской документации пациента. Загружайте только обезличенные учебные данные.
                </div>
              </aside>
            </div>
          </SectionShell>
        )}
      </div>
    </div>
  )
}
