import type { Metadata } from "next";
import { ArrowRight, BookOpen, Users, BarChart2, ShieldCheck, Globe, Zap, CheckCircle2 } from "lucide-react";

import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Container } from "@/components/layout/container";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { ROUTES } from "@/lib/constants";

export const metadata: Metadata = {
  title: "MedStart — Современное медицинское образование",
  description:
    "Платформа MedStart объединяет студентов-медиков и преподавателей для современного обучения.",
};

const features = [
  {
    icon: <BookOpen className="h-5 w-5" />,
    title: "Структурированные программы",
    description:
      "Пошаговые образовательные программы, основанные на современных международных медицинских стандартах.",
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: "Опытные преподаватели",
    description:
      "Обучайтесь у практикующих врачей и преподавателей с подтвержденной квалификацией.",
  },
  {
    icon: <BarChart2 className="h-5 w-5" />,
    title: "Отслеживание прогресса",
    description:
      "Следите за своими результатами, достижениями и рекомендациями по дальнейшему обучению.",
  },
  {
    icon: <ShieldCheck className="h-5 w-5" />,
    title: "Проверенные специалисты",
    description:
      "Каждый преподаватель проходит проверку документов и профессионального опыта.",
  },
  {
    icon: <Globe className="h-5 w-5" />,
    title: "Международное сообщество",
    description:
      "Общайтесь со студентами и преподавателями со всего мира.",
  },
  {
    icon: <Zap className="h-5 w-5" />,
    title: "Гибкое обучение",
    description:
      "Занимайтесь в удобное время и проходите материал в собственном темпе.",
  },
];

const benefits = [
  "Гибкое расписание",
  "Индивидуальные и групповые занятия",
  "Материалы по медицинским специальностям",
  "Проверка знаний",
  "Сертификат после завершения курса",
  "Полная поддержка мобильных устройств",
];

