# GrowUp — Screen Blueprints

> UX contract per screen. Build agents read this **with** `design-system/MASTER.md` before writing any
> visual logic. Stack: React + Vite + React Router v7, mobile-first, RTL-ready (logical CSS only).
> Global philosophy anchor: **Apple** (calm, one clear thing per screen); **Google** accent only on the
> Growth chart where numbers matter.

**Navigation:** persistent **BottomTabs** — Growth · Feeding · Profile — on all primary screens.
A **MedicalDisclaimer** is shown in onboarding and persists as a footer everywhere.

**Route map**
| Route | Screen | Guard |
|---|---|---|
| `/` | redirect → `/growth` if a child exists, else → `/onboarding` | — |
| `/onboarding` | Onboarding / Welcome | only when no child |
| `/profile` | Profile | needs child |
| `/profile/child` | Add / Edit Child (form) | — |
| `/growth` | Growth | needs child |
| `/feeding` | Feeding | needs child |
| Add/Edit Weight | Modal/bottom-sheet over `/growth` | needs child |

---

## Onboarding / Welcome
**Route:** `/onboarding`
**Philosophy:** Apple — warm, spacious, single CTA. First impression must calm, not overwhelm.
**Design page:** `design-system/MASTER.md`
**Layout:** Full-height centered column. Soft organic blob accent behind a friendly heading
("Welcome to GrowUp"), one reassuring sentence about tracking growth & feeding calmly, then the
**MedicalDisclaimer** (non-dismissable) and a single primary CTA "Add your baby". No tabs yet.
**Components from ui/:** Button, Card, MedicalDisclaimer.
**Screen components to create:** `src/features/profile/Onboarding.tsx`.
**Data flow:** reads `repository.children.list()`; if any exist, redirect to `/growth`.

**States**
| Element | Empty | Loading | Error |
|---|---|---|---|
| Screen | This *is* the empty state (no child yet) | brief skeleton while reading local data | if local read fails → calm "We couldn't open your data" + retry |

**A11y**
- [ ] "Add your baby" → Button, keyboard focusable, aria-label "Add your baby", ≥44×44px.
- [ ] Disclaimer is readable text (≥4.5:1), not a tooltip; not dismissable.

**Responsive**
- Mobile 375px: single column, CTA full width.
- Desktop 1280px: centered card max-w ~480px.

**Animation:** blob drift ±10px slow (motion-safe only); CTA press scale(0.98).

---

## Add / Edit Child
**Route:** `/profile/child` (also reached from Onboarding CTA)
**Philosophy:** Apple — calm single-purpose form.
**Layout:** Title ("Tell us about your baby" / "Edit baby"). Form: **Name** (text), **Sex** (segmented
control male/female with a one-line "why we ask" helper — WHO standards differ), **Date of birth**
(date picker, cannot be future). Primary "Save", secondary "Cancel". On edit, a quiet "Delete baby"
(destructive confirm via Modal).
**Components from ui/:** Input, Button, Card, Modal (delete confirm), Toast.
**Screen components to create:** `src/features/profile/ChildForm.tsx`, `SexSelector.tsx`.
**Data flow:** `repository.children.create/update/delete`; validates with Zod; stamps `ownerId` from AuthContext.

**States**
| Element | Empty | Loading | Error |
|---|---|---|---|
| Form | blank (add mode) | Save button → loading spinner, fields disabled | field errors below each field; save failure → Toast "Couldn't save — your details are still here" |

**A11y**
- [ ] Every field has a visible label; Sex uses radio semantics with a group label.
- [ ] DOB error ("Date can't be in the future") appears below the field, role="alert".
- [ ] Why-we-ask helper linked via aria-describedby on Sex.
- [ ] Delete → Modal with focus trap, Escape closes, explicit "Delete"/"Keep".

**Responsive**
- Mobile: full-width stacked fields, sticky Save at bottom.
- Desktop: centered card max-w ~520px.

**Animation:** field focus ring fade 150ms; save success Toast slide-in (motion-safe).

---

## Profile
**Route:** `/profile`
**Philosophy:** Apple — quiet summary.
**Layout:** Header with baby's name + current age ("3 months, 1 week", from DOB). Card with sex & DOB
and an "Edit" button → `/profile/child`. Persistent **MedicalDisclaimer** footer. (Future: child
switcher + account live here — leave a clearly-commented slot.)
**Components from ui/:** Card, Button, Badge, MedicalDisclaimer, BottomTabs.
**Screen components to create:** `src/features/profile/Profile.tsx`.
**Data flow:** `repository.children` (current child) + `ageFromDob`.

