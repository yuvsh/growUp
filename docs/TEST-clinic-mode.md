# QA Plan: Clinic Mode

> **Generated from:** docs/PRD-clinic-mode.md · docs/HLD-clinic-mode.md · docs/PLAN-clinic-mode.md · docs/ui-blueprints.md · design-system/MASTER.md
> **Mode:** A (docs-first)
> **Date:** 2026-06-17
> **Platform:** Superpowers (`superpowers:subagent-driven-development`)
> **Test scope:** Flow + use case + E2E (`/dev-browser`; no Playwright in repo — E2E runs against local `npm run dev`)
> **Fix branching:** Fix on current branch (`feature/clinic-mode`)
> **A11y tests:** Yes
> **Total tests:** 20 — 9 P0 · 11 P1 · 0 P2  (4 of P1 are a11y)

> Unit tests for pure logic (schema, `useClinicRead` derivation) live in **docs/PLAN-clinic-mode.md** and are written by build agents. This plan is integration / component / E2E / a11y only — it does not duplicate those.

---

## Agent pool rules

- **Max 4 agents total** — build + test + fix combined.
- **Run P0 first** — no P1 until all P0 pass. (No P2 in this plan.)
- **Never ship with a failing P0.** P1 failures need explicit sign-off.
- **Test agents report only** — they never fix code.
- **Fix agents** use `superpowers:systematic-debugging` for root cause FIRST, then `superpowers:verification-before-completion` before claiming fixed. They fix implementation only, never tests.
- **Fix isolation** via `superpowers:using-git-worktrees`; merge to `feature/clinic-mode` per the branching rule.
- **Re-run after fix** — a fresh test agent re-runs the same TC to confirm.

---

## How to spawn test agents (Superpowers)

```
Invoke: superpowers:subagent-driven-development
Context:
  Run the QA plan in docs/TEST-clinic-mode.md.
  Platform: Superpowers. Priority order: P0 → P1.
  Fix agents must use superpowers:systematic-debugging before any code change,
  and superpowers:verification-before-completion before claiming fixed.
  Fix isolation: superpowers:using-git-worktrees. Branching: fix on feature/clinic-mode.
  Max 4 agents total.
```

**Fix agent prompt template:**
```
You are a fix agent. A test failed. Follow EXACTLY:
1. superpowers:systematic-debugging — complete Phase 1 (root cause) before any code.
2. Document the root cause.
3. Implement ONE targeted fix.
4. superpowers:verification-before-completion: run the TC's verification command and confirm output.
5. Report: root cause | fix | evidence.
Failing test: [paste TC]  Error: [paste]  Files: [files_under_test]  Context: [fix_agent_context]
Branching: fix on feature/clinic-mode.
```

---

## Running order

```
After M1 deploy → TC-101/102 (flow + E2E), then TC-110–117 (P0 use cases)
After P0 green  → TC-150–154 (P1 edges/states) + TC-A01–A04 (a11y sweep)
```

---

## P0 — Release blockers

### TC-101 · Two-weight read: entry → form → full result · flow
**Area:** clinic-read · **Milestone:** after M1
**Files under test:** ClinicEntry.tsx, ClinicForm.tsx, ClinicResult.tsx, useClinicRead.ts, src/app/routes.tsx
**Steps:** /clinic → "Start a read" → DOB+sex → weight #1 → add weight #2 (later, higher) → "Get read".
**Expected:** Result shows percentile+z-score callout, chart with both points on WHO curves, TrendCard (gain, g/day), and catch-up/maintenance projection. No error.
**Fix agent context:** systematic-debugging Phase 1 first. Check submit() sets input before navigate. Likely: state lost on route change or derivation throws. Files: useClinicRead.ts, ClinicForm.tsx, ClinicResult.tsx. Verify: `npm test -- clinic`.
**Fix branching:** current branch.

### TC-102 · E2E browser: two-weight happy path · e2e · Skill: `/dev-browser`
**Area:** clinic-read · **Milestone:** after M1 · **URL:** [DEV_URL] from `npm run dev`
**Steps:** Open [DEV_URL]/clinic → Start a read → fill DOB/sex/two weights → Get read.
**Expected:** Visible percentile number, rendered chart with two points, a trend value, zero console errors.
**Fix agent context:** systematic-debugging Phase 1. Check WeightChart renders with only 1–2 entries. Likely: chart range/empty-data handling. Files: WeightChart.tsx, ClinicResult.tsx. Verify: re-run /dev-browser flow.
**Fix branching:** current branch.

