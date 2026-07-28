export type AnatomyLayer =
  | 'skin'
  | 'muscles'
  | 'organs'
  | 'skeleton'
  | 'vessels'
  | 'nerves'

export type AnatomyView = 'front' | 'left' | 'back' | 'right'

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

export const ANATOMY_LAYERS: AnatomyOption<AnatomyLayer>[] = [
  { id: 'skin', label: 'Кожа и поверхность', shortLabel: 'Кожа', color: '#d7a47f' },
  { id: 'muscles', label: 'Мышечная система', shortLabel: 'Мышцы', color: '#b91c3c' },
  { id: 'organs', label: 'Внутренние органы', shortLabel: 'Органы', color: '#be123c' },
  { id: 'skeleton', label: 'Скелет', shortLabel: 'Скелет', color: '#e2e8f0' },
  { id: 'vessels', label: 'Сосудистая система', shortLabel: 'Сосуды', color: '#dc2626' },
  { id: 'nerves', label: 'Нервная система', shortLabel: 'Нервы', color: '#facc15' },
]

export const ANATOMY_VIEWS: AnatomyOption<AnatomyView>[] = [
  { id: 'front', label: 'Вид спереди', shortLabel: 'Спереди', color: '#14b8a6' },
  { id: 'left', label: 'Левая проекция', shortLabel: 'Слева', color: '#14b8a6' },
  { id: 'back', label: 'Вид сзади', shortLabel: 'Сзади', color: '#14b8a6' },
  { id: 'right', label: 'Правая проекция', shortLabel: 'Справа', color: '#14b8a6' },
]

export const ANATOMY_REGIONS: AnatomyRegion[] = [
  {
    id: 'brain',
    label: 'Головной мозг',
    latin: 'Encephalon',
    description: 'Центральный орган нервной системы, расположенный в полости черепа.',
    clinical: 'Оценка сознания, речи, движений, чувствительности и черепных нервов.',
    focusY: 70,
  },
  {
    id: 'neck',
    label: 'Голова и шея',
    latin: 'Caput et collum',
    description: 'Дыхательные пути, крупные сосуды, щитовидная железа и шейные отделы.',
    clinical: 'Осмотр ротоглотки, лимфоузлов, щитовидной железы и сосудов шеи.',
    focusY: 125,
  },
  {
    id: 'thorax',
    label: 'Грудная клетка',
    latin: 'Thorax',
    description: 'Область сердца, лёгких, средостения, рёбер и грудного отдела позвоночника.',
    clinical: 'Аускультация, перкуссия, оценка дыхания, гемодинамики и боли в груди.',
    focusY: 230,
  },
  {
    id: 'heart',
    label: 'Сердце',
    latin: 'Cor',
    description: 'Полый мышечный орган кровообращения с четырьмя камерами.',
    clinical: 'Ритм, тоны, шумы, ЭКГ, пульс, давление и признаки недостаточности.',
    focusY: 245,
  },
  {
    id: 'lungs',
    label: 'Лёгкие',
    latin: 'Pulmones',
    description: 'Парный орган внешнего дыхания, окружающий органы средостения.',
    clinical: 'Частота дыхания, сатурация, аускультация и интерпретация снимков.',
    focusY: 225,
  },
  {
    id: 'abdomen',
    label: 'Брюшная полость',
    latin: 'Abdomen',
    description: 'Печень, желудок, кишечник, селезёнка, поджелудочная железа и почки.',
    clinical: 'Локализация боли, пальпация, перитонеальные симптомы и лабораторные данные.',
    focusY: 345,
  },
  {
    id: 'pelvis',
    label: 'Таз',
    latin: 'Pelvis',
    description: 'Костное кольцо и органы мочеполовой системы с сосудисто-нервными структурами.',
    clinical: 'Боль, функция тазовых органов, травма и оценка нижних конечностей.',
    focusY: 455,
  },
  {
    id: 'spine',
    label: 'Позвоночник',
    latin: 'Columna vertebralis',
    description: 'Осевой скелет, защищающий спинной мозг и обеспечивающий опору тела.',
    clinical: 'Осанка, боль, объём движений, корешковые и проводниковые симптомы.',
    focusY: 320,
  },
  {
    id: 'upper-limb',
    label: 'Верхняя конечность',
    latin: 'Membrum superius',
    description: 'Плечевой пояс, плечо, предплечье и кисть.',
    clinical: 'Пульс, сила, чувствительность, суставы и периферические нервы.',
    focusY: 320,
  },
  {
    id: 'lower-limb',
    label: 'Нижняя конечность',
    latin: 'Membrum inferius',
    description: 'Бедро, голень, стопа, крупные сосуды и нервы.',
    clinical: 'Походка, отёк, пульсация, сила, чувствительность и суставы.',
    focusY: 610,
  },
]

