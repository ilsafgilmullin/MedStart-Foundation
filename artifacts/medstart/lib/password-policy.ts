export interface PasswordPolicyState {
  minimumLength: boolean
  hasLetter: boolean
  hasNumber: boolean
  withinMaximum: boolean
}

export function passwordPolicyState(password: string): PasswordPolicyState {
  return {
    minimumLength: password.length >= 10,
    hasLetter: /[a-zа-яё]/i.test(password),
    hasNumber: /\d/.test(password),
    withinMaximum: password.length <= 128,
  }
}

export function isStrongPassword(password: string) {
  return Object.values(passwordPolicyState(password)).every(Boolean)
}
