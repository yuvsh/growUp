/**
 * Shared display-formatting helpers for the growth feature.
 *
 * These were previously duplicated (with subtly different precision/suffix
 * rules) across ProjectionCard, WeightRow, Growth, and WeightChart. Each
 * call site keeps its EXACT prior output by passing the matching options —
 * this module does not change any displayed string, it only removes the
 * duplication.
 */

/** Round a number to `dp` decimal places (half-up, away from float drift). */
function round(value: number, dp: number): number {
  const factor = Math.pow(10, dp);
  return Math.round(value * factor) / factor;
}

/**
 * Format grams to a kg string with a fixed number of decimal places.
 *
 * @param grams - Weight in grams.
 * @param decimals - Number of decimal places (e.g. 2 for ProjectionCard's
 *                    "4.25", 3 for Growth/WeightChart's "6.350").
 */
export function formatGramsAsKg(grams: number, decimals: number): string {
  return (grams / 1000).toFixed(decimals);
}

/**
 * Format grams to a kg string with 3 significant figures, trimming trailing
 * zeros (e.g. 3450g → "3.45 kg", 12300g → "12.3 kg"). Matches WeightRow's
 * prior `formatWeightKg`. Includes the " kg" suffix (unlike formatGramsAsKg).
 */
export function formatWeightKgPrecision3(grams: number): string {
  const kg = grams / 1000;
  return `${parseFloat(kg.toPrecision(3))} kg`;
}

/**
 * Format grams with `decimals` decimal places, trimming a trailing ".0"
 * when the rounded value is a whole number (e.g. 12.0 → "12", 12.4 → "12.4").
 * Matches ProjectionCard's prior `formatGrams`.
 */
export function formatGramsTrimmed(grams: number, decimals: number): string {
  const rounded = round(grams, decimals);
  return Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(decimals);
}

/**
 * Format a percentile with a fixed number of decimal places (no suffix).
 * Matches ProjectionCard's prior `formatPercentile` (decimals = 1).
 */
export function formatPercentile(p: number, decimals: number): string {
  return p.toFixed(decimals);
}

/**
 * Format a percentile with a fixed number of decimal places plus a literal
 * "th" suffix (e.g. 24.7 → "24.7th"). Matches Growth.tsx's prior
 * `formatPercentile` and BelowThirdAlert's inline `${percentile.toFixed(1)}th`.
 */
export function formatPercentileTh(p: number, decimals: number): string {
  return `${p.toFixed(decimals)}th`;
}

/**
 * Format a percentile rounded (not truncated) to `decimals` places via the
 * same half-up `round` helper WeightChart used, with a "%" suffix and no
 * padding of trailing zeros (e.g. 50 → "50%", 3.05 → "3.1%"). This differs
 * from `formatPercentile`/`formatPercentileTh` (which use `toFixed` and so
 * keep trailing zeros) — preserved as a distinct function on purpose.
 */
export function formatPercentilePercent(p: number, decimals: number): string {
  return `${round(p, decimals)}%`;
}

/**
 * Format a percentile as an English ordinal (e.g. 1 → "1st", 2 → "2nd",
 * 3 → "3rd", 11–13 → "11th"/"12th"/"13th", otherwise → "Nth"). Rounds to the
 * nearest whole number first. Matches WeightRow's prior `formatPercentile`.
 */
export function formatPercentileOrdinal(percentile: number): string {
  const rounded = Math.round(percentile);
  const mod10 = rounded % 10;
  const mod100 = rounded % 100;
  let suffix: string;
  if (mod100 >= 11 && mod100 <= 13) {
    suffix = 'th';
  } else if (mod10 === 1) {
    suffix = 'st';
  } else if (mod10 === 2) {
    suffix = 'nd';
  } else if (mod10 === 3) {
    suffix = 'rd';
  } else {
    suffix = 'th';
  }
  return `${rounded}${suffix}`;
}
