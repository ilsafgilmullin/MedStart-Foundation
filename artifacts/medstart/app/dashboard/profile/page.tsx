'use client'

import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import {
  AlertCircle,
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  Camera,
  CheckCircle2,
  Copy,
  Eye,
  Clock3,
  GraduationCap,
  LoaderCircle,
  MapPin,
  Save,
  Send,
  ShieldCheck,
  Star,
  Sparkles,
  Target,
  UserRoundCheck,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import ProfilePhoto from '@/components/dashboard/ProfilePhoto'
import {
  getTutorPrivateProfile,
  resubmitTutorProfile,
  updateTutorPrivateProfile,
  updateUserProfile,
} from '@/lib/firestore'
import { uploadAvatar } from '@/lib/storage'
import type { LessonFormat, UserProfile } from '@/lib/user-profile'

const inputClass =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100'

const roleNames = {
  student: 'Студент',
  tutor: 'Репетитор',
  admin: 'Администратор',
  owner: 'Владелец',
} as const

const statusNames = {
  pending: 'На проверке',
  active: 'Активен',
  rejected: 'Требуется доработка',
  blocked: 'Заблокирован',
  deleted: 'Удалён',
} as const

interface ProfileForm {
  firstName: string
  lastName: string
  avatar: string
  fieldOfStudy: string
  studyYear: string
  title: string
  specialization: string
  subjects: string
  institution: string
  experience: string
  licenceNumber: string
  bio: string
  city: string
  lessonPrice: string
  lessonDuration: string
  lessonFormats: LessonFormat[]
  timezone: string
}

const emptyForm: ProfileForm = {
  firstName: '',
  lastName: '',
  avatar: '',
  fieldOfStudy: '',
  studyYear: '',
  title: '',
  specialization: '',
  subjects: '',
  institution: '',
  experience: '',
  licenceNumber: '',
  bio: '',
  city: '',
  lessonPrice: '',
  lessonDuration: '60',
  lessonFormats: ['online'],
  timezone: 'Europe/Moscow',
}

function formFromProfile(profile: UserProfile): ProfileForm {
  return {
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    avatar: profile.avatar || '',
    fieldOfStudy: profile.fieldOfStudy || '',
    studyYear: profile.studyYear || '',
    title: profile.title || '',
    specialization: profile.specialization || '',
    subjects: (profile.subjects ?? []).join(', '),
    institution: profile.institution || '',
    experience: profile.experience || '',
    licenceNumber: '',
    bio: profile.bio || '',
    city: profile.city || '',
    lessonPrice: profile.lessonPrice ? String(profile.lessonPrice) : '',
    lessonDuration: String(profile.lessonDuration ?? 60),
    lessonFormats: profile.lessonFormats?.length
      ? profile.lessonFormats
      : ['online'],
    timezone: profile.timezone || 'Europe/Moscow',
  }
}

export default function ProfilePage() {
  const { user, profile, role } = useAuth()
  const [form, setForm] = useState<ProfileForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (profile) setForm(formFromProfile(profile))
  }, [profile])

  useEffect(() => {
    if (!user || profile?.role !== 'tutor') return
    let active = true
    void getTutorPrivateProfile(user.uid).then((privateProfile) => {
      if (active && privateProfile) {
        setForm((current) => ({
          ...current,
          licenceNumber: privateProfile.qualificationReference,
        }))
      }
    })
    return () => {
      active = false
    }
  }, [user, profile?.role])

  function field<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function toggleFormat(format: LessonFormat) {
    setForm((current) => {
      const selected = current.lessonFormats.includes(format)
      const next = selected
        ? current.lessonFormats.filter((item) => item !== format)
        : [...current.lessonFormats, format]
      return {
        ...current,
        lessonFormats: next.length ? next : [format],
      }
    })
  }

  async function saveProfile(): Promise<boolean> {
    if (!user || !profile) return false
    const firstName = form.firstName.trim()
    const lastName = form.lastName.trim()
    if (!firstName || !lastName) {
      setError('Укажите имя и фамилию.')
      return false
    }
    if (profile.role === 'tutor' && !form.specialization.trim()) {
      setError('Укажите специализацию репетитора.')
      return false
    }

    setSaving(true)
    setError('')
    setMessage('')
    try {
      await updateUserProfile(user.uid, {
        firstName,
        lastName,
        displayName: `${firstName} ${lastName}`.trim(),
        avatar: form.avatar,
        fieldOfStudy: form.fieldOfStudy.trim(),
        studyYear: form.studyYear.trim(),
        title: form.title.trim(),
        specialization: form.specialization.trim(),
        subjects: form.subjects
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
        institution: form.institution.trim(),
        experience: form.experience.trim(),
        bio: form.bio.trim(),
        city: form.city.trim(),
        lessonPrice: Math.max(0, Number(form.lessonPrice) || 0),
        lessonDuration: Math.max(30, Number(form.lessonDuration) || 60),
        lessonFormats: form.lessonFormats,
        timezone: form.timezone.trim() || 'Europe/Moscow',
      })
      if (profile.role === 'tutor') {
        await updateTutorPrivateProfile(user.uid, form.licenceNumber)
      }
      setMessage('Профиль сохранён.')
      return true
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось сохранить профиль.',
      )
      return false
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !user) return
    setUploading(true)
    setError('')
    setMessage('')
    try {
      const avatar = await uploadAvatar(user.uid, file)
      await updateUserProfile(user.uid, { avatar })
      field('avatar', avatar)
      setMessage('Фотография профиля обновлена.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось загрузить фотографию.',
      )
    } finally {
      setUploading(false)
      event.target.value = ''
    }
  }

  async function resubmit() {
    if (!user) return
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const saved = await saveProfile()
      if (!saved) return
      await resubmitTutorProfile(user.uid)
      setMessage('Анкета повторно отправлена на проверку.')
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Не удалось отправить анкету.',
      )
    } finally {
      setSaving(false)
    }
  }

  if (!profile) return null
  const initials = `${form.firstName.slice(0, 1)}${form.lastName.slice(0, 1)}`
    .toUpperCase()
    .trim()
  const isTutor = profile.role === 'tutor'
  const isStudent = profile.role === 'student' && role === 'student'
  const studentCompletionFields = isStudent
    ? [
        form.firstName,
        form.lastName,
        form.avatar,
        form.fieldOfStudy,
        form.studyYear,
        form.institution,
        form.city,
        form.subjects,
        form.bio,
        form.timezone,
      ]
    : []
  const studentCompletion = isStudent
    ? Math.round(
        (studentCompletionFields.filter((value) => Boolean(String(value).trim()))
          .length /
          studentCompletionFields.length) *
          100,
      )
    : 0
  const tutorCompletionFields = isTutor
    ? [
        ['Фотография', form.avatar],
        ['Специализация', form.specialization],
        ['Профессиональный статус', form.title],
        ['Предметы', form.subjects],
        ['Учреждение', form.institution],
        ['Опыт', form.experience],
        ['Описание', form.bio],
        ['Город', form.city],
        ['Стоимость', form.lessonPrice],
        ['Продолжительность', form.lessonDuration],
        ['Форматы', form.lessonFormats.length ? 'yes' : ''],
        ['Часовой пояс', form.timezone],
      ]
    : []
  const tutorMissing = tutorCompletionFields
    .filter(([, value]) => !Boolean(String(value).trim()))
    .map(([label]) => label)
  const tutorCompletion = isTutor
    ? Math.round(
        ((tutorCompletionFields.length - tutorMissing.length) /
          tutorCompletionFields.length) *
          100,
      )
    : 0

  async function copyTutorPreviewLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/dashboard/tutors/${profile.uid}`,
      )
      setMessage('Ссылка на предпросмотр профиля скопирована.')
    } catch {
      setError('Не удалось скопировать ссылку на этом устройстве.')
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-teal-950 to-teal-800 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-bold ring-1 ring-white/15">
              <UserRoundCheck className="h-4 w-4 text-cyan-200" />
              {role ? roleNames[role] : 'Пользователь'} · {statusNames[profile.status]}
            </span>
            <h1 className="mt-4 text-3xl font-black sm:text-4xl">Профиль</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-teal-50/85 sm:text-base">
              {isStudent
                ? 'Ваш учебный паспорт помогает MedStart точнее подбирать преподавателей, дисциплины и материалы.'
                : isTutor
                  ? 'Профессиональная анкета определяет, как вы выглядите в каталоге и насколько легко студенту принять решение о записи.'
                  : 'Управляйте данными, которые используются в вашем кабинете.'}
            </p>
          </div>
          {(isStudent || isTutor) && (
            <div className="min-w-[260px] rounded-2xl border border-white/15 bg-white/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-2 text-sm font-bold">
                  <Sparkles className="h-4 w-4 text-cyan-200" />
                  {isTutor ? 'Готовность анкеты' : 'Заполнение профиля'}
                </span>
                <span className="font-black text-cyan-100">{isTutor ? tutorCompletion : studentCompletion}%</span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${isTutor ? tutorCompletion : studentCompletion}%` }} />
              </div>
              <p className="mt-3 text-xs leading-5 text-teal-50/75">
                {isTutor
                  ? tutorCompletion >= 85
                    ? 'Анкета содержит достаточно данных для уверенного решения студента.'
                    : `Добавьте: ${tutorMissing.slice(0, 2).join(' и ').toLowerCase()}.`
                  : 'Заполните вуз, курс, сложные предметы и предпочтения по занятиям.'}
              </p>
            </div>
          )}
        </div>
      </header>

      {profile.status === 'pending' && isTutor && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Анкета находится на проверке</p>
            <p className="mt-1 text-sm">
              Вы можете дополнить профиль. Публикация произойдёт после
              одобрения.
            </p>
          </div>
        </div>
      )}

      {profile.status === 'rejected' && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Анкета требует доработки</p>
            <p className="mt-1 text-sm">
              {profile.moderationNote ||
                'Добавьте недостающую информацию и отправьте анкету повторно.'}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      )}
      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          <CheckCircle2 className="h-5 w-5" />
          {message}
        </div>
      )}

      {isTutor && (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,.85fr)]">
          <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.12em] text-teal-700">Предпросмотр каталога</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">Как вас увидит студент</h2>
              </div>
              <div className="rounded-2xl bg-teal-50 p-3 text-teal-700 ring-1 ring-teal-100">
                <Eye className="h-6 w-6" />
              </div>
            </div>
            <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center gap-4">
                {form.avatar ? (
                  <ProfilePhoto src={form.avatar} size={64} className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-teal-100 text-xl font-black text-teal-700">{initials || 'MS'}</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-lg font-black text-slate-950">{`${form.firstName} ${form.lastName}`.trim() || 'Имя преподавателя'}</h3>
                    {profile.status === 'active' && <BadgeCheck className="h-5 w-5 shrink-0 text-teal-700" />}
                  </div>
                  <p className="mt-1 truncate text-sm font-bold text-teal-700">{form.specialization || 'Медицинская специализация'}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{(profile.rating ?? 0).toFixed(1)}</span>
                    <span>{profile.reviewsCount ?? 0} отзывов</span>
                    <span>{form.lessonPrice ? `${Number(form.lessonPrice).toLocaleString('ru-RU')} ₽` : 'Цена не указана'}</span>
                  </div>
                </div>
              </div>
              <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{form.bio || 'Добавьте описание опыта, подхода и результата, который получает студент.'}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {form.subjects.split(',').map((item) => item.trim()).filter(Boolean).slice(0, 4).map((subject) => (
                  <span key={subject} className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-600 ring-1 ring-slate-200">{subject}</span>
                ))}
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a href={`/dashboard/tutors/${profile.uid}`} className="ms-btn ms-btn-primary ms-btn-sm">
                <Eye className="h-4 w-4" />
                Открыть полный профиль
              </a>
              <button type="button" onClick={() => void copyTutorPreviewLink()} className="ms-btn ms-btn-secondary ms-btn-sm">
                <Copy className="h-4 w-4" />
                Скопировать ссылку
              </button>
            </div>
          </article>

          <aside className="rounded-[28px] border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-teal-700">Качество анкеты</p>
                <p className="mt-1 text-3xl font-black text-slate-950">{tutorCompletion}%</p>
              </div>
              <ShieldCheck className="h-7 w-7 text-teal-700" />
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-teal-100">
              <div className="h-full rounded-full bg-teal-600" style={{ width: `${tutorCompletion}%` }} />
            </div>
            <div className="mt-5 space-y-3">
              {[
                ['Специализация и предметы', Boolean(form.specialization.trim() && form.subjects.trim())],
                ['Опыт и учреждение', Boolean(form.experience.trim() && form.institution.trim())],
                ['Подробное описание', form.bio.trim().length >= 120],
                ['Стоимость и формат', Boolean(form.lessonPrice && form.lessonFormats.length)],
                ['Профессиональное фото', Boolean(form.avatar)],
              ].map(([label, ready]) => (
                <div key={String(label)} className="flex items-center gap-3 text-sm">
                  <span className={`grid h-7 w-7 place-items-center rounded-full ${ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {ready ? <CheckCircle2 className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                  </span>
                  <span className="font-bold text-slate-700">{String(label)}</span>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-slate-500">
              Номер диплома или сертификата хранится отдельно и не показывается студентам.
            </p>
          </aside>
        </section>
      )}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="relative">
            {form.avatar ? (
              <ProfilePhoto
                src={form.avatar}
                size={96}
                className="h-24 w-24 rounded-3xl object-cover"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-teal-50 text-2xl font-bold text-teal-700">
                {initials || 'MS'}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading}
              className="absolute -bottom-2 -right-2 ms-icon-btn ms-icon-btn-primary ms-icon-btn-sm rounded-full shadow-lg"
              aria-label="Изменить фотографию"
            >
              {uploading ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Camera className="h-5 w-5" />
              )}
            </button>
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatar}
              className="hidden"
            />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Фотография профиля
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isTutor
                ? 'JPG, PNG или WebP до 5 МБ. Используйте нейтральную профессиональную фотографию — она отображается в каталоге.'
                : 'JPG, PNG или WebP до 5 МБ. Фотография помогает преподавателю узнать вас перед первым занятием.'}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="text-xl font-bold text-slate-900">Основные данные</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Имя
            <input
              className={inputClass}
              value={form.firstName}
              onChange={(event) => field('firstName', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Фамилия
            <input
              className={inputClass}
              value={form.lastName}
              onChange={(event) => field('lastName', event.target.value)}
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            Электронная почта
            <input
              className={`${inputClass} bg-slate-50 text-slate-500`}
              value={profile.email}
              disabled
            />
          </label>
          {!isStudent && (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Город
              <input
                className={inputClass}
                value={form.city}
                onChange={(event) => field('city', event.target.value)}
                placeholder="Например: Казань"
              />
            </label>
          )}
        </div>
      </section>

      {isStudent && (
        <>
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-teal-50 p-3 text-teal-700 ring-1 ring-teal-100">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Образование</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Эти данные используются для рекомендаций по уровню подготовки.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Учебное заведение
                <input
                  className={inputClass}
                  value={form.institution}
                  onChange={(event) => field('institution', event.target.value)}
                  placeholder="Например: Казанский ГМУ"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Направление
                <input
                  className={inputClass}
                  value={form.fieldOfStudy}
                  onChange={(event) => field('fieldOfStudy', event.target.value)}
                  placeholder="Например: лечебное дело"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Курс обучения
                <input
                  className={inputClass}
                  value={form.studyYear}
                  onChange={(event) => field('studyYear', event.target.value)}
                  placeholder="Например: 4-й курс"
                />
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Город
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className={`${inputClass} pl-11`}
                    value={form.city}
                    onChange={(event) => field('city', event.target.value)}
                    placeholder="Например: Казань"
                  />
                </div>
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-sky-50 p-3 text-sky-700 ring-1 ring-sky-100">
                <Target className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Учебные цели</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Укажите дисциплины и задачи, с которыми нужна помощь.
                </p>
              </div>
            </div>
            <label className="mt-6 block space-y-2 text-sm font-medium text-slate-700">
              Сложные дисциплины или темы
              <input
                className={inputClass}
                value={form.subjects}
                onChange={(event) => field('subjects', event.target.value)}
                placeholder="Анатомия, фармакология, ЭКГ"
              />
              <span className="block text-xs font-normal text-slate-400">
                Перечислите через запятую — по ним формируются персональные совпадения.
              </span>
            </label>
            <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
              О себе и цели обучения
              <textarea
                className={`${inputClass} min-h-36 resize-y`}
                value={form.bio}
                onChange={(event) => field('bio', event.target.value)}
                placeholder="К чему готовитесь, какие темы вызывают сложности и какой результат хотите получить?"
              />
            </label>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-amber-50 p-3 text-amber-700 ring-1 ring-amber-100">
                <Clock3 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-950">Предпочтения занятий</h2>
                <p className="mt-1 text-sm text-slate-500">
                  MedStart будет учитывать их при выборе преподавателя.
                </p>
              </div>
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Предпочтительная длительность
                <select
                  className={inputClass}
                  value={form.lessonDuration}
                  onChange={(event) => field('lessonDuration', event.target.value)}
                >
                  <option value="30">30 минут</option>
                  <option value="45">45 минут</option>
                  <option value="60">60 минут</option>
                  <option value="90">90 минут</option>
                  <option value="120">120 минут</option>
                </select>
              </label>
              <label className="space-y-2 text-sm font-medium text-slate-700">
                Часовой пояс
                <select
                  className={inputClass}
                  value={form.timezone}
                  onChange={(event) => field('timezone', event.target.value)}
                >
                  <option value="Europe/Moscow">Москва (UTC+3)</option>
                  <option value="Europe/Samara">Самара (UTC+4)</option>
                  <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
                  <option value="Asia/Omsk">Омск (UTC+6)</option>
                  <option value="Asia/Krasnoyarsk">Красноярск (UTC+7)</option>
                  <option value="Asia/Irkutsk">Иркутск (UTC+8)</option>
                  <option value="Asia/Yakutsk">Якутск (UTC+9)</option>
                  <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
                </select>
              </label>
            </div>
            <div className="mt-5">
              <p className="text-sm font-medium text-slate-700">Формат занятий</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {[
                  { value: 'online' as const, label: 'Онлайн в MedStart Live' },
                  { value: 'in_person' as const, label: 'Очно' },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => toggleFormat(item.value)}
                    aria-pressed={form.lessonFormats.includes(item.value)}
                    className="ms-choice ms-choice-block justify-start text-left"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-5 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <BookOpenCheck className="mt-0.5 h-6 w-6 text-teal-700" />
              <div>
                <h2 className="text-xl font-black text-slate-950">Как профиль используется</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
                    <p className="font-bold text-slate-900">Каталог</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">Подходящие преподаватели выше в выдаче.</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
                    <p className="font-bold text-slate-900">Учебная база</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">Рекомендуются материалы нужного уровня.</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 ring-1 ring-teal-100">
                    <p className="font-bold text-slate-900">Заявка</p>
                    <p className="mt-1 text-sm leading-5 text-slate-500">Быстрее выбирается предмет и формат.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {isTutor && (
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Анкета репетитора
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Сделайте описание конкретным: кому вы помогаете, как проходят занятия и какой результат получает студент.
            </p>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Специализация
              <input
                className={inputClass}
                value={form.specialization}
                onChange={(event) =>
                  field('specialization', event.target.value)
                }
                placeholder="Например: анатомия и физиология"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Профессиональный статус
              <input
                className={inputClass}
                value={form.title}
                onChange={(event) => field('title', event.target.value)}
                placeholder="Например: врач, ординатор, студент 6 курса"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Предметы
              <input
                className={inputClass}
                value={form.subjects}
                onChange={(event) => field('subjects', event.target.value)}
                placeholder="Анатомия, физиология, биология"
              />
              <span className="block text-xs font-normal text-slate-400">
                Перечислите через запятую.
              </span>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Учреждение
              <input
                className={inputClass}
                value={form.institution}
                onChange={(event) => field('institution', event.target.value)}
                placeholder="Вуз или место работы"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Опыт
              <input
                className={inputClass}
                value={form.experience}
                onChange={(event) => field('experience', event.target.value)}
                placeholder="Например: 3 года"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Номер диплома или сертификата
              <input
                className={inputClass}
                value={form.licenceNumber}
                onChange={(event) => field('licenceNumber', event.target.value)}
                placeholder="Не публикуется в каталоге"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Стоимость занятия, ₽
              <input
                type="number"
                min="0"
                step="100"
                className={inputClass}
                value={form.lessonPrice}
                onChange={(event) => field('lessonPrice', event.target.value)}
                placeholder="1500"
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Продолжительность
              <select
                className={inputClass}
                value={form.lessonDuration}
                onChange={(event) =>
                  field('lessonDuration', event.target.value)
                }
              >
                <option value="30">30 минут</option>
                <option value="45">45 минут</option>
                <option value="60">60 минут</option>
                <option value="90">90 минут</option>
                <option value="120">120 минут</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Часовой пояс
              <select
                className={inputClass}
                value={form.timezone}
                onChange={(event) => field('timezone', event.target.value)}
              >
                <option value="Europe/Moscow">Москва (UTC+3)</option>
                <option value="Europe/Samara">Самара (UTC+4)</option>
                <option value="Asia/Yekaterinburg">Екатеринбург (UTC+5)</option>
                <option value="Asia/Omsk">Омск (UTC+6)</option>
                <option value="Asia/Krasnoyarsk">Красноярск (UTC+7)</option>
                <option value="Asia/Irkutsk">Иркутск (UTC+8)</option>
                <option value="Asia/Yakutsk">Якутск (UTC+9)</option>
                <option value="Asia/Vladivostok">Владивосток (UTC+10)</option>
              </select>
            </label>
          </div>
          <div className="mt-5">
            <p className="text-sm font-medium text-slate-700">Формат занятий</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {[
                { value: 'online' as const, label: 'Онлайн' },
                { value: 'in_person' as const, label: 'Очно' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => toggleFormat(item.value)}
                  aria-pressed={form.lessonFormats.includes(item.value)}
                  className="ms-choice ms-choice-block justify-start text-left"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <label className="mt-5 block space-y-2 text-sm font-medium text-slate-700">
            О себе
            <textarea
              className={`${inputClass} min-h-40 resize-y`}
              value={form.bio}
              onChange={(event) => field('bio', event.target.value)}
              maxLength={4000}
              placeholder="Расскажите об образовании, опыте, структуре занятия и подходе к объяснению сложных тем."
            />
            <span className="block text-right text-xs font-normal text-slate-400">{form.bio.length}/4000 · рекомендуется не менее 120 символов</span>
          </label>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
        {profile.status === 'rejected' && isTutor ? (
          <button
            type="button"
            onClick={() => void resubmit()}
            disabled={saving}
            className="ms-btn ms-btn-primary ms-btn-lg disabled:opacity-60"
          >
            {saving ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
            Сохранить и отправить повторно
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void saveProfile()}
            disabled={saving}
            className="ms-btn ms-btn-primary ms-btn-lg"
          >
            {saving ? (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            ) : (
              <Save className="h-5 w-5" />
            )}
            Сохранить профиль
          </button>
        )}
      </div>
    </div>
  )
}
