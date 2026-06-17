// Clinic Mode — Input form (DOB + sex + birth weight + one current weight).
// Blueprint: docs/ui-blueprints.md → "Clinic Form"
// Design: design-system/MASTER.md + design-system/pages/clinic.md
// Uses from components/ui: Input, Button, Card. Reuse SexSelector + WeightForm row pattern.
// Validation: internal RHF schema with a custom resolver that rebuilds the schema
//   with the live DOB on every validation pass, so cross-field date checks are
//   always evaluated against the current value.
// Philosophy: Google accent — efficient entry, fastest path to a result.
// States: inline per-field errors; soft warn on implausible weight (CLM-4). No async.
//
// A second current weight is NOT entered here — it is added from the result
// screen via "Add another weight". This keeps the initial read to a single
// current weight; birth weight still anchors the trend at day 0.
//
// EPHEMERAL CONTRACT: no import from data/**, auth/**, or lib/supabase/**. All
// derived state lives in-memory via useClinicReadContext().

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useForm,
  Controller,
  type Resolver,
  type ResolverResult,
  type FieldValues,
} from 'react-hook-form';
import { z } from 'zod';

import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { SexSelector } from '../profile/SexSelector';
import { useClinicReadContext } from './ClinicReadContext';
import { t } from '../../i18n/t';
import type { ClinicInput } from './types';
import type { Sex } from '../../types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MAX_AGE_DAYS = 730; // WHO 0–24 month window

// Soft-warn implausible weight thresholds (CLM-4)
const IMPLAUSIBLE_MIN_GRAMS = 100;
const IMPLAUSIBLE_MAX_GRAMS = 20_000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayIso(): string {
  return new Date().toISOString().split('T')[0] as string;
}

/** Positive finite number from a kg string, or NaN if invalid. */
function parseKg(v: string): number {
  const n = parseFloat(v);
  return isFinite(n) && n > 0 ? n : NaN;
}

/** kg string → integer grams. Returns NaN for invalid input. */
function kgToGrams(kgStr: string): number {
  const kg = parseKg(kgStr);
  return isNaN(kg) ? NaN : Math.round(kg * 1000);
}

/** Returns a soft-warn string if grams are outside the plausible infant range. */
function implausibleWeightWarn(kgStr: string): string | null {
  const grams = kgToGrams(kgStr);
  if (isNaN(grams)) return null;
  if (grams < IMPLAUSIBLE_MIN_GRAMS || grams > IMPLAUSIBLE_MAX_GRAMS) {
    return t('clinic.form.validation.implausibleWeight');
  }
  return null;
}

// ---------------------------------------------------------------------------
// Internal form schema
//
// The form uses kg strings + ISO date strings. A custom resolver wraps the
// Zod schema and rebuilds it on every validation call so the live DOB value
// is available for cross-field date comparisons.
// ---------------------------------------------------------------------------

const isoDateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, t('clinic.form.validation.dobRequired'))
  .refine((v) => !isNaN(Date.parse(v)), {
    message: t('clinic.form.validation.dobRequired'),
  });

/**
 * Build the form validation schema with the current DOB value as a closure
 * variable, so that the measurement-date cross-field rules always use the live
 * DOB instead of the stale value captured at `useForm` init time.
 */
function buildFormSchema(dobValue: string) {
  const dobParsed = dobValue !== '' ? Date.parse(dobValue) : NaN;

  function isOnOrAfterDob(dateStr: string): boolean {
    if (isNaN(dobParsed)) return true; // DOB not yet filled — skip this check
    return Date.parse(dateStr) >= dobParsed;
  }

  function isWithinWhoRange(dateStr: string): boolean {
    if (isNaN(dobParsed)) return true;
    const days = Math.floor((Date.parse(dateStr) - dobParsed) / 86_400_000);
    return days <= MAX_AGE_DAYS;
  }

  const measurementDateField = isoDateField
    .refine(isOnOrAfterDob, { message: t('clinic.form.validation.dateBeforeBirth') })
    .refine(isWithinWhoRange, { message: t('clinic.form.validation.ageOutOfRange') });

  return z.object({
    dateOfBirth: isoDateField.refine((v) => v <= todayIso(), {
      message: t('clinic.form.validation.dobFuture'),
    }),
    sex: z.enum(['male', 'female'], {
      errorMap: () => ({ message: t('clinic.form.validation.sexRequired') }),
    }),
    birthWeightKg: z
      .string()
      .trim()
      .min(1, t('clinic.form.validation.birthWeightRequired'))
      .refine((v) => !isNaN(parseKg(v)), {
        message: t('clinic.form.validation.birthWeightPositive'),
      }),
    currentWeightKg: z
      .string()
      .trim()
      .min(1, t('clinic.form.validation.currentWeightRequired'))
      .refine((v) => !isNaN(parseKg(v)), {
        message: t('clinic.form.validation.currentWeightPositive'),
      }),
    currentWeightDate: measurementDateField,
  });
}

