/**
 * Feeding math module — pure functions, no side effects.
 *
 * All calculations keep full floating-point precision; rounding for display is
 * the responsibility of the UI layer.
 */

import {
  ML_PER_KG_MIN,
  ML_PER_KG_TARGET,
  ML_PER_KG_MAX,
  DEFAULT_FEEDS_PER_DAY,
  STANDARD_KCAL_PER_ML,
  ML_PER_OZ,
} from '../constants/feeding'
import type {
  VolumeRange,
  PerFeedRange,
  StandardFeedingResult,
  HighCalorieFeedingResult,
  KcalUnit,
} from '../../features/feeding/types'

/** Optional multiplier overrides for dailyVolumeRange (used in tests / custom regimens). */
export interface VolumeRangeMultipliers {
  minMlPerKg: number
  maxMlPerKg: number
}

const DEFAULT_MULTIPLIERS: VolumeRangeMultipliers = {
  minMlPerKg: ML_PER_KG_MIN,
  maxMlPerKg: ML_PER_KG_MAX,
}

/**
 * Compute the recommended daily fluid intake range for a given weight.
 *
 * @param weightKg - Baby's weight in kilograms (must be > 0).
 * @param multipliers - Optional overrides for the ml/kg/day multipliers.
 *                      Defaults to the clinical standard (120–200 ml/kg/day).
 * @returns VolumeRange with minMl and maxMl in millilitres per day.
 */
export function dailyVolumeRange(
  weightKg: number,
  multipliers: VolumeRangeMultipliers = DEFAULT_MULTIPLIERS,
): VolumeRange {
  return {
    minMl: weightKg * multipliers.minMlPerKg,
    maxMl: weightKg * multipliers.maxMlPerKg,
  }
}

/**
 * Divide a daily volume range by the number of feeds to get per-feed volumes.
 *
 * @param range - Daily volume range in ml.
 * @param feedsPerDay - Number of feeds per day.
 *   Must be >= 1. Values < 1 are clamped to 1 so the function never throws;
 *   callers relying on the exact value should validate before calling.
 * @returns PerFeedRange with minMl and maxMl per single feed.
 */
export function perFeed(range: VolumeRange, feedsPerDay: number): PerFeedRange {
  const safeFeedsPerDay = feedsPerDay < 1 ? 1 : feedsPerDay
  return {
    minMl: range.minMl / safeFeedsPerDay,
    maxMl: range.maxMl / safeFeedsPerDay,
  }
}

/**
 * Convert a calorie density value to kcal/ml.
 *
 * @param value - Numeric calorie density in the given unit.
 * @param unit  - 'kcal/ml' passes through unchanged; 'kcal/oz' divides by ML_PER_OZ.
 * @returns Calorie density in kcal/ml.
 */
export function toKcalPerMl(value: number, unit: KcalUnit): number {
  if (unit === 'kcal/oz') {
    return value / ML_PER_OZ
  }
  return value
}

/**
 * Compute calorie-adjusted volumes for a high-calorie formula.
 *
 * The calorie target is derived from the *standard* 120–200 ml/kg/day range at
 * the *standard* 0.67 kcal/ml density.  The adjusted volume is then calculated
 * to deliver those same calories at the provided `kcalPerMl`.
 *
 * A more concentrated formula (higher kcalPerMl) yields a proportionally LOWER
 * volume — this is the key invariant verified by the tests.
 *
 * @param weightKg    - Baby's weight in kilograms.
 * @param kcalPerMl   - Formula calorie density in kcal/ml (must be > 0).
 * @param feedsPerDay - Feeds per day used to split the daily range into per-feed volumes.
 *                      Defaults to DEFAULT_FEEDS_PER_DAY (8).
 * @throws Error when kcalPerMl <= 0.
 * @returns HighCalorieFeedingResult.
 */
