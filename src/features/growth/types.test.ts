/**
 * Compile-time and runtime contracts for `src/features/growth/types.ts`.
 *
 * Tests:
 *   1. PERCENTILE_Z constants match the z-scores verified in the spike.
 *   2. Typed sample objects confirm the interfaces compile correctly under
 *      strict mode — the TypeScript compiler itself is the structural test.
 */

import { describe, it, expect } from 'vitest';
import {
  PERCENTILE_Z,
  type ZResult,
  type CurvePoint,
  type PercentileCurve,
  type ProjectionResult,
  type Insight,
} from './types';

// ---------------------------------------------------------------------------
// 1. PERCENTILE_Z constants
// ---------------------------------------------------------------------------

describe('PERCENTILE_Z', () => {
  it('p50 is exactly 0 (median of the standard normal)', () => {
    expect(PERCENTILE_Z.p50).toBe(0);
  });

  it('p3 and p97 are symmetric', () => {
    expect(PERCENTILE_Z.p3).toBeCloseTo(-PERCENTILE_Z.p97, 10);
  });

  it('p15 and p85 are symmetric', () => {
    expect(PERCENTILE_Z.p15).toBeCloseTo(-PERCENTILE_Z.p85, 10);
  });

  it('p97 equals the documented spike-verified value', () => {
    expect(PERCENTILE_Z.p97).toBeCloseTo(1.880794, 6);
  });

  it('p85 equals the documented spike-verified value', () => {
    expect(PERCENTILE_Z.p85).toBeCloseTo(1.036433, 6);
  });

  it('z values are strictly ordered p3 < p15 < p50 < p85 < p97', () => {
    expect(PERCENTILE_Z.p3).toBeLessThan(PERCENTILE_Z.p15);
    expect(PERCENTILE_Z.p15).toBeLessThan(PERCENTILE_Z.p50);
    expect(PERCENTILE_Z.p50).toBeLessThan(PERCENTILE_Z.p85);
    expect(PERCENTILE_Z.p85).toBeLessThan(PERCENTILE_Z.p97);
  });
});

// ---------------------------------------------------------------------------
// 2. Structural compile checks (typed sample objects)
//    If any interface changes shape incompatibly, these will cause TS errors.
// ---------------------------------------------------------------------------

describe('interface structural checks (compile-time)', () => {
  it('ZResult accepts valid shape', () => {
    const result: ZResult = { z: -1.88, percentile: 3.0 };
    expect(result.z).toBeLessThan(0);
    expect(result.percentile).toBeGreaterThan(0);
  });

  it('CurvePoint accepts valid shape', () => {
    const point: CurvePoint = { ageDays: 183, weightGrams: 6357 };
    expect(point.ageDays).toBe(183);
  });

  it('PercentileCurve accepts valid shape with typed percentileLabel', () => {
    const curve: PercentileCurve = {
      percentileLabel: '3rd',
      z: PERCENTILE_Z.p3,
      points: [{ ageDays: 0, weightGrams: 2459 }],
    };
    expect(curve.percentileLabel).toBe('3rd');
  });

  it('ProjectionResult accepts valid shape', () => {
    const projection: ProjectionResult = {
      velocityGramsPerDay: 28,
      projectedWeightGrams: 5200,
      projectedAgeDays: 90,
      projectedPercentile: 12,
      dailyGainToReach3rdGrams: 0,
      weeklyGainToReach3rdGrams: 0,
      hasEnoughData: true,
    };
    expect(projection.hasEnoughData).toBe(true);
  });

  it('ProjectionResult hasEnoughData: false is valid', () => {
    const projection: ProjectionResult = {
      velocityGramsPerDay: 0,
      projectedWeightGrams: 0,
      projectedAgeDays: 0,
      projectedPercentile: 0,
      dailyGainToReach3rdGrams: 0,
      weeklyGainToReach3rdGrams: 0,
      hasEnoughData: false,
    };
    expect(projection.hasEnoughData).toBe(false);
  });

  it('Insight accepts valid shape with union kinds and severities', () => {
    const insight: Insight = {
      id: 'weight-loss-1',
      kind: 'weight-loss',
      severity: 'caution',
      title: 'Weight loss detected',
      body: 'Baby lost weight between the last two visits.',
    };
    expect(insight.kind).toBe('weight-loss');
    expect(insight.severity).toBe('caution');
  });
});
