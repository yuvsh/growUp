/**
 * Tests for TrendCard
 *
 * Scenarios:
 *   1. gain direction → accent green framing; shows "Gaining" label + icon + g/day.
 *   2. loss direction → caution amber framing; shows "Losing" label + icon + g/day.
 *   3. flat direction → muted framing; shows "Holding steady" label + icon + g/day.
 *   4. All three directions render an SVG icon alongside the text (never color alone).
 *   5. g/day value is always displayed.
 *
 * Design contract:
 *   - Direction NEVER conveyed by color alone — icon + label text must BOTH be present.
 *   - All strings from i18n (clinic.result.*).
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrendCard } from './TrendCard';
import type { TrendDirection } from './types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeTrend(direction: TrendDirection, gramsPerDay: number) {
  return { direction, gramsPerDay };
}

const GAIN_TREND = makeTrend('gain', 25);
const LOSS_TREND = makeTrend('loss', 15);
const FLAT_TREND = makeTrend('flat', 0);
const FRACTIONAL_GAIN_TREND = makeTrend('gain', 12.7);

// ---------------------------------------------------------------------------
// 1. Gain direction
// ---------------------------------------------------------------------------

describe('TrendCard — gain direction', () => {
  it('renders the card title (trendTitle copy)', () => {
    render(<TrendCard trend={GAIN_TREND} />);
    // clinic.result.trendTitle = 'Trend since birth'
    expect(screen.getByText(/trend since birth/i)).toBeInTheDocument();
  });

  it('shows the "Gaining" direction label', () => {
    render(<TrendCard trend={GAIN_TREND} />);
    // clinic.result.trendGain = 'Gaining'
    expect(screen.getByText('Gaining')).toBeInTheDocument();
  });

  it('shows the g/day value alongside the label (not color alone)', () => {
    render(<TrendCard trend={GAIN_TREND} />);
    // The formatted output is "25 g/day"
    expect(screen.getByText(/25 g\//i)).toBeInTheDocument();
  });

  it('renders an SVG icon alongside the direction label (never color alone)', () => {
    const { container } = render(<TrendCard trend={GAIN_TREND} />);
    const svgs = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(svgs.length).toBeGreaterThan(0);
    // The direction label must also be present in text
    expect(screen.getByText('Gaining')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Loss direction
// ---------------------------------------------------------------------------

describe('TrendCard — loss direction', () => {
  it('shows the "Losing" direction label', () => {
    render(<TrendCard trend={LOSS_TREND} />);
    // clinic.result.trendLoss = 'Losing'
    expect(screen.getByText('Losing')).toBeInTheDocument();
  });

  it('shows the g/day value alongside the label', () => {
    render(<TrendCard trend={LOSS_TREND} />);
    expect(screen.getByText(/15 g\//i)).toBeInTheDocument();
  });

  it('renders an SVG icon alongside the direction label (never color alone)', () => {
    const { container } = render(<TrendCard trend={LOSS_TREND} />);
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(screen.getByText('Losing')).toBeInTheDocument();
  });

  it('does NOT render the gain or flat labels', () => {
    render(<TrendCard trend={LOSS_TREND} />);
    expect(screen.queryByText('Gaining')).not.toBeInTheDocument();
    expect(screen.queryByText('Holding steady')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Flat direction
// ---------------------------------------------------------------------------

describe('TrendCard — flat direction', () => {
  it('shows the "Holding steady" direction label', () => {
    render(<TrendCard trend={FLAT_TREND} />);
    // clinic.result.trendFlat = 'Holding steady'
    expect(screen.getByText('Holding steady')).toBeInTheDocument();
  });

  it('shows the g/day value (0 g/day for flat)', () => {
    render(<TrendCard trend={FLAT_TREND} />);
    expect(screen.getByText(/0 g\//i)).toBeInTheDocument();
  });

  it('renders an SVG icon alongside the direction label (never color alone)', () => {
    const { container } = render(<TrendCard trend={FLAT_TREND} />);
    expect(container.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
    expect(screen.getByText('Holding steady')).toBeInTheDocument();
  });

  it('does NOT render the gain or loss labels', () => {
    render(<TrendCard trend={FLAT_TREND} />);
    expect(screen.queryByText('Gaining')).not.toBeInTheDocument();
    expect(screen.queryByText('Losing')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Fractional g/day value is rendered correctly
// ---------------------------------------------------------------------------

describe('TrendCard — fractional gramsPerDay', () => {
  it('formats a fractional g/day to one decimal place', () => {
    render(<TrendCard trend={FRACTIONAL_GAIN_TREND} />);
    expect(screen.getByText(/12\.7 g\//i)).toBeInTheDocument();
  });
});
