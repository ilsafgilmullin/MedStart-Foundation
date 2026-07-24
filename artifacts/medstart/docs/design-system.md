# MedStart — Design System

## Philosophy

MedStart's design system is inspired by the clarity of Linear, the content confidence of Notion, and the attention to craft of Stripe. It exists to make a complex domain (medical education) feel approachable, trustworthy, and fast.

**Three rules:**
1. **Reduce cognitive load** — Every visual decision should make the task clearer, never noisier.
2. **Earn trust** — Premium finish signals reliability. Medical professionals judge platform quality.
3. **Speed is design** — Perceived performance is part of the experience.

---

## Colors

### Brand palette (Indigo)

Indigo was chosen deliberately: it sits between the "clinical blue" of medical institutions and a more modern, technology-forward tone. It avoids the coldness of pure blue while maintaining authority.

| Token          | Hex       | Use |
|---|---|---|
| `brand-50`  | `#eef2ff` | Very light backgrounds, hover states |
| `brand-100` | `#e0e7ff` | Badge backgrounds, subtle highlights |
| `brand-200` | `#c7d2fe` | Focus rings (diluted), dividers |
| `brand-500` | `#6366f1` | **Primary brand** — buttons, links, active states |
| `brand-600` | `#4f46e5` | Primary hover |
| `brand-700` | `#4338ca` | Primary active / pressed |

### Neutral palette (Warm zinc)

Pure grays feel clinical and cold — wrong for a platform aiming to be approachable. Zinc has a warm undertone that softens the UI without compromising readability.

| Token            | Hex       | Use |
|---|---|---|
| `neutral-0`   | `#ffffff` | Canvas, card backgrounds |
| `neutral-50`  | `#fafafa` | Page background, surface |
| `neutral-100` | `#f4f4f5` | Subtle backgrounds, inputs |
| `neutral-200` | `#e4e4e7` | **Default border** |
| `neutral-400` | `#a1a1aa` | Disabled foreground, icons |
| `neutral-500` | `#71717a` | **Muted text** |
| `neutral-700` | `#3f3f46` | Secondary text |
| `neutral-950` | `#09090b` | **Default foreground** |

### Semantic colors

| Token     | Hex       | Use |
|---|---|---|
| `success-500` | `#22c55e` | Confirmations, verified states |
| `warning-500` | `#f59e0b` | Cautions, pending states |
| `error-500`   | `#ef4444` | Errors, destructive actions |
| `info-500`    | `#3b82f6` | Informational alerts |

---

## Typography

**Font:** Inter (Google Fonts, variable weight via `next/font/google`)

Inter was chosen for its high legibility at small sizes, its comprehensive weight range, and its neutral, modern character — qualities essential in a data-heavy medical application.

### Type scale

| Class      | Size / Line height | Weight | Use |
|---|---|---|---|
| `text-xs`  | 12px / 16px | 400 | Labels, captions |
| `text-sm`  | 14px / 20px | 400, 500 | Body small, UI text |
| `text-base`| 16px / 24px | 400 | Body |
| `text-lg`  | 18px / 28px | 500, 600 | Subheadings |
| `text-2xl` | 24px / 32px | 600 | Section headings |
| `text-3xl` | 30px / 36px | 700 | Page headings |
| `text-4xl` | 36px / 40px | 700 | Hero headings |
| `text-6xl` | 60px / 1   | 700 | Display (marketing) |
| `text-7xl` | 72px / 1   | 700 | Display (hero) |

**Letter spacing:** All headings use `tracking-tight` (-0.025em). Display text may use `-0.03em`.

---

## Spacing

MedStart uses Tailwind's default 4px base grid. Key values:

| Value    | px  | Common use |
|---|---|---|
| `space-1` | 4px | Tight icon gaps |
| `space-2` | 8px | Inner component padding |
| `space-4` | 16px | Card padding (compact), section gaps |
| `space-6` | 24px | Card padding (default) |
| `space-8` | 32px | Section inner spacing |
| `space-12`| 48px | |
| `space-16`| 64px | |
| `space-24`| 96px | Section vertical padding |

---

## Radius scale

| Token      | Value  | Use |
|---|---|---|
| `radius-xs`  | 2px  | Tiny chips, code |
| `radius-sm`  | 4px  | Small decorative |
| `radius-md`  | 6px  | Inputs (compact) |
| `radius-lg`  | 8px  | **Buttons, inputs (default)** |
| `radius-xl`  | 12px | |
| `radius-2xl` | 16px | **Cards, modals** |
| `radius-3xl` | 24px | Feature cards, large elements |
| `radius-full`| 9999px| Avatars, badges, toggles |

