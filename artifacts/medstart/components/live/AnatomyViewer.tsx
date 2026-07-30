'use client'

import { createElement, useEffect, useMemo, useRef, useState } from 'react'
import {
  Box,
  ClipboardList,
  Focus,
  LoaderCircle,
  Maximize2,
  Minus,
  Plus,
  Rotate3d,
  ScanSearch,
  TriangleAlert,
} from 'lucide-react'
import {
  ANATOMY_MODELS,
  HRA_LICENSE_URL,
  HRA_SOURCE_URL,
  anatomyDataUri,
  type AnatomyModelId,
  type AnatomyView,
} from '@/lib/anatomy-model'

interface AnatomyViewerProps {
  compact?: boolean
  initialModel?: AnatomyModelId
  initialRegion?: string
  onShowOnBoard?: (input: {
    layer: 'organs'
    view: AnatomyView
    region: string
    imageUrl: string
    label: string
  }) => void
  onAddToCase?: (label: string) => void
}

type ViewerStatus = 'loading' | 'ready' | 'error' | 'fallback'

interface ModelViewerElement extends HTMLElement {
  src?: string
}

let modelViewerLoader: Promise<void> | null = null

function supportsWebGl() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

function ensureModelViewer() {
  if (customElements.get('model-viewer')) return Promise.resolve()
  if (modelViewerLoader) return modelViewerLoader

  modelViewerLoader = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-medstart-model-viewer]',
    )
    const finish = () => {
      void customElements.whenDefined('model-viewer').then(() => resolve())
    }

    if (existing) {
      existing.addEventListener('load', finish, { once: true })
      existing.addEventListener('error', reject, { once: true })
      finish()
      return
    }

    const script = document.createElement('script')
    script.type = 'module'
    script.src = '/vendor/model-viewer/model-viewer.min.js'
    script.dataset.medstartModelViewer = 'true'
    script.addEventListener('load', finish, { once: true })
    script.addEventListener('error', reject, { once: true })
    document.head.appendChild(script)
  })

  return modelViewerLoader
}