**States**
| Element | Empty | Loading | Error |
|---|---|---|---|
| Profile | no child → EmptyState "Add your baby to begin" + action → `/profile/child` | skeleton card | calm error + retry |

**A11y**
- [ ] "Edit" Button aria-label "Edit baby's profile", ≥44×44px.
- [ ] Age shown as text, not color-coded.

**Responsive:** Mobile single column; Desktop centered max-w ~560px.
**Animation:** none beyond standard press.

---

## Growth  *(the complex screen — Google accent for the chart)*
**Route:** `/growth`
**Philosophy:** Apple shell + Google data density inside the chart/history.
**Design page:** `design-system/pages/growth.md` (if present) → else MASTER.
**Layout (top→bottom):**
1. Header: baby name + age + latest weight with its **percentile & z-score** (Badge).
2. **BelowThirdAlert** — conditional, **caution amber** (never red): current percentile, grams to reach
   the 3rd-percentile line, recent trend (improving/steady/declining), one hopeful next step. Icon + words.
3. **WeightChart** (Recharts): 5 WHO percentile curves (3/15/50/85/97) + the baby's points overlaid.
4. **ProjectionCard**: velocity (g/day), ~4-week forecast vs. curves, daily/weekly gain needed to reach 3rd;
   math shown transparently.
5. **InsightsList**: starter cards (loss between visits, slow velocity, percentile drop 2+ measurements) +
   a clearly-commented `EXTENSION POINT` for more.
6. **WeightHistoryList**: rows (date, weight, percentile, z) with edit/delete.
7. FAB / button "Add weight" → Add/Edit Weight modal.
**Components from ui/:** Card, Badge, Button, Skeleton, EmptyState, ErrorState, Modal, BottomTabs.
**Screen components to create:** `src/features/growth/Growth.tsx`, `WeightChart.tsx`, `BelowThirdAlert.tsx`,
`ProjectionCard.tsx`, `InsightsList.tsx`, `InsightCard.tsx`, `WeightHistoryList.tsx`, `WeightRow.tsx`.
**Data flow:** `repository.weights.listByChild` + `lib/who` + `lib/growth` (all pure, client-side).

**States**
| Component | Empty | Loading | Error |
|---|---|---|---|
| Chart | "Add your baby's first weight to see the chart" + Add CTA | Skeleton variant="card" | inline "Couldn't load measurements" + retry |
| Projection | hidden until ≥2 entries; shows "Add one more weight to see a projection" | Skeleton text | — |
| History | EmptyState (no entries) | Skeleton list-item ×3 | inline error |
| Add/Edit Weight | n/a (form) | Save spinner | field errors below; out-of-range date message |

**A11y**
- [ ] BelowThirdAlert: role="status", icon + text (not color-only), readable amber ≥4.5:1.
- [ ] Chart: provide a text summary / accessible table fallback of latest values (chart not sole source).
- [ ] Each history row edit/delete is a ≥44×44px labelled button ("Edit weight from <date>").
- [ ] "Add weight" aria-label, ≥44×44px.

**Responsive**
- Mobile 375px: chart scrolls/scales to width; cards stack; sticky "Add weight".
- Desktop 1280px: chart wider; projection + insights can sit two-up.

**Animation:** new point eases in 250ms; alert fades in (motion-safe); no flashing.

---

### Growth — Weight chart focus + time-range zoom (WHO-9)
**Problem:** the full 0–24mo × full-weight frame squashes the baby's small week-to-week changes.
**Control:** a segmented `1mo · 3mo · 6mo · All` toggle near the weight chart (radio-group semantics, ≥44×44px, active = `--color-primary` + non-color cue, copy via `t()`). Default **3mo**.
**Auto-fit:** X (age) domain = a focused window anchored to the baby's data — `1/3/6mo` end at the latest measurement and span that many months; `All` = the full data span (never the empty 0–24 frame). Y (kg) domain fits the baby's points in the window + padding, with a **minimum span** so a single/flat point isn't a hairline. Recharts numeric axes clip the WHO curves to the domain, so nearby percentile lines stay visible for context.
**A11y/mobile:** no gestures needed; the accessible fallback table is unchanged; toggle keyboard-operable with visible focus.

