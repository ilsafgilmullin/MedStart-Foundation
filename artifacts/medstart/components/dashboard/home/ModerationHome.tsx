'use client'

import Link from 'next/link'
import {
  ArrowRight,
  BookOpenCheck,
  FileCheck2,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export function ModeratorHome() {
  const { profile } = useAuth()
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[34px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8 lg:p-10">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-2 text-sm font-bold ring-1 ring-white/15">
          <ShieldCheck className="h-4 w-4 text-cyan-200" />
          MedStart · модератор
        </span>
        <h1 className="mt-5 text-3xl font-black sm:text-4xl">
          Добро пожаловать, {profile?.firstName || 'модератор'}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-teal-50/85 sm:text-base">
          Ваш контур ограничен проверкой репетиторов и учебных материалов. Управление аккаунтами, ролями, сессиями, занятиями и перепиской недоступно.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/dashboard/moderation" className="ms-btn ms-btn-white">
            <FileCheck2 className="h-4 w-4" />Открыть очередь
          </Link>
          <Link href="/dashboard/knowledge" className="ms-btn ms-btn-on-dark">
            <BookOpenCheck className="h-4 w-4" />Учебная база
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/moderation"
          className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-teal-200 hover:shadow-md"
        >
          <Stethoscope className="h-7 w-7 text-teal-700" />
          <h2 className="mt-4 text-xl font-black text-slate-950">Репетиторы</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Одобрение, отклонение, приостановка и восстановление публикации.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-teal-800">
            Перейти <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
        <Link
          href="/dashboard/moderation"
          className="group rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm transition hover:border-violet-200 hover:shadow-md"
        >
          <BookOpenCheck className="h-7 w-7 text-violet-700" />
          <h2 className="mt-4 text-xl font-black text-slate-950">Учебные материалы</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Проверка источника, подтверждений автора и защищённого PDF перед публикацией.
          </p>
          <span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-violet-800">
            Перейти <ArrowRight className="h-4 w-4" />
          </span>
        </Link>
      </section>
    </div>
  )
}

export function SuspendedTutorHome() {
  const { profile } = useAuth()
  return (
    <section className="rounded-[34px] border border-amber-200 bg-white p-6 shadow-sm sm:p-8">
      <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-amber-900">
        <ShieldCheck className="h-4 w-4" />Публикация приостановлена
      </span>
      <h1 className="mt-5 text-3xl font-black text-slate-950">Профиль временно скрыт из каталога</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
        До восстановления статуса запись новых занятий и рабочие функции репетитора ограничены. Вы можете просмотреть и исправить свой профиль.
      </p>
      {profile?.moderationNote && (
        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <span className="font-black">Причина:</span> {profile.moderationNote}
        </div>
      )}
      <Link href="/dashboard/profile" className="mt-6 ms-btn ms-btn-primary inline-flex">
        Открыть профиль <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  )
}
