/**
 * Tests for PercentileZScoreCallout
 *
 * Scenarios:
 *   1. Below-3rd percentile → caution amber framing: role="status" element
 *      renders with the belowThird copy string; a CautionIcon SVG exists;
 *      the text is not conveyed by color alone.
 *   2. On / above 3rd percentile → accent green framing: role="status"
 *      element renders with the onTrack copy string; icon present.
 *   3. bornAndNow sentence always mentions both birth AND current percentile.
 *   4. z-score is rendered in the secondary label.
 *
 * Design contract:
 *   - Status NEVER conveyed by color alone — icon + text must BOTH be present.
 *   - Below-3rd → caution amber; on/above → accent green.
 *   - All strings from i18n (clinic.result.*).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PercentileZScoreCallout } from './PercentileZScoreCallout';
import type { ZResult } from '../growth/types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A z-result clearly below the 3rd percentile (~0.4th percentile). */
const BELOW_THIRD_RESULT: ZResult = { z: -2.65, percentile: 0.4 };

/** Birth z-result sitting near the 25th percentile — used for "born at X" sentence. */
const BIRTH_RESULT_25TH: ZResult = { z: -0.67, percentile: 25 };

/** A z-result at the 50th percentile (median) — clearly on/above the 3rd. */
const ON_TRACK_RESULT: ZResult = { z: 0.0, percentile: 50 };

/** A z-result at exactly the 3rd percentile boundary — still below (< 3). */
const AT_THIRD_RESULT: ZResult = { z: -1.881, percentile: 2.99 };

/** Age in days for a typical 6-month-old visit. */
const AGE_DAYS = 183;

// ---------------------------------------------------------------------------
// 1. Below-3rd percentile — caution amber framing
// ---------------------------------------------------------------------------

describe('PercentileZScoreCallout — below 3rd percentile', () => {
  it('renders an element with role="status"', () => {
    render(
      <PercentileZScoreCallout
        zResult={BELOW_THIRD_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the belowThird copy string alongside the icon (never color alone)', () => {
    render(
      <PercentileZScoreCallout
        zResult={BELOW_THIRD_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    // The belowThird copy from en.ts:
    // "The latest weight is below the 3rd percentile line — a calm, factual read to share."
    expect(
      screen.getByText(/below the 3rd percentile line/i),
    ).toBeInTheDocument();
  });

  it('renders an SVG icon alongside the status text (not color alone)', () => {
    render(
      <PercentileZScoreCallout
        zResult={BELOW_THIRD_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    // The status banner must contain an SVG (the CautionIcon)
    const statusBanner = screen.getByRole('status');
    const svgInBanner = statusBanner.querySelector('svg');
    expect(svgInBanner).not.toBeNull();
    // The banner must also contain visible text — icon alone is not enough
    expect(statusBanner.textContent).toMatch(/below the 3rd percentile line/i);
  });

  it('does NOT render the onTrack copy string when below-3rd', () => {
    render(
      <PercentileZScoreCallout
        zResult={BELOW_THIRD_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    // onTrack copy: "The latest weight is tracking on a healthy percentile."
    expect(
      screen.queryByText(/tracking on a healthy percentile/i),
    ).not.toBeInTheDocument();
  });

  it('shows the current percentile in the big display number', () => {
    render(
      <PercentileZScoreCallout
        zResult={BELOW_THIRD_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    // Ordinal of 0.4 → rounds to 0th.
    // The big display <p> has aria-label="Current percentile: 0th".
    expect(
      screen.getByLabelText(/Current percentile: 0th/i),
    ).toBeInTheDocument();
  });

  it('also shows caution framing at the 3rd-percentile boundary (percentile < 3)', () => {
    render(
      <PercentileZScoreCallout
        zResult={AT_THIRD_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    expect(
      screen.getByText(/below the 3rd percentile line/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. On / above 3rd percentile — accent green framing
// ---------------------------------------------------------------------------

describe('PercentileZScoreCallout — on/above 3rd percentile', () => {
  it('renders an element with role="status"', () => {
    render(
      <PercentileZScoreCallout
        zResult={ON_TRACK_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('shows the onTrack copy string (never color alone)', () => {
    render(
      <PercentileZScoreCallout
        zResult={ON_TRACK_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    expect(
      screen.getByText(/tracking on a healthy percentile/i),
    ).toBeInTheDocument();
  });

  it('renders an SVG icon alongside the status text (not color alone)', () => {
    render(
      <PercentileZScoreCallout
        zResult={ON_TRACK_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    const statusBanner = screen.getByRole('status');
    expect(statusBanner.querySelector('svg')).not.toBeNull();
    expect(statusBanner.textContent).toMatch(/tracking on a healthy percentile/i);
  });

  it('does NOT render the belowThird copy string when on/above 3rd', () => {
    render(
      <PercentileZScoreCallout
        zResult={ON_TRACK_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    expect(
      screen.queryByText(/below the 3rd percentile line/i),
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. bornAndNow sentence mentions BOTH birth and current percentile
// ---------------------------------------------------------------------------

describe('PercentileZScoreCallout — bornAndNow sentence', () => {
  it('mentions the birth percentile ordinal', () => {
    render(
      <PercentileZScoreCallout
        zResult={ON_TRACK_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    // birthZResult.percentile = 25 → ordinal "25th"
    // The read-aloud sentence reads: "Born at the 25th percentile, now at the 50th percentile."
    // We assert there is at least one matching element (the sentence and/or the birth footnote both contain this text).
    const matches = screen.getAllByText(/Born at the 25th percentile/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('mentions the current percentile ordinal', () => {
    render(
      <PercentileZScoreCallout
        zResult={ON_TRACK_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    // ON_TRACK_RESULT.percentile = 50 → ordinal "50th".
    // The read-aloud sentence: "Born at the 25th percentile, now at the 50th percentile."
    expect(
      screen.getByText(/Born at the 25th percentile, now at the 50th percentile/i),
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. z-score rendered in secondary label
// ---------------------------------------------------------------------------

describe('PercentileZScoreCallout — z-score display', () => {
  it('renders the current z-score value', () => {
    render(
      <PercentileZScoreCallout
        zResult={ON_TRACK_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    // ON_TRACK_RESULT.z = 0.00
    expect(screen.getByText('z = 0.00')).toBeInTheDocument();
  });

  it('renders the current z-score for a below-3rd result', () => {
    render(
      <PercentileZScoreCallout
        zResult={BELOW_THIRD_RESULT}
        birthZResult={BIRTH_RESULT_25TH}
        ageDaysAtLatest={AGE_DAYS}
      />,
    );
    // BELOW_THIRD_RESULT.z = -2.65
    expect(screen.getByText('z = -2.65')).toBeInTheDocument();
  });
});
