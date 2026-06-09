# QA Plan: GrowUp

> **Generated from:** docs/PRD.md · docs/HLD.md · docs/PLAN.md · docs/ui-blueprints.md · design-system/MASTER.md
> **Date:** 2026-06-09
> **Mode:** A (docs-first)
> **Platform:** Superpowers (`superpowers:subagent-driven-development`)
> **Test scope:** Flow + use-case + E2E
> **A11y tests:** Yes (from MASTER.md Priority-1 rules)
> **Total tests:** 30 — 16 P0 · 14 P1 · 0 P2  (5 of which are a11y)

These tests are **separate from the unit tests in PLAN.md** (which already cover the pure WHO/growth/feeding
math at the function level). The tests here verify **integration-level behavior**: persistence, UI rendering,
alert logic, end-to-end flows, and accessibility — the places a parent would actually feel a bug.

---

## Agent pool rules
- **Max 4 agents total** — build + test + fix combined, across PLAN.md and TEST.md.
- **Run P0 first** — no P1 until all P0 pass; no P2 until all P1 pass.
- **Never ship with a failing P0.** P1 failures need explicit user sign-off.
- **Test agents only report** — they never fix code. On failure, a fix agent is spawned.
- **Fix agents** use `superpowers:systematic-debugging` (root cause FIRST), fix implementation only
  (never tests), then `superpowers:verification-before-completion` before claiming fixed.
- **Fix branching:** new branch `fix/TC-xxx-...` + PR (per your global git rules).
- **Fix isolation:** worktrees via `superpowers:using-git-worktrees`.
- **Re-run after fix:** a fresh test agent re-runs the same TC to confirm resolution.

---

## How to spawn test agents (Superpowers)

```
Invoke: superpowers:subagent-driven-development
Context:
  Run the QA plan in docs/TEST.md.
  Priority order: P0 -> P1 -> P2.
  Fix agents must use superpowers:systematic-debugging before any code change,
  and superpowers:verification-before-completion before claiming fixed.
  Fix isolation: superpowers:using-git-worktrees per fix; new branch + PR per fix.
  Max 4 agents total.
```

**Fix agent prompt template:**
```
You are a fix agent. A test failed. Follow EXACTLY:
1. superpowers:systematic-debugging — complete Phase 1 (root cause) before writing ANY code.
2. Document the root cause.
3. Implement ONE targeted fix (implementation only — never modify the test).
4. superpowers:verification-before-completion: run the verification command and confirm expected output.
5. Report: root cause | fix | verification evidence.
Failing test: [paste TC block]   Error: [paste output]
Files: [files_under_test]   Context: [fix_agent_context]
Branching: new branch fix/TC-xxx + PR.
```

---

## Running order (per PLAN.md milestone deploys)
```
After M0 deploy   -> TC-010, TC-011 (shell + disclaimer)
After M1 deploy   -> TC-101, TC-110..113, TC-130, TC-1E (profile)
After M2 deploy   -> TC-201, TC-210..215, TC-220, TC-230, TC-240, TC-2E (weight)
After M3 deploy   -> TC-301, TC-310, TC-311, TC-330, TC-3E (feeding)
After M4           -> TC-A01..A05 (a11y sweep) + full regression
```

---

## P0 — Release blockers
*All must pass before shipping. A failing P0 = do not ship.*

### TC-101 · FLOW: Add a baby end-to-end and see computed age · flow
**Area:** profile · **Milestone:** after M1
**Files under test:** src/features/profile/ChildForm.tsx, Profile.tsx, src/lib/hooks/useChild.ts, src/lib/growth/age.ts
**Steps:** fresh load → onboarding → "Add your baby" → enter name, sex, valid DOB (≈4 months ago) → Save.
**Expected:** lands showing name + correct completed age; persists after reload.
**Fix agent context:** systematic-debugging Phase 1 → trace create→persist→read + ageFromDob; likely repo read/write mismatch or age from time-of-day; verify by re-running flow.
**Fix branching:** new branch + PR.

### TC-110 · Future DOB is blocked · usecase
**Area:** profile · **Milestone:** after M1 · **Files:** ChildForm.tsx, profile/types.ts, types/schemas.ts
**Steps:** Add Child → future DOB → Save. **Expected:** blocked; error BELOW the DOB field.
**Fix:** schema rejects future dates + error placement. New branch + PR.

