import {
  CalendarDays,
  Home,
  MessageCircle,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
} from 'lucide-react'

import type { EffectiveUserRole } from '@/lib/user-profile'

const common = [
  { name: 'Главная', href: '/dashboard', icon: Home },
  { name: 'Репетиторы', href: '/dashboard/tutors', icon: Search },
  { name: 'Мои занятия', href: '/dashboard/schedule', icon: CalendarDays },
  { name: 'Сообщения', href: '/dashboard/messages', icon: MessageCircle },
  { name: 'Профиль', href: '/dashboard/profile', icon: UserRound },
  { name: 'Настройки', href: '/dashboard/settings', icon: Settings },
]

export function getNavigation(role: EffectiveUserRole | null) {
  return role === 'admin' || role === 'owner'
    ? [
        ...common,
        {
          name: 'Администрирование',
          href: '/dashboard/admin',
          icon: ShieldCheck,
        },
      ]
    : common
}
