import { CheckCircle2, Circle } from 'lucide-react'
import { passwordPolicyState } from '@/lib/password-policy'

export function PasswordRequirements({ password }: { password: string }) {
  const state = passwordPolicyState(password)
  const items = [
    ['Минимум 10 символов', state.minimumLength],
    ['Хотя бы одна буква', state.hasLetter],
    ['Хотя бы одна цифра', state.hasNumber],
  ] as const

  return (
    <div className="grid gap-2 rounded-2xl bg-slate-50 p-4 text-xs text-slate-600 sm:grid-cols-3">
      {items.map(([label, valid]) => (
        <div key={label} className="flex items-center gap-2">
          {valid ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-teal-600" />
          ) : (
            <Circle className="h-4 w-4 shrink-0 text-slate-300" />
          )}
          <span className={valid ? 'font-medium text-teal-700' : undefined}>{label}</span>
        </div>
      ))}
    </div>
  )
}