export function calorieAdjustedRange(
  weightKg: number,
  kcalPerMl: number,
  feedsPerDay: number = DEFAULT_FEEDS_PER_DAY,
): HighCalorieFeedingResult {
  if (kcalPerMl <= 0) {
    throw new Error('kcalPerMl must be greater than 0')
  }

  // Standard daily volume range (always uses the clinical 120–200 ml/kg constants).
  const standardDaily = dailyVolumeRange(weightKg)

  // Calorie target derived from the standard volume and standard density.
  const calorieTarget = {
    minKcal: standardDaily.minMl * STANDARD_KCAL_PER_ML,
    maxKcal: standardDaily.maxMl * STANDARD_KCAL_PER_ML,
  }

  // Adjusted daily volume to deliver the same calorie target at the given density.
  const adjustedDaily: VolumeRange = {
    minMl: calorieTarget.minKcal / kcalPerMl,
    maxMl: calorieTarget.maxKcal / kcalPerMl,
  }

  const adjustedPerFeed = perFeed(adjustedDaily, feedsPerDay)

  return {
    kcalPerMl,
    calorieTarget,
    adjustedDaily,
    adjustedPerFeed,
  }
}

/**
 * Recommended daily intake need, with a min (120 ml/kg), target (150 ml/kg),
 * and max (200 ml/kg).  When a high-calorie formula density is provided the
 * volumes are scaled down proportionally so that the same calorie target is met
 * with a smaller volume.
 */
export interface IntakeNeed {
  minMl: number
  targetMl: number
  maxMl: number
}

/**
 * Compute the calorie-matched recommended intake need for a given weight.
 *
 * @param weightKg  - Baby's weight in kilograms (must be > 0).
 * @param kcalPerMl - Formula calorie density in kcal/ml.  Pass the special-
 *                    formula density when high-calorie mode is ON; omit or
 *                    pass undefined for standard formula (factor = 1).
 * @returns IntakeNeed with minMl (120 ml/kg), targetMl (150 ml/kg), and
 *          maxMl (200 ml/kg) — each scaled by STANDARD_KCAL_PER_ML / kcalPerMl
 *          when a concentrated formula is in use.
 */
export function intakeNeed(weightKg: number, kcalPerMl?: number): IntakeNeed {
  const factor = kcalPerMl !== undefined && kcalPerMl > 0
    ? STANDARD_KCAL_PER_ML / kcalPerMl
    : 1
  return {
    minMl: weightKg * ML_PER_KG_MIN * factor,
    targetMl: weightKg * ML_PER_KG_TARGET * factor,
    maxMl: weightKg * ML_PER_KG_MAX * factor,
  }
}

/**
 * Classify an observed daily intake against the recommended need band.
 *
 * @param intakeMlPerDay - Observed average daily intake in ml/day.
 * @param need           - The recommended daily volume range { minMl, maxMl }.
 * @returns 'below' when intake < need.minMl, 'above' when intake > need.maxMl,
 *          'within' when intake is within the band (inclusive of bounds).
 */
export function classifyIntake(
  intakeMlPerDay: number,
  need: { minMl: number; maxMl: number },
): 'below' | 'within' | 'above' {
  if (intakeMlPerDay < need.minMl) return 'below'
  if (intakeMlPerDay > need.maxMl) return 'above'
  return 'within'
}

/**
 * Convenience wrapper that returns a complete standard feeding calculation.
 *
 * @param weightKg    - Baby's weight in kilograms.
 * @param feedsPerDay - Feeds per day (defaults to DEFAULT_FEEDS_PER_DAY).
 * @returns StandardFeedingResult.
 */
export function standardFeeding(
  weightKg: number,
  feedsPerDay: number = DEFAULT_FEEDS_PER_DAY,
): StandardFeedingResult {
  const daily = dailyVolumeRange(weightKg)
  return {
    weightKg,
    daily,
    perFeed: perFeed(daily, feedsPerDay),
    feedsPerDay,
  }
}
