import { describe, it, expect } from 'vitest';
import { computeInsights, SLOW_VELOCITY_THRESHOLD_G_PER_DAY } from './insights';
import type { WeightEntry } from '../../types';

/** Build a minimal WeightEntry for test purposes. */
function entry(dateMeasured: string, weightGrams: number): WeightEntry {
  return {
    id: dateMeasured,
    childId: 'test-child',
    ownerId: 'test-owner',
    dateMeasured,
    weightGrams,
    createdAt: `${dateMeasured}T00:00:00Z`,
    updatedAt: `${dateMeasured}T00:00:00Z`,
  };
}

const SEX = 'male' as const;
// DOB: baby is ~60 days old at first measurement (well within LMS table range)
const DOB = '2024-01-01';

describe('computeInsights', () => {
  it('returns empty array for 0 entries', () => {
    expect(computeInsights([], SEX, DOB)).toEqual([]);
  });

  describe('strictly dropping series', () => {
    // A series where weight decreases every day — velocity ≈ -20 g/day, percentile drops.
    // All entries around age 60–63 days (good median weight in table ~4800 g for male 60d).
    const droppingEntries = [
      entry('2024-03-01', 4800), // age ~60d
      entry('2024-03-02', 4780), // age ~61d
      entry('2024-03-03', 4760), // age ~62d
    ];

    it('flags weight-loss', () => {
      const insights = computeInsights(droppingEntries, SEX, DOB);
      const ids = insights.map((i) => i.id);
      expect(ids).toContain('weight-loss');
    });

    it('flags percentile-drop', () => {
      const insights = computeInsights(droppingEntries, SEX, DOB);
      const ids = insights.map((i) => i.id);
      expect(ids).toContain('percentile-drop');
    });

    it('all caution insights have severity=caution', () => {
      const insights = computeInsights(droppingEntries, SEX, DOB);
      for (const insight of insights) {
        expect(insight.severity).toBe('caution');
      }
    });
  });

  describe('slow-velocity rule', () => {
    it('flags slow-velocity when velocity < threshold', () => {
      // velocity ≈ 2 g/day, well below SLOW_VELOCITY_THRESHOLD_G_PER_DAY
      const entries = [
        entry('2024-03-01', 4800), // age ~60d
        entry('2024-03-02', 4802), // age ~61d (+2 g/d)
        entry('2024-03-03', 4804), // age ~62d (+2 g/d)
      ];
      const insights = computeInsights(entries, SEX, DOB);
      const ids = insights.map((i) => i.id);
      expect(ids).toContain('slow-velocity');
    });

    it('does NOT flag slow-velocity when velocity is above threshold', () => {
      // velocity ≈ SLOW_VELOCITY_THRESHOLD_G_PER_DAY + 10 = 20 g/day
      const gain = SLOW_VELOCITY_THRESHOLD_G_PER_DAY + 10;
      const entries = [
        entry('2024-03-01', 4800),
        entry('2024-03-02', 4800 + gain),
        entry('2024-03-03', 4800 + gain * 2),
      ];
      const insights = computeInsights(entries, SEX, DOB);
      const ids = insights.map((i) => i.id);
      expect(ids).not.toContain('slow-velocity');
    });
  });

  describe('healthy climbing series', () => {
    // Weight grows fast (+30 g/day) and is above 3rd percentile — no caution insights.
    const healthyEntries = [
      entry('2024-03-01', 4800),
      entry('2024-03-02', 4830),
      entry('2024-03-03', 4860),
      entry('2024-03-04', 4890),
    ];

    it('does not flag weight-loss', () => {
      const insights = computeInsights(healthyEntries, SEX, DOB);
      const ids = insights.map((i) => i.id);
      expect(ids).not.toContain('weight-loss');
    });

    it('does not flag slow-velocity', () => {
      const insights = computeInsights(healthyEntries, SEX, DOB);
      const ids = insights.map((i) => i.id);
      expect(ids).not.toContain('slow-velocity');
    });

    it('does not flag percentile-drop', () => {
      const insights = computeInsights(healthyEntries, SEX, DOB);
      const ids = insights.map((i) => i.id);
      expect(ids).not.toContain('percentile-drop');
    });
  });

  describe('insight shape', () => {
    it('each insight has all required fields', () => {
      const droppingEntries = [
        entry('2024-03-01', 4800),
        entry('2024-03-02', 4780),
      ];
      const insights = computeInsights(droppingEntries, SEX, DOB);
      expect(insights.length).toBeGreaterThan(0);
      for (const insight of insights) {
        expect(typeof insight.id).toBe('string');
        expect(typeof insight.kind).toBe('string');
        expect(['info', 'caution']).toContain(insight.severity);
        expect(typeof insight.title).toBe('string');
        expect(insight.title.length).toBeGreaterThan(0);
        expect(typeof insight.body).toBe('string');
        expect(insight.body.length).toBeGreaterThan(0);
      }
    });
  });
});