### TC-111 · Sex required with explanation · usecase
**Area:** profile · **Milestone:** after M1 · **Files:** ChildForm.tsx, SexSelector.tsx
**Steps:** fill name+DOB, leave sex empty → Save. **Expected:** blocked; "why we ask" (WHO differs by sex) shown.
**Fix:** schema requires sex; SexSelector group label/helper. New branch + PR.

### TC-112 · Editing DOB recomputes age · usecase
**Area:** profile · **Milestone:** after M1 · **Files:** ChildForm.tsx, Profile.tsx, age.ts
**Steps:** create child → edit DOB → save. **Expected:** displayed age updates. **Fix:** update persists + recompute on read. New branch + PR.

### TC-113 · Profile persists with no login across reload · usecase
**Area:** profile · **Milestone:** after M1 · **Files:** localStorageRepository.ts, AuthContext.tsx
**Steps:** create child → reload. **Expected:** child still present, no login. **Fix:** localStorage key + stable ownerId. New branch + PR.

### TC-201 · FLOW: Log a weight → percentile, z, chart, projection · flow
**Area:** weight · **Milestone:** after M2 · **Files:** Growth.tsx, WeightChart.tsx, ProjectionCard.tsx, lib/who, lib/growth/projection.ts, useWeights.ts
**Steps:** add a weight today, then a second a week later. **Expected:** history shows percentile+z per entry; chart shows 5 curves + points; projection shows velocity + 4-week forecast.
**Fix:** trace add→recompute→render; likely lmsForAge interpolation or chart mapping; verify displayed percentile/z. New branch + PR.

