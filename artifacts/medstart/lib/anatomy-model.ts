export type AnatomyLayer =
  'skin' | 'muscles' | 'organs' | 'skeleton' | 'vessels' | 'nerves'

export type AnatomyView = 'front' | 'left' | 'back' | 'right'

export type AnatomyModelId =
  'heart' | 'lungs' | 'liver' | 'right-kidney' | 'female-pelvis'

export interface AnatomyOption<T extends string> {
  id: T
  label: string
  shortLabel: string
  color: string
}

export interface AnatomyRegion {
  id: string
  label: string
  latin: string
  description: string
  clinical: string
  focusY: number
}

export interface AnatomyModel {
  id: AnatomyModelId
  label: string
  latin: string
  region: string
  file: string
  description: string
  clinical: string
  structures: string[]
}

export const ANATOMY_LAYERS: AnatomyOption<AnatomyLayer>[] = [
  {
    id: 'skin',
    label: 'Кожа и поверхность',
    shortLabel: 'Кожа',
    color: '#d7a47f',
  },
  {
    id: 'muscles',
    label: 'Мышечная система',
    shortLabel: 'Мышцы',
    color: '#be123c',
  },
  {
    id: 'organs',
    label: 'Внутренние органы',
    shortLabel: 'Органы',
    color: '#e11d48',
  },
  { id: 'skeleton', label: 'Скелет', shortLabel: 'Скелет', color: '#e2e8f0' },
  {
    id: 'vessels',
    label: 'Сосудистая система',
    shortLabel: 'Сосуды',
    color: '#dc2626',
  },
  {
    id: 'nerves',
    label: 'Нервная система',
    shortLabel: 'Нервы',
    color: '#facc15',
  },
]

export const ANATOMY_VIEWS: AnatomyOption<AnatomyView>[] = [
  {
    id: 'front',
    label: 'Вид спереди',
    shortLabel: 'Спереди',
    color: '#14b8a6',
  },
  {
    id: 'left',
    label: 'Левая проекция',
    shortLabel: 'Слева',
    color: '#14b8a6',
  },
  { id: 'back', label: 'Вид сзади', shortLabel: 'Сзади', color: '#14b8a6' },
  {
    id: 'right',
    label: 'Правая проекция',
    shortLabel: 'Справа',
    color: '#14b8a6',
  },
]

export const ANATOMY_REGIONS: AnatomyRegion[] = [
  {
    id: 'brain',
    label: 'Головной мозг',
    latin: 'Encephalon',
    description: 'Центральный орган нервной системы в полости черепа.',
    clinical: 'Сознание, речь, движения, чувствительность и черепные нервы.',
    focusY: 74,
  },
  {
    id: 'thorax',
    label: 'Грудная клетка',
    latin: 'Thorax',
    description:
      'Сердце, лёгкие, средостение, рёбра и грудной отдел позвоночника.',
    clinical: 'Дыхание, гемодинамика, аускультация, перкуссия и боль в груди.',
    focusY: 232,
  },
  {
    id: 'heart',
    label: 'Сердце',
    latin: 'Cor',
    description: 'Полый мышечный орган кровообращения с четырьмя камерами.',
    clinical: 'Ритм, тоны, шумы, ЭКГ, пульс и признаки недостаточности.',
    focusY: 250,
  },
  {
    id: 'lungs',
    label: 'Лёгкие',
    latin: 'Pulmones',
    description: 'Парный орган внешнего дыхания по сторонам средостения.',
    clinical:
      'Частота дыхания, сатурация, аускультация и интерпретация снимков.',
    focusY: 224,
  },
  {
    id: 'abdomen',
    label: 'Брюшная полость',
    latin: 'Abdomen',
    description: 'Органы пищеварения, селезёнка, поджелудочная железа и почки.',
    clinical:
      'Локализация боли, пальпация, симптомы раздражения брюшины и анализы.',
    focusY: 360,
  },
  {
    id: 'pelvis',
    label: 'Таз',
    latin: 'Pelvis',
    description: 'Костное кольцо и органы мочеполовой системы.',
    clinical:
      'Травма, боль, функция тазовых органов и оценка нижних конечностей.',
    focusY: 472,
  },
]

