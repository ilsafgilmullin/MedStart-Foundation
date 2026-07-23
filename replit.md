# MedStart

A modern medical education platform connecting students and educators, built on Next.js 15 App Router.

## Run & Operate

- `pnpm --filter @workspace/medstart dev` — run the Next.js app (port 3000, via "MedStart" workflow)
- `pnpm --filter @workspace/medstart lint` — ESLint
- `pnpm --filter @workspace/medstart typecheck` — TypeScript check (no emit)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend:** Next.js 15.5, App Router, React 19
- **Styling:** Tailwind CSS v4, PostCSS (`@tailwindcss/postcss`)
- **Font:** Inter (loaded via `next/font/google`)
- **Utilities:** clsx, tailwind-merge (`cn()`), lucide-react
- **API (shared):** Express 5
- **DB:** PostgreSQL + Drizzle ORM
- **API codegen:** Orval (from OpenAPI spec)
- **Build:** Next.js compiler (SWC)

## Where things live

```
artifacts/medstart/
├── app/                  # Next.js App Router pages & layouts
│   ├── layout.tsx        # Root layout (font, metadata, viewport)
│   ├── globals.css       # Tailwind import + @theme tokens + base reset
│   ├── page.tsx          # / — Home / landing
│   ├── login/page.tsx    # /login
│   └── register/
│       ├── student/page.tsx   # /register/student
│       └── teacher/page.tsx   # /register/teacher
├── components/
│   ├── ui/               # Reusable primitive components
│   │   ├── button.tsx    # Button (5 variants × 3 sizes)
│   │   ├── input.tsx     # Input (label, hint, error, icon)
│   │   ├── card.tsx      # Card + CardHeader/Title/Description/Content/Footer
│   │   ├── label.tsx     # Label (with required marker)
│   │   └── badge.tsx     # Badge (6 variants)
│   └── layout/
│       ├── container.tsx # Responsive max-width wrapper
│       └── header.tsx    # Sticky nav header
├── features/             # Domain feature modules (empty — fill as needed)
├── hooks/
│   └── use-media-query.ts
├── lib/
│   └── utils.ts          # cn() — clsx + twMerge
├── types/
│   └── index.ts          # User, Student, Teacher, AsyncState types
└── public/               # Static assets
```

## Design system

All tokens live in `app/globals.css` under `@theme {}`:

| Token group | CSS variable prefix | Notes |
|---|---|---|
| Brand | `--color-primary-{50..900}` | Blue scale |
| Surfaces | `--color-surface-{0..900}` | Neutral slate scale |
| Semantic | `--color-success/warning/error` | Status colours |
| Radius | `--radius-{sm,md,lg,xl,2xl}` | |
| Shadow | `--shadow-{xs,sm,md,lg,xl}` | |
| Font | `--font-sans` | Inter variable |

Use utility classes derived from these tokens (e.g. `bg-primary-600`, `text-surface-700`, `shadow-sm`).

## Architecture decisions

- **App Router only** — no Pages Router. All routes are Server Components by default; add `'use client'` only where needed.
- **Tailwind v4 CSS-first config** — no `tailwind.config.ts`. Customisation happens in `globals.css` via `@theme {}`.
- **No router library** — navigation uses Next.js `<Link>` and `redirect()` / `useRouter()` from `next/navigation`.
- **Empty form handlers** — all forms are structural shells. Business logic is intentionally absent for the foundation build.
- **`cn()` pattern** — all components merge classes via `cn()` from `lib/utils.ts` so consumers can safely override.

## Product

Pages built (shell only, no business logic):
- `/` — landing page with hero, feature cards, and CTA
- `/login` — email + password sign-in form
- `/register/student` — student registration form
- `/register/teacher` — educator registration form

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The Next.js dev server runs on port 3000. The "MedStart" workflow must be running for the preview to work.
- `pnpm run build` at the workspace root will fail for medstart because Next.js build needs `PORT` and `BASE_PATH` from the workflow env. Use `typecheck` for CI-style checks from the shell.
- Tailwind v4 does **not** use a `tailwind.config.ts`; add tokens in `globals.css → @theme {}`.
- `next/font/google` sets `--font-sans` as a CSS variable; the `@theme` block in `globals.css` references it so Tailwind utility classes pick it up.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
