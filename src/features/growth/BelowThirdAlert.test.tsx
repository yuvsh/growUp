/**
 * Tests for BelowThirdAlert
 *
 * Scenarios:
 *   1. Latest weight clearly below 3rd percentile → alert renders with
 *      role="status", shows a gram figure and a trend word.
 *   2. Latest weight above 3rd percentile → renders nothing.
 *   3. No entries → renders nothing.
 *
 * Concrete setup:
 *   - DOB: 2025-01-01  (fixed so ageDays is deterministic)
 *   - "6 months old" entry: dateMeasured 2025-07-01 → 181 days
 *   - Male WHO 3rd percentile at 181 days ≈ 6 030 g
 *   - Below-3rd weight: 2 000 g (deeply below, z ≈ −8; percentile < 3)
 *   - Above-3rd  weight: 9 000 g (> median, clearly above 3rd)
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BelowThirdAlert } from './BelowThirdAlert';
import type { WeightEntry } from '../../types';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const DOB = '2025-01-01';

/** Build a minimal WeightEntry with only the fields BelowThirdAlert reads. */
function makeEntry(overrides: Partial<WeightEntry> & { dateMeasured: string; weightGrams: number }): WeightEntry {
  return {
    id: 'entry-1',
    childId: 'child-1',
    ownerId: 'owner-1',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

// dateMeasured: 2025-07-01 → 181 days after 2025-01-01
const BELOW_ENTRY = makeEntry({ dateMeasured: '2025-07-01', weightGrams: 2000 });
const ABOVE_ENTRY = makeEntry({ dateMeasured: '2025-07-01', weightGrams: 9000 });

// An earlier entry for trend detection
const EARLIER_BELOW_ENTRY = makeEntry({
  id: 'entry-0',
  dateMeasured: '2025-06-01',
  weightGrams: 1900,
});

// ---------------------------------------------------------------------------
// 1. Below-3rd: alert renders with key accessibility + data content
// ---------------------------------------------------------------------------

describe('BelowThirdAlert — below 3rd percentile', () => {
  it('renders an element with role="status"', () => {
    render(
      <BelowThirdAlert
        entries={[BELOW_ENTRY]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the alert title', () => {
    render(
      <BelowThirdAlert
        entries={[BELOW_ENTRY]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/gentle heads-up/i)).toBeInTheDocument();
  });

  it('shows a gram figure for the gap to the 3rd-percentile line', () => {
    render(
      <BelowThirdAlert
        entries={[BELOW_ENTRY]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    // The gram gap is displayed as "{N} g"; N > 0 for a weight of 2 000 g
    expect(screen.getByText(/\d+\s*g/)).toBeInTheDocument();
  });

  it('shows the current percentile value', () => {
    render(
      <BelowThirdAlert
        entries={[BELOW_ENTRY]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/current percentile/i)).toBeInTheDocument();
  });

  it('shows a trend word when two entries are present — improving', () => {
    // Second entry is heavier → improving
    const laterEntry = makeEntry({ id: 'entry-2', dateMeasured: '2025-07-15', weightGrams: 2100 });
    render(
      <BelowThirdAlert
        entries={[BELOW_ENTRY, laterEntry]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/improving/i)).toBeInTheDocument();
  });

  it('shows "declining" trend when the latest weight is lower', () => {
    // EARLIER_BELOW_ENTRY (1900g at June 1) then BELOW_ENTRY (2000g at July 1):
    // latest > earlier → improving — flip to test declining
    const declineEntry = makeEntry({ id: 'entry-2', dateMeasured: '2025-07-15', weightGrams: 1800 });
    render(
      <BelowThirdAlert
        entries={[BELOW_ENTRY, declineEntry]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/declining/i)).toBeInTheDocument();
  });

  it('shows "holding steady" trend when weights are equal', () => {
    const steadyEntry = makeEntry({ id: 'entry-2', dateMeasured: '2025-07-15', weightGrams: 2000 });
    render(
      <BelowThirdAlert
        entries={[BELOW_ENTRY, steadyEntry]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/holding steady/i)).toBeInTheDocument();
  });

  it('shows the next-step guidance text', () => {
    render(
      <BelowThirdAlert
        entries={[BELOW_ENTRY]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByText(/pediatrician|dietitian/i)).toBeInTheDocument();
  });

  it('works for female babies too', () => {
    render(
      <BelowThirdAlert
        entries={[BELOW_ENTRY]}
        sex="female"
        dateOfBirth={DOB}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Above 3rd percentile → renders nothing
// ---------------------------------------------------------------------------

describe('BelowThirdAlert — above 3rd percentile', () => {
  it('renders nothing when the latest weight is above the 3rd percentile', () => {
    const { container } = render(
      <BelowThirdAlert
        entries={[ABOVE_ENTRY]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. No entries → renders nothing
// ---------------------------------------------------------------------------

describe('BelowThirdAlert — no entries', () => {
  it('renders nothing when entries is an empty array', () => {
    const { container } = render(
      <BelowThirdAlert
        entries={[]}
        sex="male"
        dateOfBirth={DOB}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
