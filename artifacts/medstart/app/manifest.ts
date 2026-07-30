import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MedStart',
    short_name: 'MedStart',
    description:
      'Подготовка к ОГЭ и ЕГЭ, медицинские дисциплины и индивидуальные онлайн-занятия.',
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#7c3aed',
    lang: 'ru',
    orientation: 'any',
    icons: [
      {
        src: '/medstart-mark.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
