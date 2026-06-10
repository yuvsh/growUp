/** Discriminated union for biological sex — used for WHO table selection */
export type Sex = 'male' | 'female';

/** The infant being tracked. Maps to future `children` DB table. */
export interface Child {
  id: string;
  ownerId: string;
  name: string;
  sex: Sex;
  /** ISO YYYY-MM-DD */
  dateOfBirth: string;
  /** UTC ISO timestamp */
  createdAt: string;
  /** UTC ISO timestamp */
  updatedAt: string;
}

/** One weight measurement on a date. Maps to future `weight_entries` DB table. */
export interface WeightEntry {
  id: string;
  childId: string;
  ownerId: string;
  /** ISO YYYY-MM-DD */
  dateMeasured: string;
  /** Stored as integer grams to avoid floating-point drift */
  weightGrams: number;
  /** UTC ISO timestamp */
  createdAt: string;
  /** UTC ISO timestamp */
  updatedAt: string;
}

/** Per-child feeding calculator preferences. Maps to future `feeding_configs` DB table. */
export interface FeedingConfig {
  id: string;
  childId: string;
  ownerId: string;
  /** Number of feeds per day; integer ≥ 1 */
  feedsPerDay: number;
  /** Whether to apply high-calorie formula adjustment */
  useHighCalorie: boolean;
  /** kcal per ml for the formula in use (default 0.67) */
  kcalPerMl: number;
  /** ml per kg per day — minimum end of range (default 120) */
  mlPerKgMin: number;
  /** ml per kg per day — maximum end of range (default 200); must be ≥ mlPerKgMin */
  mlPerKgMax: number;
  /** Average daily intake in ml/day over the last 7 days — optional, user-entered */
  avgIntakeMlPerDay?: number;
  /** UTC ISO timestamp */
  createdAt: string;
  /** UTC ISO timestamp */
  updatedAt: string;
}
