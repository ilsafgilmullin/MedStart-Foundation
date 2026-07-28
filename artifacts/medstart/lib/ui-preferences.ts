export type DashboardDensity = 'comfortable' | 'compact'
export type DashboardFontScale = 'normal' | 'large'

export interface UiPreferences {
  density: DashboardDensity
  fontScale: DashboardFontScale
  reduceMotion: boolean
}

export const UI_PREFERENCES_STORAGE_KEY = 'medstart-ui-preferences-v1'
export const UI_PREFERENCES_EVENT = 'medstart-ui-preferences-change'

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  density: 'comfortable',
  fontScale: 'normal',
  reduceMotion: false,
}

export function readUiPreferences(): UiPreferences {
  if (typeof window === 'undefined') return DEFAULT_UI_PREFERENCES
  try {
    const parsed = JSON.parse(
      window.localStorage.getItem(UI_PREFERENCES_STORAGE_KEY) || '{}',
    ) as Partial<UiPreferences>
    return {
      density: parsed.density === 'compact' ? 'compact' : 'comfortable',
      fontScale: parsed.fontScale === 'large' ? 'large' : 'normal',
      reduceMotion: parsed.reduceMotion === true,
    }
  } catch {
    return DEFAULT_UI_PREFERENCES
  }
}

export function applyUiPreferences(preferences: UiPreferences) {
  if (typeof document === 'undefined') return
  document.documentElement.style.fontSize =
    preferences.fontScale === 'large' ? '17px' : ''
  document.documentElement.dataset.msDensity = preferences.density
  document.documentElement.dataset.msMotion = preferences.reduceMotion
    ? 'reduced'
    : 'normal'

  const styleId = 'medstart-user-motion-preferences'
  let style = document.getElementById(styleId) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = styleId
    document.head.appendChild(style)
  }
  style.textContent = preferences.reduceMotion
    ? `html[data-ms-motion="reduced"] *,html[data-ms-motion="reduced"] *::before,html[data-ms-motion="reduced"] *::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}`
    : ''
}

export function persistUiPreferences(preferences: UiPreferences) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    UI_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences),
  )
  applyUiPreferences(preferences)
  window.dispatchEvent(
    new CustomEvent<UiPreferences>(UI_PREFERENCES_EVENT, {
      detail: preferences,
    }),
  )
}
