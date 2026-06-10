/**
 * Growth insight rules — computes a list of actionable Insight cards from
 * weight entry history.
 *
 * Each rule has a stable `id` so the UI can use it as a React key. Rules are
 * pure functions of the input: no I/O, no side effects.
 *
 * EXTENSION POINT: add new insight rules here.
 */

import type { WeightEntry } from '../../types';
import type { Sex } from '../../types';
import type { Insight } from '../../features/growth/types';
import { weightToZResult } from '../who';
import { ageFromDob } from './age';
import { weightVelocity } from './velocity';

/**
 * Velocity threshold below which growth is considered slow.
 * This is a simple starter heuristic — clinicians use age- and sex-specific
 * norms; a more accurate rule would replace this constant with a lookup table.
 */
export const SLOW_VELOCITY_THRESHOLD_G_PER_DAY = 10;

/** Minimum entries required before velocity-based rules are evaluated. */
const MIN_ENTRIES_FOR_VELOCITY_RULES = 2;

/**
 * Compute growth insights from the full weight history.
 *
 * @param entries      - All weight entries for the child (any order).
 * @param sex          - 'male' | 'female'
 * @param dateOfBirth  - ISO YYYY-MM-DD
 * @returns Array of `Insight` objects; empty when no issues are detected.
 */
export function computeInsights(
  entries: WeightEntry[],
  sex: Sex,
  dateOfBirth: string,
): Insight[] {
  const insights: Insight[] = [];

  if (entries.length === 0) {
    return insights;
  }

  // Sort ascending by date for sequential pair analysis.
  const sorted = [...entries].sort((a, b) =>
    a.dateMeasured.localeCompare(b.dateMeasured),
  );

  // --- Rule: weight-loss ---
  // Fires when any consecutive pair shows a weight decrease.
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1]!;
    const curr = sorted[i]!;
    if (curr.weightGrams < prev.weightGrams) {
      insights.push({
        id: 'weight-loss',
        kind: 'weight-loss',
        severity: 'caution',
        title: 'Weight loss detected',
        body: 'Your baby lost weight between two consecutive measurements. This can be normal shortly after birth but warrants attention if it continues.',
      });
      break; // one card per kind is enough
    }
  }

  // --- Rule: slow-velocity ---
  // Fires when the regression velocity falls below the starter threshold.
  if (sorted.length >= MIN_ENTRIES_FOR_VELOCITY_RULES) {
    const velocity = weightVelocity(sorted);
    if (velocity !== null && velocity < SLOW_VELOCITY_THRESHOLD_G_PER_DAY) {
      insights.push({
        id: 'slow-velocity',
        kind: 'slow-velocity',
        severity: 'caution',
        title: 'Slow weight gain',
        body: `Weight gain is below ${SLOW_VELOCITY_THRESHOLD_G_PER_DAY} g/day. Speak with your healthcare provider if this continues.`,
      });
    }
  }

  // --- Rule: percentile-drop ---
  // Fires when the WHO percentile falls across two or more consecutive entries.
  const percentiles = sorted.map((entry) => {
    const ageDays = ageFromDob(dateOfBirth, entry.dateMeasured).days;
    return weightToZResult(entry.weightGrams, sex, ageDays).percentile;
  });

  for (let i = 1; i < percentiles.length; i++) {
    const prevPct = percentiles[i - 1]!;
    const currPct = percentiles[i]!;
    if (currPct < prevPct) {
      insights.push({
        id: 'percentile-drop',
        kind: 'percentile-drop',
        severity: 'caution',
        title: 'Percentile dropping',
        body: 'Your baby\'s weight percentile has fallen between measurements. A single drop may be normal, but a sustained trend is worth discussing with your doctor.',
      });
      break; // one card per kind is enough
    }
  }

  // EXTENSION POINT: add new insight rules here.

  return insights;
}
