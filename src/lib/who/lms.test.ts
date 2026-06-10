import { describe, it, expect } from 'vitest';
import { weightToZ, zToPercentile, percentileWeight, type Lms } from './lms';
import { WHO_WEIGHT_FOR_AGE_SAMPLE } from '../../data/who/sample';

/** Standard percentile -> z anchors (WHO chart lines). */
const STANDARD_ZS = {
  p3: -1.880794,
  p15: -1.036433,
  p50: 0,
  p85: 1.036433,
  p97: 1.880794,
} as const;

const ALL_STANDARD_ZS = Object.values(STANDARD_ZS);

/** Synthetic LMS cells spanning positive, ~zero and negative L. */
const SYNTHETIC_LMS: readonly Lms[] = [
  { l: 1, m: 5, s: 0.1 }, // L positive (linear-ish)
  { l: 0.3487, m: 3.3464, s: 0.14602 }, // WHO-like positive L
  { l: 1e-9, m: 8, s: 0.12 }, // L ~ 0 -> log branch
  { l: -0.294, m: 11.4741, s: 0.12389 }, // L negative
  { l: 2.5, m: 6, s: 0.08 }, // large positive L
];

const REAL_LMS: readonly Lms[] = WHO_WEIGHT_FOR_AGE_SAMPLE.map((c) => c.lms);
const ALL_LMS: readonly Lms[] = [...SYNTHETIC_LMS, ...REAL_LMS];

const GRAMS_PER_KG = 1000;

// ---------------------------------------------------------------------------
// Tier A — Method identities. These MUST hold regardless of the embedded data;
// they prove the LMS math itself is correct.
// ---------------------------------------------------------------------------

describe('LMS method identities', () => {
  it('percentileWeight(0, lms) === M (the median) for every LMS', () => {
    for (const lms of ALL_LMS) {
      const weightGrams = percentileWeight(0, lms);
      expect(weightGrams / GRAMS_PER_KG).toBeCloseTo(lms.m, 9);
    }
  });

  it('weightToZ(M grams, lms) === 0 for every LMS', () => {
    for (const lms of ALL_LMS) {
      const z = weightToZ(lms.m * GRAMS_PER_KG, lms);
      expect(z).toBeCloseTo(0, 9);
    }
  });

  it('round-trips weightToZ(percentileWeight(z)) ≈ z for standard z anchors', () => {
    for (const lms of ALL_LMS) {
      for (const z of ALL_STANDARD_ZS) {
        const grams = percentileWeight(z, lms);
        const recovered = weightToZ(grams, lms);
        expect(recovered).toBeCloseTo(z, 9);
      }
    }
  });

  it('handles the L≈0 (log) branch consistently with the limit', () => {
    const nearZero: Lms = { l: 1e-12, m: 7.5, s: 0.11 };

    // Identity still holds on the log branch.
    expect(percentileWeight(0, nearZero) / GRAMS_PER_KG).toBeCloseTo(nearZero.m, 9);
    expect(weightToZ(nearZero.m * GRAMS_PER_KG, nearZero)).toBeCloseTo(0, 9);

    // The log branch must match the L->0 limit of the power branch. Compare a
    // truly-zero-ish L against a tiny-but-nonzero L; results should agree.
    const tinyNonZero: Lms = { l: 1e-4, m: 7.5, s: 0.11 };
    for (const z of ALL_STANDARD_ZS) {
      const logBranch = percentileWeight(z, nearZero);
      const powerBranch = percentileWeight(z, tinyNonZero);
      expect(logBranch).toBeCloseTo(powerBranch, 1); // within ~0.1 g
    }
  });

  it('CDF anchors map z to the expected percentiles (within 0.2)', () => {
    // The erfc approximation has |fractional error| < 1.2e-7, i.e. < ~1.5e-5
    // percentile points — comfortably inside the spike's 0.2 tolerance.
    expect(zToPercentile(0)).toBeCloseTo(50, 4);
    expect(zToPercentile(STANDARD_ZS.p97)).toBeCloseTo(97, 1);
    expect(zToPercentile(STANDARD_ZS.p3)).toBeCloseTo(3, 1);
    expect(zToPercentile(STANDARD_ZS.p85)).toBeCloseTo(85, 1);
    expect(zToPercentile(STANDARD_ZS.p15)).toBeCloseTo(15, 1);

    // Symmetry and monotonicity sanity.
    expect(zToPercentile(-2) + zToPercentile(2)).toBeCloseTo(100, 4);
    expect(zToPercentile(-1)).toBeLessThan(zToPercentile(1));
  });
});

// ---------------------------------------------------------------------------
// Tier B — Data spot-checks. Prove the embedded VERIFIED WHO sample behaves
// sanely and that our functions reproduce WHO's own published weights.
// ---------------------------------------------------------------------------

describe('WHO verified sample spot-checks', () => {
  it('percentileWeight at the 5 standard z anchors is strictly increasing, with the 50th == M', () => {
    for (const cell of WHO_WEIGHT_FOR_AGE_SAMPLE) {
      const weights = ALL_STANDARD_ZS.map((z) => percentileWeight(z, cell.lms));
      for (let i = 1; i < weights.length; i += 1) {
        expect(weights[i]).toBeGreaterThan(weights[i - 1]);
      }
      const median = percentileWeight(STANDARD_ZS.p50, cell.lms) / GRAMS_PER_KG;
      expect(median).toBeCloseTo(cell.lms.m, 9);
    }
  });

  it('reproduces WHO published weights (kg) at z = -3, -2, 0, +2, +3 within 5 g', () => {
    // Tolerance is 5 g (0.005 kg): WHO tables print to 3 decimals, so rounding
    // alone permits ~0.5 g of disagreement; 5 g is a safe, tight bound.
    const toleranceKg = 0.005;
    for (const cell of WHO_WEIGHT_FOR_AGE_SAMPLE) {
      const { sd3neg, sd2neg, median, sd2, sd3 } = cell.weightAnchorsKg;
      const checks: ReadonlyArray<readonly [number, number]> = [
        [-3, sd3neg],
        [-2, sd2neg],
        [0, median],
        [2, sd2],
        [3, sd3],
      ];
      for (const [z, expectedKg] of checks) {
        const actualKg = percentileWeight(z, cell.lms) / GRAMS_PER_KG;
        expect(
          Math.abs(actualKg - expectedKg),
          `${cell.sex} ${cell.ageLabel} z=${z}: expected ${expectedKg}kg, got ${actualKg.toFixed(4)}kg`,
        ).toBeLessThanOrEqual(toleranceKg);
      }
    }
  });

  it('reproduces WHO percentiles: weightToZ then zToPercentile gives ~3/~50/~97 at the SD anchors', () => {
    for (const cell of WHO_WEIGHT_FOR_AGE_SAMPLE) {
      const medianZ = weightToZ(cell.weightAnchorsKg.median * GRAMS_PER_KG, cell.lms);
      expect(zToPercentile(medianZ)).toBeCloseTo(50, 1);

      // z = -3 SD -> ~0.135th percentile; z = +3 SD -> ~99.865th.
      const lowZ = weightToZ(cell.weightAnchorsKg.sd3neg * GRAMS_PER_KG, cell.lms);
      const highZ = weightToZ(cell.weightAnchorsKg.sd3 * GRAMS_PER_KG, cell.lms);
      expect(lowZ).toBeCloseTo(-3, 1);
      expect(highZ).toBeCloseTo(3, 1);
    }
  });
});
