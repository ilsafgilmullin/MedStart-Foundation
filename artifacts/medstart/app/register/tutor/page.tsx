'use client'

import Link from 'next/link'
import { useTutorRegistration } from '@/hooks/useTutorRegistration'
import { ROUTES } from '@/lib/constants'

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100 sm:text-sm'

export default function RegisterTutorPage() {
  const form = useTutorRegistration()
  return (
    <main className="min-h-dvh bg-slate-50 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <Link href={ROUTES.HOME} className="text-xl font-bold text-violet-700">
          MedStart
        </Link>
        <div className="mt-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h1 className="text-3xl font-bold text-slate-900">
            Профиль репетитора
          </h1>
          <p className="mt-2 text-slate-500">
            Заполните анкету. В каталоге она появится только после проверки.
          </p>
          <form onSubmit={form.handleSubmit} className="mt-8 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Имя *
                <input
                  autoComplete="given-name"
                  required
                  className={inputClass}
                  value={form.firstName}
                  onChange={(event) => form.setFirstName(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Фамилия *
                <input
                  autoComplete="family-name"
                  required
                  className={inputClass}
                  value={form.lastName}
                  onChange={(event) => form.setLastName(event.target.value)}
                />
              </label>
            </div>
            <label className="block space-y-2 text-sm font-medium">
              Электронная почта *
              <input
                type="email"
                autoComplete="email"
                required
                className={inputClass}
                value={form.email}
                onChange={(event) => form.setEmail(event.target.value)}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Специализация *
                              <input
                  required
                  className={inputClass}
                  placeholder="Например: анатомия и физиология"
                value={form.specialization}
                onChange={(event) => form.setSpecialization(event.target.value)}
              />
            </label>
            <label className="block space-y-2 text-sm font-medium">
              Предметы
              <input
                className={inputClass}
                placeholder="Анатомия, физиология, биология"
                value={form.subjects}
                onChange={(event) => form.setSubjects(event.target.value)}
              />
              <span className="block text-xs font-normal text-slate-400">
                Перечислите через запятую.
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Учреждение
                <input
                  className={inputClass}
                  value={form.institution}
                  onChange={(event) => form.setInstitution(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Опыт
                <input
                  className={inputClass}
                  placeholder="Например: 5 лет"
                  value={form.experience}
                  onChange={(event) => form.setExperience(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Город
                <input
                  className={inputClass}
                  placeholder="Например: Казань"
                  value={form.city}
                  onChange={(event) => form.setCity(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Стоимость занятия, ₽
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  step="100"
                  className={inputClass}
                  placeholder="1500"
                  value={form.lessonPrice}
                  onChange={(event) => form.setLessonPrice(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Продолжительность
                <select
                  className={inputClass}
                  value={form.lessonDuration}
                  onChange={(event) =>
                    form.setLessonDuration(event.target.value)
                  }
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
              <p className="text-sm font-medium">Формат занятий *</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => form.setOnline(!form.online)}
                  aria-pressed={form.online}
                  className={`rounded-2xl border px-4 py-3 text-left font-semibold ${
                    form.online
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Онлайн
                </button>
                <button
                  type="button"
                  onClick={() => form.setInPerson(!form.inPerson)}
                  aria-pressed={form.inPerson}
                  className={`rounded-2xl border px-4 py-3 text-left font-semibold ${
                    form.inPerson
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-600'
                  }`}
                >
                  Очно
                </button>
              </div>
            </div>
            <label className="block space-y-2 text-sm font-medium">
              О себе
              <textarea
                className={`${inputClass} min-h-32 resize-y`}
                value={form.bio}
                onChange={(event) => form.setBio(event.target.value)}
                placeholder="Расскажите об образовании, опыте и подходе к занятиям."
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium">
                Пароль *
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  className={inputClass}
                  value={form.password}
                  onChange={(event) => form.setPassword(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-sm font-medium">
                Подтвердите пароль *
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  className={inputClass}
                  value={form.confirmPassword}
                  onChange={(event) =>
                    form.setConfirmPassword(event.target.value)
                  }
                />
              </label>
            </div>
            {form.error && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
                {form.error}
              </p>
            )}
            <button
              type="submit"
              disabled={form.loading}
              className="w-full rounded-2xl bg-violet-600 px-5 py-3.5 font-semibold text-white disabled:opacity-60"
            >
              {form.loading
                ? 'Создаём профиль…'
                : 'Отправить анкету на проверку'}
            </button>
          </form>
          <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
            <Link href={ROUTES.LOGIN} className="text-violet-700">
              Уже есть аккаунт
            </Link>
            <Link href={ROUTES.REGISTER.STUDENT} className="text-slate-600">
              Я студент
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
