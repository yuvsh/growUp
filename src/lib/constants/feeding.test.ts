import { describe, it, expect } from 'vitest'
import {
  ML_PER_KG_MIN,
  ML_PER_KG_MAX,
  DEFAULT_FEEDS_PER_DAY,
  STANDARD_KCAL_PER_ML,
  KCAL_PER_OZ_STANDARD,
  ML_PER_OZ,
} from './feeding'

describe('feeding constants', () => {
  it('ML_PER_KG_MIN equals 120', () => {
    expect(ML_PER_KG_MIN).toBe(120)
  })

  it('ML_PER_KG_MAX equals 200', () => {
    expect(ML_PER_KG_MAX).toBe(200)
  })

  it('DEFAULT_FEEDS_PER_DAY equals 8', () => {
    expect(DEFAULT_FEEDS_PER_DAY).toBe(8)
  })

  it('STANDARD_KCAL_PER_ML equals 0.67', () => {
    expect(STANDARD_KCAL_PER_ML).toBe(0.67)
  })

  it('KCAL_PER_OZ_STANDARD equals 20', () => {
    expect(KCAL_PER_OZ_STANDARD).toBe(20)
  })

  it('ML_PER_OZ equals 29.5735', () => {
    expect(ML_PER_OZ).toBe(29.5735)
  })

  it('MIN is strictly less than MAX (sanity check)', () => {
    expect(ML_PER_KG_MIN).toBeLessThan(ML_PER_KG_MAX)
  })

  it('STANDARD_KCAL_PER_ML is positive', () => {
    expect(STANDARD_KCAL_PER_ML).toBeGreaterThan(0)
  })
})
