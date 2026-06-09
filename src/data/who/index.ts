/**
 * WHO weight-for-age LMS data — public accessor.
 *
 * Re-exports the embedded boys/girls tables (machine-copied from the official
 * WHO expanded z-score .xlsx files; see boys.ts / girls.ts headers) and exposes
 * a single pure accessor that returns the right table for a given sex.
 */

import type { Sex } from '../../types';
import type { WeightForAgeTable } from './types';
import { boysWeightForAge } from './boys';
import { girlsWeightForAge } from './girls';

export { boysWeightForAge } from './boys';
export { girlsWeightForAge } from './girls';
export type { WeightForAgeTable, LmsRow, Lms, LmsLookupResult } from './types';

/**
 * Return the WHO weight-for-age LMS table for the given sex.
 * Pure: returns a reference to the shared, immutable table.
 */
export function getWeightForAgeTable(sex: Sex): WeightForAgeTable {
  return sex === 'male' ? boysWeightForAge : girlsWeightForAge;
}