### Growth — Z-score trajectory view (WHO-7)
**Component:** `ZScoreChart` (toggled in, alongside `WeightChart`)
**Trigger:** a segmented `Weight | Z-score` control near the chart header, shown only when entries exist; default **Weight**.
**Layout:** when **Z-score** is selected, `WeightChart` is replaced by `ZScoreChart`. One point per weight entry at its exact age (x-axis matches the weight chart's age convention; y-axis = z-score). 1 entry → single dot; 2+ → connected line. Tooltip per point: date, age, weight, z-score (2 dp), percentile.
**Reference lines:** horizontal, labelled, calm — `z = 0` (median, primary/muted), `z = −2` (caution), `z = −3` (caution-strong). **Never red.**
**Y-domain:** anchor the clinical lines so they stay visible and small moves don't look dramatic — `yMin = min(dataMin, −3) − 0.5`, `yMax = max(dataMax, 0) + 0.5`.
**Data:** a shared pure helper `deriveMeasurements(entries, sex, dateOfBirth)` → per-entry `{ ageDays, ageLabel, weightGrams, z, percentile, dateMeasured }` (no snapping); used by both the plotted points and the fallback table.
**States:** no entries → no toggle, no chart (Growth's empty state already covers this). Loading/error handled by the Growth screen.
**A11y:** the toggle is a labelled segmented control (radio-group semantics), ≥44×44px, `aria-current`/`aria-checked` on the active option, visible focus. Reference lines labelled in text. Accessible fallback table (date, age, weight, z-score, percentile) — chart is never the sole source. All copy via `t()`.
**Responsive:** readable at 375px via `ResponsiveContainer`.

---

## Add / Edit Weight
**Presentation:** Modal / bottom-sheet over `/growth`.
**Philosophy:** Apple — two fields, fast.
**Layout:** **Weight** (number; kg with grams, unit shown) + **Date** (defaults today; within 0–24mo & ≥DOB).
On save, recompute percentile/z and update chart/history. Edit mode prefills + offers Delete (confirm).
**Components from ui/:** Modal, Input, Button, Toast.
**Screen components to create:** `src/features/growth/WeightForm.tsx`.
**Data flow:** `repository.weights.create/update/delete`; Zod validation; weight stored as integer grams.

**States**
| Element | Empty | Loading | Error |
|---|---|---|---|
| Form | blank (add) / prefilled (edit) | Save spinner | "Please enter a weight"; "Date must be between birth and 24 months"; save fail → Toast |

**A11y**
- [ ] Labels visible; numeric keypad on mobile (inputMode="decimal").
- [ ] Errors below each field, role="alert".
- [ ] Modal focus trap + Escape + return focus to "Add weight".

**Responsive:** Mobile bottom-sheet full-width; Desktop centered dialog max-w ~440px.
**Animation:** sheet slide-up 250ms (motion-safe).

---

## Feeding
**Route:** `/feeding`
**Philosophy:** Apple — calm calculator, transparent math.
**Layout:**
1. **Weight input** (prefilled from latest weight entry; editable).
2. **Daily volume range** card: 120–200 ml/kg/day (multipliers shown as editable constants).
3. **Per-feed amount**: feeds/day stepper (default 8) → per-feed ml.
4. **High-calorie mode** toggle: enter formula kcal/ml or kcal/oz (standard 0.67 kcal/ml reference);
   show calorie target + the **calorie-matched** (lower) volume range, with the math visible.
**Components from ui/:** Card, Input, Button, Badge, EmptyState, BottomTabs.
**Screen components to create:** `src/features/feeding/Feeding.tsx`, `FeedsPerDayStepper.tsx`,
`HighCaloriePanel.tsx`.
**Data flow:** `repository.feedingConfig` (persist prefs) + `lib/feeding` (pure math).

**States**
| Element | Empty | Loading | Error |
|---|---|---|---|
| Calculator | no weight → EmptyState "Enter a weight to see feeding amounts" (+ link to add a weight) | instant | "Enter a valid weight"; "Feeds per day must be at least 1"; "Enter your formula's calories" |

**A11y**
- [ ] Stepper +/- are ≥44×44px labelled buttons ("Increase feeds per day").
- [ ] High-calorie toggle has a label + describes its effect; unit (kcal/ml vs kcal/oz) is a labelled control.
- [ ] Results announced via aria-live="polite" when inputs change.

**Responsive:** Mobile stacked cards; Desktop two-column (inputs / results).
**Animation:** result numbers cross-fade 150ms on change (motion-safe).

### Feeding — Average intake vs. need (FEED-4)
**Component:** `IntakeVsNeed` (a card below the per-feed / high-calorie cards; only when a valid weight is present).
**Input:** "Average daily intake — last 7 days" (ml/day, numeric, labelled); persists to `FeedingConfig.avgIntakeMlPerDay` via `useFeeding.saveConfig`.
**Gauge:** a lightweight **custom token-styled** horizontal bar (NOT a new chart library) on a ml/day scale from 0 to ~`max×1.15`. The **need band** (`weightKg×120 … weightKg×200`) is a shaded region (calm accent/success tint); the **intake** is a vertical **marker line** positioned at its value with its number labelled. Readable at 375px.
**Readout:** plain language — "≈ X ml/day · recommended Y–Z ml/day · within / below / above range." within = `--color-success`, below = `--color-caution` (amber, **never red**), above = neutral/`--color-text-muted`; each paired with an **icon + words** (not color alone).
**States:** no weight → whole block hidden (handled by the Feeding screen). No intake entered yet → gauge shows just the need band + a gentle prompt to enter intake.
**A11y:** labelled numeric input; the readout is the gauge's accessible text equivalent (chart not sole source); status not color-alone; tokens + logical CSS; ≥44px targets; result announced via `aria-live="polite"`.

---

## Shared — BottomTabs & MedicalDisclaimer
- **BottomTabs:** fixed bottom, 3 items (Growth/Feeding/Profile), each a ≥44×44px target with SVG icon +
  visible text label; active = `--color-primary` (icon + label + indicator, not color alone);
  uses logical positioning for RTL. `aria-current="page"` on active.
- **MedicalDisclaimer:** persistent footer + onboarding block. Plain, warm wording: informational/tracking
  only, not medical advice, FTT/IUGR require professional care. Non-dismissable. Text ≥4.5:1.

---

# Clinic Mode (feature: docs/PRD-clinic-mode.md, docs/HLD-clinic-mode.md)

> A point-of-care surface **outside** `PrimaryLayout` — no bottom tabs, no profile guard, **nothing
> saved**. Audience is a clinician reading the result aloud to a parent. Design page:
> `design-system/pages/clinic.md`. Three linear screens.

**Route map (added)**
| Route | Screen | Guard |
|---|---|---|
| `/clinic` | Clinic Entry / notice | none (outside PrimaryLayout) |
| `/clinic/read` | Clinic Form (DOB + sex + birth weight + one current weight) | none |
| `/clinic/result` | Clinic Result | none (redirect to `/clinic/read` if no in-memory input) |

State for all three lives in a single in-memory `useClinicRead` hook — refresh/close clears everything.

---

## Clinic Entry
**Route:** `/clinic`
**Philosophy:** Apple — one notice, one CTA.
**Design page:** `design-system/pages/clinic.md`
**Layout:** Full-height centered column. Heading "Clinic Mode", one line on what it does ("Enter one or
two weights for an instant WHO growth read"), a quiet **notice card**: *nothing is saved* and *this
supports, not replaces, clinical judgment*. Single primary CTA "Start a read". A small "Back to growUp"
link returns to the parent app.
**Components from ui/:** Button, Card, MedicalDisclaimer.
**Screen components to create:** `src/features/clinic/ClinicEntry.tsx`.
**Data flow:** none — static screen; CTA navigates to `/clinic/read`.

**States**
| Element | Empty | Loading | Error |
|---|---|---|---|
| Screen | This is a static intro — no data | none (no async) | n/a |

**A11y**
- [ ] "Start a read" → Button, focusable, aria-label "Start a read", ≥44×44px.
- [ ] Notice is readable text ≥4.5:1, not a tooltip; not dismissable.
- [ ] "Back to growUp" is a real link, keyboard reachable.

**Responsive**
- Mobile 375px: single column, CTA full width.
- Desktop 1280px: centered card max-w ~480px.

**Animation:** CTA press scale(0.98); respect `prefers-reduced-motion`.

---

## Clinic Form
**Route:** `/clinic/read`
**Philosophy:** Google accent — efficient data entry, fastest path to a result.
**Design page:** `design-system/pages/clinic.md`
**Layout:** Title "Enter the baby's details". Form sections: **Date of birth** (date, not future),
**Sex** (reuse `SexSelector`, with one-line "why we ask" — WHO standards differ), **Birth weight**
(grams/kg input, required — helper "The baby's weight at birth; anchors the read at day 0"), then a
single **Current weight** (grams/kg input + measurement date defaulting to today). Primary "Get read"
(disabled until DOB + sex + birth weight + current weight valid), secondary "Clear". Inline validation
under each field. A second current weight is **not** entered here — it's added from the result screen.
**Components from ui/:** Input, Button, Card. Reuse weight-row pattern from `WeightForm`; `SexSelector`.
**Screen components to create:** `src/features/clinic/ClinicForm.tsx`, `useClinicRead.ts`,
`ClinicReadContext.tsx`, `clinicSchema.ts`, `types.ts`.
**Data flow:** writes form values into the shared `useClinicReadContext().submit(...)` (in-memory); the
read is derived via `lib/who` + `lib/growth`, then navigates to `/clinic/result`. No repository, no localStorage.

**States**
| Element | Empty | Loading | Error |
|---|---|---|---|
| Form | Opens with DOB, sex, birth weight, one current-weight row visible, cursor in first field | none (sync compute) | Inline per field: "Enter a date of birth", "Choose a sex", "Enter the birth weight", "Enter a weight" |
| DOB | — | — | "Date of birth can't be in the future" / "Age is outside the WHO 0–24 month range" |
| Current weight date | — | — | "The weight date must be on or after the date of birth" |
| Weight value | — | — | Soft warn on implausible value (incl. birth weight): "That looks unusual — please confirm" |

**A11y**
- [ ] Every input has a visible `<label>` (not placeholder-only); error below the field.
- [ ] `SexSelector` is keyboard operable (arrow keys / Tab), conveys selection by more than color.
- [ ] "Get read" announces disabled state; not enabled until min valid inputs.

**Responsive**
- Mobile 375px: single column, inputs full width, "Get read" full width sticky-ish at bottom.
- Desktop 1280px: centered card max-w ~520px.

**Animation:** field focus ring fade; respect reduced-motion.

---

## Clinic Result
**Route:** `/clinic/result`
**Philosophy:** Google accent — the number and the chart are the product.
**Design page:** `design-system/pages/clinic.md`
**Layout:** Top **PercentileZScoreCallout**: big current percentile (`--text-display`) + z-score, a
"Born at the Xth percentile" line (from `birthZResult`), and one plain-language sentence to read aloud.
Below: **WeightChart** (reused) plotting the WHO curves with the birth point (day 0) + 1–2 current
points. Then **TrendCard** (direction + g/day from birth) — always present, since birth weight anchors
the trend. Then the **catch-up target** via reused **ProjectionCard** (catch-up amber when below the
line, maintenance green when on/above). Then an **"Add another weight"** affordance (shown while only
one current weight exists; capped at two): it reveals a small inline weight + date panel that validates
and, on confirm, re-derives the read in place. A quiet **disclaimer note**. Footer: "New read" (resets
and returns to a blank form).
**Components from ui/:** Input, Card, Button, MedicalDisclaimer. Reuse `WeightChart`, `ProjectionCard`
from `features/growth`; `PercentileZScoreCallout`, `TrendCard` from `features/clinic`.
**Screen components to create:** `src/features/clinic/ClinicResult.tsx`,
`src/features/clinic/PercentileZScoreCallout.tsx`, `src/features/clinic/TrendCard.tsx`.
**Data flow:** reads derived `ClinicRead` from `useClinicReadContext()`; if absent (e.g. direct nav/refresh),
redirect to `/clinic/read`. Builds ephemeral `WeightEntry[]` (synthetic ids, never persisted) to feed
the reused chart/projection. "Add another weight" calls `submit(...)` with the updated input so the
whole read re-derives; the two current weights are kept ordered by date.

**States**
| Element | Empty | Loading | Error |
|---|---|---|---|
| Result | If no in-memory input → redirect to `/clinic/read` | none (sync) | "We couldn't compute a result from these values — please review the inputs" → back to form |
| TrendCard | Always present (birth + ≥1 current weight = trend); a second current weight refines recent velocity | — | — |
| Catch-up | On/above line → maintenance framing (green), not a fabricated deficit | — | — |
| Add-weight panel | Hidden once two current weights exist | none (sync) | Inline: weight required/positive; date before birth; outside WHO range; same date as the existing reading |

**A11y**
- [ ] Percentile/z-score conveyed as text, not color alone; amber/green paired with icon + words.
- [ ] "New read" / "Add another weight" → Buttons with aria-labels, ≥44×44px.
- [ ] Add-weight panel inputs have visible labels; error below the field.
- [ ] Chart has an accessible text summary nearby (the callout sentence) for screen readers.
- [ ] Disclaimer text ≥4.5:1, not dismissable.

**Responsive**
- Mobile 375px: single column — callout, chart, cards stacked; chart full width.
- Desktop 1280px: centered max-w ~640px; chart wider, cards in a single column for read-aloud clarity.

**Animation:** number/cards fade-in `--duration-normal`; no celebratory motion (clinical context);
respect reduced-motion.
