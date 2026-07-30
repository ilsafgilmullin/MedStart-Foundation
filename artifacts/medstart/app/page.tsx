import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Check,
  CirclePlay,
  FileText,
  GraduationCap,
  HeartPulse,
  LibraryBig,
  LockKeyhole,
  MessageCircle,
  MonitorSmartphone,
  PenTool,
  School,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  UserRound,
  Video,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'MedStart — ОГЭ, ЕГЭ и медицинское обучение',
  description:
    'Индивидуальные занятия для школьников и студентов медвузов: подготовка к ОГЭ и ЕГЭ, медицинские дисциплины, видео, доска и учебные материалы.',
}

const audiences = [
  {
    eyebrow: '8–11 классы',
    title: 'Подготовка к ОГЭ и ЕГЭ',
    text: 'Выберите класс, экзамен и предметы — MedStart подберёт преподавателей под вашу учебную цель.',
    benefits: [
      'Подходящие преподаватели по предмету и экзамену',
      'Официальные материалы ФИПИ в учебной базе',
      'Видео, совместная доска и история занятий',
    ],
    icon: School,
    className:
      'border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white',
    iconClass: 'bg-cyan-700 text-white',
    eyebrowClass: 'text-cyan-700',
    checkClass: 'text-cyan-700',
  },
  {
    eyebrow: 'Студентам медвузов',
    title: 'Индивидуальное изучение медицины',
    text: 'Разбирайте дисциплины, клинические задачи и сложные темы один на один с профильным преподавателем.',
    benefits: [
      'Преподаватели с медицинской специализацией',
      'Доска для схем, ЭКГ, анализов и заметок',
      'Проверенные источники и материалы занятия',
    ],
    icon: Stethoscope,
    className:
      'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white',
    iconClass: 'bg-violet-700 text-white',
    eyebrowClass: 'text-violet-700',
    checkClass: 'text-violet-700',
  },
]

const lessonTools = [
  {
    title: 'Видео',
    text: 'Общайтесь внутри занятия',
    icon: Video,
    className: 'bg-cyan-50 text-cyan-700',
  },
  {
    title: 'Доска',
    text: 'Решайте и объясняйте вместе',
    icon: PenTool,
    className: 'bg-teal-50 text-teal-700',
  },
  {
    title: 'Чат',
    text: 'Все сообщения под рукой',
    icon: MessageCircle,
    className: 'bg-blue-50 text-blue-700',
  },
  {
    title: 'Материалы',
    text: 'Сохраняйте результат занятия',
    icon: FileText,
    className: 'bg-violet-50 text-violet-700',
  },
]

const learningFormats = [
  {
    status: 'Доступно',
    title: 'Индивидуальные занятия',
    text: 'Персональная работа с преподавателем под вашу цель и темп.',
    icon: UserRound,
    className: 'bg-cyan-50 text-cyan-700',
  },
  {
    status: 'Доступно',
    title: 'Учебная база',
    text: 'Официальные источники и проверенные материалы для повторения.',
    icon: LibraryBig,
    className: 'bg-emerald-50 text-emerald-700',
  },
  {
    status: 'Скоро',
    title: 'Видеокурсы',
    text: 'Структурированные программы преподавателей для обучения в своём темпе.',
    icon: CirclePlay,
    className: 'bg-violet-50 text-violet-700',
  },
]

const trustItems = [
  { label: 'Модерация преподавателей', icon: BadgeCheck },
  { label: 'Защита аккаунтов', icon: LockKeyhole },
  { label: 'Работа на любом устройстве', icon: MonitorSmartphone },
]

