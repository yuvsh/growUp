import { describe, it, expect } from 'vitest'
import {
  dailyVolumeRange,
  perFeed,
  toKcalPerMl,
  calorieAdjustedRange,
  standardFeeding,
  classifyIntake,
  intakeNeed,
} from './index'
import {
  STANDARD_KCAL_PER_ML,
  DEFAULT_FEEDS_PER_DAY,
  ML_PER_OZ,
} from '../constants/feeding'

describe('dailyVolumeRange', () => {
  it('returns { minMl: 600, maxMl: 1000 } for a 5 kg baby', () => {
    const result = dailyVolumeRange(5)
    expect(result.minMl).toBe(600)
    expect(result.maxMl).toBe(1000)
  })

  it('scales linearly with weight', () => {
    const result = dailyVolumeRange(3)
    expect(result.minMl).toBe(360)
    expect(result.maxMl).toBe(600)
  })

  it('accepts custom multiplier overrides', () => {
    const result = dailyVolumeRange(5, { minMlPerKg: 100, maxMlPerKg: 150 })
    expect(result.minMl).toBe(500)
    expect(result.maxMl).toBe(750)
  })
})

describe('perFeed', () => {
  it('divides range by feedsPerDay', () => {
    const result = perFeed({ minMl: 600, maxMl: 1000 }, 8)
    expect(result.minMl).toBe(75)
    expect(result.maxMl).toBe(125)
  })

  it('clamps feedsPerDay < 1 to 1 (documented guard)', () => {
    // A feedsPerDay of 0 would produce Infinity; we clamp to 1.
    const result = perFeed({ minMl: 600, maxMl: 1000 }, 0)
    expect(result.minMl).toBe(600)
    expect(result.maxMl).toBe(1000)
  })

  it('clamps negative feedsPerDay to 1', () => {
    const result = perFeed({ minMl: 600, maxMl: 1000 }, -5)
    expect(result.minMl).toBe(600)
    expect(result.maxMl).toBe(1000)
  })

  it('handles fractional feedsPerDay without throwing', () => {
    // 0.5 is clamped to 1 (< 1 guard)
    const result = perFeed({ minMl: 600, maxMl: 1000 }, 0.5)
    expect(result.minMl).toBe(600)
    expect(result.maxMl).toBe(1000)
  })
})

describe('toKcalPerMl', () => {
  it('converts 20 kcal/oz to approx 0.676 kcal/ml', () => {
    const result = toKcalPerMl(20, 'kcal/oz')
    // 20 / 29.5735 ≈ 0.6763
    expect(result).toBeCloseTo(20 / ML_PER_OZ, 5)
    expect(result).toBeCloseTo(0.676, 2)
  })

  it('returns the value unchanged for kcal/ml', () => {
    expect(toKcalPerMl(0.8, 'kcal/ml')).toBe(0.8)
  })

  it('returns STANDARD_KCAL_PER_ML ≈ 0.67 for 20 kcal/oz (reference check)', () => {
    const result = toKcalPerMl(20, 'kcal/oz')
    // The clinical constant rounds to 0.67, conversion is exact at ~0.676.
    expect(result).toBeCloseTo(STANDARD_KCAL_PER_ML, 1)
  })
})

describe('calorieAdjustedRange', () => {
  it('returns adjustedDaily ≈ standard range when using STANDARD_KCAL_PER_ML (same density ⇒ same volume)', () => {
    const result = calorieAdjustedRange(5, STANDARD_KCAL_PER_ML)
    // Same density → adjusted volume ≈ standard volume (600, 1000)
    expect(result.adjustedDaily.minMl).toBeCloseTo(600, 5)
    expect(result.adjustedDaily.maxMl).toBeCloseTo(1000, 5)
  })

  it('returns calorieTarget { minKcal: 402, maxKcal: 670 } for 5 kg at standard density', () => {
    const result = calorieAdjustedRange(5, STANDARD_KCAL_PER_ML)
    // 600 * 0.67 = 402; 1000 * 0.67 = 670
    expect(result.calorieTarget.minKcal).toBeCloseTo(402, 5)
    expect(result.calorieTarget.maxKcal).toBeCloseTo(670, 5)
  })

  it('returns LOWER adjustedDaily when kcalPerMl = 1.0 (more concentrated than standard)', () => {
    const result = calorieAdjustedRange(5, 1.0)
    // calorieTarget stays {402, 670}; volume = kcal / 1.0 = {402, 670} — LOWER than standard {600, 1000}
    expect(result.adjustedDaily.minMl).toBeCloseTo(402, 5)
    expect(result.adjustedDaily.maxMl).toBeCloseTo(670, 5)

    // Key invariant: concentrated formula yields LOWER volume
    expect(result.adjustedDaily.minMl).toBeLessThan(600)
    expect(result.adjustedDaily.maxMl).toBeLessThan(1000)
  })

  it('delivers the same calorieTarget for 5 kg at kcalPerMl = 1.0', () => {
    const result = calorieAdjustedRange(5, 1.0)
    expect(result.calorieTarget.minKcal).toBeCloseTo(402, 5)
    expect(result.calorieTarget.maxKcal).toBeCloseTo(670, 5)
  })

  it('includes adjustedPerFeed using default feedsPerDay', () => {
    const result = calorieAdjustedRange(5, STANDARD_KCAL_PER_ML)
    expect(result.adjustedPerFeed.minMl).toBeCloseTo(600 / DEFAULT_FEEDS_PER_DAY, 5)
    expect(result.adjustedPerFeed.maxMl).toBeCloseTo(1000 / DEFAULT_FEEDS_PER_DAY, 5)
  })

  it('uses custom feedsPerDay when provided', () => {
    const result = calorieAdjustedRange(5, STANDARD_KCAL_PER_ML, 6)
    expect(result.adjustedPerFeed.minMl).toBeCloseTo(600 / 6, 5)
    expect(result.adjustedPerFeed.maxMl).toBeCloseTo(1000 / 6, 5)
  })

  it('echoes the provided kcalPerMl in the result', () => {
    const result = calorieAdjustedRange(5, 0.8)
    expect(result.kcalPerMl).toBe(0.8)
  })

  it('throws when kcalPerMl <= 0', () => {
    expect(() => calorieAdjustedRange(5, 0)).toThrow('kcalPerMl must be greater than 0')
    expect(() => calorieAdjustedRange(5, -1)).toThrow('kcalPerMl must be greater than 0')
  })
})