### TC-110 · CLM-1: entry independent of parent data · usecase
**Files:** src/app/routes.tsx, ClinicEntry.tsx
**Steps:** With no child profile, go to /clinic.
**Expected:** Renders outside PrimaryLayout — no onboarding redirect, no bottom tabs, notice present.
**Fix agent context:** systematic-debugging Phase 1. Check /clinic routes are OUTSIDE PrimaryLayout children. Files: routes.tsx. Verify: `npm test -- routing`.
**Fix branching:** current branch.

### TC-111 · CLM-2: DOB+sex+one weight → percentile & z-score, no profile · usecase
**Files:** ClinicForm.tsx, useClinicRead.ts, lib/who/index.ts
**Steps:** /clinic/read → DOB+sex+single weight → Get read.
**Expected:** Valid percentile and z-score; no name/account/profile required.
**Fix agent context:** systematic-debugging Phase 1. Check weightToZResult gets age-in-days from DOB. Files: useClinicRead.ts, lib/who. Verify: `npm test -- useClinicRead`.
**Fix branching:** current branch.

### TC-112 · CLM-3/CLM-7: second weight → trend & velocity · usecase
**Files:** useClinicRead.ts, TrendCard.tsx
**Steps:** DOB+sex+weight #1, add weight #2 later & higher, Get read.
**Expected:** TrendCard shows 'gain' + positive g/day between the dated points.
**Fix agent context:** systematic-debugging Phase 1. Check g/day = (w2-w1)/days. Files: useClinicRead.ts. Verify: `npm test -- useClinicRead`.
**Fix branching:** current branch.

### TC-113 · CLM-6: weights plotted vs WHO curves · usecase
**Files:** ClinicResult.tsx, WeightChart.tsx
**Steps:** Two-weight read → inspect chart.
**Expected:** 3rd/15th/50th/85th/97th curves for the sex; both points at correct ages.
**Fix agent context:** systematic-debugging Phase 1. Check ephemeral WeightEntry[] has valid dateMeasured/weightGrams. Files: ClinicResult.tsx. Verify: `npm test -- ClinicResult`.
**Fix branching:** current branch.

### TC-114 · CLM-8: catch-up vs maintenance · usecase
**Files:** useClinicRead.ts, ProjectionCard.tsx
**Steps:** Read below 3rd percentile, then a New read at/above 50th.
**Expected:** Below → catch-up (g/day + g/week, amber). On/above → maintenance (green), no fabricated deficit.
**Fix agent context:** systematic-debugging Phase 1. Check the mode branch against the 3rd-percentile line. Files: useClinicRead.ts. Verify: `npm test -- useClinicRead`.
**Fix branching:** current branch.

### TC-115 · CLM-9: non-diagnostic phrasing + disclaimer · usecase
**Files:** ClinicResult.tsx, src/i18n/copy/en.ts
**Steps:** View any result; read callout + disclaimer.
**Expected:** Visible "supports, not replaces, clinical judgment"; no diagnosis asserted.
**Fix agent context:** systematic-debugging Phase 1. Check clinic i18n block + disclaimer render. Files: en.ts, ClinicResult.tsx. Verify: `npm test -- ClinicResult`.
**Fix branching:** current branch.