// ---------------------------------------------------------------------------
// Form types
// ---------------------------------------------------------------------------

/**
 * The react-hook-form values type.
 * Sex is nullable until the user selects an option — same pattern as ChildForm.
 */
interface ClinicFormValues {
  dateOfBirth: string;
  sex: Sex | null;
  birthWeightKg: string;
  currentWeightKg: string;
  currentWeightDate: string;
}

type FormSchema = ReturnType<typeof buildFormSchema>;
type FormSchemaOutput = z.infer<FormSchema>;

// ---------------------------------------------------------------------------
// Custom resolver
//
// Rebuilds the schema on every validation pass with the live DOB so that
// cross-field date checks use the current value. This is the standard pattern
// for context-dependent Zod schemas in RHF.
// ---------------------------------------------------------------------------

function makeClinicResolver(): Resolver<ClinicFormValues> {
  return async (
    values: FieldValues,
  ): Promise<ResolverResult<ClinicFormValues>> => {
    const schema = buildFormSchema(
      typeof values['dateOfBirth'] === 'string' ? (values['dateOfBirth'] as string) : '',
    );
    const result = schema.safeParse(values);

    if (result.success) {
      return {
        values: result.data as unknown as ClinicFormValues,
        errors: {},
      };
    }

    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      if (!(path in errors)) {
        errors[path] = { type: 'custom', message: issue.message };
      }
    }

    return { values: {}, errors } as ResolverResult<ClinicFormValues>;
  };
}

// Module-level resolver instance — stable across renders, no component state
// dependency. Created once so RHF's resolver reference is never stale.
const CLINIC_RESOLVER: Resolver<ClinicFormValues> = makeClinicResolver();

// ---------------------------------------------------------------------------
// Sub-component: WeightRow
// Extracted as a named component — no inline components (vercel-react-best-practices).
// ---------------------------------------------------------------------------

interface WeightRowProps {
  weightId: string;
  dateId: string;
  weightLabel: string;
  dateLabel: string;
  weightError: string | undefined;
  dateError: string | undefined;
  softWarn: string | null;
  weightRegisterProps: React.InputHTMLAttributes<HTMLInputElement> & {
    ref: React.Ref<HTMLInputElement>;
    name: string;
  };
  dateRegisterProps: React.InputHTMLAttributes<HTMLInputElement> & {
    ref: React.Ref<HTMLInputElement>;
    name: string;
  };
}

function WeightRow({
  weightId,
  dateId,
  weightLabel,
  dateLabel,
  weightError,
  dateError,
  softWarn,
  weightRegisterProps,
  dateRegisterProps,
}: WeightRowProps): React.JSX.Element {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
    >
      <div
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}
      >
        <Input
          id={weightId}
          label={weightLabel}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          error={weightError}
          {...weightRegisterProps}
        />
        {softWarn !== null && weightError === undefined && (
          <p
            role="status"
            style={{
              fontSize: 'var(--text-caption)',
              color: 'var(--color-caution)',
              margin: 0,
            }}
          >
            {softWarn}
          </p>
        )}
      </div>
      <Input
        id={dateId}
        label={dateLabel}
        type="date"
        error={dateError}
        {...dateRegisterProps}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// ClinicForm
// ---------------------------------------------------------------------------

