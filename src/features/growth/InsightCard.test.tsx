/**
 * Tests for InsightCard
 *
 * Scenarios:
 *   1. Caution insight → renders title, body, and a "Caution" badge.
 *   2. Info insight → renders title, body, and a "Info" badge.
 *   3. slow-velocity insight → body interpolates `bodyParams.threshold` via t().
 *
 * Title/body/severity-label text is resolved from `growth.insights.*` copy
 * (src/i18n/copy/en.ts) — these tests assert the rendered (resolved) text to
 * prove the kind/severity → t() resolution path works end to end.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InsightCard } from './InsightCard';
import type { Insight } from './types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const CAUTION_INSIGHT: Insight = {
  id: 'weight-loss',
  kind: 'weight-loss',
  severity: 'caution',
};

const INFO_INSIGHT: Insight = {
  id: 'percentile-drop',
  kind: 'percentile-drop',
  severity: 'info',
};

const SLOW_VELOCITY_INSIGHT: Insight = {
  id: 'slow-velocity',
  kind: 'slow-velocity',
  severity: 'caution',
  bodyParams: { threshold: 10 },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('InsightCard — caution insight', () => {
  it('renders the insight title', () => {
    render(<InsightCard insight={CAUTION_INSIGHT} />);
    expect(screen.getByText('Weight loss detected')).toBeInTheDocument();
  });

  it('renders the insight body', () => {
    render(<InsightCard insight={CAUTION_INSIGHT} />);
    expect(
      screen.getByText(/lost weight between two consecutive measurements/i),
    ).toBeInTheDocument();
  });

  it('renders a badge with the severity label "Caution"', () => {
    render(<InsightCard insight={CAUTION_INSIGHT} />);
    expect(screen.getByText('Caution')).toBeInTheDocument();
  });
});

describe('InsightCard — info insight', () => {
  it('renders the insight title', () => {
    render(<InsightCard insight={INFO_INSIGHT} />);
    expect(screen.getByText('Percentile dropping')).toBeInTheDocument();
  });

  it('renders the insight body', () => {
    render(<InsightCard insight={INFO_INSIGHT} />);
    expect(
      screen.getByText(/percentile has fallen between measurements/i),
    ).toBeInTheDocument();
  });

  it('renders a badge with the severity label "Info"', () => {
    render(<InsightCard insight={INFO_INSIGHT} />);
    expect(screen.getByText('Info')).toBeInTheDocument();
  });
});

describe('InsightCard — slow-velocity insight (interpolated body)', () => {
  it('renders the insight title', () => {
    render(<InsightCard insight={SLOW_VELOCITY_INSIGHT} />);
    expect(screen.getByText('Slow weight gain')).toBeInTheDocument();
  });

  it('interpolates bodyParams.threshold into the body copy', () => {
    render(<InsightCard insight={SLOW_VELOCITY_INSIGHT} />);
    expect(
      screen.getByText(/Weight gain is below 10 g\/day/i),
    ).toBeInTheDocument();
  });

  it('renders a badge with the severity label "Caution"', () => {
    render(<InsightCard insight={SLOW_VELOCITY_INSIGHT} />);
    expect(screen.getByText('Caution')).toBeInTheDocument();
  });
});
