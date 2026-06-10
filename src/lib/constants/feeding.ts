/**
 * Feeding calculator constants.
 *
 * Clinical rule of thumb (standard neonatal/infant nutrition practice):
 *   - 120–200 ml/kg/day covers the typical hydration and energy range for
 *     healthy term infants, including those being managed for FTT/IUGR.
 *   - Standard cow's-milk-based formula (20 kcal/oz) delivers ≈ 0.67 kcal/ml.
 *   - High-calorie formula delivers more kcal per ml, so the same daily calorie
 *     target is met with a proportionally lower volume.
 *
 * All multipliers and reference densities are surfaced here as named constants
 * so downstream logic contains no magic numbers.
 */

/** Minimum daily fluid intake: 120 ml per kg of body weight. */
export const ML_PER_KG_MIN: number = 120

/** Target daily fluid intake: 150 ml per kg of body weight (common clinical target). */
export const ML_PER_KG_TARGET: number = 150

/** Maximum daily fluid intake: 200 ml per kg of body weight. */
export const ML_PER_KG_MAX: number = 200

/** Default number of feeds per day for a typical infant feeding schedule. */
export const DEFAULT_FEEDS_PER_DAY: number = 8

/**
 * Standard formula energy density: approximately 0.67 kcal per ml.
 * Equivalent to 20 kcal/oz (standard formula); used as the reference
 * baseline when computing calorie-matched volumes for high-calorie formulas.
 */
export const STANDARD_KCAL_PER_ML: number = 0.67

/**
 * Energy content of standard formula expressed in the conventional US unit:
 * 20 kcal per fluid ounce.
 */
export const KCAL_PER_OZ_STANDARD: number = 20

/**
 * Exact ml per US fluid ounce (29.5735 ml/oz).
 * Used to convert between kcal/oz and kcal/ml:
 *   kcalPerMl = kcalPerOz / ML_PER_OZ
 */
export const ML_PER_OZ: number = 29.5735
