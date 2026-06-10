import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** Matches ISO YYYY-MM-DD dates. */
const isoDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format')
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'Must be a valid calendar date',
  });

/** UUID-shaped string (non-empty; we don't enforce the full UUID format so
 *  tests and stubs can use short ids without pain). */
const idString = z.string().min(1, 'ID must not be empty');

/** UTC ISO timestamp string (non-empty). */
const isoTimestamp = z.string().min(1, 'Timestamp must not be empty');

// ---------------------------------------------------------------------------
// Child schema
// ---------------------------------------------------------------------------

/**
 * Form-facing schema: includes the "not in the future" rule on dateOfBirth.
 * Re-exported so the Profile form can import and register it directly.
 */
export const childSchema = z.object({
  id: idString,
  ownerId: idString,
  name: z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, "Child's name must not be empty")),
  sex: z.enum(['male', 'female']),
  dateOfBirth: isoDateString.refine(
    (value) => new Date(value) <= new Date(),
    { message: 'Date of birth cannot be in the future' },
  ),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export type ChildSchema = z.infer<typeof childSchema>;

// ---------------------------------------------------------------------------
// WeightEntry schema
// ---------------------------------------------------------------------------

export const weightEntrySchema = z.object({
  id: idString,
  childId: idString,
  ownerId: idString,
  dateMeasured: isoDateString,
  weightGrams: z
    .number()
    .int('Weight must be a whole number in grams')
    .positive('Weight must be greater than zero'),
  createdAt: isoTimestamp,
  updatedAt: isoTimestamp,
});

export type WeightEntrySchema = z.infer<typeof weightEntrySchema>;

// ---------------------------------------------------------------------------
// FeedingConfig schema
// ---------------------------------------------------------------------------

export const feedingConfigSchema = z
  .object({
    id: idString,
    childId: idString,
    ownerId: idString,
    feedsPerDay: z
      .number()
      .int('Feeds per day must be a whole number')
      .min(1, 'Feeds per day must be at least 1'),
    useHighCalorie: z.boolean(),
    kcalPerMl: z.number().positive('kcal per ml must be greater than zero'),
    mlPerKgMin: z.number().positive('ml/kg min must be greater than zero'),
    mlPerKgMax: z.number().positive('ml/kg max must be greater than zero'),
    avgIntakeMlPerDay: z
      .number()
      .positive('Average intake must be greater than zero')
      .optional(),
    createdAt: isoTimestamp,
    updatedAt: isoTimestamp,
  })
  .refine((config) => config.mlPerKgMax >= config.mlPerKgMin, {
    message: 'mlPerKgMax must be greater than or equal to mlPerKgMin',
    path: ['mlPerKgMax'],
  });

export type FeedingConfigSchema = z.infer<typeof feedingConfigSchema>;