function Brand({
  inverse = false,
  compact = false,
}: {
  inverse?: boolean
  compact?: boolean
}) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`grid place-items-center rounded-xl border shadow-sm ${
          compact ? 'h-9 w-9' : 'h-11 w-11'
        } ${
          inverse
            ? 'border-white/15 bg-white/10 text-white'
            : 'border-teal-100 bg-white text-teal-700'
        }`}
      >
        <HeartPulse
          className={compact ? 'h-5 w-5' : 'h-6 w-6'}
          strokeWidth={2.25}
        />
      </span>
      <span
        className={`${compact ? 'text-lg' : 'text-xl'} font-black tracking-tight ${
          inverse ? 'text-white' : 'text-slate-950'
        }`}
      >
        MedStart
      </span>
    </span>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
        {description}
      </p>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" aria-label="MedStart — главная" className="shrink-0">
            <span className="sm:hidden">
              <Brand compact />
            </span>
            <span className="hidden sm:inline-flex">
              <Brand />
            </span>
          </Link>

          <nav
            aria-label="Основная навигация"
            className="hidden items-center gap-7 text-sm font-semibold text-slate-600 lg:flex"
          >
            <a className="transition hover:text-teal-700" href="#directions">
              Направления
            </a>
            <a className="transition hover:text-teal-700" href="#lesson">
              Как проходит занятие
            </a>
            <a className="transition hover:text-teal-700" href="#formats">
              Возможности
            </a>
          </nav>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <Link
              href="/login"
              className="ms-btn ms-btn-ghost ms-btn-sm whitespace-nowrap px-2.5 text-xs sm:px-4 sm:text-sm"
            >
              Войти
            </Link>
            <Link
              href="/register/student"
              className="ms-btn ms-btn-primary ms-btn-sm whitespace-nowrap px-3 text-xs sm:px-5 sm:text-sm"
            >
              <span className="sm:hidden">Начать</span>
              <span className="hidden sm:inline">Начать обучение</span>
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -left-36 top-0 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-18 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100 sm:px-4 sm:py-2 sm:text-sm">
              <Sparkles className="h-4 w-4" />
              ОГЭ · ЕГЭ · медицинские дисциплины
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:mt-6 sm:text-5xl lg:text-6xl">
              Учитесь увереннее
              <span className="block bg-gradient-to-r from-cyan-300 via-teal-200 to-violet-300 bg-clip-text text-transparent">
                с личным преподавателем
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg sm:leading-8">
              MedStart объединяет подготовку школьников к ОГЭ и ЕГЭ и
              индивидуальное обучение студентов-медиков в одной современной
              платформе.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register/student"
                className="ms-btn ms-btn-primary ms-btn-lg"
              >
                Выбрать направление
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/register/tutor"
                className="ms-btn ms-btn-on-dark ms-btn-lg"
              >
                Стать преподавателем
              </Link>
            </div>

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-300 sm:text-sm">
              {[
                'Индивидуальный формат',
                'Проверенные преподаватели',
                'Всё в одном кабинете',
              ].map((label) => (
                <span key={label} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-300" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-xl sm:block">
            <div className="absolute -inset-5 rounded-[38px] bg-gradient-to-br from-cyan-400/15 to-violet-500/15 blur-2xl" />
            <div className="relative rounded-[28px] border border-white/15 bg-white/10 p-3 shadow-2xl shadow-black/40 backdrop-blur sm:p-4">
              <div className="rounded-[22px] bg-white p-4 sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-teal-700">
                      Ваш учебный маршрут
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      С чего начнём?
                    </p>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-cyan-300">
                    <GraduationCap className="h-6 w-6" />
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-700 text-white">
                      <School className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-xs font-black uppercase tracking-wider text-cyan-700">
                      Школьникам
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      ОГЭ и ЕГЭ
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      8–11 классы · выбор предметов
                    </p>
                  </div>

                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-700 text-white">
                      <Stethoscope className="h-5 w-5" />
                    </span>
                    <p className="mt-4 text-xs font-black uppercase tracking-wider text-violet-700">
                      Студентам медвузов
                    </p>
                    <p className="mt-1 text-lg font-black text-slate-950">
                      Медицина
                    </p>
                    <p className="mt-2 text-xs leading-5 text-slate-600">
                      Дисциплины · сложные темы
                    </p>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Видео', icon: Video },
                    { label: 'Доска', icon: PenTool },
                    { label: 'Материалы', icon: BookOpen },
                  ].map(({ label, icon: Icon }) => (
                    <div
                      key={label}
                      className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-3 text-center"
                    >
                      <Icon className="h-4 w-4 text-teal-700" />
                      <span className="text-[10px] font-black text-slate-700 sm:text-xs">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="directions" className="scroll-mt-20 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Два направления"
            title="Одна платформа для разных учебных целей"
            description="При регистрации ученик выбирает свою траекторию, а MedStart показывает подходящих преподавателей и инструменты."
          />

          <div className="mt-9 grid gap-5 lg:grid-cols-2">
            {audiences.map(({ icon: Icon, ...item }) => (
              <article
                key={item.title}
                className={`rounded-[28px] border p-6 shadow-sm sm:p-8 ${item.className}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <span
                    className={`grid h-13 w-13 shrink-0 place-items-center rounded-2xl shadow-lg ${item.iconClass}`}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span
                    className={`rounded-full bg-white px-3 py-1.5 text-xs font-black shadow-sm ${item.eyebrowClass}`}
                  >
                    {item.eyebrow}
                  </span>
                </div>
                <h3 className="mt-6 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.text}
                </p>
                <div className="mt-5 space-y-3">
                  {item.benefits.map((benefit) => (
                    <div key={benefit} className="flex items-start gap-3">
                      <Check
                        className={`mt-0.5 h-5 w-5 shrink-0 ${item.checkClass}`}
                      />
                      <span className="text-sm font-semibold leading-6 text-slate-700">
                        {benefit}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="lesson" className="scroll-mt-20 bg-slate-50 py-14 sm:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:px-8">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
              MedStart Live
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              Не просто звонок, а полноценное занятие
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
              Видео, совместная работа и материалы связаны с одним занятием — не
              нужно переходить между разными сервисами.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {lessonTools.map(({ title, text, icon: Icon, className }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${className}`}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-black text-slate-950">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[30px] bg-slate-950 p-3 shadow-2xl shadow-slate-900/20 sm:p-5">
            <div className="rounded-[23px] bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <CalendarDays className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-slate-950">
                      Индивидуальное занятие
                    </p>
                    <p className="text-xs text-slate-500">
                      Преподаватель и ученик
                    </p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 sm:px-3 sm:text-xs">
                  Онлайн
                </span>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-[0.72fr_1.28fr]">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                  {[
                    {
                      initials: 'АС',
                      name: 'Преподаватель',
                      className: 'from-slate-800 to-slate-950',
                    },
                    {
                      initials: 'МК',
                      name: 'Ученик',
                      className: 'from-violet-700 to-indigo-950',
                    },
                  ].map((person) => (
                    <div
                      key={person.name}
                      className={`rounded-2xl bg-gradient-to-br p-4 text-white ${person.className}`}
                    >
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-white/15 text-xs font-black">
                        {person.initials}
                      </span>
                      <p className="mt-7 text-xs font-black sm:text-sm">
                        {person.name}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50 to-cyan-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        Совместная доска
                      </p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        Синхронизация в реальном времени
                      </p>
                    </div>
                    <PenTool className="h-5 w-5 text-teal-700" />
                  </div>
                  <div className="mt-4 rounded-xl bg-slate-950 p-3">
                    <svg
                      aria-hidden="true"
                      className="h-20 w-full"
                      viewBox="0 0 520 120"
                      fill="none"
                    >
                      <path
                        d="M0 64H92L110 64L126 32L148 96L169 15L193 64H260L277 64L291 43L306 81L326 24L348 64H520"
                        stroke="#2dd4bf"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M0 30H520M0 60H520M0 90H520M65 0V120M130 0V120M195 0V120M260 0V120M325 0V120M390 0V120M455 0V120"
                        stroke="#334155"
                        strokeWidth="1"
                      />
                    </svg>
                  </div>
                  <div className="mt-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2.5 text-xs font-bold text-slate-700 shadow-sm">
                    <ShieldCheck className="h-4 w-4 text-teal-700" />
                    Результат сохраняется в кабинете
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="formats" className="scroll-mt-20 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow="Возможности"
            title="Главное для обучения — в одном месте"
            description="Начните с индивидуальных занятий и учебной базы. Видеокурсы появятся отдельным проверенным разделом."
          />

          <div className="mt-9 grid gap-4 lg:grid-cols-3">
            {learningFormats.map(
              ({ status, title, text, icon: Icon, className }) => (
                <article
                  key={title}
                  className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <span
                      className={`grid h-11 w-11 place-items-center rounded-2xl ${className}`}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                      {status}
                    </span>
                  </div>
                  <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {text}
                  </p>
                </article>
              ),
            )}
          </div>

          <div className="mt-5 grid gap-3 rounded-[24px] border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3 sm:p-5">
            {trustItems.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl bg-white p-3.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-bold leading-5 text-slate-700">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-gradient-to-br from-teal-700 via-cyan-800 to-slate-950 px-6 py-10 text-white shadow-2xl sm:px-10 sm:py-12 lg:px-12">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                Начните обучение
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">
                Выберите свою учебную траекторию
              </h2>
              <p className="mt-3 text-base leading-7 text-cyan-50/80">
                Школьникам — подготовка к ОГЭ и ЕГЭ. Студентам медвузов —
                профильные дисциплины. Преподавателям — собственный рабочий
                кабинет.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/register/student"
                className="ms-btn ms-btn-primary ms-btn-lg"
              >
                Начать обучение
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/register/tutor"
                className="ms-btn ms-btn-on-dark ms-btn-lg"
              >
                Стать преподавателем
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <Link href="/" aria-label="MedStart — главная">
              <Brand inverse compact />
            </Link>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-400">
              Индивидуальное обучение для школьников, студентов медвузов и
              преподавателей.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
            <Link className="transition hover:text-cyan-300" href="/login">
              Войти
            </Link>
            <Link
              className="transition hover:text-cyan-300"
              href="/register/student"
            >
              Ученикам
            </Link>
            <Link
              className="transition hover:text-cyan-300"
              href="/register/tutor"
            >
              Преподавателям
            </Link>
          </div>
        </div>
        <div className="border-t border-slate-800">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© 2026 MedStart. Образовательная платформа.</p>
            <p>ОГЭ · ЕГЭ · медицинские дисциплины</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
