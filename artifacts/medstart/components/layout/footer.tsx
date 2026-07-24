import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Logo } from '@/components/common/logo'

const LINK_GROUPS = [
  {
    id:    'product',
    title: 'Продукт',
    links: [
      { label: 'Возможности',        href: '/#features'  },
      { label: 'Тарифы',             href: '/#pricing'   },
      { label: 'Дорожная карта',     href: '/#roadmap'   },
      { label: 'История изменений',  href: '/#changelog' },
    ],
  },
  {
    id:    'company',
    title: 'Компания',
    links: [
      { label: 'О нас',    href: '/about'   },
      { label: 'Блог',     href: '/blog'    },
      { label: 'Вакансии', href: '/careers' },
      { label: 'Контакты', href: '/contact' },
    ],
  },
  {
    id:    'legal',
    title: 'Правовая информация',
    links: [
      { label: 'Политика конфиденциальности', href: '/privacy' },
      { label: 'Условия использования',       href: '/terms'   },
      { label: 'Политика cookies',            href: '/cookies' },
    ],
  },
] as const

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <Container>
        <div className="py-12 grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Колонка с брендом */}
          <div className="col-span-2 md:col-span-2 flex flex-col gap-4">
            <Link href="/" className="inline-flex items-center gap-2" aria-label="MedStart — главная">
              <Logo />
            </Link>
            <p className="text-sm text-foreground-muted max-w-xs leading-relaxed">
              Современная платформа, объединяющая студентов-медиков и преподавателей по всему миру.
            </p>
          </div>

          {/* Колонки со ссылками */}
          {LINK_GROUPS.map(({ id, title, links }) => (
            <div key={id} className="flex flex-col gap-3">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">{title}</p>
              <ul className="flex flex-col gap-2">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-foreground-muted hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Нижняя панель */}
        <div className="border-t border-border py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-foreground-subtle">
            © {new Date().getFullYear()} MedStart. Все права защищены.
          </p>
          <p className="text-xs text-foreground-subtle">
            Создано для будущего медицинского образования.
          </p>
        </div>
      </Container>
    </footer>
  )
}
