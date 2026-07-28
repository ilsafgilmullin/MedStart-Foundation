'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, Clock3, EyeOff } from 'lucide-react'
import {
  formatPresence,
  subscribeToPresences,
  type PresenceSnapshot,
} from '@/lib/presence'

export default function PresenceBadge({
  uid,
  compact = false,
  className = '',
}: {
  uid: string
  compact?: boolean
  className?: string
}) {
  const [snapshot, setSnapshot] = useState<PresenceSnapshot | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => subscribeToPresences([uid], (items) => setSnapshot(items[uid] ?? null)), [uid])
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const meta = useMemo(() => formatPresence(snapshot, now), [snapshot, now])
  const icon =
    meta.tone === 'online' ? (
      <Activity className="h-3.5 w-3.5" />
    ) : meta.tone === 'hidden' ? (
      <EyeOff className="h-3.5 w-3.5" />
    ) : (
      <Clock3 className="h-3.5 w-3.5" />
    )
  const toneClass =
    meta.tone === 'online'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : meta.tone === 'recent'
        ? 'border-cyan-200 bg-cyan-50 text-cyan-700'
        : meta.tone === 'hidden'
          ? 'border-slate-200 bg-slate-50 text-slate-500'
          : 'border-slate-200 bg-white text-slate-500'

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
          meta.tone === 'online' ? 'text-emerald-700' : 'text-slate-500'
        } ${className}`}
      >
        <span
          className={`h-2.5 w-2.5 rounded-full ring-2 ring-white ${
            meta.tone === 'online'
              ? 'animate-pulse bg-emerald-500'
              : meta.tone === 'recent'
                ? 'bg-cyan-400'
                : 'bg-slate-300'
          }`}
        />
        {meta.label}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold ${toneClass} ${className}`}
    >
      {icon}
      {meta.label}
    </span>
  )
}
