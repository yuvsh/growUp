# GrowUp — Design System (MASTER)

> **Single source of truth for all UI.** Build agents read THIS file for every visual decision —
> not the PRD or HLD. When building a screen, first check `design-system/pages/<screen>.md`;
> if it exists, it overrides this file. Otherwise follow this.
>
> Stack note: project is **React + Vite + Tailwind v4** (not Next.js). Tokens live in
> `src/index.css`; base components in `src/components/ui/`. Use **logical CSS properties**
> (`ps/pe`, `ms/me`, `text-start/end`) everywhere — never physical `left/right` — so the future
> Hebrew/RTL phase is a drop-in.

---

## ⚠️ Accessibility Constraints (Priority 1 — Non-Negotiable)
From: ui-ux-pro-max UX validation. Every agent must satisfy these before any UI is "done".

- [ ] **Contrast ≥ 4.5:1** for all normal text on its surface (≥3:1 for large/bold ≥18.66px and UI controls).
- [ ] **Never convey meaning by color alone** — every status (below-3rd alert, success, error) pairs color with an **icon + words**. Critical for a health app a stressed, possibly color-blind parent reads.
- [ ] **Touch targets ≥ 44×44px** for every interactive element (`min-h-[44px] min-w-[44px]`).
- [ ] **Visible focus ring** (2–4px, `--color-ring`) on every keyboard-navigable element.
- [ ] **All inputs have a visible `<label>`** — never placeholder-only.
- [ ] **Error text sits below its field**, not only at the top of the form.
- [ ] **`aria-label`** on every icon-only button (in the project language — English now, Hebrew later via `t()`).
- [ ] **Respect `prefers-reduced-motion`** — disable the blob drift and press-squish when set.
- [ ] **Icons are SVG** (Lucide/Heroicons), **never emoji** — flags later via `flag-icons`.

---

## Design Direction

**Style anchor:** **Organic Biophilic** — soft, calm, growth-themed; gentle organic curves and soft
shadows; generous whitespace. Chosen over claymorphism (too playful/gamified + React-Native-only) and
neumorphism (fails contrast). The "a living thing nurtured and growing over time" metaphor *is* GrowUp.

**Philosophy:** **Apple anchor** (consumer clarity, generous whitespace, one calm thing per screen) —
this is a B2C, emotionally-loaded, onboarding-light tool for stressed parents. Google-style data density
is used only as an *accent* on the Growth chart, where real numbers matter.

**Emotional brief:** warm, calm, reassuring. Copy and visuals must lower a worried parent's heart rate,
never raise it. Concern is always paired with a concrete, hopeful next step.

---

## Color Palette

| Role | Hex | CSS Variable | Usage |
|------|-----|--------------|-------|
| Primary | `#0891B2` | `--color-primary` | Calm cyan — primary actions, active tab, links. Trust + medical-but-warm. |
| Primary hover | `#0E7490` | `--color-primary-hover` | ~10% darker for hover/press. |
| On primary | `#FFFFFF` | `--color-on-primary` | Text/icons on primary (use on `--color-primary` for ≥3:1 large/UI). |
| Secondary | `#22D3EE` | `--color-secondary` | Light cyan — subtle highlights, chart grid accents. |
| Accent | `#059669` | `--color-accent` | Health green — "on track", positive deltas, growth. |
| Accent strong | `#047857` | `--color-accent-strong` | Darker green for small text needing AA. |
| Background | `#ECFEFF` | `--color-background` | Soft cyan-tint app background. |
| Surface | `#FFFFFF` | `--color-surface` | Cards, sheets, inputs. |
| Foreground | `#164E63` | `--color-foreground` | Deep teal — primary text. High contrast on bg/surface. |
| Muted text | `#4B7A8A` | `--color-text-muted` | Secondary text, captions (verify ≥4.5:1 on surface). |
| Muted surface | `#E8F1F6` | `--color-muted` | Subtle fills, disabled, skeleton base. |
| Border | `#A5F3FC` | `--color-border` | Soft cyan borders/dividers. |
| Caution | `#B45309` | `--color-caution` | Warm amber — the **gentle "below 3rd / watch" state**. Calm, not alarming. |
| Caution surface | `#FEF3E2` | `--color-caution-surface` | Soft amber card fill for the gentle alert. |
| Success | `#059669` | `--color-success` | = accent. |
| Destructive | `#DC2626` | `--color-destructive` | Hard red — reserved for genuine destructive confirms (delete) only. |
| Ring | `#0891B2` | `--color-ring` | Focus ring. |

> **Health-app rule:** the below-3rd-percentile alert uses **caution amber, not red** — clear but never
> frightening, always with an icon + plain words + a hopeful next number. Red is reserved for
> destructive confirmations (e.g. deleting an entry).

---

## Typography

- **Heading font:** `Varela Round` — soft, rounded, gentle.
- **Body font:** `Nunito Sans` (weights 300–700) — friendly, highly legible.
- Load via Google Fonts (`@import` in `src/index.css`). Never below **16px** body on mobile.

| Token | Size | Use |
|---|---|---|
| `--text-display` | 2.5rem / 40px | Onboarding welcome |
| `--text-h1` | 2rem / 32px | Page titles |
| `--text-h2` | 1.5rem / 24px | Section headers |
| `--text-h3` | 1.25rem / 20px | Card titles |
| `--text-body-lg` | 1.125rem / 18px | Lead / key numbers |
| `--text-body` | 1rem / 16px | Default body |
| `--text-sm` | 0.875rem / 14px | Labels, secondary |
| `--text-caption` | 0.75rem / 12px | Helpers, timestamps |

---

## Spacing, Radius, Shadow, Motion

- **Spacing:** 4pt grid — `--space-1..16` (4,8,12,16,24,32,48,64px). Generous whitespace (Apple anchor).
- **Radius (organic, generous):** `--radius-sm: 12px`, `--radius: 18px` (cards), `--radius-lg: 24px` (sheets/blobs), `--radius-pill: 999px`.
- **Shadow (soft, natural):**
  - `--shadow-sm: 0 2px 8px rgba(8,72,99,0.06)` — cards
  - `--shadow-md: 0 8px 24px rgba(8,72,99,0.08)` — popovers
  - `--shadow-lg: 0 16px 48px rgba(8,72,99,0.12)` — modals
- **Motion:** `--duration-fast 150ms`, `--normal 250ms`, `--slow 350ms`; `--ease-out cubic-bezier(0,0,0.2,1)`.
  - Press: gentle `scale(0.98)` (not bouncy/squishy). Blob accents drift ±10px very slowly.
  - **All motion gated behind `prefers-reduced-motion`.**

---

## Anti-patterns to avoid
- ❌ Playful/candy/claymorphism, bouncy haptic-style springs — too gamified for this audience.
- ❌ Low-contrast neumorphic text.
- ❌ Red/alarm styling for the below-3rd state (use caution amber + hopeful framing).
- ❌ Status by color alone.
- ❌ Emoji as icons.
- ❌ Physical `left/right` CSS (breaks future RTL) — use logical properties.
- ❌ Hardcoded hex/px/font in components — always use the CSS variables/tokens.

---

## Component inventory (shells in `src/components/ui/`)
Button · Input · Card · Badge · Skeleton · EmptyState · ErrorState · LoadingSpinner · Modal · Toast
· BottomTabs · MedicalDisclaimer (GrowUp-specific, persistent).

Screen blueprints: `docs/ui-blueprints.md`.
