/**
 * Tests for InsightsList
 *
 * Scenarios:
 *   1. A strictly dropping series → produces insights → renders ≥1 InsightCard
 *      with its title text visible.
 *   2. Fewer than 2 entries (empty or single) → no insights → empty message shown.
 *   3. Healthy climbing series (no insights) → empty message shown.
 *
 * Concrete setup — matches the fixtures used in insights.test.ts:
 *   - DOB: 2024-01-01
 *   - Dropping entries at ~60 days old (2024-03-01…03): weights 4800 → 4780 → 4760
 *     → triggers weight-loss, percentile-drop (and slow-velocity due to negative vel)
 *   - Healthy entries: weights 4800 → 4830 → 4860 → 4890 (+30 g/day, above threshold)
 *     → no insights, so empty message shown
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightsList } from './InsightsList';
import type { WeightEntry } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal WeightEntry with only the fields computeInsights reads. */
function makeEntry(dateMeasured: string, weightGrams: number): WeightEntry {
  return {
    id: dateMeasured,
    childId: 'child-1',
    ownerId: 'owner-1',
    dateMeasured,
    weightGrams,
    createdAt: `${dateMeasured}T00:00:00Z`,
    updatedAt: `${dateMeasured}T00:00:00Z`,
  };
}

const DOB = '2024-01-01';
const SEX = 'male' as const;

// Strictly dropping series — triggers weight-loss and percentile-drop insights
const DROPPING_ENTRIES: WeightEntry[] = [
  makeEntry('2024-03-01', 4800),
  makeEntry('2024-03-02', 4780),
  makeEntry('2024-03-03', 4760),
];

// Healthy climbing series — no insights
const HEALTHY_ENTRIES: WeightEntry[] = [
  makeEntry('2024-03-01', 4800),
  makeEntry('2024-03-02', 4830),
  makeEntry('2024-03-03', 4860),
  makeEntry('2024-03-04', 4890),
];

// ---------------------------------------------------------------------------
// 1. Dropping series → renders insight cards
// ---------------------------------------------------------------------------

describe('InsightsList — dropping series (produces insights)', () => {
  it('renders the section heading "Insights"', () => {
    render(
      <InsightsList entries={DROPPING_ENTRIES} sex={SEX} dateOfBirth={DOB} />,
    );
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });

  it('renders at least one insight card (title visible)', () => {
    render(
      <InsightsList entries={DROPPING_ENTRIES} sex={SEX} dateOfBirth={DOB} />,
    );
    // weight-loss insight title from computeInsights
    expect(screen.getByText('Weight loss detected')).toBeInTheDocument();
  });

  it('does NOT show the empty message', () => {
    render(
      <InsightsList entries={DROPPING_ENTRIES} sex={SEX} dateOfBirth={DOB} />,
    );
    expect(
      screen.queryByText(/add a couple of weights/i),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Fewer than 2 entries → empty message
// ---------------------------------------------------------------------------

describe('InsightsList — empty entries', () => {
  it('shows the empty message when entries is empty', () => {
    render(<InsightsList entries={[]} sex={SEX} dateOfBirth={DOB} />);
    expect(
      screen.getByText(/add a couple of weights to unlock insights/i),
    ).toBeInTheDocument();
  });

  it('shows the section heading even when empty', () => {
    render(<InsightsList entries={[]} sex={SEX} dateOfBirth={DOB} />);
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });
});

describe('InsightsList — single entry (too few for velocity/percentile rules)', () => {
  it('shows the empty message with only one entry', () => {
    render(
      <InsightsList
        entries={[makeEntry('2024-03-01', 4800)]}
        sex={SEX}
        dateOfBirth={DOB}
      />,
    );
    // computeInsights with 1 entry may return 0 insights depending on rules
    // The weight-loss and slow-velocity rules need ≥2 entries, percentile-drop needs ≥2
    // A single entry cannot produce any insights, so the empty message should show.
    expect(
      screen.getByText(/add a couple of weights to unlock insights/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Healthy series → no insights → empty message
// ---------------------------------------------------------------------------

describe('InsightsList — healthy series (no insights)', () => {
  it('shows the empty message when no issues are detected', () => {
    render(
      <InsightsList entries={HEALTHY_ENTRIES} sex={SEX} dateOfBirth={DOB} />,
    );
    expect(
      screen.getByText(/add a couple of weights to unlock insights/i),
    ).toBeInTheDocument();
  });

  it('does NOT render any insight card title for a healthy series', () => {
    render(
      <InsightsList entries={HEALTHY_ENTRIES} sex={SEX} dateOfBirth={DOB} />,
    );
    expect(screen.queryByText('Weight loss detected')).not.toBeInTheDocument();
    expect(screen.queryByText('Slow weight gain')).not.toBeInTheDocument();
  });
});
