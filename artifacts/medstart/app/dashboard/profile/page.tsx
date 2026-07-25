'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Save, UserRound } from 'lucide-react'

import { useAuth } from '@/hooks/useAuth'
import { updateUserProfile } from '@/lib/firestore'

const roleNames = {
  student: 'Студент',
  tutor: 'Репетитор',
  admin: 'Администратор',
  owner: 'Владелец',
} as const

export default function ProfilePage() {
  const { profile, role, refreshProfile } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [fieldOfStudy, setFieldOfStudy] = useState('')
  const [studyYear, setStudyYear] = useState('')
  const [specialization, setSpecialization] = useState('')
  const [institution, setInstitution] = useState('')
  const [experience, setExperience] = useState('')
  const [bio, setBio] = useState('')
  const [lessonPrice, setLessonPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!profile) return

    setFirstName(profile.firstName ?? '')
    setLastName(profile.lastName ?? '')
    setFieldOfStudy(profile.fieldOfStudy ?? '')
    setStudyYear(profile.studyYear ?? '')
    setSpecialization(profile.specialization ?? '')
    setInstitution(profile.institution ?? '')
    setExperience(profile.experience ?? '')
    setBio(profile.bio ?? '')
    setLessonPrice(
      profile.lessonPrice && profile.lessonPrice > 0
        ? String(profile.lessonPrice)
        : '',
    )
  }, [profile])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setError('')

    if (!profile) return
    if (!firstName.trim() || !lastName.trim()) {
      setError('Укажите имя и фамилию.')
      return
    }

    const parsedPrice = Number(lessonPrice.replace(/\s/g, '').replace(',', '.'))

    if (role === 'tutor' && lessonPrice && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setError('Укажите корректную стоимость занятия.')
      return
    }

    try {
      setSaving(true)
      await updateUserProfile(profile.uid, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        fieldOfStudy: fieldOfStudy.trim(),
        studyYear: studyYear.trim(),
        specialization: specialization.trim(),
        institution: institution.trim(),
        experience: experience.trim(),
        bio: bio.trim(),
        lessonPrice:
          role === 'tutor' && Number.isFinite(parsedPrice) ? parsedPrice : 0,
        onboardingCompleted: true,
      })
      await refreshProfile()
      setMessage('Профиль сохранён.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось сохранить профиль.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null

  const isTutor = role === 'tutor'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Профиль</h1>
        <p className="mt-2 text-slate-500">
          Актуальные данные помогают корректно работать с платформой.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-[32px] border border-slate-200 bg-white p-7 text-center shadow-sm">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-violet-100 text-violet-700">
            <UserRound className="h-10 w-10" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">
            {profile.displayName || profile.email}
          </h2>
          <p className="mt-1 text-sm text-slate-500">{profile.email}</p>
          <div className="mt-5 rounded-2xl bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Роль</p>
            <p className="mt-1 font-semibold text-slate-900">
              {role ? roleNames[role] : 'Пользователь'}
            </p>
          </div>
          {isTutor && (
            <div className="mt-3 rounded-2xl bg-violet-50 p-4">
              <p className="text-sm text-slate-500">Статус анкеты</p>
              <p className="mt-1 font-semibold text-violet-700">
                {profile.status === 'active' ? 'Опубликована' : 'На проверке'}
              </p>
            </div>
          )}
        </aside>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm lg:p-9"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Имя" value={firstName} onChange={setFirstName} required />
            <Field label="Фамилия" value={lastName} onChange={setLastName} required />
          </div>

          {!isTutor && role === 'student' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Направление подготовки"
                value={fieldOfStudy}
                onChange={setFieldOfStudy}
              />
              <Field
                label="Курс обучения"
                value={studyYear}
                onChange={setStudyYear}
              />
            </div>
          )}

          {isTutor && (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Специализация"
                  value={specialization}
                  onChange={setSpecialization}
                  required
                />
                <Field
                  label="Организация или вуз"
                  value={institution}
                  onChange={setInstitution}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Опыт"
                  value={experience}
                  onChange={setExperience}
                  placeholder="Например: 7 лет"
                />
                <Field
                  label="Стоимость занятия, ₽"
                  value={lessonPrice}
                  onChange={setLessonPrice}
                  inputMode="decimal"
                />
              </div>
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">О себе</span>
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
                  placeholder="Расскажите об образовании, опыте и формате занятий"
                />
              </label>
            </>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-2xl bg-violet-600 px-6 py-3 font-semibold text-white disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Сохраняем…' : 'Сохранить изменения'}
          </button>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
  placeholder,
  inputMode,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  placeholder?: string
  inputMode?: 'text' | 'decimal' | 'numeric'
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        placeholder={placeholder}
        inputMode={inputMode}
        className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-violet-500"
      />
    </label>
  )
}
