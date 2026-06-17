// Clinic Mode — Zod validation schema for the input form.
//
// Mirrors the parent app's validation patterns (see src/types/schemas.ts and
// features/growth/WeightForm). Enforces the business rules from
// docs/HLD-clinic-mode.md §3 at parse time, so the result screen can trust its
// input. Soft warnings (implausible weight) are handled in the form UI, not
// here — they are not a hard block.

import { z } from 'zod';
import { ageFromDob } from '../../lib/growth/age';

/**
 * WHO weight-for-age standard covers 0–730 days (0–24 months). Age at every
 * current measurement must fall within this window.
 */
export const WHO_MAX_AGE_DAYS = 730;

// ---------------------------------------------------------------------------
// Shared primitives (mirrors src/types/schemas.ts)
// ---------------------------------------------------------------------------

/** Matches ISO YYYY-MM-DD dates. */
const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Please enter a valid date')
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Please enter a valid date',
  });

/** Integer grams, greater than zero. */
const weightGramsField = z
  .number()
  .int('Weight must be a whole number in grams')
  .positive('Weight must be greater than zero');

// ---------------------------------------------------------------------------
// Current weight entry
// ---------------------------------------------------------------------------

const clinicWeightEntrySchema = z.object({
  weightGrams: weightGramsField,
  measuredOn: isoDateString,
});

// ---------------------------------------------------------------------------
// Clinic input schema
// ---------------------------------------------------------------------------

/** Today's local date as YYYY-MM-DD, for the not-in-the-future check. */
function todayIso(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const clinicInputSchema = z
  .object({
    dateOfBirth: isoDateString,
    sex: z.enum(['male', 'female']),
    birthWeightGrams: weightGramsField,
    currentWeights: z
      .array(clinicWeightEntrySchema)
      .min(1, 'Please enter at least one current weight')
      .max(2, 'You can enter at most two current weights'),
  })
  .superRefine((input, ctx) => {
    const { dateOfBirth, currentWeights } = input;

    // DOB must not be in the future.
    if (dateOfBirth > todayIso()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Date of birth cannot be in the future',
        path: ['dateOfBirth'],
      });
    }

    // Per-entry date rules: on/after DOB and within the WHO age window.
    currentWeights.forEach((entry, index) => {
      if (entry.measuredOn < dateOfBirth) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Measurement date cannot be before the date of birth',
          path: ['currentWeights', index, 'measuredOn'],
        });
        return;
      }

      const ageDays = ageFromDob(dateOfBirth, entry.measuredOn).days;
      if (ageDays > WHO_MAX_AGE_DAYS) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'This age is outside the WHO 0–24 month standard',
          path: ['currentWeights', index, 'measuredOn'],
        });
      }
    });

    // Two-weight ordering: second must be on/after the first, and not the same day.
    if (currentWeights.length === 2) {
      const [first, second] = currentWeights;
      if (first !== undefined && second !== undefined) {
        if (second.measuredOn < first.measuredOn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'The second weight must be on or after the first',
            path: ['currentWeights', 1, 'measuredOn'],
          });
        } else if (second.measuredOn === first.measuredOn) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'The two weights must be on different dates',
            path: ['currentWeights', 1, 'measuredOn'],
          });
        }
      }
    }
  });

export type ClinicInputSchema = z.infer<typeof clinicInputSchema>;
