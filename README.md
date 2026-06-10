# GrowUp

GrowUp is a warm, calm, mobile-first web app that helps parents of infants diagnosed with failure to thrive (FTT) or with a history of intrauterine growth restriction (IUGR) track their baby's weight and plan feeding between doctor visits. It plots each weight against the official WHO Child Growth Standards, computes the exact WHO percentile and z-score for the baby's precise age using the LMS method, and — when things are below the healthy line — explains in plain, reassuring language how far below they are and what recent progress looks like. GrowUp is local-only (no backend, no login), completely private, and works offline. It is a calm information companion, not a replacement for professional care.

---

## Medical Disclaimer

GrowUp is for tracking and information purposes only. It is **not medical advice** and does not replace the guidance of a pediatrician, dietitian, or other healthcare professional. Failure to thrive and IUGR are medical conditions that require professional diagnosis and ongoing care. Always discuss your baby's growth and feeding with your care team. GrowUp helps you understand the numbers between visits — it never replaces the people who know your baby.

---

## Features

### Child Profile
- Add your baby with name, sex, and date of birth.
- Sex is required because the WHO publishes separate standards for boys and girls.
- Baby's current age is shown in plain terms (e.g. "3 months, 1 week").
- All data is stored locally on your device — no account needed.

### WHO Weight Tracking
- **Exact percentile and z-score** computed with the WHO LMS method for the baby's precise age (not snapped to the nearest printed curve).
- **Chart** plotting the baby's measured weights against the 3rd, 15th, 50th, 85th, and 97th WHO percentile curves.
- **Weight history** with edit and delete; every entry shows its percentile and z-score.
- **Gentle below-3rd-percentile alert** — when the latest weight is below the 3rd percentile, a calm amber card states the current percentile, the gram gap to reach the 3rd-percentile line, and the recent trend. Always paired with a hopeful next number, never alarmist.
- **Transparent projection** — computes recent weight-gain velocity (g/day), projects ~4 weeks ahead against the WHO curves, and states the daily and weekly gain needed to reach the 3rd percentile. All assumptions are shown plainly.
- **Insight cards** — starter cards surface weight loss between visits, slow velocity, and percentile drops across multiple measurements, in warm, plain language.

