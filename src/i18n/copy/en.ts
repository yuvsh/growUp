/**
 * English copy — the canonical source of truth for all UI strings.
 *
 * Rules:
 * - Every user-visible string lives here (never hardcoded in components).
 * - The `Copy` type is derived from this object so that `he.ts` (and any other
 *   locale) must satisfy the same shape — a missing or extra key is a TS error.
 * - Keys follow dot-path conventions: <namespace>.<key>.
 */

const en = {
  app: {
    name: 'GrowUp',
  },
  nav: {
    growth: 'Growth',
    feeding: 'Feeding',
    profile: 'Profile',
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
  },
  onboarding: {
    cta: 'Add your baby',
  },
  disclaimer: {
    body:
      'GrowUp helps you track your baby\'s weight and feeding at home. ' +
      'It is for informational purposes only and is not a substitute for ' +
      'professional medical advice. If your baby has been diagnosed with ' +
      'failure to thrive (FTT) or intrauterine growth restriction (IUGR), ' +
      'please follow the guidance of your healthcare provider.',
  },
} as const;

export default en;

/** Shape that every locale must match. Derived from the English source. */
export type Copy = typeof en;
