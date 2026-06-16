# GrowUp

GrowUp is a warm, calm, mobile-first web app that helps parents of infants diagnosed with failure to thrive (FTT) or with a history of intrauterine growth restriction (IUGR) track their baby's weight and plan feeding between doctor visits. It plots each weight against the official WHO Child Growth Standards, computes the exact WHO percentile and z-score for the baby's precise age using the LMS method, and — when things sit below the healthy line — explains in plain, reassuring language how far below they are and what recent progress looks like. GrowUp is **local-first and private by default** (no account, fully offline), with **optional cloud sync** for parents who want a backup or multi-device access. It is a calm information companion, not a replacement for professional care.

---

## ⚠️ Medical Disclaimer

GrowUp is for **tracking and information purposes only**. It is **not medical advice** and does not replace the guidance of a pediatrician, dietitian, or other healthcare professional. Failure to thrive and IUGR are medical conditions that require professional diagnosis and ongoing care. Always discuss your baby's growth and feeding with your care team. GrowUp helps you understand the numbers between visits — it never replaces the people who know your baby.

---

## Features

### Child Profile
- Add your baby with **name, sex, and date of birth**.
- Sex is required because the WHO publishes separate standards for boys and girls.
- Baby's current age is computed and shown in plain terms (e.g. "3 months, 1 week").

### WHO Weight Tracking
- **Exact percentile and z-score** computed with the WHO LMS method for the baby's precise age — not snapped to the nearest printed curve.
- **Weight chart** plotting the baby's measured weights against the 3rd, 15th, 50th, 85th, and 97th WHO percentile curves.
- **Focus / zoom range toggle** — switch the chart window between **1mo / 3mo / 6mo / All / 2yr** so small week-to-week changes stay legible instead of being squashed into the full 0–24 month frame.
- **Gentle below-3rd-percentile alert** — when the latest weight is below the 3rd percentile, a calm amber card states the current percentile, the gram gap to reach the 3rd-percentile line, and the recent trend. Always paired with a hopeful next number, never alarmist.
- **Transparent projection** — computes recent weight-gain velocity (g/day), projects ~4 weeks ahead against the WHO curves, and states the daily and weekly gain needed to reach the 3rd percentile. All assumptions are shown plainly.
- **Z-score trajectory view** — a second chart tab plots the baby's z-score over time, making the trend across visits clear at a glance.
- **Insight cards** — warm, plain-language cards surface weight loss between visits, slow velocity, and percentile drops across multiple measurements.
- **"Latest measurements" table** — full weight history with edit and delete; every entry shows its percentile and z-score.

### Import from Nara Baby
- **Import weights from a Nara Baby CSV export.** GrowUp parses the file (no external dependencies) and adds the weight entries to the baby's history.

### Feeding Calculator
- **Daily milk-volume range** using the standard **120–200 ml/kg/day** rule (multipliers are named constants).
- **Per-feed amount** based on feeds per day (default 8, adjustable).
- **High-calorie / special formula mode** — enter your formula's energy density (kcal/ml or kcal/oz); the app recomputes a **calorie-matched** volume range so the baby receives the same calories as with standard formula. A more concentrated formula correctly yields a lower ml range.
- **Average intake vs. need gauge** — enter the baby's average daily intake and see it plotted against the recommended need band, with **120 / 150 / 200 ml/kg/day reference ticks**. Status is communicated with icon and text (caution amber when below — never red), never by color alone.

### Optional Remote Sync *(new)*
- At onboarding the parent **explicitly chooses** how their data is stored:
  - **On this device (private)** — no account, fully offline, nothing transmitted. *Default.*
  - **Sync to my account** — sign in with **Google**; children, weights, and feeding settings are stored in a private **Supabase** database (EU region), row-secured to the signed-in owner (**owner-only Row-Level Security**).
