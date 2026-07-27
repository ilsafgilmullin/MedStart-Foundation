import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  CirclePlay,
  Clock3,
  FileText,
  GraduationCap,
  HeartPulse,
  LibraryBig,
  LockKeyhole,
  MessageCircle,
  MonitorSmartphone,
  PenTool,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  UploadCloud,
  UserRound,
  Video,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'MedStart — индивидуальное медицинское обучение',
  description:
    'Индивидуальные занятия с медицинскими репетиторами, MedStart Live, совместная медицинская доска, учебная база и будущая платформа видеокурсов.',
}

const platformFeatures = [
  {
    title: 'MedStart Live',
    text: 'Профессиональная видеокомната внутри занятия — без перехода в сторонние сервисы.',
    icon: Video,
    iconClass: 'bg-cyan-50 text-cyan-700 ring-cyan-100',
  },
  {
    title: 'Индивидуальный формат',
    text: 'Один студент и один преподаватель: внимание сосредоточено только на вашей задаче.',
    icon: UserRound,
    iconClass: 'bg-violet-50 text-violet-700 ring-violet-100',
  },
  {
    title: 'Чат занятия',
    text: 'Вопросы, договорённости и учебное общение сохраняются в одном диалоге.',
    icon: MessageCircle,
    iconClass: 'bg-blue-50 text-blue-700 ring-blue-100',
  },
  {
    title: 'Расписание',
    text: 'Заявки, подтверждённые занятия, история встреч и управление временем в личном кабинете.',
    icon: CalendarDays,
    iconClass: 'bg-amber-50 text-amber-700 ring-amber-100',
  },
  {
    title: 'Материалы преподавателя',
    text: 'После занятия преподаватель может передать студенту видео, документы, ссылки и заметки.',
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

const learningPaths = [
  {
    eyebrow: 'Уже доступно',
    title: 'Индивидуальные занятия',
    text: 'Подберите преподавателя и разбирайте конкретные темы один на один в MedStart Live.',
    icon: Stethoscope,
    className:
      'border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white',
    iconClass: 'bg-cyan-600 text-white shadow-cyan-600/20',
  },
  {
    eyebrow: 'Готовится к запуску',
    title: 'Видеокурсы преподавателей',
    text: 'Структурированные видеокурсы, которые студенты смогут покупать и проходить в удобном темпе.',
    icon: CirclePlay,
    className:
      'border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white',
    iconClass: 'bg-violet-600 text-white shadow-violet-600/20',
  },
  {
    eyebrow: 'Уже доступно',
    title: 'Учебная база',
    text: 'Официальные источники и проверенные MedStart материалы для системной подготовки.',
    icon: LibraryBig,
    className:
      'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white',
    iconClass: 'bg-emerald-600 text-white shadow-emerald-600/20',
  },
]

const studentBenefits = [
  'Индивидуальная работа с преподавателем',
  'Подбор по дисциплине и формату',
  'Видео, доска и чат в одном занятии',
  'Материалы и история обучения',
  'В будущем — покупка видеокурсов',
]

const tutorBenefits = [
  'Профессиональный профиль после модерации',
  'Индивидуальные занятия со студентами',
  'Управление заявками и расписанием',
  'Передача видео, документов и заметок',
  'В будущем — создание и продажа курсов',
]

const steps = [
  {
    title: 'Создайте профиль',
    text: 'Зарегистрируйтесь как студент или подайте анкету преподавателя.',
  },
  {
    title: 'Выберите специалиста',
    text: 'Найдите преподавателя по медицинской дисциплине и отправьте заявку.',
  },
  {
    title: 'Проведите занятие',
    text: 'Подключитесь к MedStart Live и работайте вместе в индивидуальном формате.',
  },
  {
    title: 'Сохраните результат',
    text: 'Продолжите общение и используйте материалы преподавателя после встречи.',
  },
]

function Brand({ inverse = false }: { inverse?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span
        className={`grid h-11 w-11 place-items-center rounded-2xl border shadow-sm ${
          inverse
            ? 'border-white/15 bg-white/10 text-white'
            : 'border-teal-100 bg-white text-teal-700'
        }`}
      >
        <HeartPulse className="h-6 w-6" strokeWidth={2.25} />
      </span>
      <span
        className={`text-xl font-black tracking-tight ${
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
      <p className="text-xs font-black uppercase tracking-[0.2em] text-teal-700">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-5 text-base leading-8 text-slate-600 sm:text-lg">
        {description}
      </p>
    </div>
  )
}

export default function HomePage() {
  return (
    <main className="min-h-dvh overflow-hidden bg-white text-slate-950">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" aria-label="MedStart — главная">
            <Brand />
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
            <a className="transition hover:text-teal-700" href="#tutors">
              Преподавателям
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-xl px-3 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100 sm:px-4"
            >
              Войти
            </Link>
            <Link
              href="/register/student"
              className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition hover:bg-teal-800 sm:px-5"
            >
              Начать обучение
            </Link>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-slate-950">
        <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.16)_1px,transparent_0)] [background-size:32px_32px]" />
        <div className="pointer-events-none absolute -left-32 top-10 h-80 w-80 rounded-full bg-cyan-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-32 bottom-0 h-96 w-96 rounded-full bg-violet-600/25 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:px-8 lg:py-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100">
              <Sparkles className="h-4 w-4" />
              Медицинское обучение нового поколения
            </div>

            <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              Учитесь медицине
              <span className="block bg-gradient-to-r from-cyan-300 via-teal-200 to-violet-300 bg-clip-text text-transparent">
                индивидуально и системно
              </span>
            </h1>

            <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl">
              Один студент, один преподаватель и профессиональная среда для
              занятия: видеосвязь, медицинская доска, чат, расписание и учебные
              материалы. Следующий этап — видеокурсы преподавателей внутри
              MedStart.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/register/student"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-4 font-black text-slate-950 shadow-xl shadow-cyan-500/20 transition hover:from-teal-400 hover:to-cyan-400"
              >
                Начать обучение
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/register/tutor"
                className="inline-flex items-center justify-center rounded-2xl border border-white/15 bg-white/10 px-6 py-4 font-bold text-white backdrop-blur transition hover:bg-white/15"
              >
                Стать преподавателем
              </Link>
            </div>

            <div className="mt-9 grid max-w-2xl gap-3 text-sm text-slate-300 sm:grid-cols-3">
              {[
                ['Модерация профилей', BadgeCheck],
                ['Защищённая среда', ShieldCheck],
                ['Без лишних сервисов', Check],
              ].map(([label, Icon]) => (
                <div key={label as string} className="flex items-center gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-cyan-200">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-semibold">{label as string}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-6 rounded-[44px] bg-gradient-to-br from-cyan-400/20 to-violet-500/20 blur-2xl" />
            <div className="relative overflow-hidden rounded-[32px] border border-white/15 bg-white p-2 shadow-2xl shadow-black/40 sm:p-3">
              <div className="overflow-hidden rounded-[26px] bg-slate-100">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
                  <Brand />
                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 sm:inline-flex">
                      Занятие идёт
                    </span>
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_0_5px_rgba(16,185,129,0.12)]" />
                  </div>
                </div>

                <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-[1fr_0.42fr]">
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="relative flex min-h-36 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-white">
                        <div className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-cyan-400/20 text-sm font-black text-cyan-100 ring-1 ring-cyan-300/30">
                          АС
                        </div>
                        <div>
                          <p className="text-sm font-bold">Анна Сергеевна</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Преподаватель · Кардиология
                          </p>
                        </div>
                        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 text-[10px] font-bold text-emerald-200 backdrop-blur">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Онлайн
                        </span>
                      </div>
                      <div className="relative flex min-h-36 items-end overflow-hidden rounded-2xl bg-gradient-to-br from-violet-800 to-indigo-950 p-4 text-white">
                        <div className="absolute left-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-violet-300/20 text-sm font-black text-violet-100 ring-1 ring-violet-200/30">
                          МК
                        </div>
                        <div>
                          <p className="text-sm font-bold">Михаил К.</p>
                          <p className="mt-1 text-xs text-violet-200/70">
                            Студент · 4 курс
                          </p>
                        </div>
                        <Video className="absolute right-4 top-4 h-4 w-4 text-violet-200" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span className="grid h-9 w-9 place-items-center rounded-xl bg-teal-50 text-teal-700">
                            <PenTool className="h-4 w-4" />
                          </span>
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              Медицинская доска
                            </p>
                            <p className="text-[11px] text-slate-500">
                              Совместная работа в реальном времени
                            </p>
                          </div>
                        </div>
                        <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[10px] font-black text-teal-700">
                          Синхронизировано
                        </span>
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
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-600 to-indigo-700 p-4 text-white shadow-lg shadow-violet-600/15">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider">
                          Скоро
                        </span>
                        <CirclePlay className="h-5 w-5 text-violet-100" />
                      </div>
                      <p className="mt-7 text-sm font-black">
                        Видеокурсы MedStart
                      </p>
                      <p className="mt-2 text-xs leading-5 text-violet-100/80">
                        Покупка курсов преподавателей и обучение в собственном
                        темпе.
                      </p>
                      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/15">
                        <div className="h-full w-2/3 rounded-full bg-cyan-300" />
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="h-4 w-4 text-cyan-700" />
                        <p className="text-xs font-black text-slate-900">
                          Чат занятия
                        </p>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="max-w-[88%] rounded-xl rounded-bl-sm bg-slate-100 px-3 py-2 text-[10px] leading-4 text-slate-600">
                          Разберём этот комплекс ещё раз?
                        </div>
                        <div className="ml-auto max-w-[88%] rounded-xl rounded-br-sm bg-teal-600 px-3 py-2 text-[10px] leading-4 text-white">
                          Да, отмечу ключевые интервалы на доске.
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

      <section id="learning" className="scroll-mt-24 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            centered
            eyebrow="Три направления MedStart"
            title="Учитесь так, как требует ваша задача"
            description="Короткий разбор сложной темы, системный курс или надёжный источник для повторения — MedStart объединяет разные форматы медицинского образования."
          />

          <div className="mt-12 grid gap-5 lg:grid-cols-3">
            {learningPaths.map(({ icon: Icon, ...item }) => (
              <article
                key={item.title}
                className={`group rounded-[28px] border p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl sm:p-8 ${item.className}`}
              >
                <div
                  className={`grid h-14 w-14 place-items-center rounded-2xl shadow-lg ${item.iconClass}`}
                >
                  <Icon className="h-7 w-7" />
                </div>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  {item.eyebrow}
                </p>
                <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                  {item.title}
                </h3>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  {item.text}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-10 grid gap-4 rounded-[28px] border border-slate-200 bg-slate-50 p-5 sm:grid-cols-3 sm:p-7">
            {[
              ['Нужно разобраться сейчас?', 'Запишитесь на индивидуальное занятие.'],
              ['Хотите пройти тему полностью?', 'Выберите видеокурс после запуска раздела.'],
              ['Нужно повторить материал?', 'Откройте учебную базу MedStart.'],
            ].map(([title, text], index) => (
              <div key={title} className="flex gap-4 rounded-2xl bg-white p-4 shadow-sm">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white">
                  {index + 1}
                </span>
                <div>
                  <p className="font-black text-slate-900">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="live" className="scroll-mt-24 bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div className="order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-900/5 sm:p-7">
              <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-cyan-100 blur-3xl" />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-slate-950 text-cyan-300">
                      <HeartPulse className="h-6 w-6" />
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
                  <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-700">
                    Подтверждено
                  </span>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-[0.85fr_1.15fr]">
                  <div className="space-y-3">
                    <div className="rounded-2xl bg-slate-950 p-4 text-white">
                      <div className="grid h-12 w-12 place-items-center rounded-full bg-violet-500/20 font-black text-violet-100">
                        АС
                      </div>
                      <p className="mt-8 text-sm font-black">Преподаватель</p>
                      <p className="mt-1 text-xs text-slate-400">
                        Объясняет и ведёт занятие
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-black text-slate-700">
                        <Clock3 className="h-4 w-4 text-teal-700" />
                        Личный темп
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Можно остановиться на сложной теме и разобрать её подробно.
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-gradient-to-br from-teal-50 to-cyan-50 p-4 ring-1 ring-teal-100">
                    <div className="flex items-center justify-between text-xs font-black text-teal-900">
                      <span>Рабочее пространство</span>
                      <PenTool className="h-4 w-4" />
                    </div>
                    <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
                      <div className="grid grid-cols-2 gap-2">
                        {['ЭКГ', 'Клинический случай', 'Анализы', 'Заметки'].map(
                          (label) => (
                            <div
                              key={label}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center text-[11px] font-bold text-slate-600"
                            >
                              {label}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-teal-700 px-3 py-2.5 text-xs font-bold text-white">
                      <Check className="h-4 w-4" />
                      Результат сохраняется после занятия
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionHeading
              eyebrow="Индивидуальное обучение"
              title="Не просто видеозвонок. Полноценное медицинское занятие"
              description="MedStart создан вокруг работы один на один. Преподаватель видит запрос конкретного студента, адаптирует темп и использует профессиональные инструменты прямо во время встречи."
            />

            <div className="mt-8 space-y-4">
              {[
                'Один студент и один преподаватель в комнате',
                'Совместная доска для схем, ЭКГ, анализов и заметок',
                'Чат, расписание и материалы связаны с занятием',
                'Никаких разрозненных ссылок и отдельных приложений',
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-100 text-teal-700">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <p className="font-semibold leading-7 text-slate-700">{item}</p>
                </div>
              ))}
            </div>

            <Link
              href="/register/student"
              className="mt-9 inline-flex items-center gap-2 font-black text-teal-700 transition hover:text-teal-900"
            >
              Найти преподавателя
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            centered
            eyebrow="Возможности платформы"
            title="Всё главное находится внутри MedStart"
            description="Функции собраны вокруг реального учебного процесса, чтобы студент и преподаватель не переключались между несколькими сервисами."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {platformFeatures.map(({ title, text, icon: Icon, iconClass }) => (
              <article
                key={title}
                className="rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-xl"
              >
                <div
                  className={`grid h-12 w-12 place-items-center rounded-2xl ring-4 ${iconClass}`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-black tracking-tight text-slate-950">
                  {title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="courses" className="scroll-mt-24 bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-300/10 px-4 py-2 text-sm font-black text-violet-100">
              <CirclePlay className="h-4 w-4" />
              Раздел готовится к запуску
            </div>
            <h2 className="mt-6 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
              Видеокурсы преподавателей MedStart
            </h2>
            <p className="mt-6 text-lg leading-8 text-slate-300">
              Следующий этап платформы — собственная витрина медицинских курсов.
              Преподаватели смогут собирать видеолекции и дополнительные
              материалы в структурированные программы, а студенты — покупать
              доступ и учиться в удобном темпе.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ['Видеоуроки', CirclePlay],
                ['Материалы курса', FileText],
                ['Покупка доступа', ShoppingBag],
                ['Обучение в кабинете', GraduationCap],
              ].map(([label, Icon]) => (
                <div
                  key={label as string}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-violet-400/15 text-violet-200">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-bold text-slate-100">{label as string}</span>
                </div>
              ))}
            </div>

            <p className="mt-7 flex items-start gap-2 text-sm leading-6 text-slate-400">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
              До запуска раздел будет отдельно проверен: структура курса,
              безопасность оплаты, правила доступа и модерация материалов.
            </p>
          </div>

          <div className="relative">
            <div className="absolute -inset-8 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="relative rounded-[32px] border border-white/10 bg-white/5 p-5 backdrop-blur sm:p-7">
              <div className="rounded-[26px] bg-white p-4 text-slate-950 shadow-2xl sm:p-5">
                <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-violet-700 via-indigo-700 to-slate-950 p-5 text-white">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/15 px-3 py-1.5 text-xs font-black">
                      Демонстрация курса
                    </span>
                    <CirclePlay className="h-8 w-8 text-cyan-300" />
                  </div>
                  <div className="mt-16 max-w-md">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-violet-200">
                      Кардиология
                    </p>
                    <h3 className="mt-3 text-2xl font-black">
                      Основы интерпретации ЭКГ
                    </h3>
                    <p className="mt-3 text-sm leading-6 text-violet-100/80">
                      Последовательная программа из видеолекций, клинических
                      примеров и дополнительных материалов.
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ['12 видеолекций', Video],
                    ['Методические файлы', BookOpen],
                    ['Последовательный план', CalendarDays],
                    ['Доступ в кабинете', LockKeyhole],
                  ].map(([label, Icon]) => (
                    <div
                      key={label as string}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                    >
                      <Icon className="h-4 w-4 text-violet-700" />
                      <span className="text-xs font-bold text-slate-700">
                        {label as string}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-violet-200 bg-violet-50 p-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-violet-700">
                      Для преподавателей
                    </p>
                    <p className="mt-1 text-sm font-black text-slate-900">
                      Загрузите знания один раз — обучайте больше студентов
                    </p>
                  </div>
                  <UploadCloud className="h-7 w-7 shrink-0 text-violet-700" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tutors" className="scroll-mt-24 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            centered
            eyebrow="Одна платформа — две роли"
            title="Полезно студентам. Профессионально для преподавателей"
            description="Каждая роль получает собственный понятный рабочий процесс без лишних инструментов."
          />

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <article className="relative overflow-hidden rounded-[32px] border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-white p-7 sm:p-9">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-200/50 blur-3xl" />
              <div className="relative">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-700 text-white shadow-lg shadow-cyan-700/20">
                  <GraduationCap className="h-7 w-7" />
                </span>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-cyan-700">
                  Студентам
                </p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  Учитесь с поддержкой специалиста
                </h3>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Получайте персональное объяснение, сохраняйте материалы и
                  выстраивайте обучение вокруг своего уровня и цели.
                </p>
                <div className="mt-7 space-y-3">
                  {studentBenefits.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-cyan-100 text-cyan-700">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/register/student"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-cyan-700 px-5 py-3.5 font-black text-white transition hover:bg-cyan-800"
                >
                  Создать профиль студента
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>

            <article className="relative overflow-hidden rounded-[32px] border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-white p-7 sm:p-9">
              <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-violet-200/50 blur-3xl" />
              <div className="relative">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-violet-700 text-white shadow-lg shadow-violet-700/20">
                  <Stethoscope className="h-7 w-7" />
                </span>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-violet-700">
                  Преподавателям
                </p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
                  Преподавайте и развивайте свой профиль
                </h3>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  Проводите индивидуальные занятия, управляйте студентами и
                  готовьтесь создавать собственные платные видеокурсы.
                </p>
                <div className="mt-7 space-y-3">
                  {tutorBenefits.map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-violet-100 text-violet-700">
                        <Check className="h-3 w-3" />
                      </span>
                      <span className="text-sm font-semibold text-slate-700">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
                <Link
                  href="/register/tutor"
                  className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-violet-700 px-5 py-3.5 font-black text-white transition hover:bg-violet-800"
                >
                  Подать анкету преподавателя
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            centered
            eyebrow="Простой путь"
            title="От регистрации до первого занятия"
            description="Платформа проводит пользователя через понятный последовательный процесс."
          />

          <div className="mt-12 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {steps.map((step, index) => (
              <article
                key={step.title}
                className="relative rounded-[26px] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-950 font-black text-white">
                  {index + 1}
                </span>
                <h3 className="mt-6 text-xl font-black text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {step.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 rounded-[36px] border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-7 shadow-sm sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-teal-700">
                Доверие и качество
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
                Медицинская специализация — не декоративная надпись
              </h2>
              <p className="mt-5 text-base leading-8 text-slate-600">
                Архитектура MedStart учитывает модерацию преподавателей,
                проверку учебных источников, защиту аккаунтов и особый формат
                медицинского занятия.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {[
                ['Профили преподавателей проходят модерацию', BadgeCheck],
                ['Официальные и проверенные учебные источники', LibraryBig],
                ['Серверная защита регистрации и входа', LockKeyhole],
                ['Материалы курса будут проходить проверку', ShieldCheck],
                ['Напоминания и единое расписание', Bell],
                ['Инструменты для медицинского разбора', HeartPulse],
              ].map(([label, Icon]) => (
                <div
                  key={label as string}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-bold leading-6 text-slate-700">
                    {label as string}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white px-4 pb-20 sm:px-6 sm:pb-28 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] bg-gradient-to-br from-teal-700 via-cyan-800 to-slate-950 px-6 py-12 text-white shadow-2xl shadow-teal-900/20 sm:px-10 sm:py-16 lg:px-16">
          <div className="pointer-events-none absolute -right-20 -top-28 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">
                Ваш следующий шаг
              </p>
              <h2 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                Начните с индивидуального занятия. Продолжите системным обучением.
              </h2>
              <p className="mt-5 text-base leading-8 text-cyan-50/80 sm:text-lg">
                MedStart развивается в единую медицинскую образовательную
                экосистему: преподаватель, занятие, материалы, учебная база и
                видеокурсы в одном аккаунте.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/register/student"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-6 py-4 font-black text-slate-950 transition hover:bg-cyan-50"
              >
                Начать обучение
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/register/tutor"
                className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/10 px-6 py-4 font-bold text-white transition hover:bg-white/15"
              >
                Стать преподавателем
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 bg-slate-950 text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.2fr_0.8fr_0.8fr] lg:px-8">
          <div>
            <Link href="/" aria-label="MedStart — главная">
              <Brand inverse />
            </Link>
            <p className="mt-5 max-w-md text-sm leading-7 text-slate-400">
              Профессиональная среда для индивидуального медицинского обучения,
              учебных материалов и будущих видеокурсов преподавателей.
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
                Студентам
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
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
            <p>© 2026 MedStart. Медицинская образовательная платформа.</p>
            <p>Индивидуальные занятия · Учебная база · Видеокурсы</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
