'use client'

import { useMemo, useRef, useState, type PointerEvent } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Focus,
  Maximize2,
  Minus,
  Plus,
  Rotate3d,
  ScanSearch,
} from 'lucide-react'
import {
  ANATOMY_LAYERS,
  ANATOMY_REGIONS,
  ANATOMY_VIEWS,
  anatomyDataUri,
  type AnatomyLayer,
  type AnatomyView,
} from '@/lib/anatomy-model'

interface AnatomyViewerProps {
  compact?: boolean
  initialLayer?: AnatomyLayer
  initialView?: AnatomyView
  initialRegion?: string
  onShowOnBoard?: (input: {
    layer: AnatomyLayer
    view: AnatomyView
    region: string
    imageUrl: string
    label: string
  }) => void
}

export default function AnatomyViewer({
  compact = false,
  initialLayer = 'organs',
  initialView = 'front',
  initialRegion = 'thorax',
  onShowOnBoard,
}: AnatomyViewerProps) {
  const [layer, setLayer] = useState<AnatomyLayer>(initialLayer)
  const [view, setView] = useState<AnatomyView>(initialView)
  const [region, setRegion] = useState(initialRegion)
  const [zoom, setZoom] = useState(1)
  const dragStart = useRef<number | null>(null)
  const selectedRegion =
    ANATOMY_REGIONS.find((item) => item.id === region) ?? ANATOMY_REGIONS[2]
  const imageUrl = useMemo(() => anatomyDataUri(layer, view, region), [layer, view, region])

  function rotate(direction: number) {
    const index = ANATOMY_VIEWS.findIndex((item) => item.id === view)
    const next = (index + direction + ANATOMY_VIEWS.length) % ANATOMY_VIEWS.length
    setView(ANATOMY_VIEWS[next].id)
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    dragStart.current = event.clientX
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (dragStart.current === null) return
    const delta = event.clientX - dragStart.current
    dragStart.current = null
    if (Math.abs(delta) > 42) rotate(delta > 0 ? -1 : 1)
  }

  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/10 bg-slate-900/90 text-white shadow-xl">
      <header className="shrink-0 border-b border-white/10 px-3 py-3 sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Rotate3d className="h-4 w-4 text-violet-300" />
              Интерактивная анатомия
            </p>
            <p className="mt-1 truncate text-[11px] text-slate-400">
              Слои, области и четыре проекции человеческого тела
            </p>
          </div>
          <span className="rounded-full bg-teal-400/10 px-2.5 py-1 text-[10px] font-semibold text-teal-200">
            2.5D
          </span>
        </div>
      </header>

      <div className={`grid min-h-0 min-w-0 flex-1 ${compact ? 'grid-rows-[minmax(260px,1fr)_auto]' : 'lg:grid-cols-[minmax(300px,1fr)_320px]'}`}>
        <div className="flex min-h-0 min-w-0 flex-col p-2 sm:p-3">
          <div
            onPointerDown={pointerDown}
            onPointerUp={pointerUp}
            onPointerCancel={() => {
              dragStart.current = null
            }}
            className="relative flex min-h-[300px] min-w-0 flex-1 touch-pan-y select-none items-center justify-center overflow-hidden rounded-2xl bg-slate-950 sm:min-h-[420px]"
          >
            <img
              src={imageUrl}
              alt={`${selectedRegion.label}, ${ANATOMY_LAYERS.find((item) => item.id === layer)?.label}`}
              draggable={false}
              className="h-full max-h-[760px] w-full object-contain transition-transform duration-300"
              style={{ transform: `scale(${zoom})` }}
            />
            <button
              type="button"
              aria-label="Предыдущая проекция"
              onClick={() => rotate(-1)}
              className="ms-icon-btn ms-icon-btn-on-dark absolute left-2 top-1/2 -translate-y-1/2"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Следующая проекция"
              onClick={() => rotate(1)}
              className="ms-icon-btn ms-icon-btn-on-dark absolute right-2 top-1/2 -translate-y-1/2"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute bottom-2 right-2 flex gap-1 rounded-xl bg-slate-950/75 p-1 backdrop-blur">
              <button type="button" onClick={() => setZoom((value) => Math.max(.8, value - .1))} className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm" aria-label="Уменьшить модель"><Minus className="h-4 w-4" /></button>
              <button type="button" onClick={() => setZoom(1)} className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm" aria-label="Сбросить масштаб"><Focus className="h-4 w-4" /></button>
              <button type="button" onClick={() => setZoom((value) => Math.min(1.6, value + .1))} className="ms-icon-btn ms-icon-btn-on-dark ms-icon-btn-sm" aria-label="Увеличить модель"><Plus className="h-4 w-4" /></button>
            </div>
            <p className="absolute bottom-3 left-3 hidden rounded-lg bg-slate-950/70 px-2 py-1 text-[10px] text-slate-300 backdrop-blur sm:block">
              Проведите по модели для вращения
            </p>
          </div>
        </div>

        <aside className="min-h-0 min-w-0 overflow-y-auto border-t border-white/10 p-3 lg:border-l lg:border-t-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Система</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {ANATOMY_LAYERS.map((item) => (
                <button key={item.id} type="button" onClick={() => setLayer(item.id)} aria-pressed={layer === item.id} className="ms-choice ms-choice-dark w-full justify-start px-2 py-2 text-[11px]">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Проекция</p>
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {ANATOMY_VIEWS.map((item) => (
                <button key={item.id} type="button" onClick={() => setView(item.id)} aria-pressed={view === item.id} className="ms-choice ms-choice-dark w-full px-2 py-2 text-[11px]">
                  {item.shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-slate-500">Область</p>
            <select value={region} onChange={(event) => setRegion(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-teal-400">
              {ANATOMY_REGIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>

          <article className="mt-4 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-3">
            <div className="flex items-start gap-2">
              <ScanSearch className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold">{selectedRegion.label}</h3>
                <p className="mt-0.5 text-[11px] italic text-violet-200">{selectedRegion.latin}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] leading-5 text-slate-300">{selectedRegion.description}</p>
            <p className="mt-2 border-t border-white/10 pt-2 text-[11px] leading-5 text-teal-100">{selectedRegion.clinical}</p>
          </article>

          {onShowOnBoard && (
            <button
              type="button"
              onClick={() => onShowOnBoard({ layer, view, region, imageUrl, label: `${selectedRegion.label} · ${ANATOMY_LAYERS.find((item) => item.id === layer)?.shortLabel}` })}
              className="ms-btn ms-btn-primary mt-3 w-full"
            >
              <Maximize2 className="h-4 w-4" />
              Показать на доске
            </button>
          )}
        </aside>
      </div>
    </section>
  )
}
