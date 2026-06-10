/**
 * WHO Child Growth Standards — LMS method (pure functions).
 *
 * The LMS method models a skewed distribution at each age with three
 * parameters:
 *   L — Box-Cox power (lambda)
 *   M — median
 *   S — coefficient of variation (sigma)
 *
 * Reference: WHO Multicentre Growth Reference Study Group (2006),
 * "WHO Child Growth Standards: Methods and development", Annex on the
 * computation of centiles and z-scores.
 *
 * WHO tabulates M (the median weight) in KILOGRAMS. This app stores and
 * passes weights in INTEGER GRAMS (see `WeightEntry.weightGrams`), so these
 * functions convert grams <-> kg at the boundary.
 *
 * This module is pure: no React, no DOM, no I/O.
 */

/** WHO LMS parameters for one (sex, age) cell. M is in kilograms. */
export interface Lms {
  /** Box-Cox power (lambda). May be 0 or negative. */
  l: number;
  /** Median weight in kilograms. */
  m: number;
  /** Coefficient of variation (sigma). */
  s: number;
}

/** Grams per kilogram. */
const GRAMS_PER_KG = 1000;

/**
 * Threshold below which |L| is treated as the L=0 (log) branch of the LMS
 * transform. The LMS formulas are mathematically continuous as L -> 0, so a
 * small epsilon avoids division by (L * S) blowing up near zero while keeping
 * the result indistinguishable (within float precision) from the limit.
 */
const L_ZERO_EPSILON = 1e-7;

/**
 * Convert a weight measurement (grams) to a WHO z-score for the given LMS cell.
 *
 *   L != 0:  z = ((X/M)^L - 1) / (L * S)
 *   L ~= 0:  z = ln(X/M) / S
 *
 * X and M are both in kilograms inside the formula; the input is grams.
 */
export function weightToZ(weightGrams: number, lms: Lms): number {
  const weightKg = weightGrams / GRAMS_PER_KG;
  const ratio = weightKg / lms.m;

  if (Math.abs(lms.l) < L_ZERO_EPSILON) {
    return Math.log(ratio) / lms.s;
  }

  return (Math.pow(ratio, lms.l) - 1) / (lms.l * lms.s);
}

/**
 * Standard normal cumulative distribution function, returned as a PERCENTILE
 * (0-100): percentile = Phi(z) * 100.
 *
 * Phi is implemented via the complementary error function using the
 * Cody / W. J. Cody-style rational Chebyshev approximation popularised as
 * Numerical Recipes' `erfcc`. Its fractional error is everywhere less than
 * 1.2e-7, which is far tighter than the ~0.2 percentile tolerance the spike
 * requires and adequate for clinical percentile display.
 *
 * Source of the erfc approximation:
 *   Press, Teukolsky, Vetterling, Flannery, "Numerical Recipes in C", 2nd ed.,
 *   §6.2 `erfcc` — itself based on the rational approximation in
 *   W. J. Cody (1969) and Abramowitz & Stegun 7.1.26.
 */
export function zToPercentile(z: number): number {
  const phi = standardNormalCdf(z);
  return phi * 100;
}

/** Phi(z): probability that a standard normal variate is <= z. */
function standardNormalCdf(z: number): number {
  // Phi(z) = 1 - 0.5 * erfc(z / sqrt(2))
  return 1 - 0.5 * erfc(z / Math.SQRT2);
}

/**
 * Complementary error function erfc(x) with |error| < 1.2e-7.
 * Numerical Recipes `erfcc` rational approximation.
 */
function erfc(x: number): number {
  const absX = Math.abs(x);
  const t = 1 / (1 + 0.5 * absX);

  // Horner evaluation of the degree-9 polynomial in t.
  const poly =
    -1.26551223 +
    t *
      (1.00002368 +
        t *
          (0.37409196 +
            t *
              (0.09678418 +
                t *
                  (-0.18628806 +
                    t *
                      (0.27886807 +
                        t *
                          (-1.13520398 +
                            t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))));

  const tau = t * Math.exp(-absX * absX + poly);

  return x >= 0 ? tau : 2 - tau;
}

/**
 * Inverse LMS: the weight (in GRAMS) at a given z-score for the LMS cell.
 *
 *   L != 0:  X = M * (1 + L * S * z)^(1/L)
 *   L ~= 0:  X = M * e^(S * z)
 *
 * Returned in grams to match the rest of the domain (X is computed in kg).
 */
export function percentileWeight(z: number, lms: Lms): number {
  let weightKg: number;

  if (Math.abs(lms.l) < L_ZERO_EPSILON) {
    weightKg = lms.m * Math.exp(lms.s * z);
  } else {
    weightKg = lms.m * Math.pow(1 + lms.l * lms.s * z, 1 / lms.l);
  }

  return weightKg * GRAMS_PER_KG;
}
