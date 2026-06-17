/**
 * Shared display-formatting helpers for the feeding feature.
 *
 * roundMl was previously duplicated identically across Feeding, HighCaloriePanel,
 * and IntakeVsNeed. Extracted here so display rounding lives in exactly one place.
 */

/** Round a ml value to the nearest integer for display. */
export function roundMl(value: number): number {
  return Math.round(value)
}