export const ANATOMY_MODELS: AnatomyModel[] = [
  {
    id: 'heart',
    label: 'Сердце',
    latin: 'Cor',
    region: 'heart',
    file: '/models/anatomy/heart.glb',
    description:
      'Трёхмерная модель сердца взрослого человека с отдельными анатомическими структурами.',
    clinical:
      'Используйте для разбора камер, клапанов, коронарных сосудов и пространственных ориентиров.',
    structures: [
      'Правое предсердие',
      'Левое предсердие',
      'Правый желудочек',
      'Левый желудочек',
      'Аорта',
    ],
  },
  {
    id: 'lungs',
    label: 'Дыхательная система',
    latin: 'Systema respiratorium',
    region: 'lungs',
    file: '/models/anatomy/lungs.glb',
    description: 'Лёгкие и связанные структуры дыхательной системы.',
    clinical:
      'Подходит для объяснения долей, бронхиального дерева и отношений со средостением.',
    structures: [
      'Правое лёгкое',
      'Левое лёгкое',
      'Трахея',
      'Главные бронхи',
      'Доли лёгких',
    ],
  },
  {
    id: 'liver',
    label: 'Печень',
    latin: 'Hepar',
    region: 'abdomen',
    file: '/models/anatomy/liver.glb',
    description:
      'Трёхмерная модель печени с сосудистыми и желчными ориентирами.',
    clinical:
      'Используйте для разбора долей, ворот печени и топографии верхнего этажа живота.',
    structures: [
      'Правая доля',
      'Левая доля',
      'Воротная вена',
      'Печёночные вены',
      'Жёлчный пузырь',
    ],
  },
  {
    id: 'right-kidney',
    label: 'Правая почка',
    latin: 'Ren dexter',
    region: 'abdomen',
    file: '/models/anatomy/right-kidney.glb',
    description:
      'Правая почка и элементы чашечно-лоханочной и сосудистой систем.',
    clinical:
      'Подходит для разбора ворот почки, паренхимы, сосудов и мочевых путей.',
    structures: [
      'Корковое вещество',
      'Мозговое вещество',
      'Почечная лоханка',
      'Почечная артерия',
      'Мочеточник',
    ],
  },
  {
    id: 'female-pelvis',
    label: 'Женский таз',
    latin: 'Pelvis feminina',
    region: 'pelvis',
    file: '/models/anatomy/female-pelvis.glb',
    description: 'Трёхмерная модель женского таза и органов малого таза.',
    clinical:
      'Используйте для разбора костных ориентиров и взаимного расположения органов малого таза.',
    structures: [
      'Кости таза',
      'Крестец',
      'Матка',
      'Мочевой пузырь',
      'Прямая кишка',
    ],
  },
]

export const HRA_SOURCE_URL = 'https://humanatlas.io/3d-reference-library'
export const HRA_LICENSE_URL = 'https://creativecommons.org/licenses/by/4.0/'

function viewTransform(view: AnatomyView) {
  if (view === 'left') return 'translate(46 0) scale(.8 1)'
  if (view === 'right') return 'translate(394 0) scale(-.8 1)'
  if (view === 'back') return 'translate(440 0) scale(-1 1)'
  return ''
}