### Feeding Calculator
- **Daily milk-volume range** using the standard 120–200 ml/kg/day rule (multipliers are named constants).
- **Per-feed amount** based on feeds per day (default 8, adjustable).
- **High-calorie / special formula mode** — enter your formula's energy density (kcal/ml or kcal/oz); the app recomputes the volume range so the baby receives the same calories as with standard formula. A more concentrated formula correctly yields a lower ml range. Both the calorie target and adjusted volume range are shown.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 6 + TypeScript |
| Styling | Tailwind CSS v4 (logical CSS properties throughout for RTL-readiness) |
| Routing | React Router 7 |
| Charts | Recharts |
| Forms & validation | react-hook-form 7 + Zod 3 |
| Unit tests | Vitest 2 + React Testing Library |
| Persistence | `localStorage` via an async `Repository` interface (`LocalStorageRepository`) |
| Backend / Auth | None (MVP is local-only; seams are pre-built for Phase 2 — see [How to Extend](#how-to-extend)) |

All WHO math runs in the browser. No network calls, no server, no account required.

---

## WHO Child Growth Standards — Data Source & Method

### Source

The embedded LMS data comes from the official **WHO Child Growth Standards — Weight-for-age, z-scores expanded tables** (daily L/M/S, birth to 5 years):

- **Boys:** [`wfa-boys-zscore-expanded-tables.xlsx`](https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-boys-zscore-expanded-tables.xlsx)
- **Girls:** [`wfa-girls-zscore-expanded-tables.xlsx`](https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-girls-zscore-expanded-tables.xlsx)
- **Landing page:** [https://www.who.int/tools/child-growth-standards/standards/weight-for-age](https://www.who.int/tools/child-growth-standards/standards/weight-for-age)

Both files were downloaded and parsed programmatically (unzip + XML parse of `sheet1.xml`). Every L, M, S value in `src/data/who/boys.ts` and `src/data/who/girls.ts` was machine-copied from the official `.xlsx` — no value was typed or guessed by hand. The spike notes document a real transcription error caught during development when a few anchor weights were entered from memory; those errors were corrected by re-reading the official table. The full 0–24 month daily tables (731 rows × 2 sexes) are embedded as typed TypeScript constants and covered by regression tests.

### LMS Method

GrowUp computes the **exact** percentile and z-score using the WHO LMS method. The key formulas, implemented in `src/lib/who/lms.ts`:

**Z-score from a measured weight X:**

```
z = ( (X/M)^L − 1 ) / (L · S)
```

For the special case where `L ≈ 0` (the log branch, used when L is very close to zero):

```
z = ln(X/M) / S
```

**Percentile from z-score:**

```
percentile = Φ(z) × 100
```

where `Φ` is the standard normal CDF, computed via the Chebyshev rational approximation (Abramowitz–Stegun 7.1.26 / Cody 1969). Worst-case CDF error is `< 1.2e-7`, yielding a worst-case percentile error of `≈ 1.5e-5` points — far below any clinically meaningful precision.

**Inverse LMS (used to draw percentile curves and compute gram gaps):**

```
X = M · (1 + L · S · z)^(1/L)    [L ≠ 0]
X = M · e^(S · z)                  [L ≈ 0]
```

`lmsForAge` linearly interpolates between the tabulated daily rows for exact-day precision. The full LMS module lives in `src/lib/who/`.

### Spike Validation

Before any UI was built, the math was validated in a dedicated spike (`spike-notes.md`):

- All method identities (round-trip `z → X → z`, identity at median, L≈0 branch) pass to `1e-9`.
- The inverse-LMS reproduces WHO's own published kilogram weights at z = −3, −2, 0, +2, +3 for boys and girls at birth, 6, 12, and 24 months — **within 5 grams** (the WHO table's own 3-decimal rounding allows ~0.5 g of slack).
- CDF anchors (z=0→50%, z=±1.88→3%/97%, z=±1.04→15%/85%) all pass.

The method is faithful to WHO's published numbers, not just internally consistent.

---

## Getting Started

```bash
npm install
npm run dev          # start the dev server
npm run build        # production build (runs tsc then vite build)
npm run test         # run all unit tests (Vitest)
npm run type-check   # TypeScript type-check without emitting
npm run lint         # ESLint
```

---

## Project Structure

```
src/
  app/                  App shell, router, bottom-tab layout (App.tsx, routes.tsx, PrimaryLayout.tsx)
  features/
    profile/            Profile + Add/Edit Child screens and components
    growth/             Growth screen, chart, history, insight cards, alerts
    feeding/            Feeding calculator screen and components
  components/
    ui/                 Primitive UI components (Button, Input, Card, Tabs, Toast, EmptyState)
  lib/
    who/                LMS lookup, z-score, percentile, inverse-percentile, curve generation
    growth/             Age computation, weight-gain velocity, projection, insight rules
    feeding/            Daily volume range, per-feed amount, calorie-adjusted volume
    hooks/              Custom React hooks (useChild, useWeights, useFeeding)
    utils/              Pure date and number/format helpers
    constants/          Named constants (ml/kg multipliers, projection window, z-table z-values)
  data/
    repository/         Repository interface + LocalStorageRepository (+ future ApiRepository slot)
    who/                Static WHO LMS tables (boys.ts, girls.ts, index.ts, types.ts)
  auth/                 AuthContext stub (anonymous local user with stable UUID)
  i18n/                 t() accessor, LocaleContext, copy/en.ts (English copy, typed)
  types/                Shared entity and domain TypeScript types
  main.tsx
```

---

## How to Extend

### Add more insight cards

Insight rules live in `src/lib/growth/insights.ts`. The file has a clearly-marked `EXTENSION POINT` comment where new rules can be added as pure functions of the weight history. The `InsightsList` component in `src/features/growth/` renders whatever the `insights` function returns — no wiring changes needed.

### Add length-for-age or head-circumference tracking

Embed additional WHO LMS tables in `src/data/who/` following the same shape as `boys.ts` / `girls.ts` (the `WeightForAgeTable` type in `src/data/who/types.ts` is the pattern). The chart, LMS math, and insight components are already general enough to reuse.

### Support multiple children

The data model already keys all entities by `childId`. Adding multiple children requires a child-switcher UI component; no data layer or domain logic changes are needed.

### Next phases are pre-architected

The MVP deliberately builds seams for the next phases so they are small, low-risk lifts rather than rewrites (see `docs/HLD.md` §10):

- **Login + server persistence (Phase 2):** replace `LocalStorageRepository` with an `ApiRepository` implementing the same async `Repository` interface. The swap point is `src/data/repository/index.ts`. No screen or hook changes. Entities already carry `uuid` IDs, `ownerId`, and UTC ISO timestamps — they map directly onto future database tables.

- **Hebrew / RTL (Phase 3):** all UI copy lives behind `t()` in `src/i18n/copy/en.ts`. Add `src/i18n/copy/he.ts` with the same `Copy` type shape, and flip `dir` in `LocaleContext`. The layout already uses logical CSS properties (`ps/pe`, `ms/me`, `text-start/end`) so RTL mirrors automatically.

---

## Testing

Unit tests live beside their source files (e.g. `src/lib/who/lms.test.ts`, `src/lib/growth/insights.test.ts`). The WHO math modules (`src/lib/who/`) and growth analysis modules (`src/lib/growth/`) have the heaviest coverage.

The integration, end-to-end, and accessibility QA plan is documented in `docs/TEST.md` and `docs/qa-plan.json`.

---

## License

Personal project. All rights reserved.
