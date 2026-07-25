'use client'

import { Menu } from 'lucide-react'

import UserDropdown from './UserDropdown'

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between px-5 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-xl p-2 hover:bg-slate-100 lg:hidden"
          aria-label="Открыть меню"
        >
          <Menu className="h-6 w-6" />
        </button>
        <p className="hidden text-sm text-slate-500 sm:block">
          Маркетплейс медицинских репетиторов
        </p>
        <UserDropdown />
      </div>
    </header>
  )
}
