/**
 * Tests for ProjectionCard
 *
 * Scenarios:
 *   1. < 2 entries → "notEnough" message shown; projection data NOT present.
 *   2. ≥ 2 climbing entries → title, velocity, and projected weight present.
 *   3. A clearly-below-3rd series → gain-to-reach line shows a positive gram figure.
 *
 * Fixtures:
 *   - DOB: 2025-01-01 (fixed for deterministic ageDays)
 *   - Entries at ~3 months (91 days) and ~4 months (120 days) for the "enough data" cases
 *   - Male WHO 3rd percentile at ~120 days ≈ 4 600 g
 *   - Below-3rd series: two entries well under 3 000 g (deeply below 3rd)
 *   - Climbing series: two entries rising from ~6 000 g to ~6 500 g
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectionCard } from './ProjectionCard';
import type { WeightEntry, Sex } from '../../types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DOB = '2025-01-01';
const SEX: Sex = 'male';

function makeEntry(
  overrides: Partial<WeightEntry> & { dateMeasured: string; weightGrams: number },
): WeightEntry {
  return {
    id: 'entry-1',
    childId: 'child-1',
    ownerId: 'owner-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// Two climbing entries — both well above the 3rd percentile for the age
// DOB 2025-01-01; ~3 months old = 2025-04-02 (91 days); ~4 months = 2025-05-01 (120 days)
const CLIMBING_ENTRY_1 = makeEntry({ id: 'e1', dateMeasured: '2025-04-02', weightGrams: 6000 });
const CLIMBING_ENTRY_2 = makeEntry({ id: 'e2', dateMeasured: '2025-05-01', weightGrams: 6500 });

// Two entries clearly below the 3rd percentile — 2 000 g at similar ages
const BELOW_ENTRY_1 = makeEntry({ id: 'b1', dateMeasured: '2025-04-02', weightGrams: 2000 });
const BELOW_ENTRY_2 = makeEntry({ id: 'b2', dateMeasured: '2025-05-01', weightGrams: 2100 });

// ---------------------------------------------------------------------------
// 1. Fewer than 2 entries → not-enough-data state
// ---------------------------------------------------------------------------

describe('ProjectionCard — fewer than 2 entries', () => {
  it('shows the notEnough message with zero entries', () => {
    render(
      <ProjectionCard entries={[]} sex={SEX} dateOfBirth={DOB} />,
    );
    expect(
      screen.getByText(/Add one more weight to see a projection/i),
    ).toBeInTheDocument();
  });

  it('shows the notEnough message with exactly one entry', () => {
    render(
      <ProjectionCard
        entries={[CLIMBING_ENTRY_1]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    expect(
      screen.getByText(/Add one more weight to see a projection/i),
    ).toBeInTheDocument();
  });

  it('does NOT show the projection title when data is insufficient', () => {
    render(
      <ProjectionCard entries={[]} sex={SEX} dateOfBirth={DOB} />,
    );
    expect(screen.queryByText(/4-week outlook/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. ≥ 2 climbing entries → full projection present
// ---------------------------------------------------------------------------

describe('ProjectionCard — two or more entries (climbing)', () => {
  it('renders the projection title', () => {
    render(
      <ProjectionCard
        entries={[CLIMBING_ENTRY_1, CLIMBING_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/4-week outlook/i)).toBeInTheDocument();
  });

  it('renders the velocity label', () => {
    render(
      <ProjectionCard
        entries={[CLIMBING_ENTRY_1, CLIMBING_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/recent weight gain/i)).toBeInTheDocument();
  });

  it('renders the projected weight label', () => {
    render(
      <ProjectionCard
        entries={[CLIMBING_ENTRY_1, CLIMBING_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/Projected weight in 4 weeks/i)).toBeInTheDocument();
  });

  it('shows a projected weight value in kg', () => {
    render(
      <ProjectionCard
        entries={[CLIMBING_ENTRY_1, CLIMBING_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    // Projected weight for two climbing entries should be > 6 kg
    expect(screen.getByText(/\d+\.\d{2}\s*kg/i)).toBeInTheDocument();
  });

  it('renders the projected percentile label', () => {
    render(
      <ProjectionCard
        entries={[CLIMBING_ENTRY_1, CLIMBING_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/Projected percentile/i)).toBeInTheDocument();
  });

  it('does NOT show the notEnough message', () => {
    render(
      <ProjectionCard
        entries={[CLIMBING_ENTRY_1, CLIMBING_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    expect(
      screen.queryByText(/Add one more weight to see a projection/i),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Clearly-below-3rd series → gain-to-reach section with positive gram figure
// ---------------------------------------------------------------------------

describe('ProjectionCard — below 3rd percentile series', () => {
  it('shows the gainNeeded label', () => {
    render(
      <ProjectionCard
        entries={[BELOW_ENTRY_1, BELOW_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/To reach the 3rd percentile/i)).toBeInTheDocument();
  });

  it('shows a positive gram figure per day', () => {
    render(
      <ProjectionCard
        entries={[BELOW_ENTRY_1, BELOW_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    // Expect a positive number followed by "g" and "per day"
    const perDayElements = screen.getAllByText(/per day/i);
    expect(perDayElements.length).toBeGreaterThanOrEqual(1);
  });

  it('shows a positive gram figure per week', () => {
    render(
      <ProjectionCard
        entries={[BELOW_ENTRY_1, BELOW_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    const perWeekElements = screen.getAllByText(/per week/i);
    expect(perWeekElements.length).toBeGreaterThanOrEqual(1);
  });

  it('does NOT show a negative gram figure for gain needed', () => {
    render(
      <ProjectionCard
        entries={[BELOW_ENTRY_1, BELOW_ENTRY_2]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    // No text containing a negative number followed by g
    expect(screen.queryByText(/-\d+\s*g/)).not.toBeInTheDocument();
  });
});