function systemMarkup(layer: AnatomyLayer) {
  if (layer === 'skeleton') {
    return '<path d="M220 118v392M175 180h90M180 455l-18 278M260 455l18 278M180 180L98 392M260 180l82 212" fill="none" stroke="#f8fafc" stroke-width="12" stroke-linecap="round"/><ellipse cx="220" cy="68" rx="38" ry="45" fill="none" stroke="#f8fafc" stroke-width="8"/>'
  }
  if (layer === 'vessels') {
    return '<path d="M220 132v570M220 240L112 390M220 240l108 150M220 450l-55 278M220 450l55 278" fill="none" stroke="#dc2626" stroke-width="9" stroke-linecap="round"/><path d="M232 140v552M232 250l-104 150M232 250l105 150" fill="none" stroke="#2563eb" stroke-width="6"/>'
  }
  if (layer === 'nerves') {
    return '<path d="M220 104v615M220 170L105 390M220 170l115 220M220 440l-58 290M220 440l58 290" fill="none" stroke="#fde047" stroke-width="7" stroke-linecap="round"/><ellipse cx="220" cy="68" rx="30" ry="34" fill="#facc15"/>'
  }
  if (layer === 'muscles') {
    return '<path d="M175 126h90l16 310h-122zM170 456h42l-18 280h-42zM228 456h42l18 280h-42zM170 170L88 398h35l83-190zM270 170l82 228h-35l-83-190z" fill="#be123c" opacity=".9"/>'
  }
  if (layer === 'skin') return ''
  return '<ellipse cx="184" cy="225" rx="45" ry="92" fill="#fb7185"/><ellipse cx="256" cy="225" rx="45" ry="92" fill="#fb7185"/><path d="M218 232c-34-34-54 24 2 67 58-43 34-101-2-67z" fill="#e11d48"/><path d="M165 330q55-45 118 4l-24 65q-57 24-102-8z" fill="#a16207"/><path d="M177 418q43-25 86 0l-9 70q-34 27-68 0z" fill="#f472b6"/>'
}

export function anatomySvgMarkup(
  layer: AnatomyLayer,
  view: AnatomyView,
  region = 'thorax',
) {
  const selectedLayer =
    ANATOMY_LAYERS.find((item) => item.id === layer) ?? ANATOMY_LAYERS[2]
  const selectedRegion =
    ANATOMY_REGIONS.find((item) => item.id === region) ?? ANATOMY_REGIONS[1]
  const transform = viewTransform(view)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 800"><defs><radialGradient id="bg" cx="50%" cy="28%" r="75%"><stop stop-color="#17384a"/><stop offset="1" stop-color="#020617"/></radialGradient></defs><rect width="440" height="800" rx="36" fill="url(#bg)"/><g${transform ? ` transform="${transform}"` : ''}><ellipse cx="220" cy="68" rx="48" ry="54" fill="#d9e2ec" opacity=".34"/><path d="M184 118c-34 50-32 143-22 218 7 55-12 99-17 146-8 78-2 183 6 270h47l22-242 22 242h47c8-87 14-192 6-270-5-47-24-91-17-146 10-75 12-168-22-218-20 14-52 14-72 0z" fill="#d9e2ec" opacity=".34"/><path d="M174 165L72 390l39 12 81-193M266 165l102 225-39 12-81-193" fill="none" stroke="#d9e2ec" stroke-width="28" stroke-linecap="round" opacity=".34"/>${systemMarkup(layer)}</g><ellipse cx="220" cy="${selectedRegion.focusY}" rx="104" ry="62" fill="none" stroke="${selectedLayer.color}" stroke-width="4" stroke-dasharray="12 9"/><circle cx="220" cy="${selectedRegion.focusY}" r="7" fill="${selectedLayer.color}"/><text x="22" y="36" fill="#ccfbf1" font-family="system-ui,sans-serif" font-size="16" font-weight="700">Схематическая проекция · ${selectedLayer.shortLabel}</text><text x="22" y="62" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">${selectedRegion.label} · ${ANATOMY_VIEWS.find((item) => item.id === view)?.label}</text></svg>`
}

export function anatomyDataUri(
  layer: AnatomyLayer,
  view: AnatomyView,
  region: string,
) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    anatomySvgMarkup(layer, view, region),
  )}`
}
