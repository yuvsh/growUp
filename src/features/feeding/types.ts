/**
 * Feeding feature — stable result and shared types.
 *
 * These are the public contracts consumed by Wave-1 feeding logic and UI agents.
 * Keep them minimal and change only through an agreed interface update.
 */

/**
 * The unit in which a formula's calorie density is expressed by the user.
 * 'kcal/ml' is the SI clinical unit; 'kcal/oz' is the common US label on formula cans.
 */
export type KcalUnit = 'kcal/ml' | 'kcal/oz'

/** A min–max daily volume in millilitres. */
export interface VolumeRange {
  minMl: number
  maxMl: number
}

/** A min–max per-feed volume in millilitres (daily range ÷ feedsPerDay). */
export interface PerFeedRange {
  minMl: number
  maxMl: number
}

/**
 * The result of a standard (non-high-calorie) feeding calculation.
 * Based on the 120–200 ml/kg/day clinical rule of thumb.
 */
export interface StandardFeedingResult {
  /** Baby's weight used as the basis for the calculation, in kg. */
  weightKg: number
  /** Recommended daily fluid intake range. */
  daily: VolumeRange
  /** Suggested volume per individual feed. */
  perFeed: PerFeedRange
  /** Number of feeds per day used to derive perFeed. */
  feedsPerDay: number
}

/**
 * The result of a calorie-adjusted (high-calorie formula) feeding calculation.
 *
 * A more concentrated formula delivers more kcal/ml, so the same calorie target
 * is met with a proportionally lower volume — hence adjustedDaily.minMl < standard minMl.
 */
export interface HighCalorieFeedingResult {
  /** The formula's calorie density in kcal/ml (already converted from kcal/oz if needed). */
  kcalPerMl: number
  /** The calorie target derived from the standard volume range and standard density. */
  calorieTarget: {
    minKcal: number
    maxKcal: number
  }
  /** Volume range adjusted so the baby receives the same calories as the standard range. */
  adjustedDaily: VolumeRange
  /** Per-feed volume based on the adjusted daily range. */
  adjustedPerFeed: PerFeedRange
}
