import Link from 'next/link'
import { Container } from '@/components/layout/container'
import { Logo } from '@/components/common/logo'

const LINKS = {
  Product:  [
    { label: 'Features', href: '/#features' },
    { label: 'Pricing',  href: '/#pricing'  },
    { label: 'Roadmap',  href: '/#roadmap'  },
    { label: 'Changelog', href: '/#changelog' },
  ],
  Company: [
    { label: 'About',    href: '/about'    },
    { label: 'Blog',     href: '/blog'     },
    { label: 'Careers',  href: '/careers'  },
    { label: 'Contact',  href: '/contact'  },
  ],
  Legal: [
    { label: 'Privacy policy', href: '/privacy' },
    { label: 'Terms of service', href: '/terms' },
    { label: 'Cookie policy', href: '/cookies' },
  ],
} as const

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <Container>
        <div className="py-12 grid grid-cols-2 gap-8 md:grid-cols-5">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-2 flex flex-col gap-4">
            <Link href="/" className="inline-flex items-center gap-2">
              <Logo />
            </Link>
            <p className="text-sm text-foreground-muted max-w-xs leading-relaxed">
              The modern platform connecting medical students and educators worldwide.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(LINKS).map(([title, links]) => (
            <div key={title} className="flex flex-col gap-3">
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

        {/* Bottom bar */}
        <div className="border-t border-border py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-foreground-subtle">
            © {new Date().getFullYear()} MedStart. All rights reserved.
          </p>
          <p className="text-xs text-foreground-subtle">
            Built for the future of medical education.
          </p>
        </div>
      </Container>
    </footer>
  )
}
