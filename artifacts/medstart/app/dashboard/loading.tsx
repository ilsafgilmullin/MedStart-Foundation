const blocks = ['a', 'b', 'c', 'd']

export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-7">
      <div className="space-y-3">
        <div className="h-8 w-56 rounded-xl bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded-lg bg-slate-200" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {blocks.map((key) => (
          <div
            key={key}
            className="h-32 rounded-3xl border border-slate-200 bg-white"
          />
        ))}
      </div>
      <div className="h-72 rounded-[28px] border border-slate-200 bg-white" />
    </div>
  )
}
