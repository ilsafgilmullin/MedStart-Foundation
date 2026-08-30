'use client'

import Link from 'next/link'
import { BadgeCheck, GraduationCap, LoaderCircle, School } from 'lucide-react'
import {
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'
import { PasswordRequirements } from '@/components/auth/PasswordRequirements'
import { useHydrated } from '@/hooks/useHydrated'
import { useTutorRegistration } from '@/hooks/useTutorRegistration'
import { ROUTES } from '@/lib/constants'
import { SCHOOL_TRACK_ENABLED } from '@/lib/feature-flags'
import {
  SCHOOL_EXAM_LABELS,
  subjectsForExam,
  type LearnerTrack,
  type SchoolExam,
} from '@/lib/education'

export default function RegisterTutorPage() {
  const form = useTutorRegistration()
  const hydrated = useHydrated()
  const disabled = form.loading || !hydrated
  const suggestedSchoolSubjects = [
    ...new Map(
      form.examTypes
        .flatMap((exam) => subjectsForExam(exam))
        .map((subject) => [subject.value, subject]),
    ).values(),
  ]

  return (
    <AuthShell
      wide
      eyebrow="Анкета репетитора"
      title="Преподавайте в MedStart"
      description={
        SCHOOL_TRACK_ENABLED
          ? 'Заполните профессиональный профиль для занятий со школьниками, студентами медвузов или обеими группами. После подтверждения почты анкета поступит на модерацию.'
          : 'Заполните профессиональный профиль для занятий со студентами медвузов. После подтверждения почты анкета поступит на модерацию.'
      }
      footer={
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={ROUTES.LOGIN}
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            Уже есть аккаунт
          </Link>
          <Link
            href={ROUTES.REGISTER.STUDENT}
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            Зарегистрироваться как ученик
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm leading-6 text-violet-950">
        <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-700" />
        <p>
          Статус нового профиля — «На проверке». Модератор проверит
          квалификацию, направления подготовки и сведения для каталога.
        </p>
      </div>

      <form onSubmit={form.handleSubmit} className="space-y-7" noValidate>
        <section className="space-y-5">
          <h2 className="text-lg font-bold text-slate-900">Основные данные</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Имя *
              <input
                autoComplete="given-name"
                required
                disabled={disabled}
                className={authInputClass}
                value={form.firstName}
                onChange={(event) => form.setFirstName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Фамилия *
              <input
                autoComplete="family-name"
                required
                disabled={disabled}
                className={authInputClass}
                value={form.lastName}
                onChange={(event) => form.setLastName(event.target.value)}
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            Электронная почта *
            <input
              type="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              autoComplete="email"
              required
              disabled={disabled}
              className={authInputClass}
              value={form.email}
              onChange={(event) => form.setEmail(event.target.value)}
              placeholder="name@example.ru"
            />
          </label>
        </section>

        <section className="space-y-5 border-t border-slate-200 pt-7">
          <h2 className="text-lg font-bold text-slate-900">
            Профессиональный профиль
          </h2>
          <fieldset>
            <legend className="text-sm font-semibold text-slate-700">
              С кем вы проводите занятия *
            </legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                ...(SCHOOL_TRACK_ENABLED
                  ? [
                      {
                        value: 'school' as LearnerTrack,
                        label: 'Школьники',
                        hint: 'ОГЭ и ЕГЭ',
                        icon: School,
                      },
                    ]
                  : []),
                {
                  value: 'medical' as LearnerTrack,
                  label: 'Студенты медвузов',
                  hint: 'Медицинские дисциплины',
                  icon: GraduationCap,
                },
              ].map((item) => {
                const Icon = item.icon
                return (
                  <button
                    key={item.value}
                    type="button"
                    disabled={disabled}
                    aria-pressed={form.tutorAudiences.includes(item.value)}
                    onClick={() => form.toggleAudience(item.value)}
                    className="ms-choice ms-choice-block min-h-20 justify-start text-left"
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    <span>
                      <span className="block font-bold">{item.label}</span>
                      <span className="mt-1 block text-xs font-medium opacity-75">
                        {item.hint}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </fieldset>

          {SCHOOL_TRACK_ENABLED && form.tutorAudiences.includes('school') && (
            <fieldset className="rounded-3xl border border-sky-200 bg-sky-50/60 p-4 sm:p-5">
              <legend className="px-1 text-sm font-semibold text-slate-700">
                К каким экзаменам готовите *
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {(
                  Object.entries(SCHOOL_EXAM_LABELS) as Array<
                    [SchoolExam, string]
                  >
                ).map(([exam, label]) => (
                  <button
                    key={exam}
                    type="button"
                    disabled={disabled}
                    aria-pressed={form.examTypes.includes(exam)}
                    onClick={() => form.toggleExamType(exam)}
                    className="ms-choice ms-choice-block justify-start"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          )}

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            Специализация *
            <input
              required
              disabled={disabled}
              className={authInputClass}
              placeholder="Например: химия ОГЭ/ЕГЭ или анатомия и физиология"
              value={form.specialization}
              onChange={(event) => form.setSpecialization(event.target.value)}
            />
          </label>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            Предметы
            <input
              disabled={disabled}
              className={authInputClass}
              placeholder="Анатомия, физиология, биология"
              value={form.subjects}
              onChange={(event) => form.setSubjects(event.target.value)}
            />
            <span className="block text-xs font-normal text-slate-400">
              Перечислите через запятую.
            </span>
          </label>

          {form.tutorAudiences.includes('school') &&
            suggestedSchoolSubjects.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-slate-700">
                  Быстро добавить школьные предметы
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestedSchoolSubjects.map((subject) => (
                    <button
                      key={subject.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => form.addSuggestedSubject(subject.value)}
                      className="ms-choice ms-choice-pill"
                    >
                      {subject.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Учреждение
              <input
                disabled={disabled}
                className={authInputClass}
                value={form.institution}
                onChange={(event) => form.setInstitution(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Опыт
              <input
                disabled={disabled}
                className={authInputClass}
                placeholder="Например: 5 лет"
                value={form.experience}
                onChange={(event) => form.setExperience(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Город
              <input
                disabled={disabled}
                className={authInputClass}
                placeholder="Например: Казань"
                value={form.city}
                onChange={(event) => form.setCity(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Стоимость занятия, ₽
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="1000000"
                step="100"
                disabled={disabled}
                className={authInputClass}
                placeholder="1500"
                value={form.lessonPrice}
                onChange={(event) => form.setLessonPrice(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Продолжительность
              <select
                className={authInputClass}
                value={form.lessonDuration}
                disabled={disabled}
                onChange={(event) => form.setLessonDuration(event.target.value)}
              >
                <option value="30">30 минут</option>
                <option value="45">45 минут</option>
                <option value="60">60 минут</option>
                <option value="90">90 минут</option>
                <option value="120">120 минут</option>
              </select>
            </label>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700">
              Формат занятий *
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => form.setOnline(!form.online)}
                aria-pressed={form.online}
                className="ms-choice ms-choice-block justify-start text-left"
              >
                Онлайн
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => form.setInPerson(!form.inPerson)}
                aria-pressed={form.inPerson}
                className="ms-choice ms-choice-block justify-start text-left"
              >
                Очно
              </button>
            </div>
          </div>

          <label className="block space-y-2 text-sm font-semibold text-slate-700">
            О себе
            <textarea
              disabled={disabled}
              className={`${authInputClass} min-h-32 resize-y`}
              value={form.bio}
              onChange={(event) => form.setBio(event.target.value)}
              placeholder="Расскажите об образовании, опыте и подходе к занятиям."
            />
          </label>
        </section>

        <section className="space-y-5 border-t border-slate-200 pt-7">
          <h2 className="text-lg font-bold text-slate-900">
            Безопасность аккаунта
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <PasswordField
              label="Пароль *"
              value={form.password}
              onChange={form.setPassword}
              autoComplete="new-password"
              disabled={disabled}
              errorId={form.error ? 'tutor-registration-error' : undefined}
            />
            <PasswordField
              label="Повторите пароль *"
              value={form.confirmPassword}
              onChange={form.setConfirmPassword}
              autoComplete="new-password"
              disabled={disabled}
              errorId={form.error ? 'tutor-registration-error' : undefined}
            />
          </div>
          <PasswordRequirements password={form.password} />
        </section>

        {!hydrated && (
          <p
            role="status"
            aria-live="polite"
            className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900"
          >
            Подключаем защищённую регистрацию MedStart…
          </p>
        )}

        {form.error && (
          <p
            id="tutor-registration-error"
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-800"
          >
            {form.error}
          </p>
        )}

        <button
          type="submit"
          disabled={disabled}
          aria-busy={form.loading}
          className={authPrimaryButtonClass}
        >
          {form.loading ? (
            <>
              <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />
              Создаём защищённый профиль…
            </>
          ) : hydrated ? (
            'Создать профиль и отправить на проверку'
          ) : (
            'Подключаем регистрацию…'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