### TC-116 · CLM-10: nothing is stored (ephemeral contract) · usecase
**Files:** useClinicRead.ts, no-persistence.test.ts
**Steps:** Complete a read; inspect localStorage/sessionStorage; refresh /clinic/result; run the guard test.
**Expected:** No clinic keys in storage; refresh clears state → redirect to /clinic/read; guard test confirms no imports from data/auth/lib/supabase under features/clinic.
**Fix agent context:** systematic-debugging Phase 1. Check React-state-only + no forbidden imports. Files: src/features/clinic/*. Verify: `npm test -- no-persistence`.
**Fix branching:** current branch.

### TC-117 · CLM-11: one-tap reset · usecase
**Files:** ClinicResult.tsx, useClinicRead.ts
**Steps:** Complete a read → "New read".
**Expected:** Blank /clinic/read form, nothing pre-filled.
**Fix agent context:** systematic-debugging Phase 1. Check reset() clears input and form remounts empty. Files: useClinicRead.ts, ClinicForm.tsx. Verify: `npm test -- clinic`.
**Fix branching:** current branch.

---

## P1 — Important
*Run after all P0 pass. Failures require sign-off.*

### TC-150 · Edge: single weight degrades gracefully · usecase
**Files:** ClinicResult.tsx
**Expected:** Percentile/z-score + chart render; trend section shows EmptyState "Add a second weight…", not empty panels.
**Fix agent context:** systematic-debugging Phase 1. Check trend?→TrendCard : EmptyState. Verify: `npm test -- ClinicResult`. **Branch:** current.

### TC-151 · Edge: future DOB / age out of range rejected · usecase
**Files:** clinicSchema.ts, ClinicForm.tsx
**Expected:** Inline "can't be in the future" and "outside the WHO 0–24 month range"; no result.
**Fix agent context:** systematic-debugging Phase 1. Check refinements + WHO_MAX_AGE_DAYS. Verify: `npm test -- clinicSchema`. **Branch:** current.

### TC-152 · Edge: reversed / same-date weights · usecase
**Files:** clinicSchema.ts
**Expected:** Reversed → "second weight's date must be on or after the first"; same-date → blocked (velocity undefined).
**Fix agent context:** systematic-debugging Phase 1. Check date-order + same-date refinements. Verify: `npm test -- clinicSchema`. **Branch:** current.

### TC-153 · CLM-4: implausible weight soft-warn · usecase
**Files:** ClinicForm.tsx
**Expected:** Soft confirm/warn; a genuine edge value can still proceed after confirming (not a hard block).
**Fix agent context:** systematic-debugging Phase 1. Check soft-warn in form UI, not schema. Verify: `npm test -- ClinicForm`. **Branch:** current.

### TC-154 · State: result with no input redirects · usecase
**Files:** ClinicResult.tsx
**Expected:** Direct nav/refresh on /clinic/result with no input → redirect to /clinic/read; no crash.
**Fix agent context:** systematic-debugging Phase 1. Check !input||!read → <Navigate replace>. Verify: `npm test -- ClinicResult`. **Branch:** current.

---

## A11y test cases (Priority 1-2 from design-system/MASTER.md)

### TC-A01 · Contrast ≥ 4.5:1 on all clinic text · Skill: `/dev-browser`
**Screens:** Entry, Form, Result. **Expected:** All text ≥4.5:1 (≥3:1 large/UI); amber/green pass on their surfaces. **Branch:** current.

### TC-A02 · Touch targets ≥ 44×44px · Skill: `/dev-browser`
**Screens:** all clinic controls (CTAs, add/remove weight, SexSelector, New read). **Expected:** all ≥44×44px. **Branch:** current.

### TC-A03 · Status never color-alone
**Screens:** Result callout, TrendCard, projection. **Expected:** every amber/green status pairs color with icon AND words. **Branch:** current.

### TC-A04 · Visible labels + keyboard nav · Skill: `/dev-browser`
**Screens:** Form. **Expected:** all inputs labelled (not placeholder-only); visible focus ring; errors below fields; SexSelector keyboard-operable. **Branch:** current.

---

## Quick reference

| ID | Title | Type | Area | Priority |
|---|---|---|---|---|
| TC-101 | Two-weight read flow | flow | clinic-read | P0 |
| TC-102 | E2E two-weight happy path | e2e | clinic-read | P0 |
| TC-110 | Entry independent of parent data | usecase | clinic-entry | P0 |
| TC-111 | One weight → percentile/z-score | usecase | clinic-read | P0 |
| TC-112 | Second weight → trend/velocity | usecase | clinic-read | P0 |
| TC-113 | Plotted vs WHO curves | usecase | clinic-result | P0 |
| TC-114 | Catch-up vs maintenance | usecase | clinic-result | P0 |
| TC-115 | Non-diagnostic + disclaimer | usecase | clinic-result | P0 |
| TC-116 | Nothing stored (ephemeral) | usecase | ephemeral | P0 |
| TC-117 | One-tap reset | usecase | clinic-result | P0 |
| TC-150 | Single-weight graceful degrade | usecase | clinic-result | P1 |
| TC-151 | Future DOB / age range | usecase | validation | P1 |
| TC-152 | Reversed / same-date weights | usecase | validation | P1 |
| TC-153 | Implausible weight soft-warn | usecase | validation | P1 |
| TC-154 | Result with no input redirects | usecase | routing | P1 |
| TC-A01 | Contrast ≥4.5:1 | a11y | a11y | P1 |
| TC-A02 | Touch targets ≥44px | a11y | a11y | P1 |
| TC-A03 | Status not color-alone | a11y | a11y | P1 |
| TC-A04 | Labels + keyboard nav | a11y | a11y | P1 |

---

> Run P0 after M1 deploys; give each test agent its TC block as its full prompt. Test agents report failures only — fix agents use `superpowers:systematic-debugging` then `superpowers:verification-before-completion`.
> Next: build with `superpowers:using-git-worktrees` → `superpowers:subagent-driven-development` (from docs/PLAN-clinic-mode.md).
