/**
 * Tests for InsightCard
 *
 * Scenarios:
 *   1. Caution insight → renders title, body, and a "Caution" badge.
 *   2. Info insight → renders title, body, and a "Info" badge.
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
  title: 'Weight loss detected',
  body: 'Your baby lost weight between two consecutive measurements.',
};

const INFO_INSIGHT: Insight = {
  id: 'percentile-drop',
  kind: 'percentile-drop',
  severity: 'info',
  title: 'Percentile dropping',
  body: "Your baby's weight percentile has fallen between measurements.",
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
