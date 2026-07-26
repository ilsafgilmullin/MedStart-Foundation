import Link from 'next/link'
import { RefreshCw, WifiOff } from 'lucide-react'

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-slate-950 p-5 text-white">
      <section className="w-full max-w-md rounded-[32px] border border-white/10 bg-white/5 p-7 text-center shadow-2xl backdrop-blur sm:p-9">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-violet-500/20 text-violet-300">
          <WifiOff className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-2xl font-bold">Связь временно пропала</h1>
        <p className="mt-3 leading-7 text-slate-300">
          MedStart сохранит доступные данные на устройстве. Проверьте интернет и
          повторите попытку — открытая доска не очищается.
        </p>
        <Link
          href="/dashboard"
          className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white"
        >
          <RefreshCw className="h-5 w-5" />
          Попробовать снова
        </Link>
      </section>
    </main>
  )
}
