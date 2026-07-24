# MedStart — Architecture

## Overview

MedStart is a monorepo (`pnpm workspaces`) with a Next.js 15 App Router frontend and a shared Express 5 API server. The frontend is statically exported in production; the API server runs as a long-lived Node.js process.

## Repository structure

```
medstart-monorepo/
├── artifacts/
│   ├── medstart/          ← Next.js 15 web app (this package)
│   └── api-server/        ← Express 5 REST API (shared backend)
├── lib/
│   ├── api-client-react/  ← Generated React Query hooks (Orval)
│   ├── api-spec/          ← OpenAPI 3.1 spec (source of truth)
│   ├── api-zod/           ← Generated Zod schemas (from spec)
│   └── db/                ← Drizzle ORM schema + migrations
├── scripts/               ← Utility scripts
├── pnpm-workspace.yaml    ← Workspace + catalog
└── tsconfig.base.json     ← Shared TS strict config
```

## Frontend (`artifacts/medstart/`)

```
app/                       ← Next.js App Router
  layout.tsx               ← Root layout (font, metadata, providers)
  page.tsx                 ← / (marketing landing)
  login/page.tsx           ← /login
  register/
    student/page.tsx       ← /register/student
    teacher/page.tsx       ← /register/teacher
  (dashboard)/             ← Protected dashboard routes (future)
  (admin)/                 ← Admin routes (future)

components/
  ui/                      ← Reusable primitive components
  layout/                  ← Page-level layout components
  common/                  ← Shared cross-cutting components

features/                  ← Domain feature modules
  auth/                    ← Auth forms, guards (future)
  student/                 ← Student-specific UI (future)
  teacher/                 ← Educator-specific UI (future)
  courses/                 ← Course/session UI (future)

hooks/                     ← Custom React hooks
lib/                       ← Pure utilities + constants
types/                     ← TypeScript type definitions
styles/                    ← CSS reference / documentation
docs/                      ← Architecture documentation
```

## API contract (OpenAPI-first)

```
lib/api-spec/openapi.yaml
       ↓ codegen (Orval)
lib/api-client-react/       ← React Query hooks + fetch client
lib/api-zod/                ← Zod schemas for runtime validation
       ↓ consumed by
artifacts/medstart/         ← Frontend uses hooks
artifacts/api-server/       ← Backend validates with Zod
```

**Rule:** The OpenAPI spec is the single source of truth. Never write types manually that should come from the spec.

## Routing strategy

| Route pattern        | Layout         | Auth required |
|---|---|---|
| `/`                  | Marketing      | No |
| `/login`             | Auth (minimal) | No |
| `/register/*`        | Auth (minimal) | No |
| `/dashboard/*`       | App shell      | Yes |
| `/settings/*`        | App shell      | Yes |
| `/admin/*`           | Admin shell    | Yes + admin role |

Route groups (future implementation):
```
app/
  (marketing)/   ← public pages with Header + Footer
  (auth)/        ← auth pages (centered, minimal chrome)
  (app)/         ← protected dashboard pages with sidebar
  (admin)/       ← admin panel
```

## State management

| Layer          | Tool                    | Scope              |
|---|---|---|
| Server state   | TanStack React Query    | API data, caching  |
| Form state     | react-hook-form + Zod   | Form validation    |
| Local UI state | React useState/useReducer | Component-level  |
| Global UI state| React Context           | Toast, Modal, Auth |
| Persisted state| useLocalStorage hook    | Preferences, drafts |

## Data flow

```
User interaction
  → React component
    → API hook (React Query)
      → api-client-react fetch
        → /api/... (Express)
          → Zod validation
            → Business logic
              → PostgreSQL (Drizzle)
```

## Styling architecture

- **Engine:** Tailwind CSS v4 (CSS-first, no `tailwind.config.ts`)
- **Tokens:** Defined in `app/globals.css` via `@theme {}`
- **Utilities:** `cn()` from `lib/utils.ts` (clsx + tailwind-merge)
- **Components:** Explicit variant maps with TypeScript union types
- **No CSS modules, no styled-components, no runtime CSS-in-JS**

## TypeScript configuration

- `tsconfig.base.json` — shared strict defaults (root)
- `artifacts/medstart/tsconfig.json` — extends base, adds Next.js plugin + path aliases
- Path alias: `@/*` → `./artifacts/medstart/*`
- All `lib/` packages are composite (emit declarations for cross-package use)

## Environment variables

| Variable                  | Required | Description                      |
|---|---|---|
| `NEXT_PUBLIC_APP_URL`     | No       | Canonical URL (defaults to hardcoded) |
| `DATABASE_URL`            | Yes (API)| PostgreSQL connection string      |
| `SESSION_SECRET`          | Yes (API)| Session signing secret            |

## Performance targets

| Metric        | Target     |
|---|---|
| LCP           | < 2.5s     |
| FID / INP     | < 100ms    |
| CLS           | < 0.1      |
| Bundle size   | < 200KB JS |
| TTFB          | < 200ms    |

## Security principles

1. All API endpoints validate with Zod — no raw user input reaches business logic
2. Session cookies are `httpOnly`, `sameSite: lax`, `secure` in production
3. CSRF protection on all mutation endpoints
4. Rate limiting on auth endpoints
5. No secrets in client-side code — `NEXT_PUBLIC_` prefix intentionally restricted
