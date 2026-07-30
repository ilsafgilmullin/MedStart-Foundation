import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
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
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UploadCloud,
  UserRound,
  Video,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'MedStart — подготовка к ОГЭ, ЕГЭ и медицинское обучение',
  description:
    'Индивидуальные занятия для школьников и студентов медвузов: подготовка к ОГЭ и ЕГЭ, медицинские дисциплины, MedStart Live, доска и учебные материалы.',
}

const learningPaths = [
  {
    eyebrow: 'Уже доступно',
    title: 'Индивидуальные занятия',
    text: 'Один ученик и один преподаватель разбирают предмет ОГЭ/ЕГЭ или медицинскую дисциплину в MedStart Live.',
    icon: Stethoscope,
    className:
      'border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white',
    iconClass: 'bg-cyan-700 text-white',
  },
  {
    eyebrow: 'Готовится к запуску',
    title: 'Видеокурсы преподавателей',
    text: 'Структурированные видеокурсы, которые ученики смогут покупать и проходить в удобном темпе.',
    icon: CirclePlay,
    className:
      'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white',
    iconClass: 'bg-violet-700 text-white',
  },
  {
    eyebrow: 'Уже доступно',
    title: 'Учебная база',
    text: 'Официальные источники и проверенные MedStart материалы для подготовки и повторения.',
    icon: LibraryBig,
    className:
      'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white',
    iconClass: 'bg-emerald-700 text-white',
  },
]

const platformFeatures = [
  {
    title: 'MedStart Live',
    text: 'Видеокомната внутри занятия — без перехода в сторонние сервисы.',
    icon: Video,
    iconClass: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  },
  {
    title: 'Индивидуальный формат',
    text: 'Всё внимание преподавателя сосредоточено на задаче одного ученика.',
    icon: UserRound,
    iconClass: 'bg-violet-50 text-violet-700 ring-violet-100',
  },
  {
    title: 'Совместная доска',
    text: 'Формулы, схемы, ЭКГ, анализы и заметки разбираются совместно в реальном времени.',
    icon: PenTool,
    iconClass: 'bg-teal-50 text-teal-700 ring-teal-100',
  },
  {
    title: 'Чат и расписание',
    text: 'Заявки, встречи, сообщения и история занятий связаны в одном кабинете.',
    icon: MessageCircle,
    iconClass: 'bg-blue-50 text-blue-700 ring-blue-100',
  },
  {
    title: 'Материалы преподавателя',
    text: 'После занятия ученик получает видео, документы, ссылки и заметки.',
    icon: FileText,
    iconClass: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  },
  {
    title: 'На любом устройстве',
    text: 'Работайте со смартфона, планшета или компьютера в современном браузере.',
    icon: MonitorSmartphone,
    iconClass: 'bg-rose-50 text-rose-700 ring-rose-100',
  },
]

const studentBenefits = [
  'Подготовка к ОГЭ, ЕГЭ или медицинским дисциплинам',
  'Индивидуальная работа с преподавателем',
  'Видео, доска и чат в одном занятии',
  'Материалы и история обучения',
]

const tutorBenefits = [
  'Профессиональный профиль после модерации',
  'Занятия со школьниками и студентами медвузов',
  'Управление заявками и материалами',
  'В будущем — создание и продажа курсов',
]

