'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
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
import AnatomyViewer from './AnatomyViewer'
import Whiteboard from './Whiteboard'
import { anatomyDataUri } from '@/lib/anatomy-model'
import type { WhiteboardRealtimeChannel } from '@/lib/live-whiteboard'
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
  realtime?: WhiteboardRealtimeChannel
}

type SaveState = 'loading' | 'saved' | 'saving' | 'error'

const moduleItems: Array<{
  id: MedicalModule
  label: string
  shortLabel: string
  icon: typeof LayoutDashboard
}> = [
  {
    id: 'board',
    label: 'Умная доска',
    shortLabel: 'Доска',
    icon: LayoutDashboard,
  },
  {
    id: 'imaging',
    label: 'Медицинские снимки',
    shortLabel: 'Снимки',
    icon: ImageIcon,
  },
  { id: 'anatomy', label: '3D-анатомия', shortLabel: 'Анатомия', icon: Box },
  {
    id: 'case',
    label: 'Клинический кейс',
    shortLabel: 'Кейс',
    icon: ClipboardList,
  },
  { id: 'labs', label: 'Лаборатория', shortLabel: 'Лаб.', icon: FlaskConical },
  { id: 'ecg', label: 'ЭКГ и ритмы', shortLabel: 'ЭКГ', icon: Activity },
  {
    id: 'privacy',
    label: 'Безопасность',
    shortLabel: 'Защита',
    icon: ShieldCheck,
  },
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
      teachingGoal:
        'Разобрать опасные причины боли в груди и порядок первичной оценки.',
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
      teachingGoal:
        'Научиться отделять неотложную хирургическую патологию от других причин.',
    },
  },
]

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
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-5">
        {children}
      </div>
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
        className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-base leading-6 text-white outline-none placeholder:text-slate-600 focus:border-teal-400 sm:text-sm"
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
  realtime,
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
        setError(
          'Не удалось синхронизировать медицинское рабочее пространство.',
        )
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
          workspace.boardBackground.anatomyView,
          workspace.boardBackground.anatomyRegion,
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
        caught instanceof Error
          ? caught.message
          : 'Не удалось сохранить данные.',
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

  function updatePrivacy(
    field: keyof PrivacyChecklist,
    value: boolean | string,
  ) {
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
  const identifierFindings = useMemo(
    () => scanMedicalText(scanText),
    [scanText],
  )

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
                className="ms-choice ms-choice-dark snap-start shrink-0 text-xs sm:px-4"
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
              className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
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
            realtime={realtime}
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
                      <p className="text-sm font-semibold">
                        Загрузка временно отключена
                      </p>
                      <p className="mt-2 text-xs leading-5 text-amber-100/75">
                        Новые снимки станут доступны после подключения
                        серверного обезличивания, проверки метаданных и
                        антивирусного сканирования. Ранее проверенные учебные
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
                            ? 'border-teal-400 bg-teal-500/15'
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedAssetId(asset.id)}
                            className="ms-row-action min-w-0 flex-1 items-start gap-3 rounded-xl p-1 text-left text-white"
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
                              className="ms-icon-btn ms-icon-btn-danger ms-icon-btn-sm"
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
                        onClick={() =>
                          setZoom((value) => Math.max(50, value - 10))
                        }
                        className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
                        title="Уменьшить"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setZoom((value) => Math.min(250, value + 10))
                        }
                        className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
                        title="Увеличить"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setRotation((value) => (value + 90) % 360)
                        }
                        className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
                        title="Повернуть"
                      >
                        <RotateCw className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInvert((value) => !value)}
                        aria-pressed={invert}
                        className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
                        title="Инверсия"
                      >
                        <Contrast className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setGrayscale((value) => !value)}
                        aria-pressed={grayscale}
                        className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
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
                        className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
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
                            className="ms-btn ms-btn-primary ms-btn-sm"
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
                          onChange={(event) =>
                            setBrightness(Number(event.target.value))
                          }
                          className="mt-1 block w-full accent-teal-500"
                        />
                      </label>
                      <label className="text-xs text-slate-400">
                        Контраст: {contrast}%
                        <input
                          type="range"
                          min="40"
                          max="220"
                          value={contrast}
                          onChange={(event) =>
                            setContrast(Number(event.target.value))
                          }
                          className="mt-1 block w-full accent-teal-500"
                        />
                      </label>
                    </div>
                    <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-5">
                      {selectedAsset.mimeType === 'application/dicom' ? (
                        <div className="max-w-md rounded-3xl border border-amber-300/20 bg-amber-500/10 p-6 text-center text-amber-100">
                          <FileWarning className="mx-auto h-10 w-10 text-amber-300" />
                          <h3 className="mt-4 font-bold">
                            DICOM сохранён защищённо
                          </h3>
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
          <AnatomyViewer
            initialRegion={anatomyRegion}
            onShowOnBoard={({ layer, view, region, label }) => {
              setAnatomyRegion(region)
              void commitPatch(
                {
                  boardBackground: {
                    kind: 'anatomy',
                    assetId: '',
                    label,
                    anatomyLayer: layer,
                    anatomyView: view,
                    anatomyRegion: region,
                  },
                },
                'Анатомическая проекция наложена на доску.',
              )
            }}
            onAddToCase={(label) => {
              updateClinicalCase(
                'examination',
                `${workspace.clinicalCase.examination}${
                  workspace.clinicalCase.examination ? '\n' : ''
                }Анатомический ориентир: ${label}.`,
              )
              setActiveModule('case')
            }}
          />
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
                  className="ms-choice ms-choice-dark ms-choice-pill shrink-0 text-xs"
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
                  onChange={(value) =>
                    updateClinicalCase('teachingGoal', value)
                  }
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
              className="mt-5 ms-btn ms-btn-primary ms-btn-lg ms-btn-block sm:w-auto"
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
                            className="w-full rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
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
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
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
                            labs: current.labs.filter(
                              (item) => item.id !== row.id,
                            ),
                          }))
                        }
                        className="ms-icon-btn ms-icon-btn-danger ms-icon-btn-sm"
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
                className="ms-btn ms-btn-on-dark"
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
                className="ms-btn ms-btn-primary"
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
              <svg
                viewBox="0 0 920 180"
                className="w-full"
                role="img"
                aria-label="Учебная ЭКГ-кривая"
              >
                <defs>
                  <pattern
                    id="smallGrid"
                    width="10"
                    height="10"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 10 0 L 0 0 0 10"
                      fill="none"
                      stroke="#fecaca"
                      strokeWidth="0.6"
                    />
                  </pattern>
                  <pattern
                    id="grid"
                    width="50"
                    height="50"
                    patternUnits="userSpaceOnUse"
                  >
                    <rect width="50" height="50" fill="url(#smallGrid)" />
                    <path
                      d="M 50 0 L 0 0 0 50"
                      fill="none"
                      stroke="#fca5a5"
                      strokeWidth="1.2"
                    />
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
              Кривая генерируется как учебная иллюстрация и не является
              клинической ЭКГ, диагностикой или медицинским заключением.
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
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm outline-none focus:border-teal-400"
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
                  className="ms-choice ms-choice-dark ms-choice-pill text-xs"
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
              className="mt-5 ms-btn ms-btn-primary ms-btn-lg ms-btn-block sm:w-auto"
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
                    [
                      'deidentified',
                      'ФИО и другие прямые идентификаторы удалены',
                    ],
                    [
                      'identifiersRemoved',
                      'На изображениях удалены подписи, номера карт и даты рождения',
                    ],
                    [
                      'consentConfirmed',
                      'Есть законное основание для учебного использования',
                    ],
                    [
                      'educationalUseOnly',
                      'Материалы используются только в рамках занятия',
                    ],
                  ] as Array<[keyof PrivacyChecklist, string]>
                ).map(([field, label]) => (
                  <label
                    key={field}
                    className="flex cursor-pointer items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(workspace.privacy[field])}
                      onChange={(event) =>
                        updatePrivacy(field, event.target.checked)
                      }
                      className="mt-1 h-5 w-5 accent-violet-600"
                    />
                    <span>
                      <strong className="text-sm">{label}</strong>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        Подтверждение фиксируется в защищённом рабочем
                        пространстве занятия.
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
                    onChange={(event) =>
                      updatePrivacy('patientLabel', event.target.value)
                    }
                    placeholder="Например: Учебный пациент A-01"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-teal-400"
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
                  className="ms-btn ms-btn-primary ms-btn-lg ms-btn-block sm:w-auto"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Подтвердить безопасность
                </button>
              </div>

              <aside className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-start gap-3">
                  <FileWarning className="h-6 w-6 shrink-0 text-amber-300" />
                  <div>
                    <h3 className="font-bold">
                      Автоматическая проверка текста
                    </h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Поиск возможных телефонов, почты, дат, номеров документов
                      и ФИО. Результат требует ручной проверки.
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
                        <p className="font-semibold text-amber-200">
                          {finding.label}
                        </p>
                        <p className="mt-1 break-all text-amber-100/70">
                          {finding.match}
                        </p>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        const clinicalCase = Object.fromEntries(
                          Object.entries(workspace.clinicalCase).map(
                            ([key, value]) => [key, redactMedicalText(value)],
                          ),
                        ) as unknown as ClinicalCaseData
                        const labs = workspace.labs.map((row) => ({
                          ...row,
                          name: redactMedicalText(row.name),
                          note: redactMedicalText(row.note),
                        }))
                        const ecg = {
                          ...workspace.ecg,
                          conclusion: redactMedicalText(
                            workspace.ecg.conclusion,
                          ),
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
                      className="mt-2 ms-btn ms-btn-on-dark ms-btn-sm ms-btn-block text-xs"
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
                  MedStart не предназначен для хранения медицинской документации
                  пациента. Загружайте только обезличенные учебные данные.
                </div>
              </aside>
            </div>
          </SectionShell>
        )}
      </div>
    </div>
  )
}
