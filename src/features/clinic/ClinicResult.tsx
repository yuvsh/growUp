// Clinic Mode — Result screen.
// Blueprint: docs/ui-blueprints.md → "Clinic Result"
// Design: design-system/MASTER.md + design-system/pages/clinic.md
// Uses from components/ui: Input, Button, Card, MedicalDisclaimer.
// Reuses features/growth: WeightChart, ProjectionCard (fed an ephemeral WeightEntry[]).
// Reuses features/clinic: PercentileZScoreCallout, TrendCard.
// Philosophy: Google accent — the number and the chart are the product.
//
// Birth-weight model: birth weight anchors the read at day 0, so there are
// ALWAYS ≥2 dated points. `trend` and `catchUp` are ALWAYS present.
//
// A second current weight is added HERE, not on the read form: "Add another
// weight" reveals a small inline form; on confirm we submit the updated input
// so the chart/trend/projection re-derive in place. Capped at two current
// weights (model limit) — the button hides once a second is present.
//
// EPHEMERAL CONTRACT: the WeightEntry[] assembled here is synthetic and is NEVER
// persisted. It exists only to feed the reused chart/projection components. This
// file imports nothing from data/, auth/, or lib/supabase/.

import React, { useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import type { WeightEntry } from '../../types';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { MedicalDisclaimer } from '../../components/ui/medical-disclaimer';
import { t } from '../../i18n/t';
import type { ChartRange } from '../../lib/growth/chartWindow';
import { WeightChart } from '../growth/WeightChart';
import { ProjectionCard } from '../growth/ProjectionCard';
import { PercentileZScoreCallout } from './PercentileZScoreCallout';
import { TrendCard } from './TrendCard';
import { useClinicReadContext } from './ClinicReadContext';
import type { ClinicInput, ClinicWeightEntry } from './types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Placeholder identity for the synthetic, never-persisted weight entries. */
const EPHEMERAL_PLACEHOLDER_ID = 'clinic-ephemeral';

/**
 * Default chart window. "all" frames the baby's own data (birth → latest)
 * rather than the full 0–24mo axis, keeping the short clinic history legible.
 */
const DEFAULT_CHART_RANGE: ChartRange = 'all';

/** Route the screen redirects to / returns to when there is no read. */
const READ_ROUTE = '/clinic/read';

/** WHO weight-for-age window (0–24 months). */
const MAX_AGE_DAYS = 730;

/** The model caps current weights at two (birth + up to two current). */
const MAX_CURRENT_WEIGHTS = 2;

const MS_PER_DAY = 86_400_000;

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

/**
 * Validate a candidate second current weight against the existing read.
 * Returns a plain-language error string, or null when the entry is valid.
 * Mirrors the read-form rules so the two paths stay consistent.
 */
function validateNewWeight(
  input: ClinicInput,
  weightKg: string,
  date: string,
): string | null {
  if (weightKg.trim() === '') {
    return t('clinic.form.validation.currentWeightRequired');
  }
  if (isNaN(parseKg(weightKg))) {
    return t('clinic.form.validation.currentWeightPositive');
  }
  if (date === '') {
    return t('clinic.form.validation.dobRequired');
  }
  if (date < input.dateOfBirth) {
    return t('clinic.form.validation.dateBeforeBirth');
  }
  const ageDays = Math.floor(
    (Date.parse(date) - Date.parse(input.dateOfBirth)) / MS_PER_DAY,
  );
  if (ageDays > MAX_AGE_DAYS) {
    return t('clinic.form.validation.ageOutOfRange');
  }
  // The new reading may fall anywhere on/after birth — including between birth
  // and the existing current weight. It only must not share a date with an
  // existing current weight (a same-day pair has no defined velocity).
  const existingDates = input.currentWeights.map((entry) => entry.measuredOn);
  if (existingDates.includes(date)) {
    return t('clinic.form.validation.sameDatePair');
  }
  return null;
}

/**
 * Assemble the ephemeral history that feeds the reused chart/projection:
 * birth point (day 0) + each current reading. Mirrors how `useClinicRead`
 * builds entries for the domain math. These are NEVER persisted.
 */
function buildEphemeralEntries(input: ClinicInput): WeightEntry[] {
  const nowIso = new Date().toISOString();

  const makeEntry = (dateMeasured: string, weightGrams: number): WeightEntry => ({
    id: crypto.randomUUID(),
    childId: EPHEMERAL_PLACEHOLDER_ID,
    ownerId: EPHEMERAL_PLACEHOLDER_ID,
    dateMeasured,
    weightGrams,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  return [
    makeEntry(input.dateOfBirth, input.birthWeightGrams),
    ...input.currentWeights.map((entry) =>
      makeEntry(entry.measuredOn, entry.weightGrams),
    ),
  ];
}

// ---------------------------------------------------------------------------
// Sub-component: AddWeightPanel
// Named component (no inline components — vercel-react-best-practices).
// ---------------------------------------------------------------------------

interface AddWeightPanelProps {
  input: ClinicInput;
  onAdd: (entry: ClinicWeightEntry) => void;
  onCancel: () => void;
}

function AddWeightPanel({
  input,
  onAdd,
  onCancel,
}: AddWeightPanelProps): React.JSX.Element {
  const [weightKg, setWeightKg] = useState<string>('');
  const [date, setDate] = useState<string>(todayIso());
  const [error, setError] = useState<string | null>(null);

  function handleSave(): void {
    const validationError = validateNewWeight(input, weightKg, date);
    if (validationError !== null) {
      setError(validationError);
      return;
    }
    onAdd({ weightGrams: kgToGrams(weightKg), measuredOn: date });
  }

  return (
    <Card
      style={{
        padding: 'var(--space-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-4)',
      }}
    >
      <h2
        style={{
          fontSize: 'var(--text-h3)',
          fontFamily: 'var(--font-heading)',
          color: 'var(--color-foreground)',
          margin: 0,
        }}
      >
        {t('clinic.result.addWeightTitle')}
      </h2>

      <Input
        id="clinic-add-weight"
        label={t('clinic.form.currentWeightLabel')}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={weightKg}
        onChange={(e): void => {
          setWeightKg(e.target.value);
          setError(null);
        }}
        error={error ?? undefined}
      />
      <Input
        id="clinic-add-weight-date"
        label={t('clinic.form.currentWeightDateLabel')}
        type="date"
        value={date}
        onChange={(e): void => {
          setDate(e.target.value);
          setError(null);
        }}
      />

      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
        <Button
          type="button"
          variant="primary"
          fullWidthOnMobile
          aria-label={t('clinic.result.addWeightSave')}
          onClick={handleSave}
        >
          {t('clinic.result.addWeightSave')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          fullWidthOnMobile
          aria-label={t('clinic.result.addWeightCancel')}
          onClick={onCancel}
        >
          {t('clinic.result.addWeightCancel')}
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ClinicResult(): React.JSX.Element {
  const { input, read, submit, reset } = useClinicReadContext();
  const navigate = useNavigate();

  const [range, setRange] = useState<ChartRange>(DEFAULT_CHART_RANGE);
  const [showAddWeight, setShowAddWeight] = useState<boolean>(false);

  // Derived ephemeral entries — memoized on input so toggling the chart range
  // (local state) never rebuilds the synthetic history. `input` may be null on
  // the redirect path; the empty array is unused because we return early below.
  const entries = useMemo<WeightEntry[]>(
    () => (input === null ? [] : buildEphemeralEntries(input)),
    [input],
  );

  // Redirect guard: with no in-memory input/read there is nothing to show.
  if (input === null || read === null) {
    return <Navigate to={READ_ROUTE} replace />;
  }

  const canAddWeight = input.currentWeights.length < MAX_CURRENT_WEIGHTS;

  function handleNewRead(): void {
    reset();
    navigate(READ_ROUTE);
  }

  function handleAddWeight(entry: ClinicWeightEntry): void {
    if (input === null) return;
    // Keep the two current weights ordered by date so the pair stays consistent
    // with the contract (second on/after first), regardless of which one the
    // clinician entered second.
    const ordered = [...input.currentWeights, entry].sort((a, b) =>
      a.measuredOn.localeCompare(b.measuredOn),
    );
    const updated: ClinicInput = {
      ...input,
      currentWeights: [ordered[0], ordered[1]] as [
        ClinicWeightEntry,
        ClinicWeightEntry,
      ],
    };
    submit(updated);
    setShowAddWeight(false);
  }

  return (
    <main
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--color-background)',
        paddingBlock: 'var(--space-6)',
        paddingInline: 'var(--space-4)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          marginInline: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-6)',
        }}
      >
        {/* Headline: percentile now vs at birth + status banner */}
        <PercentileZScoreCallout
          zResult={read.zResult}
          birthZResult={read.birthZResult}
          ageDaysAtLatest={read.ageDaysAtLatest}
        />

        {/* WHO percentile chart fed the ephemeral history */}
        <WeightChart
          entries={entries}
          sex={input.sex}
          dateOfBirth={input.dateOfBirth}
          range={range}
          onRangeChange={setRange}
        />

        {/* Trend since birth — ALWAYS present (birth anchors ≥2 dated points) */}
        <TrendCard trend={read.trend} />

        {/* 4-week outlook fed the same ephemeral history */}
        <ProjectionCard
          entries={entries}
          sex={input.sex}
          dateOfBirth={input.dateOfBirth}
        />

        {/* Add another current weight (up to two) — refines recent velocity */}
        {canAddWeight ? (
          showAddWeight ? (
            <AddWeightPanel
              input={input}
              onAdd={handleAddWeight}
              onCancel={(): void => {
                setShowAddWeight(false);
              }}
            />
          ) : (
            <Button
              type="button"
              variant="secondary"
              fullWidthOnMobile
              aria-label={t('clinic.result.addWeight')}
              onClick={(): void => {
                setShowAddWeight(true);
              }}
            >
              {t('clinic.result.addWeight')}
            </Button>
          )
        ) : null}

        {/* Persistent disclaimer — nothing is saved */}
        <MedicalDisclaimer variant="footer" />

        {/* Footer action — clears the read and returns to the form */}
        <Button
          variant="primary"
          size="lg"
          fullWidthOnMobile
          aria-label={t('clinic.result.newRead')}
          onClick={handleNewRead}
        >
          {t('clinic.result.newRead')}
        </Button>
      </div>
    </main>
  );
}
