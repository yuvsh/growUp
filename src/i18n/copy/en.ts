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
    keep: 'Keep',
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
  profile: {
    sex: {
      label: "Baby's sex",
      male: 'Male',
      female: 'Female',
      why: 'We use this to choose the correct WHO growth standard.',
    },
    childForm: {
      titleAdd: 'Tell us about your baby',
      titleEdit: 'Edit baby',
      namePlaceholder: "Your baby's name",
      nameLabel: "Baby's name",
      dobLabel: 'Date of birth',
      dobError: 'Date of birth cannot be in the future',
      deleteAction: 'Delete baby',
      deleteModalTitle: 'Delete baby?',
      deleteModalBody:
        'This will permanently remove your baby and all their data. This cannot be undone.',
      saveMutationError: "Couldn't save — your details are still here",
      saving: 'Saving…',
    },
  },
} as const;

export default en;

/** Shape that every locale must match. Derived from the English source. */
export type Copy = typeof en;
