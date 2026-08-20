import {
  BookOpenCheck,
  CalendarDays,
  FileCheck2,
  FolderOpen,
  Home,
  Inbox,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  UsersRound,
} from 'lucide-react'
import type { EffectiveUserRole } from '@/lib/user-profile'

const account = [
  { name: 'Профиль', href: '/dashboard/profile', icon: UserRound },
  { name: 'Настройки', href: '/dashboard/settings', icon: Settings },
]

const student = [
  { name: 'Главная', href: '/dashboard', icon: Home },
  { name: 'Репетиторы', href: '/dashboard/tutors', icon: Search },
  { name: 'Мои занятия', href: '/dashboard/schedule', icon: CalendarDays },
  { name: 'Сообщения', href: '/dashboard/messages', icon: MessageCircle },
  { name: 'Материалы', href: '/dashboard/materials', icon: FolderOpen },
  {
    name: 'Учебная база',
    href: '/dashboard/knowledge',
    icon: BookOpenCheck,
  },
  ...account,
]

const tutor = [
  { name: 'Главная', href: '/dashboard', icon: Home },
  { name: 'Заявки', href: '/dashboard/requests', icon: Inbox },
  { name: 'Расписание', href: '/dashboard/schedule', icon: CalendarDays },
  { name: 'Мои ученики', href: '/dashboard/students', icon: UsersRound },
  { name: 'Сообщения', href: '/dashboard/messages', icon: MessageCircle },
  { name: 'Материалы', href: '/dashboard/materials', icon: FolderOpen },
  {
    name: 'Учебная база',
    href: '/dashboard/knowledge',
    icon: BookOpenCheck,
  },
  ...account,
]

const moderator = [
  { name: 'Главная', href: '/dashboard', icon: Home },
  {
    name: 'Модерация',
    href: '/dashboard/moderation',
    icon: FileCheck2,
  },
  {
    name: 'Учебная база',
    href: '/dashboard/knowledge',
    icon: BookOpenCheck,
  },
  ...account,
]

const admin = [
  { name: 'Главная', href: '/dashboard', icon: Home },
  {
    name: 'Центр управления',
    href: '/dashboard/admin',
    icon: ShieldCheck,
  },
  {
    name: 'Модерация',
    href: '/dashboard/moderation',
    icon: FileCheck2,
  },
  { name: 'Сообщения', href: '/dashboard/messages', icon: MessageCircle },
  { name: 'Каталог', href: '/dashboard/tutors', icon: Search },
  {
    name: 'Учебная база',
    href: '/dashboard/knowledge',
    icon: BookOpenCheck,
  },
  ...account,
]

export function getNavigation(role: EffectiveUserRole | null) {
  if (role === 'tutor') return tutor
  if (role === 'moderator') return moderator
  if (role === 'admin' || role === 'owner') return admin
  return student
}