- **Migration** — switching from local → sync offers to upload the data already on the device, with a confirmation that states exactly what will be uploaded.
- **Switch mode anytime in Settings** — change between local and sync; switching back copies the cloud data down to the device and keeps the cloud copy until explicitly deleted.
- **Export & delete** — export everything as JSON, or permanently delete your synced account and data.
- **Per-tab scroll and chart-view persistence** — scroll position and the active chart view/range survive tab switches and reloads.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 6 + TypeScript 5 |
| Styling | Tailwind CSS v4 (logical CSS properties throughout for RTL-readiness) |
| Routing | React Router 7 (`react-router-dom`) |
| Charts | Recharts 3 |
| Forms & validation | react-hook-form 7 + Zod 3 |
| Unit/integration tests | Vitest 3 + React Testing Library + jsdom |
| Local persistence | `localStorage` via an async `Repository` interface (`LocalStorageRepository`) |
| Optional remote sync | **Supabase** (Postgres + Auth + Row-Level Security) via `@supabase/supabase-js` v2 |

All WHO math runs in the browser. In local mode there are no network calls, no server, and no account. Remote sync is fully optional and additive.

---

## WHO Child Growth Standards — Data Source & Method

### Source

The embedded LMS data comes from the official **WHO Child Growth Standards — Weight-for-age, z-scores expanded tables** (daily L/M/S):

