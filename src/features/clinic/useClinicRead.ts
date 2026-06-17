// Clinic Mode — in-memory state + derivation hook.
//
// THE EPHEMERAL CONTRACT (docs/HLD-clinic-mode.md §2/§3): this hook holds the
// entire Clinic Mode state in React state ONLY. It must NEVER import or call the
// repository, localStorage, AuthContext, or any network. Closing/refreshing the
// route clears everything because it only ever lived here.
//
// No medical math is re-implemented: an ephemeral WeightEntry[] is assembled
// (birth point at day 0 + the current readings) and fed to the SAME pure domain
// functions the parent app uses — weightToZResult, weightVelocity, projectGrowth.

import { useCallback, useMemo, useState } from 'react';
import type { WeightEntry } from '../../types';
import type {
  ClinicInput,
  ClinicRead,
  ClinicWeightEntry,
  TrendDirection,
} from './types';
import { weightToZResult } from '../../lib/who';
import { projectGrowth } from '../../lib/growth/projection';
import { ageFromDob } from '../../lib/growth/age';

/** Age in days at birth — birth weight anchors the read at day 0 by definition. */
const BIRTH_AGE_DAYS = 0;

/** Days per week — named constant to avoid a magic number in weekly conversion. */
const DAYS_PER_WEEK = 7;

/**
 * Placeholder identity for the synthetic, never-persisted weight entries. The
 * pure domain functions only read `dateMeasured` and `weightGrams`, but the
 * `WeightEntry` shape requires these fields, so we supply harmless constants.
 */
const EPHEMERAL_PLACEHOLDER_ID = 'clinic-ephemeral';

export interface UseClinicRead {
  /** Current raw input, or null before the form is submitted. */
  input: ClinicInput | null;
  /** Derived read for the result screen, or null when input is absent/invalid. */
  read: ClinicRead | null;
  /** Set the input and derive the read (called by ClinicForm on submit). */
  submit: (input: ClinicInput) => void;
  /** Reset everything back to blank (the "New read" action). */
  reset: () => void;
}

/** Build one synthetic, never-persisted WeightEntry from a date + grams. */
function makeEphemeralEntry(
  dateMeasured: string,
  weightGrams: number,
  nowIso: string,
): WeightEntry {
  return {
    id: crypto.randomUUID(),
    childId: EPHEMERAL_PLACEHOLDER_ID,
    ownerId: EPHEMERAL_PLACEHOLDER_ID,
    dateMeasured,
    weightGrams,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

/** Pick the latest current weight by `measuredOn` (stable for same-date pairs). */
function latestCurrentWeight(input: ClinicInput): ClinicWeightEntry {
  const [first, second] = input.currentWeights;
  if (second && second.measuredOn.localeCompare(first.measuredOn) >= 0) {
    return second;
  }
  return first;
}

/** Map a g/day signal to a discrete direction. Exactly flat → 'flat'. */
function trendDirection(gramsPerDay: number): TrendDirection {
  if (gramsPerDay > 0) {
    return 'gain';
  }
  if (gramsPerDay < 0) {
    return 'loss';
  }
  return 'flat';
}

/** Pure derivation: ClinicInput → ClinicRead, using only shared domain fns. */
function deriveRead(input: ClinicInput): ClinicRead {
  const nowIso = new Date().toISOString();

  // Assemble the ephemeral history: birth (day 0) + each current reading.
  // These entries are synthetic and are NEVER persisted anywhere.
  const birthEntry = makeEphemeralEntry(
    input.dateOfBirth,
    input.birthWeightGrams,
    nowIso,
  );
  const currentEntries = input.currentWeights.map((entry) =>
    makeEphemeralEntry(entry.measuredOn, entry.weightGrams, nowIso),
  );
  const entries: WeightEntry[] = [birthEntry, ...currentEntries];

  const latest = latestCurrentWeight(input);
  const ageDaysAtLatest = ageFromDob(input.dateOfBirth, latest.measuredOn).days;

  const zResult = weightToZResult(latest.weightGrams, input.sex, ageDaysAtLatest);
  const birthZResult = weightToZResult(
    input.birthWeightGrams,
    input.sex,
    BIRTH_AGE_DAYS,
  );

  // Trend: birth → latest. g/day = (latestGrams - birthGrams) / daysBetween.
  // ageDaysAtLatest is days since birth, so it is exactly the days between the
  // birth point and the latest reading. Guard the day-0 edge (same-day reading).
  const gramsGained = latest.weightGrams - input.birthWeightGrams;
  const trendGramsPerDay =
    ageDaysAtLatest > 0 ? gramsGained / ageDaysAtLatest : 0;

  // Catch-up vs maintenance: reuse projectGrowth EXACTLY as ProjectionCard does.
  // ProjectionCard treats a strictly-positive gain-needed figure as "below the
  // 3rd line" (show the catch-up target); a non-positive figure means the baby
  // is on/above the 3rd line (maintenance). We mirror that branch verbatim.
  const projection = projectGrowth(entries, input.sex, input.dateOfBirth);
  const isCatchUp =
    projection.dailyGainToReach3rdGrams > 0 &&
    projection.weeklyGainToReach3rdGrams > 0;

  const catchUp = isCatchUp
    ? {
        mode: 'catch-up' as const,
        gramsPerDay: projection.dailyGainToReach3rdGrams,
        gramsPerWeek: projection.weeklyGainToReach3rdGrams,
      }
    : {
        // Maintenance: the baby is on/above the 3rd line, so the meaningful
        // target is sustaining the current regression velocity, not a gap-to-3rd
        // figure (which is ≤ 0 here and must never be shown).
        mode: 'maintenance' as const,
        gramsPerDay: projection.velocityGramsPerDay,
        gramsPerWeek: projection.velocityGramsPerDay * DAYS_PER_WEEK,
      };

  return {
    ageDaysAtLatest,
    zResult,
    birthZResult,
    trend: {
      direction: trendDirection(trendGramsPerDay),
      gramsPerDay: trendGramsPerDay,
    },
    catchUp,
  };
}

export function useClinicRead(): UseClinicRead {
  const [input, setInput] = useState<ClinicInput | null>(null);

  // Derive with useMemo (NOT useEffect): keeps the read a pure function of the
  // input (perf rule `rerender-derived-state-no-effect`) and preserves the
  // ephemeral guarantee — nothing is written out, ever.
  const read = useMemo<ClinicRead | null>(
    () => (input === null ? null : deriveRead(input)),
    [input],
  );

  const submit = useCallback((next: ClinicInput): void => {
    setInput(next);
  }, []);

  const reset = useCallback((): void => {
    setInput(null);
  }, []);

  return { input, read, submit, reset };
}
