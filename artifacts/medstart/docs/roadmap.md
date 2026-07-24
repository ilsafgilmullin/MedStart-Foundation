# MedStart — Product Roadmap

> This document describes planned development phases. No business logic has been implemented yet. All entries are architectural intentions, not feature promises.

---

## Phase 0 — Foundation ✅ (current)

**Goal:** Clean, scalable project architecture ready for rapid feature development.

- [x] Next.js 15 App Router scaffold
- [x] Design system + token set (Tailwind CSS v4)
- [x] 21 reusable UI components
- [x] TypeScript base models (`User`, `Student`, `Teacher`)
- [x] Utility library (`cn`, formatters, etc.)
- [x] Custom hooks (`useToast`, `useModal`, `useLocalStorage`, `useDebounce`, `useMediaQuery`)
- [x] Routes: `/`, `/login`, `/register/student`, `/register/teacher`
- [x] Documentation: vision, architecture, design system, routes
- [x] Shared API server (Express 5, Drizzle, PostgreSQL)
- [x] OpenAPI spec scaffold
- [x] Code generation pipeline (Orval → React Query hooks + Zod)

---

## Phase 1 — Authentication

**Goal:** Secure, minimal-friction sign-up and sign-in.

- [ ] Email + password authentication
- [ ] Google OAuth (educators and students)
- [ ] Email verification flow
- [ ] Password reset
- [ ] JWT / session management (httpOnly cookies)
- [ ] Route middleware (auth guards)
- [ ] Role-based access control (student / teacher / admin)
- [ ] Educator identity verification email flow

**API routes:** `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`

---

## Phase 2 — Profiles

**Goal:** Users can build and view professional profiles.

- [ ] Student profile creation and editing
- [ ] Educator profile creation and editing
- [ ] Avatar upload (object storage)
- [ ] Public educator profile page (`/profile/:userId`)
- [ ] Profile verification badge (educators)
- [ ] Educator search and discovery

---

## Phase 3 — Courses

**Goal:** Educators can create and publish courses; students can enrol and learn.

- [ ] Course builder (educators)
  - [ ] Lesson CRUD (text, video embed, PDF)
  - [ ] Course settings (price, visibility, category)
- [ ] Course catalogue (`/courses`)
- [ ] Course detail page
- [ ] Student enrolment flow
- [ ] Lesson player
- [ ] Progress tracking (per lesson, per course)
- [ ] Course completion certificates

---

## Phase 4 — Live sessions

**Goal:** 1:1 and small-group live learning sessions.

- [ ] Session booking flow (student → educator)
- [ ] Calendar availability (educator sets availability)
- [ ] Video conferencing integration
- [ ] Session notes and shared annotations
- [ ] Post-session summary and review
- [ ] Session recording (with consent)

---

## Phase 5 — Assessments

**Goal:** Educators can evaluate students; students get meaningful feedback.

- [ ] Question bank (MCQ, SAQ, OSCE-style)
- [ ] Formative quizzes (attached to lessons)
- [ ] Performance analytics dashboard
- [ ] Educator feedback tools
- [ ] Adaptive recommendations based on gaps

---

## Phase 6 — Payments

**Goal:** Sustainable business model for educators.

- [ ] Stripe integration
- [ ] Paid course checkout
- [ ] Session pricing (hourly rate)
- [ ] Educator payout system
- [ ] Platform commission
- [ ] Subscription plans for students (unlimited access tier)

---

## Phase 7 — Community & trust

**Goal:** Build network effects and reinforce platform trust.

- [ ] Educator ratings and reviews
- [ ] Student testimonials
- [ ] Course discussion threads
- [ ] Q&A forums (per course)
- [ ] Moderation tooling

---

## Phase 8 — Institutional

**Goal:** B2B accounts for medical schools and hospitals.

- [ ] Organisation accounts
- [ ] Bulk student enrolment
- [ ] Institution-branded pages
- [ ] Analytics dashboard for administrators
- [ ] SSO integration (SAML / OIDC)
- [ ] API access for LMS integration

---

## Non-goals (out of scope)

The following are explicitly not on the roadmap to avoid scope creep:

- Job board or recruitment features
- Prescribing or clinical decision support tools
- Patient data of any kind
- Social feed (not a social network)
- Consumer health advice (not a telemedicine platform)

---

## Engineering principles for each phase

1. **OpenAPI first** — Define the contract before writing route handlers
2. **Test the critical path** — Auth, payment, and enrolment flows need integration tests
3. **Feature flags** — Ship to production behind a flag, not a branch
4. **Observability** — Logging, error tracking, and performance monitoring before each phase ships
5. **Accessibility audit** — Run axe/Lighthouse before each major release