### TC-210 · Percentile/z match WHO reference (not snapped) · usecase ⭐ critical
**Area:** weight · **Milestone:** after M2 · **Files:** lib/who/*, data/who/*, WeightRow.tsx
**Steps:** add a weight equal to the WHO 50th (M) for the sex/age; read percentile/z; then an off-curve weight.
**Expected:** 50th / z=0 within rounding; off-curve shows exact interpolated percentile, not nearest label.
**Fix:** systematic-debugging — this is the #1 risk. Compare to spike-notes.md; likely wrong L/M/S row, sex mix-up, or CDF error; assert against WHO published values. New branch + PR.

### TC-211 · Weight history edit & delete · usecase
**Area:** weight · **Milestone:** after M2 · **Files:** WeightHistoryList.tsx, WeightForm.tsx, useWeights.ts
**Steps:** add → edit value → delete. **Expected:** edit updates value+percentile; delete removes from history+chart; persists. New branch + PR.

### TC-212 · Chart shows 5 curves + baby points + accessible fallback · usecase
**Area:** weight · **Milestone:** after M2 · **Files:** WeightChart.tsx, lib/who/curves.ts
**Steps:** add 2+ weights; inspect chart. **Expected:** 5 labelled curves 0–24mo for sex; points overlay; text/table fallback exists. New branch + PR.

### TC-213 · Below-3rd alert: gentle, gram gap + trend, never red/color-only · usecase ⭐
**Area:** weight · **Milestone:** after M2 · **Files:** BelowThirdAlert.tsx, lib/who
**Steps:** add a weight clearly below 3rd; observe alert.
**Expected:** caution-amber (NOT red) alert states current percentile, GRAMS to reach 3rd-percentile line, trend; icon + words; hopeful next step.
**Fix:** check threshold (<3) + percentileWeight gram-gap; confirm amber+icon; verify gap = percentileWeight(z₃)−current. New branch + PR.

### TC-214 · Projection: velocity, forecast, gain-to-3rd, graceful <2 points · usecase
**Area:** weight · **Milestone:** after M2 · **Files:** ProjectionCard.tsx, velocity.ts, projection.ts
**Steps:** add two weights a known interval apart; read projection; delete one to leave a single entry.
**Expected:** 2+ pts → velocity (g/day), ~4-week forecast vs curves, daily/weekly gain to reach 3rd, assumptions stated; 1 pt → graceful "add one more weight". New branch + PR.

### TC-301 · FLOW: weight → daily range + per-feed · flow
**Area:** feeding · **Milestone:** after M3 · **Files:** Feeding.tsx, lib/feeding/index.ts, constants/feeding.ts
**Steps:** open Feeding (weight prefilled/entered); feeds/day=8. **Expected:** daily range 120–200 ml/kg/day; per-feed = range/feeds (verify e.g. 5kg → 600–1000 ml/day). New branch + PR.

### TC-310 · Feeds-per-day stepper recomputes + clamps at 1 · usecase
**Area:** feeding · **Milestone:** after M3 · **Files:** FeedsPerDayStepper.tsx, lib/feeding/index.ts
**Steps:** change feeds/day; try below 1. **Expected:** per-feed recomputes; will not go below 1. New branch + PR.

### TC-311 · High-calorie formula → LOWER volume, SAME calories · usecase ⭐
**Area:** feeding · **Milestone:** after M3 · **Files:** HighCaloriePanel.tsx, lib/feeding/index.ts
**Steps:** enable high-cal; enter >0.67 kcal/ml (e.g. 1.0). **Expected:** calorie target = standard target; adjusted volume LOWER than standard; math shown; kcal/oz↔kcal/ml consistent.
**Fix:** calorieAdjustedRange divides calorie target by new density; verify conversion + hand calc. New branch + PR.

### TC-1E · E2E: Onboarding → profile (real browser) · e2e
**Area:** profile · **Milestone:** after M1 · **Skill:** `/dev-browser` · **URL:** [STAGING_URL]
**Steps:** open URL → add baby → verify Profile name+age. **Expected:** journey works in-browser + persists on reload. New branch + PR.

### TC-2E · E2E: Log weights → chart + alert (real browser) · e2e
**Area:** weight · **Milestone:** after M2 · **Skill:** `/dev-browser` · **URL:** [STAGING_URL]
**Steps:** add two weights (one below 3rd); verify chart + amber alert. **Expected:** 5 curves + points; gram-gap alert; no console errors. New branch + PR.

### TC-3E · E2E: Feeding incl. high-calorie (real browser) · e2e
**Area:** feeding · **Milestone:** after M3 · **Skill:** `/dev-browser` · **URL:** [STAGING_URL]
**Steps:** enter weight; toggle high-cal + density. **Expected:** daily range, per-feed, calorie-matched lower volume all correct in-browser. New branch + PR.

---

## P1 — Important
*Run after all P0 pass. Failures need explicit sign-off before shipping.*

### TC-010 · Bottom tabs navigate · usecase
**Milestone:** after M0 · **Files:** routes.tsx, bottom-tabs.tsx. Tabs route correctly; active tab `aria-current=page` + non-color indicator. New branch + PR.

### TC-011 · Medical disclaimer present + non-dismissable everywhere · usecase
**Milestone:** after M0 · **Files:** medical-disclaimer.tsx, i18n/copy/en.ts. On all screens; cannot dismiss; contrast ≥4.5:1. New branch + PR.

### TC-130 · Profile empty state · usecase
**Milestone:** after M1 · **Files:** Profile.tsx, empty-state.tsx. No-child → "Add your baby to begin" + action. New branch + PR.

### TC-215 · Weight date out of 0–24mo / before DOB blocked · usecase
**Milestone:** after M2 · **Files:** WeightForm.tsx, useWeights.ts, schemas.ts. Calm range message. New branch + PR.

### TC-220 · Starter insight cards (loss / slow velocity / percentile drop) · usecase
**Milestone:** after M2 · **Files:** InsightsList.tsx, insights.ts. Drop across 2+ measurements flagged calmly; extension point present. New branch + PR.

### TC-230 · Growth empty state (no weights) · usecase
**Milestone:** after M2 · **Files:** Growth.tsx, empty-state.tsx. "Add your baby's first weight…" + CTA; no broken chart. New branch + PR.

### TC-240 · localStorage write failure → calm toast, no data loss · usecase
**Milestone:** after M2 · **Files:** localStorageRepository.ts, toast.tsx. Typed error → toast; in-memory value preserved; no crash. New branch + PR.

### TC-330 · Feeding empty state (no weight) · usecase
**Milestone:** after M3 · **Files:** Feeding.tsx, empty-state.tsx. "Enter a weight to see feeding amounts" + link. New branch + PR.

### A11y sweep (run after M4 on all screens)

### TC-A01 · Contrast ≥4.5:1 (incl. amber alert + muted text) · a11y
**Files:** index.css, MASTER.md. All normal text ≥4.5:1; large/UI ≥3:1. Darken offending token. New branch + PR.

### TC-A02 · Interactive elements ≥44×44px · a11y
**Files:** components/ui/*, features/**. Tabs, buttons, stepper, row actions, modal close. New branch + PR.

### TC-A03 · Keyboard nav + visible focus rings; modal focus trap · a11y
**Files:** modal.tsx, features/**. All reachable; focus visible; Escape closes modal. New branch + PR.

### TC-A04 · No status by color alone; icon-only buttons have aria-label · a11y
**Files:** BelowThirdAlert.tsx, badge.tsx, modal.tsx. Icon+text for status; aria-labels present. New branch + PR.

### TC-A05 · Visible input labels; reduced motion respected · a11y
**Files:** input.tsx, index.css. No placeholder-only inputs; decorative motion off under prefers-reduced-motion. New branch + PR.

---

## Quick reference

| ID | Title | Type | Area | Priority | Milestone |
|---|---|---|---|---|---|
| TC-101 | Add baby end-to-end | flow | profile | P0 | M1 |
| TC-110 | Future DOB blocked | usecase | profile | P0 | M1 |
| TC-111 | Sex required | usecase | profile | P0 | M1 |
| TC-112 | Edit DOB recomputes age | usecase | profile | P0 | M1 |
| TC-113 | Persists across reload | usecase | profile | P0 | M1 |
| TC-1E | E2E onboarding→profile | e2e | profile | P0 | M1 |
| TC-201 | Log weight → pct/z/chart/projection | flow | weight | P0 | M2 |
| TC-210 | Percentile matches WHO ref ⭐ | usecase | weight | P0 | M2 |
| TC-211 | History edit/delete | usecase | weight | P0 | M2 |
| TC-212 | Chart 5 curves + points | usecase | weight | P0 | M2 |
| TC-213 | Below-3rd gentle alert ⭐ | usecase | weight | P0 | M2 |
| TC-214 | Projection + graceful <2 | usecase | weight | P0 | M2 |
| TC-2E | E2E weights→chart+alert | e2e | weight | P0 | M2 |
| TC-301 | Weight → daily range | flow | feeding | P0 | M3 |
| TC-310 | Stepper recompute/clamp | usecase | feeding | P0 | M3 |
| TC-311 | High-cal lower volume ⭐ | usecase | feeding | P0 | M3 |
| TC-3E | E2E feeding high-cal | e2e | feeding | P0 | M3 |
| TC-010 | Tabs navigate | usecase | setup | P1 | M0 |
| TC-011 | Disclaimer non-dismissable | usecase | trust | P1 | M0 |
| TC-130 | Profile empty state | usecase | profile | P1 | M1 |
| TC-215 | Weight date range blocked | usecase | weight | P1 | M2 |
| TC-220 | Insight cards | usecase | weight | P1 | M2 |
| TC-230 | Growth empty state | usecase | weight | P1 | M2 |
| TC-240 | Write-failure toast | usecase | weight | P1 | M2 |
| TC-330 | Feeding empty state | usecase | feeding | P1 | M3 |
| TC-A01 | Contrast ≥4.5:1 | usecase | a11y | P1 | M4 |
| TC-A02 | Touch targets ≥44px | usecase | a11y | P1 | M4 |
| TC-A03 | Keyboard + focus | usecase | a11y | P1 | M4 |
| TC-A04 | Not color-alone + aria | usecase | a11y | P1 | M4 |
| TC-A05 | Labels + reduced motion | usecase | a11y | P1 | M4 |

---

## A11y test cases (from design-system/MASTER.md Priority-1 rules)

| ID | Rule | Screens | Check |
|---|---|---|---|
| TC-A01 | contrast ≥4.5:1 | all | contrast checker on text incl. amber alert + muted |
| TC-A02 | touch target ≥44×44px | all | inspect every interactive element |
| TC-A03 | focus ring + keyboard | all | tab through; modal trap + Escape |
| TC-A04 | not color-alone + aria-label | Growth, shared | status icon+text; icon-only buttons labelled |
| TC-A05 | labels + reduced motion | forms, global | visible labels; motion gated |