function bodySilhouette(view: AnatomyView, fill: string) {
  const side = view === 'left' || view === 'right'
  const flip = view === 'right' ? ' transform="translate(440 0) scale(-1 1)"' : ''
  if (side) {
    return `<g${flip}><ellipse cx="220" cy="68" rx="43" ry="52"/><path d="M203 116 C186 137 187 167 193 193 C174 225 167 288 177 353 C184 405 180 450 168 501 C158 546 161 655 174 752 L207 752 C213 669 221 591 231 513 C240 441 245 375 248 310 C251 244 249 176 237 121 Z"/><path d="M190 187 C155 235 130 302 115 385 L145 395 C165 338 185 286 211 239 Z"/><path d="M179 365 C145 436 124 511 111 594 L141 602 C161 527 181 459 206 398 Z"/></g>`
  }
  return `<ellipse cx="220" cy="68" rx="48" ry="54"/><path d="M184 118 C154 155 150 220 158 294 C164 355 153 418 145 472 C134 548 139 658 151 752 L198 752 C205 659 211 574 220 510 C229 574 235 659 242 752 L289 752 C301 658 306 548 295 472 C287 418 276 355 282 294 C290 220 286 155 256 118 C236 132 204 132 184 118 Z"/><path d="M174 165 C125 215 92 293 72 390 L111 402 C136 322 159 259 192 209 Z"/><path d="M266 165 C315 215 348 293 368 390 L329 402 C304 322 281 259 248 209 Z"/><path d="M157 401 C123 490 103 587 94 690 L135 696 C151 601 171 518 196 446 Z"/><path d="M283 401 C317 490 337 587 346 690 L305 696 C289 601 269 518 244 446 Z"/>`
}

function skeletonShapes(view: AnatomyView) {
  const side = view === 'left' || view === 'right'
  return `${side ? '<ellipse cx="220" cy="68" rx="35" ry="43" fill="none" stroke="#f8fafc" stroke-width="7"/>' : '<ellipse cx="220" cy="68" rx="38" ry="44" fill="none" stroke="#f8fafc" stroke-width="7"/>'}<path d="M220 112 L220 505" stroke="#f8fafc" stroke-width="10" stroke-linecap="round"/><path d="M174 170 Q220 140 266 170 M165 195 Q220 160 275 195 M162 222 Q220 185 278 222 M163 249 Q220 213 277 249 M168 276 Q220 244 272 276" fill="none" stroke="#f8fafc" stroke-width="6"/><path d="M190 425 Q220 455 250 425" fill="none" stroke="#f8fafc" stroke-width="12"/><path d="M180 173 L91 384 M260 173 L349 384 M190 458 L174 735 M250 458 L266 735" stroke="#f8fafc" stroke-width="9" stroke-linecap="round"/><circle cx="91" cy="384" r="12" fill="#f8fafc"/><circle cx="349" cy="384" r="12" fill="#f8fafc"/><circle cx="174" cy="735" r="12" fill="#f8fafc"/><circle cx="266" cy="735" r="12" fill="#f8fafc"/>`
}

function muscleShapes() {
  return `<path d="M185 123 Q220 145 255 123 L267 196 Q220 225 173 196 Z" fill="#9f1239"/><path d="M169 206 Q220 235 271 206 L276 320 Q220 343 164 320 Z" fill="#be123c"/><path d="M165 331 Q220 355 275 331 L285 439 Q220 463 155 439 Z" fill="#e11d48"/><path d="M177 456 L207 456 L195 735 L159 735 Z" fill="#be123c"/><path d="M233 456 L263 456 L281 735 L245 735 Z" fill="#be123c"/><path d="M169 171 L90 388 L117 398 L195 210 Z" fill="#e11d48"/><path d="M271 171 L350 388 L323 398 L245 210 Z" fill="#e11d48"/>`
}