---

## Shadow scale

Shadows follow the "just enough" principle — they indicate elevation without looking skeuomorphic.

| Token        | Use |
|---|---|
| `shadow-xs`  | Barely visible — hover lift on flat elements |
| `shadow-sm`  | **Cards, inputs** — default subtle depth |
| `shadow-md`  | **Dropdowns, popovers** |
| `shadow-lg`  | **Modals, drawers** |
| `shadow-xl`  | High-emphasis overlays |
| `shadow-2xl` | Marketing hero elements |
| `shadow-brand` | Brand focus glow ring |

---

## Animation

**Principle:** Animate only what communicates state, not what decorates.

| Token           | Value | Use |
|---|---|---|
| `duration-fast`   | 100ms | Hover, active states |
| `duration-base`   | 200ms | **Standard transitions** |
| `duration-slow`   | 300ms | Overlays entering |
| `duration-slower` | 500ms | Toasts, longer sequences |

**Easing:**
- `ease-out` — elements arriving (feel weightless, fast start)
- `ease-in` — elements leaving (feel intentional, slow finish)
- `ease-in-out` — state changes within a component
- `ease-spring` — confirmations, success states

**Respect user preferences:** Always wrap significant animations in a `prefers-reduced-motion` query.

---

## Component library

All 21 components live in `components/ui/`:

| Component   | Type        | Notes |
|---|---|---|
| Button      | Primitive   | 6 variants × 4 sizes, href support |
| Input       | Form        | Label, hint, error, left/right icon, addons |
| Textarea    | Form        | Character count, auto-described |
| Select      | Form        | Native select, custom chevron |
| Checkbox    | Form        | Indeterminate state, animated |
| Radio       | Form        | RadioGroup helper |
| Switch      | Form        | Controlled + uncontrolled |
| Label       | Primitive   | Required/optional markers |
| Badge       | Display     | 7 variants, dot indicator |
| Avatar      | Display     | Fallback initials, status dot, AvatarGroup |
| Card        | Layout      | Header/Title/Description/Content/Footer/Divider |
| Alert       | Feedback    | 4 variants, dismissible |
| Loader      | Feedback    | Spinner/Dots/Bar variants |
| Skeleton    | Feedback    | Text/Circle/Rect, shimmer animation |
| Modal       | Overlay     | Portal, escape key, body lock |
| Drawer      | Overlay     | Right/Left/Bottom, portal |
| Dropdown    | Overlay     | Items/Separator/Label types |
| Tooltip     | Overlay     | 4 positions, configurable delay |
| Popover     | Overlay     | Click-triggered, title/close |
| Tabs        | Navigation  | Underline/Pill/Boxed variants |
| Toast       | Notification| Context-based, auto-dismiss |
| EmptyState  | Display     | Icon/title/description/action |
| StatCard    | Display     | Value/change/trend/footer |

---

## Icons

MedStart uses **Lucide React** exclusively. Rules:
- Default size: `h-4 w-4` (16px) in UI context
- `h-5 w-5` (20px) for feature icons, navigation
- Always add `aria-hidden="true"` on decorative icons
- Never use icons without adjacent text except for icon-only buttons (add `aria-label`)

---

## Accessibility

- All interactive components support keyboard navigation
- Focus rings use `ring-2 ring-ring` (brand-500 at full opacity)
- ARIA attributes: `aria-label`, `aria-invalid`, `aria-describedby`, `role` applied correctly
- Form inputs have associated `<label>` elements
- `aria-live="polite"` on toast region
- Modals/drawers trap focus (basic) and use `aria-modal="true"`

---

## Usage patterns

### Always use `cn()` for conditional classes

```tsx
// ✅ Correct
className={cn('base-class', condition && 'conditional-class', className)}

// ❌ Avoid
className={`base-class ${condition ? 'conditional-class' : ''}`}
```

### Variant maps over string interpolation

```tsx
// ✅ Correct
const variantClasses = { primary: '...', secondary: '...' }
// then: variantClasses[variant]

// ❌ Avoid
`bg-${variant}-500`  // Tailwind can't statically analyze this
```

### Forward refs on all form components

```tsx
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (props, ref) => { ... }
)
Input.displayName = 'Input'
```
