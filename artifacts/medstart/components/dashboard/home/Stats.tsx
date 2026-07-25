import { BookOpen, CalendarDays, MessageSquare } from 'lucide-react'

const items = [
  { title: 'Мои репетиторы', description: 'Появятся после первой записи', icon: BookOpen },
  { title: 'Ближайшее занятие', description: 'Пока не запланировано', icon: CalendarDays },
  { title: 'Новые сообщения', description: 'Нет непрочитанных сообщений', icon: MessageSquare },
]

export default function Stats() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {items.map(({ title, description, icon: Icon }) => (
        <article key={title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Icon className="h-5 w-5" />
          </div>
          <h2 className="mt-5 text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </article>
      ))}
    </section>
  )
}