export default function HomePage() {
  return (
    <>
      <Header />

      <main>

        {/* Hero */}

        <section
          className="relative overflow-hidden bg-background py-16 sm:py-20 lg:py-24"
          aria-label="Главный экран"
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex justify-center"
          >
            <div className="h-[520px] w-[520px] rounded-full bg-brand-500/10 blur-3xl" />
          </div>

          <Container size="lg">

            <div className="mx-auto max-w-3xl text-center">

              <Badge variant="brand" className="mb-5">
                🚀 Платформа уже доступна
              </Badge>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">

                Современное
                <br />

                <span className="text-brand-500">
                  медицинское образование
                </span>

              </h1>

              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-foreground-muted">
                MedStart объединяет студентов и преподавателей медицины
                на современной образовательной платформе для эффективного
                обучения, обмена опытом и профессионального развития.
              </p>

              <div className="mt-10 flex flex-wrap justify-center gap-4">

                <Button
                  href={ROUTES.REGISTER.STUDENT}
                  size="lg"
                >
                  Начать обучение

                  <ArrowRight className="h-4 w-4" />
                </Button>

                <Button
                  href={ROUTES.REGISTER.TEACHER}
                  variant="outline"
                  size="lg"
                >
                  Стать преподавателем
                </Button>

              </div>

              <p className="mt-5 text-sm text-foreground-subtle">
                Бесплатная регистрация • Без банковской карты
              </p>

            </div>

          </Container>

        </section>
        {/* Статистика */}

        <section
          className="border-y border-border bg-surface py-8"
          aria-label="Статистика"
        >
          <Container>
            <div className="grid grid-cols-2 gap-8 text-center lg:grid-cols-4">

              {[
                {
                  value: "50 000+",
                  label: "Студентов",
                },
                {
                  value: "3 200+",
                  label: "Преподавателей",
                },
                {
                  value: "98%",
                  label: "Положительных отзывов",
                },
                {
                  value: "80+",
                  label: "Стран",
                },
              ].map((item) => (
                <div key={item.label}>
                  <div className="text-3xl font-bold text-brand-500">
                    {item.value}
                  </div>

                  <div className="mt-2 text-sm text-foreground-muted">
                    {item.label}
                  </div>
                </div>
              ))}

            </div>
          </Container>
        </section>

        {/* Возможности */}

        <section
          className="py-20"
          id="features"
        >
          <Container>

            <div className="mx-auto mb-14 max-w-2xl text-center">

              <Badge className="mb-4">
                Возможности платформы
              </Badge>

              <h2 className="text-4xl font-bold tracking-tight">

                Всё необходимое
                <br />
                для современного медицинского образования

              </h2>

              <p className="mt-5 text-lg text-foreground-muted">

                MedStart создавался специально
                для медицинского образования,
                а не является переделанной LMS.

              </p>

            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

              {features.map((feature) => (

                <div
                  key={feature.title}
                  className="rounded-2xl border border-border bg-background p-7 transition-all hover:-translate-y-1 hover:shadow-lg"
                >

                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-500">
                    {feature.icon}
                  </div>

                  <h3 className="mb-3 text-xl font-semibold">
                    {feature.title}
                  </h3>

                  <p className="leading-7 text-foreground-muted">
                    {feature.description}
                  </p>

                </div>

              ))}

            </div>

          </Container>

        </section>
        {/* Для преподавателей */}

        <section
          id="educators"
          className="border-y border-border bg-surface py-20"
        >
          <Container>

            <div className="grid items-center gap-14 lg:grid-cols-2">

              <div>

                <Badge variant="brand" className="mb-4">
                  Для преподавателей
                </Badge>

                <h2 className="text-4xl font-bold tracking-tight">
                  Делитесь знаниями.
                  <br />
                  Обучайте новое поколение врачей.
                </h2>

                <p className="mt-6 text-lg leading-8 text-foreground-muted">
                  Создавайте авторские курсы, публикуйте учебные материалы,
                  проводите индивидуальные и групповые занятия, отслеживайте
                  прогресс студентов и развивайте свою профессиональную
                  репутацию на одной современной платформе.
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">

                  {benefits.map((item) => (

                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-xl border border-border bg-background p-4"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />

                      <span className="text-sm font-medium">
                        {item}
                      </span>

                    </div>

                  ))}

                </div>

                <div className="mt-10">

                  <Button
                    href={ROUTES.REGISTER.TEACHER}
                    size="lg"
                  >
                    Стать преподавателем

                    <ArrowRight className="h-4 w-4" />
                  </Button>

                </div>

              </div>

              {/* Правая карточка */}

              <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-brand-500 to-brand-700 p-10 text-white shadow-2xl">

                <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

                <div className="relative">

                  <div className="mb-6 inline-flex rounded-full bg-white/15 px-4 py-2 text-sm">
                    MedStart PRO
                  </div>

                  <h3 className="text-3xl font-bold">
                    Создавайте собственные курсы
                  </h3>

                  <p className="mt-5 text-white/90 leading-8">
                    Загружайте лекции, тесты, презентации, клинические случаи,
                    проводите онлайн-занятия и формируйте профессиональное
                    медицинское сообщество.
                  </p>

                  <div className="mt-10 grid grid-cols-2 gap-4">

                    <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">

                      <div className="text-3xl font-bold">
                        24/7
                      </div>

                      <div className="mt-1 text-sm text-white/80">
                        доступ к материалам
                      </div>

                    </div>

                    <div className="rounded-2xl bg-white/10 p-5 backdrop-blur">

                      <div className="text-3xl font-bold">
                        AI
                      </div>

                      <div className="mt-1 text-sm text-white/80">
                        интеллектуальная помощь
                      </div>

                    </div>

                  </div>

                </div>

              </div>

            </div>

          </Container>

        </section>
                {/* Финальный призыв */}

                <section
                  className="relative overflow-hidden py-20"
                  aria-label="Начать"
                >

                  <div className="absolute inset-0 bg-brand-600" />

                  <div className="absolute left-1/2 top-0 h-[450px] w-[450px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />

                  <Container>

                    <div className="relative mx-auto max-w-3xl text-center text-white">

                      <Badge
                        variant="outline"
                        className="mb-6 border-white/30 text-white"
                      >
                        MedStart
                      </Badge>

                      <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">

                        Начните обучение уже сегодня

                      </h2>

                      <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-brand-100">

                        Присоединяйтесь к студентам и преподавателям,
                        которые уже используют MedStart
                        для современного медицинского образования.

                      </p>

                      <div className="mt-10 flex flex-wrap justify-center gap-4">

                        <Button
                          href={ROUTES.REGISTER.STUDENT}
                          variant="secondary"
                          size="lg"
                        >
                          Создать аккаунт
                        </Button>

                        <Button
                          href={ROUTES.LOGIN}
                          variant="ghost"
                          size="lg"
                          className="border border-white/20 text-white hover:bg-white/10 hover:text-white"
                        >
                          Войти
                        </Button>

                      </div>

                    </div>

                  </Container>

                </section>

              </main>

              <Footer />

            </>
          )
        }