describe('classifyIntake', () => {
  const need = { minMl: 600, maxMl: 1000 }

  it('returns "below" when intake is strictly below minMl', () => {
    expect(classifyIntake(599, need)).toBe('below')
  })

  it('returns "within" when intake equals minMl (lower bound inclusive)', () => {
    expect(classifyIntake(600, need)).toBe('within')
  })

  it('returns "within" when intake is between min and max', () => {
    expect(classifyIntake(800, need)).toBe('within')
  })

  it('returns "within" when intake equals maxMl (upper bound inclusive)', () => {
    expect(classifyIntake(1000, need)).toBe('within')
  })

  it('returns "above" when intake is strictly above maxMl', () => {
    expect(classifyIntake(1001, need)).toBe('above')
  })

  it('returns "below" for intake = 0 against any positive range', () => {
    expect(classifyIntake(0, need)).toBe('below')
  })
})

describe('standardFeeding', () => {
  it('returns a complete StandardFeedingResult for a 5 kg baby with 8 feeds', () => {
    const result = standardFeeding(5, 8)
    expect(result.weightKg).toBe(5)
    expect(result.daily.minMl).toBe(600)
    expect(result.daily.maxMl).toBe(1000)
    expect(result.perFeed.minMl).toBe(75)
    expect(result.perFeed.maxMl).toBe(125)
    expect(result.feedsPerDay).toBe(8)
  })

  it('uses DEFAULT_FEEDS_PER_DAY when feedsPerDay is omitted', () => {
    const result = standardFeeding(5)
    expect(result.feedsPerDay).toBe(DEFAULT_FEEDS_PER_DAY)
  })
})

describe('intakeNeed', () => {
  describe('standard formula (kcalPerMl omitted or undefined)', () => {
    it('returns min=600, target=750, max=1000 for a 5 kg baby (factor=1)', () => {
      const result = intakeNeed(5)
      expect(result.minMl).toBe(600)       // 5 * 120 * 1
      expect(result.targetMl).toBe(750)    // 5 * 150 * 1
      expect(result.maxMl).toBe(1000)      // 5 * 200 * 1
    })

    it('scales linearly with weight', () => {
      const result = intakeNeed(3)
      expect(result.minMl).toBe(360)       // 3 * 120
      expect(result.targetMl).toBe(450)    // 3 * 150
      expect(result.maxMl).toBe(600)       // 3 * 200
    })

    it('passing undefined explicitly is equivalent to omitting kcalPerMl', () => {
      const a = intakeNeed(5, undefined)
      const b = intakeNeed(5)
      expect(a).toEqual(b)
    })
  })

  describe('high-calorie formula (kcalPerMl = 1.0)', () => {
    // factor = STANDARD_KCAL_PER_ML / 1.0 = 0.67
    // 5 kg → min = 600 * 0.67 = 402, target = 750 * 0.67 = 502.5, max = 1000 * 0.67 = 670
    it('returns lower volumes when kcalPerMl > STANDARD_KCAL_PER_ML', () => {
      const result = intakeNeed(5, 1.0)
      expect(result.minMl).toBeCloseTo(5 * 120 * (STANDARD_KCAL_PER_ML / 1.0), 5)
      expect(result.targetMl).toBeCloseTo(5 * 150 * (STANDARD_KCAL_PER_ML / 1.0), 5)
      expect(result.maxMl).toBeCloseTo(5 * 200 * (STANDARD_KCAL_PER_ML / 1.0), 5)
    })

    it('minMl is approximately 402 for 5 kg at kcalPerMl = 1.0', () => {
      const result = intakeNeed(5, 1.0)
      expect(result.minMl).toBeCloseTo(402, 0)
    })

    it('maxMl is approximately 670 for 5 kg at kcalPerMl = 1.0', () => {
      const result = intakeNeed(5, 1.0)
      expect(result.maxMl).toBeCloseTo(670, 0)
    })

    it('all values are lower than the standard need', () => {
      const standard = intakeNeed(5)
      const highCal = intakeNeed(5, 1.0)
      expect(highCal.minMl).toBeLessThan(standard.minMl)
      expect(highCal.targetMl).toBeLessThan(standard.targetMl)
      expect(highCal.maxMl).toBeLessThan(standard.maxMl)
    })
  })

  describe('standard formula passed explicitly (kcalPerMl = STANDARD_KCAL_PER_ML)', () => {
    it('returns the same result as omitting kcalPerMl (factor = 1)', () => {
      const explicit = intakeNeed(5, STANDARD_KCAL_PER_ML)
      const omitted = intakeNeed(5)
      expect(explicit.minMl).toBeCloseTo(omitted.minMl, 5)
      expect(explicit.targetMl).toBeCloseTo(omitted.targetMl, 5)
      expect(explicit.maxMl).toBeCloseTo(omitted.maxMl, 5)
    })
  })
})
