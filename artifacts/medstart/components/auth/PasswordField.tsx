'use client'

import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import { authInputClass } from './AuthShell'

interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  disabled?: boolean
  errorId?: string
}

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  disabled = false,
  errorId,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="block space-y-2 text-sm font-semibold text-slate-700">
      {label}
      <span className="relative block">
        <input
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          disabled={disabled}
          aria-describedby={errorId}
          className={`${authInputClass} pr-14`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          disabled={disabled}
          aria-label={visible ? 'Скрыть пароль' : 'Показать пароль'}
          aria-pressed={visible}
          className="absolute inset-y-1 right-1 grid w-12 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </span>
    </label>
  )
}