export default function AnatomyViewer({
  compact = false,
  initialModel = 'heart',
  initialRegion,
  onShowOnBoard,
  onAddToCase,
}: AnatomyViewerProps) {
  const initial =
    ANATOMY_MODELS.find(
      (item) => item.id === initialModel || item.region === initialRegion,
    ) ?? ANATOMY_MODELS[0]
  const [modelId, setModelId] = useState<AnatomyModelId>(initial.id)
  const [selectedStructure, setSelectedStructure] = useState(
    initial.structures[0],
  )
  const [status, setStatus] = useState<ViewerStatus>('loading')
  const [fieldOfView, setFieldOfView] = useState(35)
  const elementRef = useRef<ModelViewerElement | null>(null)
  const model =
    ANATOMY_MODELS.find((item) => item.id === modelId) ?? ANATOMY_MODELS[0]
  const boardImageUrl = useMemo(
    () => anatomyDataUri('organs', 'front', model.region),
    [model.region],
  )

  useEffect(() => {
    if (!supportsWebGl()) {
      setStatus('fallback')
      return
    }

    let active = true
    void ensureModelViewer()
      .then(() => {
        if (active) setStatus('loading')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    setSelectedStructure(model.structures[0])
    setStatus((current) => (current === 'fallback' ? current : 'loading'))
  }, [model])

  useEffect(() => {
    elementRef.current?.setAttribute('field-of-view', `${fieldOfView}deg`)
  }, [fieldOfView])

  const modelElement = createElement('model-viewer', {
    ref: (node: ModelViewerElement | null) => {
      elementRef.current = node
    },
    src: model.file,
    alt: `${model.label}, интерактивная трёхмерная анатомическая модель`,
    'camera-controls': true,
    'touch-action': 'pan-y',
    'interaction-prompt': 'auto',
    'shadow-intensity': '1',
    'environment-image': 'neutral',
    'camera-orbit': '0deg 75deg auto',
    'field-of-view': `${fieldOfView}deg`,
    loading: 'eager',
    className: 'h-full min-h-[300px] w-full bg-transparent',
    onLoad: () => setStatus('ready'),
    onError: () => setStatus('error'),
  })

  function resetCamera() {
    setFieldOfView(35)
    elementRef.current?.setAttribute('camera-orbit', '0deg 75deg auto')
    elementRef.current?.removeAttribute('camera-target')
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/90 text-white shadow-xl">
      <header className="shrink-0 border-b border-white/10 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Rotate3d className="h-4 w-4 text-violet-300" />
              Интерактивная 3D-анатомия
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-400">
              Настоящие полигональные модели HRA/NIH
            </p>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-200">
            3D · GLB
          </span>
        </div>
      </header>

      <div
        className={`grid min-h-0 min-w-0 flex-1 ${
          compact
            ? 'grid-rows-[minmax(280px,1fr)_auto]'
            : 'lg:grid-cols-[minmax(320px,1fr)_330px]'
        }`}
      >
        <div className="flex min-h-0 min-w-0 flex-col p-2 sm:p-3">
          <div className="relative flex min-h-[320px] min-w-0 flex-1 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-slate-950 to-indigo-950 sm:min-h-[460px]">
            {status === 'fallback' || status === 'error' ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-4">
                <img
                  src={boardImageUrl}
                  alt={`Схематическая проекция: ${model.label}`}
                  className="min-h-0 max-h-[620px] w-full object-contain"
                />
                <p className="mt-2 flex items-center gap-2 text-center text-xs text-amber-200">
                  <TriangleAlert className="h-4 w-4 shrink-0" />
                  3D недоступно на этом устройстве — показана облегчённая схема.
                </p>
              </div>
            ) : (
              modelElement
            )}

            {status === 'loading' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/55">
                <div className="rounded-2xl border border-white/10 bg-slate-950/90 px-5 py-4 text-center shadow-xl">
                  <LoaderCircle className="mx-auto h-6 w-6 animate-spin text-violet-300" />
                  <p className="mt-2 text-xs text-slate-300">
                    Загружаем только выбранный орган…
                  </p>
                </div>
              </div>
            )}

            {status !== 'fallback' && status !== 'error' && (
              <div className="absolute bottom-2 right-2 flex gap-1 rounded-xl bg-slate-950/80 p-1 backdrop-blur">
                <button
                  type="button"
                  onClick={() =>
                    setFieldOfView((value) => Math.min(60, value + 5))
                  }
                  className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
                  aria-label="Уменьшить модель"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetCamera}
                  className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
                  aria-label="Сбросить положение модели"
                >
                  <Focus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setFieldOfView((value) => Math.max(15, value - 5))
                  }
                  className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm"
                  aria-label="Увеличить модель"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="min-h-0 min-w-0 overflow-y-auto border-t border-white/10 p-3 lg:border-l lg:border-t-0">
          <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">
            Модель
          </p>
          <div className="mt-2 grid grid-cols-2 gap-1.5">
            {ANATOMY_MODELS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setModelId(item.id)}
                aria-pressed={model.id === item.id}
                className="ms-choice ms-choice-dark w-full justify-start px-2 py-2 text-[11px]"
              >
                <Box className="h-3.5 w-3.5" />
                {item.label}
              </button>
            ))}
          </div>

          <article className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
            <div className="flex items-start gap-2">
              <ScanSearch className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold">{model.label}</h3>
                <p className="mt-0.5 text-[11px] italic text-violet-200">
                  {model.latin}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-300">
              {model.description}
            </p>
            {!compact && (
              <p className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-5 text-teal-100">
                {model.clinical}
              </p>
            )}
          </article>

          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">
              Анатомический ориентир
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {model.structures.map((structure) => (
                <button
                  key={structure}
                  type="button"
                  onClick={() => setSelectedStructure(structure)}
                  aria-pressed={selectedStructure === structure}
                  className="ms-choice ms-choice-dark ms-choice-pill px-2 py-1.5 text-[10px]"
                >
                  {structure}
                </button>
              ))}
            </div>
          </div>

          {onShowOnBoard && (
            <button
              type="button"
              onClick={() =>
                onShowOnBoard({
                  layer: 'organs',
                  view: 'front',
                  region: model.region,
                  imageUrl: boardImageUrl,
                  label: `${model.label} · схематическая проекция`,
                })
              }
              className="ms-btn ms-btn-primary mt-4 w-full"
            >
              <Maximize2 className="h-4 w-4" />
              Показать проекцию на доске
            </button>
          )}

          {onAddToCase && (
            <button
              type="button"
              onClick={() =>
                onAddToCase(`${model.label}: ${selectedStructure}`)
              }
              className="ms-btn ms-btn-on-dark mt-2 w-full"
            >
              <ClipboardList className="h-4 w-4" />
              Добавить ориентир в кейс
            </button>
          )}

          <p className="mt-4 text-[10px] leading-4 text-slate-500">
            Источник:{' '}
            <a
              href={HRA_SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-violet-300 underline"
            >
              Human Reference Atlas / HuBMAP
            </a>
            . Лицензия{' '}
            <a
              href={HRA_LICENSE_URL}
              target="_blank"
              rel="noreferrer"
              className="text-violet-300 underline"
            >
              CC BY 4.0
            </a>
            . Модели оптимизированы для MedStart. Только для обучения, не для
            диагностики.
          </p>
        </aside>
      </div>
    </section>
  )
}
