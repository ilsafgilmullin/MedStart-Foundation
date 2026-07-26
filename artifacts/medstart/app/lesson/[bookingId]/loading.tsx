export default function LessonLoading() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-white">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
        <span className="h-3 w-3 animate-pulse rounded-full bg-violet-400" />
        <span className="text-sm font-semibold">Готовим онлайн-занятие…</span>
      </div>
    </div>
  )
}
