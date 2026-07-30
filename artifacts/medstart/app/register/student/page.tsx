'use client'

import Link from 'next/link'
import {
  BookOpenCheck,
  GraduationCap,
  LoaderCircle,
  School,
} from 'lucide-react'
import {
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from '@/components/auth/AuthShell'
import { PasswordField } from '@/components/auth/PasswordField'
import { PasswordRequirements } from '@/components/auth/PasswordRequirements'
import { useHydrated } from '@/hooks/useHydrated'
import { useStudentRegistration } from '@/hooks/useStudentRegistration'
import { ROUTES } from '@/lib/constants'
import {
  MEDICAL_FIELDS,
  SCHOOL_EXAM_LABELS,
  SCHOOL_GRADES,
  subjectsForExam,
  type LearnerTrack,
} from '@/lib/education'

export default function RegisterStudentPage() {
  const form = useStudentRegistration()
  const hydrated = useHydrated()
  const disabled = form.loading || !hydrated

  return (
    <AuthShell
      eyebrow="Аккаунт ученика"
      title="Начните учиться в MedStart"
      description="Создайте профиль школьника для подготовки к ОГЭ и ЕГЭ или профиль студента медвуза. После подтверждения почты откроются преподаватели, расписание, сообщения и материалы."
      footer={
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={ROUTES.LOGIN}
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            Уже есть аккаунт
          </Link>
          <Link
            href={ROUTES.REGISTER.TUTOR}
            className="font-semibold text-teal-700 hover:text-teal-900"
          >
            Зарегистрироваться как репетитор
          </Link>
        </div>
      }
    >
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm leading-6 text-cyan-950">
        <GraduationCap className="mt-0.5 h-5 w-5 shrink-0 text-cyan-700" />
        <p>
          Профиль ученика активируется автоматически после создания аккаунта и
          подтверждения электронной почты.
        </p>
      </div>

      <form onSubmit={form.handleSubmit} className="space-y-5" noValidate>
        <fieldset>
          <legend className="text-sm font-semibold text-slate-700">
            Кто будет учиться
          </legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              {
                value: 'school' as LearnerTrack,
                label: 'Школьник',
                hint: 'Подготовка к ОГЭ и ЕГЭ',
                icon: School,
              },
              {
                value: 'medical' as LearnerTrack,
                label: 'Студент медвуза',
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
                  aria-pressed={form.learnerTrack === item.value}
                  onClick={() => form.setLearnerTrack(item.value)}
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

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-semibold text-slate-700">
            Имя
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
            Фамилия
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
          Электронная почта
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

        {form.learnerTrack === 'medical' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Направление
              <select
                className={authInputClass}
                value={form.field}
                disabled={disabled}
                onChange={(event) => form.setField(event.target.value)}
              >
                {MEDICAL_FIELDS.map((field) => (
                  <option key={field.value} value={field.value}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-semibold text-slate-700">
              Курс
              <select
                className={authInputClass}
                value={form.year}
                disabled={disabled}
                onChange={(event) => form.setYear(event.target.value)}
              >
                {[1, 2, 3, 4, 5, 6].map((year) => (
                  <option key={year} value={year}>
                    {year}-й курс
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <section className="space-y-5 rounded-3xl border border-sky-200 bg-sky-50/60 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-sky-700" />
              <div>
                <h2 className="font-bold text-slate-900">
                  Подготовка к экзаменам
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Выберите текущий класс, экзамен и все нужные предметы.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Класс
                <select
                  className={authInputClass}
                  value={form.schoolGrade}
                  disabled={disabled}
                  onChange={(event) => form.setSchoolGrade(event.target.value)}
                >
                  {SCHOOL_GRADES.map((grade) => (
                    <option key={grade.value} value={grade.value}>
                      {grade.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Экзамен
                <select
                  className={authInputClass}
                  value={form.schoolExam}
                  disabled={disabled}
                  onChange={(event) =>
                    form.setSchoolExam(event.target.value as 'oge' | 'ege')
                  }
                >
                  {Object.entries(SCHOOL_EXAM_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="text-sm font-semibold text-slate-700">
                Предметы *
              </legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {subjectsForExam(form.schoolExam).map((subject) => (
                  <button
                    key={subject.value}
                    type="button"
                    disabled={disabled}
                    aria-pressed={form.schoolSubjects.includes(subject.value)}
                    onClick={() => form.toggleSchoolSubject(subject.value)}
                    className="ms-choice ms-choice-block justify-start text-left"
                  >
                    {subject.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-white p-4 text-sm leading-6 text-slate-700">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 accent-teal-700"
                checked={form.schoolConsentConfirmed}
                disabled={disabled}
                onChange={(event) =>
                  form.setSchoolConsentConfirmed(event.target.checked)
                }
              />
              <span>
                Мне исполнилось 18 лет или обучение и использование платформы
                согласованы с моим законным представителем.
              </span>
            </label>
          </section>
        )}

        <PasswordField
          label="Придумайте пароль"
          value={form.password}
          onChange={form.setPassword}
          autoComplete="new-password"
          disabled={disabled}
          errorId={form.error ? 'student-registration-error' : undefined}
        />
        <PasswordRequirements password={form.password} />
        <PasswordField
          label="Повторите пароль"
          value={form.confirmPassword}
          onChange={form.setConfirmPassword}
          autoComplete="new-password"
          disabled={disabled}
          errorId={form.error ? 'student-registration-error' : undefined}
        />

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
            id="student-registration-error"
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
              Создаём защищённый аккаунт…
            </>
          ) : hydrated ? (
            form.learnerTrack === 'school' ? (
              'Создать аккаунт школьника'
            ) : (
              'Создать аккаунт студента медвуза'
            )
          ) : (
            'Подключаем регистрацию…'
          )}
        </button>
      </form>
    </AuthShell>
  )
}
