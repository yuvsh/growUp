import { z } from 'zod';
import { childSchema } from '../../types/schemas';

// ---------------------------------------------------------------------------
// Form value shape
// ---------------------------------------------------------------------------

/**
 * The raw values the Add/Edit Child form collects.
 *
 * `sex` is nullable so the form can represent "not yet selected"; the schema
 * below rejects null on submission.
 *
 * `dateOfBirth` uses an empty string when the field has not been filled — the
 * schema rejects empty strings so the save button stays blocked.
 */
export interface ChildFormValues {
  name: string;
  sex: 'male' | 'female' | null;
  /** ISO YYYY-MM-DD, or '' when not yet entered */
  dateOfBirth: string;
}

// ---------------------------------------------------------------------------
// Form-specific Zod schema
// ---------------------------------------------------------------------------

/**
 * Validates user input captured by the Add/Edit Child form before any ids or
 * timestamps have been attached.  Reuses the `name` and `dateOfBirth` rules
 * from `childSchema` (trim + non-empty; valid ISO date + not in the future)
 * and tightens `sex` to reject null.
 */
export const childFormSchema = z.object({
  name: childSchema.shape.name,
  sex: z.enum(['male', 'female'], {
    // Surfaces a meaningful message when the value is null or undefined
    required_error: "Please select your baby's sex",
    invalid_type_error: "Please select your baby's sex",
  }),
  dateOfBirth: childSchema.shape.dateOfBirth,
});

/** The validated (parsed) output of `childFormSchema`. */
export type ChildFormOutput = z.output<typeof childFormSchema>;
