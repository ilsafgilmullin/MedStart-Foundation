# MedStart — Routes

## Current routes (foundation)

| Route                   | Page file                                | Layout           | Status |
|---|---|---|---|
| `/`                     | `app/page.tsx`                           | Marketing (Header + Footer) | ✅ Built |
| `/login`                | `app/login/page.tsx`                     | Auth (minimal header)       | ✅ Built |
| `/register/student`     | `app/register/student/page.tsx`          | Auth (minimal header)       | ✅ Built |
| `/register/teacher`     | `app/register/teacher/page.tsx`          | Auth (minimal header)       | ✅ Built |

---

## Planned routes (feature phases)

### Phase 1 — Core platform

| Route                          | Description                         |
|---|---|
| `/dashboard`                   | Student/teacher home — personalised feed |
| `/dashboard/sessions`          | Upcoming and past sessions           |
| `/dashboard/progress`          | Study analytics and milestones       |
| `/profile/:userId`             | Public educator or student profile   |
| `/settings`                    | Account, notifications, password     |
| `/settings/profile`            | Edit display name, bio, avatar       |
| `/settings/billing`            | Subscription plan and invoices       |

### Phase 2 — Learning features

| Route                          | Description                         |
|---|---|
| `/courses`                     | Browse all available courses         |
| `/courses/:courseSlug`         | Course detail and enrolment          |
| `/courses/:courseSlug/lessons/:lessonId` | Individual lesson view  |
| `/sessions/new`                | Book a 1:1 session with an educator  |
| `/sessions/:sessionId`         | Session detail and video room        |

### Phase 3 — Educator tools

| Route                          | Description                         |
|---|---|
| `/teach`                       | Educator dashboard overview          |
| `/teach/courses/new`           | Course builder                       |
| `/teach/courses/:courseSlug`   | Course management                    |
| `/teach/students`              | Enrolled student list and progress   |
| `/teach/earnings`              | Revenue and payout history           |

### Phase 4 — Admin

| Route                          | Description                         |
|---|---|
| `/admin`                       | Platform overview                    |
| `/admin/users`                 | User management                      |
| `/admin/educators`             | Educator verification queue          |
| `/admin/courses`               | Content moderation                   |
| `/admin/analytics`             | Platform-level analytics             |

---

## Route conventions

### Route groups (Next.js App Router)

Route groups are used to share layouts without affecting URLs:

```
app/
  (marketing)/      ← public pages: /, /about, /pricing
    layout.tsx      ← Header + Footer
  (auth)/           ← auth pages: /login, /register/*
    layout.tsx      ← minimal chrome, centered
  (app)/            ← authenticated: /dashboard, /settings
    layout.tsx      ← sidebar + app shell
  (admin)/          ← admin: /admin/*
    layout.tsx      ← admin shell
```

### Middleware (future)

`middleware.ts` at the root will handle:
- Redirecting unauthenticated users from `(app)/*` to `/login`
- Redirecting authenticated users away from `/login`, `/register/*`
- Role-based access: redirecting non-admins from `(admin)/*`

### URL design rules

- **Lowercase, kebab-case** paths: `/register/student` not `/Register/Student`
- **Noun-first** resource paths: `/courses/:id` not `/view-course/:id`
- **No trailing slashes** in internal links
- **Slug over ID** where human-readable: `/courses/cardiology-basics` not `/courses/abc123`
- **Dynamic segments** use brackets: `[courseSlug]`, `[userId]`
- **Catch-all** for 404: `app/not-found.tsx`

### Metadata strategy

Every page exports `metadata` (static) or `generateMetadata` (dynamic):

```ts
// Static
export const metadata: Metadata = { title: 'Sign in' }

// Dynamic (future, for profile pages)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getUser(params.userId)
  return { title: `${user.name} · MedStart` }
}
```

Root template: `%s · MedStart` (set in `app/layout.tsx`)
