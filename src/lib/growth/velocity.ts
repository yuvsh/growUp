/**
 * Weight velocity — least-squares linear regression of weight over time.
 *
 * Uses only the last up to 4 entries (by date) to keep the estimate responsive
 * to recent trends rather than being dragged by older measurements.
 */

import type { WeightEntry } from '../../types';

/** Minimum number of entries required to compute a velocity. */
const MIN_ENTRIES_FOR_VELOCITY = 2;

/** Maximum number of recent entries used for the regression window. */
const REGRESSION_WINDOW_SIZE = 4;

/**
 * Compute weight velocity in grams per day using least-squares linear
 * regression of weightGrams vs day-offset from the earliest entry in the window.
 *
 * @param entries - All weight entries for the child (any order; function sorts internally).
 * @returns Velocity in g/day, or null if fewer than 2 entries are provided.
 */
export function weightVelocity(entries: WeightEntry[]): number | null {
  if (entries.length < MIN_ENTRIES_FOR_VELOCITY) {
    return null;
  }

  // Sort ascending by date and take the last REGRESSION_WINDOW_SIZE entries.
  const sorted = [...entries].sort((a, b) =>
    a.dateMeasured.localeCompare(b.dateMeasured),
  );
  const window = sorted.slice(-REGRESSION_WINDOW_SIZE);

  // Convert ISO dates to epoch days for regression x-axis.
  const baseTime = Date.parse(window[0]!.dateMeasured);
  const MS_PER_DAY = 86_400_000;

  const points = window.map((entry) => ({
    x: (Date.parse(entry.dateMeasured) - baseTime) / MS_PER_DAY,
    y: entry.weightGrams,
  }));

  const n = points.length;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const { x, y } of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denominator = n * sumXX - sumX * sumX;

  // If all x values are the same (all entries on the same day), slope is undefined.
  if (denominator === 0) {
    return null;
  }

  // Least-squares slope: β₁ = (n·Σxy − Σx·Σy) / (n·Σx² − (Σx)²)
  const slope = (n * sumXY - sumX * sumY) / denominator;

  return slope;
}