const trustItems = [
  { label: 'Модерация преподавателей', icon: BadgeCheck },
  { label: 'Проверенные учебные источники', icon: LibraryBig },
  { label: 'Серверная защита аккаунтов', icon: LockKeyhole },
  { label: 'Проверка будущих курсов', icon: ShieldCheck },
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
  centered = false,
}: {
  eyebrow: string
  title: string
  description: string
  centered?: boolean
}) {
  return (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-3xl'}>
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
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95">
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
            <a className="transition hover:text-teal-700" href="#learning">
              Обучение
            </a>
            <a className="transition hover:text-teal-700" href="#live">
              MedStart Live
            </a>
            <a className="transition hover:text-teal-700" href="#courses">
              Курсы
            </a>
            <a className="transition hover:text-teal-700" href="#roles">
              Роли
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
        <div className="pointer-events-none absolute inset-0 opacity-35 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -left-32 top-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-80 w-80 rounded-full bg-violet-600/20 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-xs font-black text-cyan-100 sm:px-4 sm:py-2 sm:text-sm">
              <Sparkles className="h-4 w-4" />
              От школьных экзаменов до медицинской профессии
            </div>

            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-[-0.04em] text-white sm:mt-7 sm:text-5xl lg:text-6xl">
              Готовьтесь к ОГЭ и ЕГЭ
              <span className="block bg-gradient-to-r from-cyan-300 via-teal-200 to-violet-300 bg-clip-text text-transparent">
                или изучайте медицину
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:mt-7 sm:text-xl sm:leading-8">
              Один ученик, один преподаватель и единая среда для занятия: видео,
              совместная доска, чат, расписание и учебные материалы.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
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

            <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-slate-300 sm:mt-9 sm:text-sm">
              {[
                'Модерация профилей',
                'Защищённая среда',
                'Без лишних сервисов',
              ].map((label) => (
                <span key={label} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-cyan-300" />
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-2xl lg:max-w-none">
            <div className="absolute -inset-5 rounded-[40px] bg-gradient-to-br from-cyan-400/15 to-violet-500/15 blur-2xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/15 bg-white p-2 shadow-2xl shadow-black/40 sm:p-3">
              <div className="overflow-hidden rounded-[22px] bg-slate-100">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2.5 sm:px-5 sm:py-3">
                  <Brand compact />
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-black text-emerald-700 sm:px-3 sm:text-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Онлайн
                  </span>
                </div>

                <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[1fr_0.42fr]">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="relative flex min-h-28 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-3 text-white sm:min-h-36 sm:p-4">
                        <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-cyan-400/20 text-xs font-black text-cyan-100 sm:left-4 sm:top-4 sm:h-11 sm:w-11 sm:text-sm">
                          АС
                        </span>
                        <div>
                          <p className="text-xs font-black sm:text-sm">
                            Анна Сергеевна
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400 sm:text-xs">
                            Преподаватель
                          </p>
                        </div>
                      </div>
                      <div className="relative flex min-h-28 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-violet-800 to-indigo-950 p-3 text-white sm:min-h-36 sm:p-4">
                        <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-violet-300/20 text-xs font-black text-violet-100 sm:left-4 sm:top-4 sm:h-11 sm:w-11 sm:text-sm">
                          МК
                        </span>
                        <div>
                          <p className="text-xs font-black sm:text-sm">
                            Михаил К.
                          </p>
                          <p className="mt-1 text-[10px] text-violet-200/70 sm:text-xs">
                            Ученик · индивидуально
                          </p>
                        </div>
                        <Video className="absolute right-3 top-3 h-4 w-4 text-violet-200 sm:right-4 sm:top-4" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <span className="grid h-8 w-8 place-items-center rounded-xl bg-teal-50 text-teal-700 sm:h-9 sm:w-9">
                            <PenTool className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-xs font-black text-slate-900 sm:text-sm">
                              Совместная доска
                            </p>
                            <p className="text-[9px] text-slate-500 sm:text-[11px]">
                              Работа в реальном времени
                            </p>
                          </div>
                        </div>
                        <span className="hidden rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black text-teal-700 sm:inline-flex">
                          Синхронизировано
                        </span>
                      </div>
                      <div className="mt-3 rounded-xl bg-slate-950 p-2.5 sm:mt-4 sm:p-3">
                        <svg
                          aria-hidden="true"
                          className="h-14 w-full sm:h-20"
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
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                    <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-3 text-white sm:p-4">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/15 px-2 py-1 text-[9px] font-black uppercase">
                          Скоро
                        </span>
                        <CirclePlay className="h-4 w-4 text-violet-100" />
                      </div>
                      <p className="mt-6 text-xs font-black sm:mt-7 sm:text-sm">
                        Видеокурсы
                      </p>
                      <p className="mt-1.5 text-[10px] leading-4 text-violet-100/80 sm:text-xs sm:leading-5">
                        Покупка курсов преподавателей.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-cyan-700" />
                        <p className="text-[10px] font-black text-slate-900 sm:text-xs">
                          Чат занятия
                        </p>
                      </div>
                      <div className="mt-3 space-y-2">
                        <div className="rounded-xl bg-slate-100 px-2.5 py-2 text-[9px] leading-4 text-slate-600">
                          Разберём ещё раз?
                        </div>
                        <div className="ml-auto rounded-xl bg-teal-700 px-2.5 py-2 text-[9px] leading-4 text-white">
                          Отмечу на доске.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="learning" className="scroll-mt-20 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            centered
            eyebrow="Три направления MedStart"
            title="Выберите формат под свою задачу"
            description="Разберите сложную тему один на один, используйте проверенную учебную базу или проходите видеокурсы после запуска раздела."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-3">
            {learningPaths.map(({ icon: Icon, ...item }) => (
              <article
                key={item.title}
                className={`rounded-[28px] border p-6 shadow-sm sm:p-8 ${item.className}`}
              >
                <div
                  className={`grid h-13 w-13 place-items-center rounded-2xl shadow-lg ${item.iconClass}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  {item.eyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {item.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="live" className="scroll-mt-20 bg-slate-50 py-16 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div className="order-2 rounded-[30px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-7 lg:order-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 text-cyan-300">
                  <HeartPulse className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Индивидуальное занятие
                  </p>
                  <p className="text-xs text-slate-500">
                    Кардиология · 60 минут
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700 sm:text-xs">
                Подтверждено
              </span>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-[0.8fr_1.2fr]">
              <div className="rounded-2xl bg-slate-950 p-4 text-white">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-violet-500/20 font-black text-violet-100">
                  АС
                </div>
                <p className="mt-7 text-sm font-black">Преподаватель</p>
                <p className="mt-1 text-xs text-slate-400">
                  Объясняет и ведёт занятие
                </p>
              </div>
              <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 p-4 ring-1 ring-teal-100">
                <div className="flex items-center justify-between text-xs font-black text-teal-900">
                  <span>Рабочее пространство</span>
                  <PenTool className="h-4 w-4" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-white p-3 shadow-sm">
                  {['ЭКГ', 'Клинический случай', 'Анализы', 'Заметки'].map(
                    (label) => (
                      <div
                        key={label}
                        className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-[10px] font-bold text-slate-600 sm:text-[11px]"
                      >
                        {label}
                      </div>
                    ),
                  )}
                </div>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2.5 text-xs font-bold text-white">
                  <Check className="h-4 w-4" />
                  Результат сохраняется после занятия
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Индивидуальное обучение"
              title="Не просто видеозвонок. Полноценное индивидуальное занятие"
              description="Преподаватель работает с запросом конкретного ученика, адаптирует темп и использует нужные учебные инструменты прямо во время встречи."
            />
            <div className="mt-7 space-y-3">
              {[
                'Один ученик и один преподаватель в комнате',
                'Совместная доска для формул, схем, ЭКГ и заметок',
                'Чат, расписание и материалы связаны с занятием',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <p className="font-semibold leading-7 text-slate-700">
                    {item}
                  </p>
                </div>
              ))}
            </div>
            <Link href="/register/student" className="mt-8 ms-link-action">
              Найти преподавателя
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            centered
            eyebrow="Возможности платформы"
            title="Всё главное внутри MedStart"
            description="Функции собраны вокруг одного учебного процесса, чтобы не переключаться между несколькими сервисами."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {platformFeatures.map(({ title, text, icon: Icon, iconClass }) => (
              <article
                key={title}
                className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div
                  className={`grid h-12 w-12 place-items-center rounded-2xl ring-4 ${iconClass}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-xl font-black tracking-tight text-slate-950">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="courses"
        className="scroll-mt-20 bg-slate-950 py-16 text-white sm:py-24"
      >
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm font-black text-violet-100">
              <CirclePlay className="h-4 w-4" />
              Раздел готовится к запуску
            </div>
            <h2 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Видеокурсы преподавателей MedStart
            </h2>
            <p className="mt-5 text-base leading-8 text-slate-300 sm:text-lg">
              Преподаватели смогут объединять видеолекции и дополнительные
              материалы в программы, а ученики — покупать доступ и учиться в
              своём темпе.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              {[
                { label: 'Видеоуроки', icon: CirclePlay },
                { label: 'Материалы курса', icon: FileText },
                { label: 'Покупка доступа', icon: ShoppingBag },
                { label: 'Обучение в кабинете', icon: GraduationCap },
              ].map(({ label, icon: Icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-400/15 text-violet-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-bold text-slate-100">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-start gap-2 text-sm leading-6 text-slate-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              Перед запуском будут отдельно проверены оплата, доступ и модерация
              материалов.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/5 p-4 sm:p-6">
            <div className="rounded-[24px] bg-white p-4 text-slate-950 shadow-2xl sm:p-5">
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-950 p-5 text-white">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
                    Демонстрация курса
                  </span>
                  <CirclePlay className="h-8 w-8 text-cyan-300" />
                </div>
                <div className="mt-12 max-w-md sm:mt-16">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                    Кардиология
                  </p>
                  <h3 className="mt-3 text-2xl font-black">
                    Основы интерпретации ЭКГ
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-violet-100/80">
                    Видеолекции, клинические примеры и дополнительные материалы.
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[
                  { label: '12 видеолекций', icon: Video },
                  { label: 'Методические файлы', icon: BookOpen },
                  { label: 'План обучения', icon: CalendarDays },
                  { label: 'Доступ в кабинете', icon: LockKeyhole },
                ].map(({ label, icon: Icon }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <Icon className="h-4 w-4 text-violet-700" />
                    <span className="text-xs font-bold text-slate-700">
                      {label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-violet-700">
                    Для преподавателей
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    Создавайте курсы и обучайте больше учеников
                  </p>
                </div>
                <UploadCloud className="h-7 w-7 shrink-0 text-violet-700" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="roles" className="scroll-mt-20 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            centered
            eyebrow="Одна платформа — две роли"
            title="Для учеников и преподавателей"
            description="Каждая роль получает собственный понятный рабочий процесс без лишних инструментов."
          />
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <article className="rounded-[30px] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white p-7 sm:p-9">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-700 text-white">
                <School className="h-7 w-7" />
              </span>
              <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                Школьникам и студентам
              </p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Учитесь с поддержкой специалиста
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Выберите подготовку к ОГЭ/ЕГЭ или медицинские дисциплины,
                получайте персональное объяснение и сохраняйте материалы.
              </p>
              <div className="mt-6 space-y-3">
                {studentBenefits.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
                    <span className="text-sm font-semibold text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/register/student"
                className="mt-7 ms-btn ms-btn-primary"
              >
                Создать профиль ученика
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>

            <article className="rounded-[30px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-7 sm:p-9">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-700 text-white">
                <Stethoscope className="h-7 w-7" />
              </span>
              <p className="mt-7 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                Преподавателям
              </p>
              <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                Преподавайте и развивайте профиль
              </h3>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Проводите индивидуальные занятия, управляйте материалами и
                готовьтесь создавать платные видеокурсы.
              </p>
              <div className="mt-6 space-y-3">
                {tutorBenefits.map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <Check className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
                    <span className="text-sm font-semibold text-slate-700">
                      {item}
                    </span>
                  </div>
                ))}
              </div>
              <Link
                href="/register/tutor"
                className="mt-7 ms-btn ms-btn-secondary"
              >
                Подать анкету преподавателя
                <ArrowRight className="h-4 w-4" />
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[34px] border border-slate-200 bg-white p-7 shadow-sm sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
              Доверие и качество
            </p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              Качество преподавания заложено в продукт
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              MedStart учитывает модерацию преподавателей, учебную траекторию
              ученика, проверку источников и защищённый формат занятия.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {trustItems.map(({ label, icon: Icon }) => (
              <div
                key={label}
                className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                  <Icon className="h-4 w-4" />
                </span>
                <p className="text-sm font-bold leading-6 text-slate-700">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[34px] bg-gradient-to-br from-teal-700 via-cyan-800 to-slate-950 px-6 py-11 text-white shadow-2xl sm:px-10 sm:py-14 lg:px-14">
          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                Ваш следующий шаг
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Начните с индивидуального занятия
              </h2>
              <p className="mt-4 text-base leading-8 text-cyan-50/80 sm:text-lg">
                Преподаватель, занятие, материалы, учебная база и будущие
                видеокурсы — в одном аккаунте MedStart.
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
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <Link href="/" aria-label="MedStart — главная">
              <Brand inverse />
            </Link>
            <p className="mt-4 max-w-md text-sm leading-7 text-slate-400">
              Профессиональная среда для подготовки к ОГЭ и ЕГЭ, медицинского
              обучения, материалов и будущих видеокурсов.
            </p>
          </div>
          <div>
            <p className="font-black text-white">Платформа</p>
            <div className="mt-4 grid gap-3 text-sm">
              <a className="transition hover:text-cyan-300" href="#learning">
                Форматы обучения
              </a>
              <a className="transition hover:text-cyan-300" href="#live">
                MedStart Live
              </a>
              <a className="transition hover:text-cyan-300" href="#courses">
                Видеокурсы
              </a>
            </div>
          </div>
          <div>
            <p className="font-black text-white">Аккаунт</p>
            <div className="mt-4 grid gap-3 text-sm">
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
        </div>
        <div className="border-t border-slate-800">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© 2026 MedStart. Образовательная платформа.</p>
            <p>Индивидуальные занятия · Учебная база · Видеокурсы</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
