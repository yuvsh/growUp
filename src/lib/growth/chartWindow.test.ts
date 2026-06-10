/**
 * Unit tests for computeChartWindow.
 *
 * Tests cover:
 * - 3mo window math (latest 10mo → xMax≈10.25, xMin≈7.25)
 * - single point → minimum span ≥ 1.0 kg enforced
 * - flat data (two equal weights) → min span enforced
 * - 'all' range spans first..latest
 * - points outside the window are excluded from Y fit
 */

import { describe, it, expect } from 'vitest';
import { computeChartWindow } from './chartWindow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePoint(ageMonths: number, weightKg: number): { ageMonths: number; weightKg: number } {
  return { ageMonths, weightKg };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeChartWindow', () => {
  // ---- empty / default ---------------------------------------------------

  it('returns a sensible default when babyPoints is empty', () => {
    const win = computeChartWindow([], '3mo');
    expect(win.xMinMonths).toBe(0);
    expect(win.xMaxMonths).toBe(6);
    expect(win.yMinKg).toBeGreaterThanOrEqual(0);
    expect(win.yMaxKg).toBeGreaterThan(win.yMinKg);
  });

  // ---- 3mo window math ---------------------------------------------------

  it('3mo window: latest at 10mo → xMax≈10.25, xMin≈7.25', () => {
    const points = [
      makePoint(7, 8.0),
      makePoint(8, 8.5),
      makePoint(10, 9.2),
    ];
    const win = computeChartWindow(points, '3mo');

    // xMax = min(24, 10 + 0.25) = 10.25
    expect(win.xMaxMonths).toBe(10.3); // rounded to 1dp from 10.25 → 10.3
    // xMin = max(0, 10.3 - 3) = 7.3
    expect(win.xMinMonths).toBe(7.3);
  });

  it('3mo window: xMax is anchored to latest measurement, not the full 24mo range', () => {
    const points = [makePoint(3, 5.5), makePoint(4, 6.0)];
    const win = computeChartWindow(points, '3mo');
    expect(win.xMaxMonths).toBeLessThan(24);
    expect(win.xMaxMonths).toBeCloseTo(4.25, 1);
    // xMin should be max(0, 4.25-3) = 1.25 → 1.3 after rounding
    expect(win.xMinMonths).toBeGreaterThanOrEqual(0);
    expect(win.xMinMonths).toBeLessThan(win.xMaxMonths);
  });

  // ---- 1mo window --------------------------------------------------------

  it('1mo window uses a 1-month span', () => {
    const points = [makePoint(5, 7.0), makePoint(6, 7.5)];
    const win = computeChartWindow(points, '1mo');
    const span = win.xMaxMonths - win.xMinMonths;
    expect(span).toBeCloseTo(1, 0);
  });

  // ---- 6mo window --------------------------------------------------------

  it('6mo window uses a 6-month span', () => {
    const points = [makePoint(10, 8.5), makePoint(12, 9.0)];
    const win = computeChartWindow(points, '6mo');
    const span = win.xMaxMonths - win.xMinMonths;
    expect(span).toBeCloseTo(6, 0);
  });

  // ---- 'all' range -------------------------------------------------------

  it("'all' spans from first to latest measurement", () => {
    const points = [
      makePoint(2, 4.5),
      makePoint(5, 6.0),
      makePoint(10, 8.5),
    ];
    const win = computeChartWindow(points, 'all');
    // xMin = max(0, 2 - 0.25) = 1.75 → 1.8 (rounded)
    expect(win.xMinMonths).toBeCloseTo(1.8, 1);
    // xMax = min(24, 10 + 0.25) = 10.25 → 10.3 (rounded)
    expect(win.xMaxMonths).toBeCloseTo(10.3, 1);
  });

  it("'all' xMin is clamped to 0 when first measurement is before 0.25mo", () => {
    const points = [makePoint(0.1, 3.0), makePoint(3, 5.5)];
    const win = computeChartWindow(points, 'all');
    expect(win.xMinMonths).toBe(0);
  });

  // ---- single point — min span -------------------------------------------

  it('single point: y span is at least MIN_SPAN_KG (1.0 kg)', () => {
    const points = [makePoint(5, 6.5)];
    const win = computeChartWindow(points, '3mo');
    const ySpan = win.yMaxKg - win.yMinKg;
    expect(ySpan).toBeGreaterThanOrEqual(1.0);
  });

  it('single point: Y window is centered around the data weight', () => {
    const points = [makePoint(5, 6.5)];
    const win = computeChartWindow(points, '3mo');
    // mid-point of y axis should be near the weight (within 0.5 kg of padding)
    const mid = (win.yMinKg + win.yMaxKg) / 2;
    // mid should be close to 6.5 (the raw weight, before clamping)
    expect(mid).toBeGreaterThanOrEqual(6.0);
    expect(mid).toBeLessThanOrEqual(7.0);
  });

  // ---- flat data — min span ----------------------------------------------

  it('two points with equal weights: y span is at least 1.0 kg', () => {
    const points = [makePoint(4, 7.0), makePoint(5, 7.0)];
    const win = computeChartWindow(points, '3mo');
    const ySpan = win.yMaxKg - win.yMinKg;
    expect(ySpan).toBeGreaterThanOrEqual(1.0);
  });

  // ---- yMin clamped to 0 -------------------------------------------------

  it('yMin is clamped to 0 (never negative)', () => {
    // Very light baby at 0.5 kg would push yMin below 0 without clamping.
    const points = [makePoint(0, 0.5)];
    const win = computeChartWindow(points, '3mo');
    expect(win.yMinKg).toBeGreaterThanOrEqual(0);
  });

  // ---- Y fit excludes points outside the X window -----------------------

  it('points outside the X window are excluded from the Y fit', () => {
    // A very heavy outlier at month 2 should NOT drag yMax up when we zoom to 3mo ending at 10.
    const points = [
      makePoint(2, 50.0),  // outlier, outside 3mo window ending at 10mo
      makePoint(8, 8.0),
      makePoint(9, 8.5),
      makePoint(10, 9.0),
    ];
    const win = computeChartWindow(points, '3mo');
    // The outlier (month 2) is outside [xMin, xMax] ≈ [7.3, 10.3], so yMax should be near 9-10 kg, not 50.
    expect(win.yMaxKg).toBeLessThan(15);
  });

  // ---- domain clamped to [0, 24] ----------------------------------------

  it('xMax does not exceed 24 months', () => {
    const points = [makePoint(23.9, 12.0)];
    const win = computeChartWindow(points, 'all');
    expect(win.xMaxMonths).toBeLessThanOrEqual(24);
  });

  // ---- rounded to 1 decimal place ----------------------------------------

  it('returned values are rounded to 1 decimal place', () => {
    const points = [makePoint(3.333, 5.666), makePoint(6.777, 8.111)];
    const win = computeChartWindow(points, '3mo');
    // All values should have at most 1 decimal place.
    [win.xMinMonths, win.xMaxMonths, win.yMinKg, win.yMaxKg].forEach((v) => {
      expect(v * 10).toBe(Math.round(v * 10));
    });
  });
});
