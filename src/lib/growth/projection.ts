/**
 * 28-day weight projection and gap-to-3rd-percentile calculation.
 *
 * Projects the baby's weight forward by `horizonDays` using the regression
 * velocity, then computes how much daily/weekly gain is needed to reach the
 * WHO 3rd-percentile line at the projected age.
 *
 * NOTE: `dailyGainToReach3rdGrams` is exposed raw — it may be ≤ 0 when the
 * baby is already at or above the 3rd percentile. The UI is responsible for
 * clamping or hiding this value when it is non-positive.
 */

import type { WeightEntry } from '../../types';
import type { Sex } from '../../types';
import type { ProjectionResult } from '../../features/growth/types';
import { PERCENTILE_Z } from '../../features/growth/types';
import { weightToZResult, lmsForAge, percentileWeight } from '../who';
import { ageFromDob } from './age';
import { weightVelocity } from './velocity';

/** Default projection horizon in days. */
const DEFAULT_HORIZON_DAYS = 28;

/** Days per week — named constant to avoid magic numbers in weekly conversion. */
const DAYS_PER_WEEK = 7;

/** Zero-value result returned when there is not enough data. */
function emptyResult(): ProjectionResult {
  return {
    velocityGramsPerDay: 0,
    projectedWeightGrams: 0,
    projectedAgeDays: 0,
    projectedPercentile: 0,
    dailyGainToReach3rdGrams: 0,
    weeklyGainToReach3rdGrams: 0,
    hasEnoughData: false,
  };
}

/**
 * Project growth over the next `horizonDays` days from the most recent entry.
 *
 * @param entries       - All weight entries for the child.
 * @param sex           - 'male' | 'female'
 * @param dateOfBirth   - ISO YYYY-MM-DD
 * @param horizonDays   - How far ahead to project (default 28).
 * @returns `ProjectionResult` with projection values, or a zeroed result with
 *          `hasEnoughData = false` when fewer than 2 entries are available.
 */
export function projectGrowth(
  entries: WeightEntry[],
  sex: Sex,
  dateOfBirth: string,
  horizonDays: number = DEFAULT_HORIZON_DAYS,
): ProjectionResult {
  if (entries.length < 2) {
    return emptyResult();
  }

  const velocity = weightVelocity(entries);
  if (velocity === null) {
    return emptyResult();
  }

  // Most recent entry by date.
  const latest = [...entries].sort((a, b) =>
    b.dateMeasured.localeCompare(a.dateMeasured),
  )[0]!;

  const latestAgeDays = ageFromDob(dateOfBirth, latest.dateMeasured).days;
  const projectedAgeDays = latestAgeDays + horizonDays;
  const projectedWeightGrams = latest.weightGrams + velocity * horizonDays;

  const projectedPercentile = weightToZResult(
    projectedWeightGrams,
    sex,
    projectedAgeDays,
  ).percentile;

  // 3rd-percentile target weight at the projected age.
  const lmsAtProjectedAge = lmsForAge(sex, projectedAgeDays);
  const target3rdGrams = percentileWeight(PERCENTILE_Z.p3, lmsAtProjectedAge);

  const dailyGainToReach3rdGrams =
    (target3rdGrams - latest.weightGrams) / horizonDays;
  const weeklyGainToReach3rdGrams = dailyGainToReach3rdGrams * DAYS_PER_WEEK;

  return {
    velocityGramsPerDay: velocity,
    projectedWeightGrams,
    projectedAgeDays,
    projectedPercentile,
    dailyGainToReach3rdGrams,
    weeklyGainToReach3rdGrams,
    hasEnoughData: true,
  };
}