function organShapes() {
  return `<path d="M176 169 C157 183 158 242 177 277 C190 286 203 276 207 259 L207 181 C199 165 187 161 176 169 Z" fill="#fb7185"/><path d="M264 169 C283 183 282 242 263 277 C250 286 237 276 233 259 L233 181 C241 165 253 161 264 169 Z" fill="#fb7185"/><path d="M218 211 C198 198 184 218 190 239 C196 258 220 274 220 274 C220 274 247 257 250 234 C253 211 234 199 218 211 Z" fill="#e11d48"/><path d="M173 298 C189 280 238 284 263 300 C278 316 266 349 246 355 C213 360 179 348 169 330 C164 319 165 307 173 298 Z" fill="#92400e"/><path d="M190 365 C202 350 238 350 250 365 C261 381 257 420 238 433 C224 442 200 438 188 424 C176 407 178 380 190 365 Z" fill="#f59e0b"/><path d="M181 442 Q220 418 259 442 Q277 477 251 501 Q220 521 189 501 Q163 477 181 442 Z" fill="#f472b6"/>`
}

function vesselShapes() {
  return `<path d="M220 133 L220 694 M220 235 L145 368 M220 235 L295 368 M220 445 L180 713 M220 445 L260 713" fill="none" stroke="#dc2626" stroke-width="8" stroke-linecap="round"/><path d="M231 140 L231 690 M231 248 L159 380 M231 248 L309 380 M231 455 L195 714 M231 455 L276 714" fill="none" stroke="#2563eb" stroke-width="5" stroke-linecap="round"/><circle cx="220" cy="228" r="18" fill="#ef4444"/>`
}

function nerveShapes() {
  return `<path d="M220 105 L220 715 M220 170 L108 387 M220 170 L332 387 M220 438 L169 723 M220 438 L271 723" fill="none" stroke="#fde047" stroke-width="6" stroke-linecap="round"/><ellipse cx="220" cy="68" rx="30" ry="35" fill="#facc15" opacity=".95"/><path d="M190 68 Q220 35 250 68 Q220 101 190 68 Z" fill="#fef08a"/>`
}

export function anatomySvgMarkup(
  layer: AnatomyLayer,
  view: AnatomyView,
  region = 'thorax',
) {
  const layerInfo = ANATOMY_LAYERS.find((item) => item.id === layer) ?? ANATOMY_LAYERS[2]
  const regionInfo = ANATOMY_REGIONS.find((item) => item.id === region) ?? ANATOMY_REGIONS[2]
  const bodyFill = layer === 'skin' ? '#d6a17d' : '#d9e2ec'
  const system =
    layer === 'muscles'
      ? muscleShapes()
      : layer === 'organs'
        ? organShapes()
        : layer === 'skeleton'
          ? skeletonShapes(view)
          : layer === 'vessels'
            ? vesselShapes()
            : layer === 'nerves'
              ? nerveShapes()
              : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 440 800"><defs><radialGradient id="bg" cx="50%" cy="30%" r="72%"><stop stop-color="#17384a"/><stop offset="1" stop-color="#020617"/></radialGradient><filter id="shadow"><feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity=".48"/></filter></defs><rect width="440" height="800" rx="36" fill="url(#bg)"/><g fill="${bodyFill}" opacity="${layer === 'skin' ? '.98' : '.28'}" filter="url(#shadow)">${bodySilhouette(view, bodyFill)}</g><g>${system}</g><ellipse cx="220" cy="${regionInfo.focusY}" rx="104" ry="62" fill="none" stroke="${layerInfo.color}" stroke-width="4" stroke-dasharray="12 9" opacity=".9"/><circle cx="220" cy="${regionInfo.focusY}" r="7" fill="${layerInfo.color}"/><text x="22" y="36" fill="#ccfbf1" font-family="system-ui,sans-serif" font-size="16" font-weight="700">${layerInfo.label}</text><text x="22" y="62" fill="#94a3b8" font-family="system-ui,sans-serif" font-size="13">${regionInfo.label} · ${ANATOMY_VIEWS.find((item) => item.id === view)?.label}</text></svg>`
}

export function anatomyDataUri(layer: AnatomyLayer, view: AnatomyView, region: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(anatomySvgMarkup(layer, view, region))}`
}
