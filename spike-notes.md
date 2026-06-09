# Spike M0.5-1 — WHO LMS math validation

**Goal:** prove the LMS method reproduces official WHO weight-for-age percentiles /
z-scores before building features, and decide GO / NO-GO. A wrong number is the one
failure GrowUp must prevent (HLD §8, top risk).

---

## 1. Data source & provenance

**Source (official WHO Child Growth Standards — Weight-for-age, "z-scores expanded
tables", daily L/M/S, birth to 5 years):**

- Boys: `https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-boys-zscore-expanded-tables.xlsx`
- Girls: `https://cdn.who.int/media/docs/default-source/child-growth/child-growth-standards/indicators/weight-for-age/expanded-tables/wfa-girls-zscore-expanded-tables.xlsx`
- Landing page: `https://www.who.int/tools/child-growth-standards/standards/weight-for-age`

**Method.** During this spike I downloaded both official `.xlsx` files and parsed
them programmatically (zip + XML, no third-party data entry). The expanded tables are
indexed by **age in days**, with columns `Day, L, M, S, SD4neg…SD4`. I copied the
rows for **day 0 (birth), 183 (6mo), 365 (12mo), 730 (24mo)** verbatim into
`src/data/who/sample.ts`. Day mapping follows WHO's `month × 30.4375` convention.

**Verified vs unverified.**

- **VERIFIED (all of them):** every `L`, `M`, `S` and every weight anchor (`sd3neg`,
  `sd2neg`, `median`, `sd2`, `sd3`) in the embedded sample was read directly from the
  official WHO `.xlsx`. Nothing is guessed.
- **Honesty note:** my first draft contained a handful of weight-anchor values from
  memory that turned out **wrong** (e.g. boys 6mo `sd2neg` 6.387 vs official 6.357;
  boys 24mo `sd3` 17.084 vs official 17.128). They were caught by re-reading the
  official table and corrected. This is exactly the transcription risk HLD §8 flags —
  and the reason every number is now machine-copied from source.
- **UNVERIFIED:** none. The sample is intentionally small (8 cells) but fully sourced.

---

## 2. CDF approximation

`zToPercentile(z)` computes `Φ(z)·100` via `Φ(z) = 1 − ½·erfc(z/√2)`, using the
Numerical Recipes `erfcc` rational Chebyshev approximation (Press et al., *Numerical
Recipes in C*, 2nd ed., §6.2; based on W. J. Cody 1969 / Abramowitz–Stegun 7.1.26).

**Accuracy:** documented fractional error `< 1.2e-7` everywhere → worst-case
percentile error `≈ 1.5e-5` points. That is ~13,000× tighter than the spike's 0.2
tolerance and far below any clinically meaningful display precision.

Anchor check (test-verified):

| z | zToPercentile(z) | expected |
|---|---|---|
| 0 | 50.000 | 50 |
| +1.880794 | ≈97.00 | 97 |
| −1.880794 | ≈3.00 | 3 |
| +1.036433 | ≈85.00 | 85 |
| −1.036433 | ≈15.00 | 15 |

---

## 3. Results

`npm run type-check` → **0 errors.**
`npm run test` → **82 passed (9 files).** New file `src/lib/who/lms.test.ts`: **8 passed.**
`eslint` on the three new files → **0 problems.** (Two pre-existing lint errors live in
`src/types/schemas.test.ts`, outside this spike's scope.)

### Tier A — Method identities (prove the math, data-independent) — ALL PASS

| Identity | Result |
|---|---|
| `percentileWeight(0, lms) === M` (5 synthetic + 8 real LMS) | PASS (1e-9) |
| `weightToZ(M·1000 g, lms) === 0` | PASS (1e-9) |
| Round-trip `weightToZ(percentileWeight(z)) ≈ z` for z ∈ {−1.88,−1.04,0,1.04,1.88} | PASS (1e-9) |
| L≈0 (log) branch == L→0 limit of power branch | PASS |
| CDF anchors (50/97/3/85/15) within 0.2 | PASS |

### Tier B — Data spot-checks against official WHO weights — ALL PASS

| Check | Result |
|---|---|
| 5 standard z's strictly increasing & 50th == M, all 8 cells | PASS |
| `percentileWeight` reproduces WHO published kg at z=−3,−2,0,+2,+3, all 8 cells | **PASS within 5 g** |
| `weightToZ`→`zToPercentile` gives ~50/~0.135/~99.865 at SD anchors | PASS |

The decisive evidence is the second Tier-B check: our inverse-LMS reproduces WHO's
**own** tabulated kilogram weights at five z-scores across boys & girls at birth/6/12/24
months, to within 5 grams (the table's own 3-decimal rounding allows ~0.5 g of slack).
The method is faithful to WHO's published numbers, not just internally consistent.

---

## 4. Decision

> **GO — the LMS method is proven.** The z-score, normal-CDF, and inverse-LMS
> functions reproduce official WHO weight-for-age values to within 5 grams across both
> sexes at birth, 6, 12 and 24 months, and all data-independent method identities hold
> to 1e-9. The CDF approximation's error (~1.5e-5 percentile points) is clinically
> negligible.
>
> **Concrete next step (M2-1):** embed the **full verified 0–24 month daily L/M/S
> tables** for both sexes from the WHO expanded z-score `.xlsx` files cited above, using
> the same machine-copy-from-source process (never manual entry), and implement
> `lmsForAge` with linear interpolation between tabulated days (HLD §4). Re-run the
> Tier-B WHO-weight spot-checks against the full table as a regression gate. The math
> layer in `src/lib/who/lms.ts` is ready and needs no changes.

**Risk status after spike:** HLD §8 "WHO LMS transcription errors" downgraded from a
blind risk to a controlled one — provenance is automated and test-gated. "CDF
approximation inaccuracy" is closed.