export function ClinicForm(): React.JSX.Element {
  const navigate = useNavigate();
  const { submit } = useClinicReadContext();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ClinicFormValues>({
    resolver: CLINIC_RESOLVER,
    defaultValues: {
      dateOfBirth: '',
      sex: null,
      birthWeightKg: '',
      currentWeightKg: '',
      currentWeightDate: todayIso(),
    },
    mode: 'onTouched',
  });

  // Watch all values for reactive soft-warn evaluation and submit-button gating.
  const watchedValues = watch();

  // "Get read" is disabled until the minimum required fields are non-empty.
  // The resolver handles the full Zod validation on submit.
  const canSubmit =
    watchedValues.dateOfBirth !== '' &&
    watchedValues.sex !== null &&
    watchedValues.birthWeightKg.trim() !== '' &&
    watchedValues.currentWeightKg.trim() !== '' &&
    watchedValues.currentWeightDate !== '';

  function handleClear(): void {
    reset({
      dateOfBirth: '',
      sex: null,
      birthWeightKg: '',
      currentWeightKg: '',
      currentWeightDate: todayIso(),
    });
  }

  function onSubmit(values: ClinicFormValues): void {
    // Values have been validated by the resolver. Build ClinicInput.
    const v = values as unknown as FormSchemaOutput;

    const clinicInput: ClinicInput = {
      dateOfBirth: v.dateOfBirth,
      sex: v.sex as Sex,
      birthWeightGrams: kgToGrams(v.birthWeightKg),
      currentWeights: [
        {
          weightGrams: kgToGrams(v.currentWeightKg),
          measuredOn: v.currentWeightDate,
        },
      ],
    };

    submit(clinicInput);
    navigate('/clinic/result');
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--color-background)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingBlock: 'var(--space-6)',
        paddingInline: 'var(--space-4)',
      }}
    >
      <Card
        className="w-full"
        style={{
          maxWidth: '520px',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-5)',
        }}
      >
        {/* Title */}
        <h1
          style={{
            fontSize: 'var(--text-h2)',
            fontFamily: 'var(--font-heading)',
            color: 'var(--color-foreground)',
            fontWeight: '700',
            margin: 0,
          }}
        >
          {t('clinic.form.title')}
        </h1>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
        >
          {/* ---- Date of birth ---- */}
          <Input
            id="clinic-dob"
            label={t('clinic.form.dobLabel')}
            type="date"
            error={errors.dateOfBirth?.message}
            {...register('dateOfBirth')}
          />

          {/* ---- Sex + why-we-ask helper ---- */}
          <Controller
            name="sex"
            control={control}
            render={({ field }): React.JSX.Element => (
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-2)',
                }}
              >
                <SexSelector
                  id="clinic-sex"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.sex?.message}
                />
                <p
                  style={{
                    fontSize: 'var(--text-caption)',
                    color: 'var(--color-text-muted)',
                    margin: 0,
                  }}
                >
                  {t('clinic.form.whyWeAsk')}
                </p>
              </div>
            )}
          />

          {/* ---- Birth weight ---- */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}
          >
            <Input
              id="clinic-birth-weight"
              label={t('clinic.form.birthWeightLabel')}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              error={errors.birthWeightKg?.message}
              {...register('birthWeightKg')}
            />
            {implausibleWeightWarn(watchedValues.birthWeightKg) !== null &&
              errors.birthWeightKg === undefined && (
                <p
                  role="status"
                  style={{
                    fontSize: 'var(--text-caption)',
                    color: 'var(--color-caution)',
                    margin: 0,
                  }}
                >
                  {implausibleWeightWarn(watchedValues.birthWeightKg)}
                </p>
              )}
          </div>

          {/* ---- Current weight ---- */}
          <WeightRow
            weightId="clinic-w1-weight"
            dateId="clinic-w1-date"
            weightLabel={t('clinic.form.currentWeightLabel')}
            dateLabel={t('clinic.form.currentWeightDateLabel')}
            weightError={errors.currentWeightKg?.message}
            dateError={errors.currentWeightDate?.message}
            softWarn={implausibleWeightWarn(watchedValues.currentWeightKg)}
            weightRegisterProps={register('currentWeightKg')}
            dateRegisterProps={register('currentWeightDate')}
          />

          {/* ---- Actions ---- */}
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}
          >
            <Button
              type="submit"
              variant="primary"
              fullWidthOnMobile
              disabled={!canSubmit}
              aria-disabled={!canSubmit}
            >
              {t('clinic.form.getRead')}
            </Button>
            <Button
              type="button"
              variant="secondary"
              fullWidthOnMobile
              onClick={handleClear}
            >
              {t('clinic.form.clear')}
            </Button>
          </div>
        </form>
      </Card>
    </main>
  );
}
