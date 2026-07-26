import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  PenTool,
  Video,
} from 'lucide-react'

const features = [
  {
    title: 'Проверенные репетиторы',
    text: 'В каталоге публикуются только профили, прошедшие модерацию.',
    icon: BadgeCheck,
  },
  {
    title: 'MedStart Live',
    text: 'Собственная профессиональная видеокомната внутри занятия — без перехода в Zoom.',
    icon: Video,
  },
  {
    title: 'Умная доска',
    text: 'Рисуйте, добавляйте текст и схемы вместе. Результат сохраняется после занятия.',
    icon: PenTool,
  },
  {
    title: 'Всё в одном месте',
    text: 'Расписание, видеозанятие, чат и материалы связаны в одном рабочем пространстве.',
    icon: CalendarDays,
  },
]

export default function HomePage() {
  return (
    <main className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="text-xl font-bold text-violet-700">
            MedStart
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 font-medium text-slate-700"
            >
              Войти
            </Link>
            <Link
              href="/register/student"
              className="rounded-xl bg-violet-600 px-4 py-2 font-semibold text-white"
            >
              Регистрация
            </Link>
          </div>
        </div>
      </header>
      <section className="mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:py-28">
        <div>
          <span className="inline-flex rounded-full bg-violet-100 px-4 py-2 text-sm font-semibold text-violet-700">
            Медицинское образование без лишних барьеров
          </span>
          <h1 className="mt-6 text-5xl font-bold leading-tight text-slate-900">
            Репетитор и полноценное онлайн-занятие в одном месте
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Выберите медицинского репетитора, согласуйте время и занимайтесь в
            MedStart Live: видео, совместная умная доска, чат и материалы без
            разрозненных сервисов.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/register/student"
              className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3.5 font-semibold text-white"
            >
              Начать поиск
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/register/tutor"
              className="rounded-2xl border border-slate-300 bg-white px-6 py-3.5 font-semibold text-slate-700"
            >
              Стать репетитором
            </Link>
          </div>
        </div>
        <div className="rounded-[36px] bg-gradient-to-br from-violet-700 via-violet-600 to-indigo-700 p-8 text-white shadow-2xl">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-violet-100">Как это работает</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
              <Video className="h-3.5 w-3.5" />
              MedStart Live
            </span>
          </div>
          <ol className="mt-6 space-y-5">
            {[
              'Выберите репетитора и отправьте заявку',
              'Получите подтверждение в расписании',
              'Войдите в собственную комнату занятия',
              'Работайте вместе на доске и сохраните результат',
            ].map((item, index) => (
              <li
                key={item}
                className="flex items-center gap-4 rounded-2xl bg-white/10 p-4"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white font-bold text-violet-700">
                  {index + 1}
                </span>
                <span className="font-semibold">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {features.map(({ title, text, icon: Icon }) => (
            <article
              key={title}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-600">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 text-lg font-bold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