- **Boys:** [`wfa-boys-zscore-expanded-tables.xlsx`](https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-boys-zscore-expanded-tables.xlsx)
- **Girls:** [`wfa-girls-zscore-expanded-tables.xlsx`](https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-girls-zscore-expanded-tables.xlsx)
- **Landing page:** [who.int/tools/child-growth-standards/standards/weight-for-age](https://www.who.int/tools/child-growth-standards/standards/weight-for-age)

Both files were downloaded from `cdn.who.int` and parsed programmatically. Every L, M, S value in `src/data/who/boys.ts` and `src/data/who/girls.ts` was **machine-copied** from the official `.xlsx` — no value was typed or guessed by hand. The full **0–24 month** daily tables (boys + girls) are embedded as typed TypeScript constants and covered by regression tests.

### LMS Method

GrowUp computes the **exact** percentile and z-score using the WHO LMS method (`src/lib/who/lms.ts`):

**Z-score from a measured weight X:**

```
z = ( (X/M)^L − 1 ) / (L · S)
```

For the special case where `L ≈ 0` (the log branch):

```
z = ln(X/M) / S
```

**Percentile from z-score:**

```
percentile = Φ(z) × 100
```

where `Φ` is the standard normal CDF, computed via the Chebyshev rational approximation (Abramowitz–Stegun 7.1.26 / Cody 1969).

**Inverse LMS** (used to draw percentile curves and compute gram gaps):

```
X = M · (1 + L · S · z)^(1/L)    [L ≠ 0]
X = M · e^(S · z)                  [L ≈ 0]
```

`lmsForAge` linearly interpolates between the tabulated daily rows for exact-day precision. Values are computed exactly — never snapped to the printed curves. The full LMS module and its validation tests live in `src/lib/who/`.

---

## Getting Started

```bash
npm install
npm run dev          # start the dev server (Vite)
npm run build        # production build (tsc -b, then vite build)
npm run test         # run all unit/integration tests (Vitest)
npm run type-check   # TypeScript type-check without emitting
npm run lint         # ESLint
```

Additional scripts: `npm run preview` (preview the production build), `npm run test:watch` (Vitest in watch mode).

---

## Optional Remote Sync Setup

Remote sync is **off unless configured**. Without the env vars below, the app runs **fully local-only** and never crashes — the Supabase client is created lazily and guarded, and onboarding simply offers the on-device option.

To enable cloud sync:

1. Set the public Supabase env vars (e.g. in `.env.local` — already git-ignored):

   ```bash
   VITE_SUPABASE_URL=        # your project URL
   VITE_SUPABASE_ANON_KEY=   # the public anon key (browser-safe; RLS protects data)
   ```

   > Never put the service-role key in the client. RLS (owner_id = `auth.uid()`) is what protects the data. **Do not commit real keys.**

2. Apply the database schema + Row-Level Security. The canonical location for the timestamped, idempotent migration SQL (children / weight_entries / feeding_configs + RLS policies) is `supabase/migrations/`, per `docs/HLD-remote-sync.md`.

3. Enable **Google OAuth** in the Supabase dashboard, with the app's callback URL as an authorized redirect. (The SPA handles the redirect at `src/app/AuthCallback.tsx`.)

The Supabase project is provisioned in the **EU** region (GDPR-friendly for infant health data).

---

## Project Structure

```
src/
  app/                  App shell, router, layout, auth callback, scroll memory
                        (App.tsx, routes.tsx, PrimaryLayout.tsx, AuthCallback.tsx, RootRedirect.tsx)
  features/
    profile/            Profile + Add/Edit Child screens
    growth/             Growth screen, weight chart, z-score chart, history, insights,
                        alerts, projection, Nara Baby import UI
    feeding/            Feeding calculator, feeds-per-day stepper, high-calorie panel,
                        intake-vs-need gauge
    settings/           Storage & Privacy section, migration modal
    sync/               Sync upload prompt
  components/
    ui/                 Primitive UI (Button, Input, Card, Modal, Badge, Toast, Skeleton,
                        BottomTabs, EmptyState, ErrorState, MedicalDisclaimer, tokens)
  lib/
    who/                LMS lookup, z-score, percentile, inverse-percentile, curve generation
    growth/             Age, weight-gain velocity, projection, insight rules, chart window/zoom
    feeding/            Daily volume range, per-feed amount, calorie-matched volume, intake need
    hooks/              Custom React hooks
    constants/          Named constants (ml/kg multipliers, formula energy densities, etc.)
    import/             Nara Baby CSV parser
    supabase/           Lazy, guarded supabase-js client
    sync/               Local↔remote migration + JSON export
    storageMode.ts      'local' | 'remote' persistence
  data/
    who/                Static WHO LMS tables (boys.ts, girls.ts, index.ts, types.ts)
    repository/         Repository interface + LocalStorageRepository + SupabaseRepository
                        (chosen at the composition root by mode + auth)
  auth/                 AuthContext (anonymous local user, or Supabase Google session)
  i18n/                 t() accessor, LocaleContext, copy/en.ts (typed English copy)
  ui-state/             UiStateContext — persisted chart view/range above the router
  types/                Shared entity and domain TypeScript types
  main.tsx
supabase/
  migrations/           Schema + RLS migration SQL (see Optional Remote Sync Setup)
docs/                   PRD, HLD, remote-sync PRD/HLD, TEST plan, UI blueprints
```

---

## How to Extend

### Add more insight cards
Insight rules live in `src/lib/growth/insights.ts`, with a clearly-marked extension point. New rules are pure functions of the weight history; `InsightsList` renders whatever `insights` returns — no wiring changes.

### Add length-for-age or head-circumference tracking
Embed additional WHO LMS tables in `src/data/who/` following the same shape as `boys.ts` / `girls.ts`. The chart, LMS math, and insight components are already general enough to reuse.

### Support multiple children
The data model already keys all entities by `childId`. Adding multiple children needs a child-switcher UI component; no data-layer or domain-logic changes are required.

### Hebrew / RTL
All UI copy lives behind `t()` in `src/i18n`. Add `src/i18n/copy/he.ts` with the same `Copy` type shape and flip `dir` in `LocaleContext`. The layout already uses logical CSS properties (`ps/pe`, `ms/me`, `text-start/end`) so RTL mirrors automatically.

---

## Testing & Deployment

- **Unit & integration tests** run on **Vitest** and live beside their source files (e.g. `src/lib/who/lms.test.ts`, `src/lib/growth/insights.test.ts`, `src/data/repository/supabaseRepository.test.ts`). The WHO math and growth-analysis modules have the heaviest coverage.
- The full integration, end-to-end, and accessibility **QA plan** is documented in `docs/TEST.md` (with `docs/qa-plan.json`).
- **Deployment:** the app is deployed on **Vercel** as a single-page app. `vercel.json` configures the SPA rewrite (`/(.*) → /index.html`) so client-side routes (including the OAuth callback) resolve correctly.

---

## License

See `LICENSE`. Personal project.
