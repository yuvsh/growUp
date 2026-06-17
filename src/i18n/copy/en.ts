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
    welcomeTitle: 'Welcome to GrowUp',
    welcomeBody:
      'Track your baby\'s growth and feeding with calm, reassuring insights — all in one place.',
    storage: {
      title: 'Where should your baby\'s data live?',
      deviceTitle: 'Keep on this device',
      deviceBody: 'Private. Stays on this phone, works offline, no account.',
      syncTitle: 'Sync to my account',
      syncBody:
        'Backed up and on your other devices. Sign in with Google.',
    },
  },
  sync: {
    migration: {
      title: 'Upload your data to your account?',
      body:
        'We found {children} baby profile(s) and {weights} weight entries on this device. Uploading copies them to your account so they\'re backed up and on your other devices. Nothing is removed from this device.',
      upload: 'Upload',
      uploading: 'Uploading…',
      notNow: 'Not now',
      success: 'Uploaded {n} items to your account.',
      error:
        'We couldn\'t upload everything just now. Your data is safe on this device — please try again.',
    },
    settings: {
      title: 'Storage & privacy',
      modeLabel: 'Where your data lives',
      modeLocal: 'On this device',
      modeRemote: 'Synced — {email}',
      switchToRemote: 'Sync to my account',
      switchToLocal: 'Keep on this device only',
      switchToLocalConfirm:
        'Copy your synced data back to this device and stop syncing? Your cloud copy stays until you delete it.',
      switchToLocalDone:
        'Your data is now on this device. A copy is kept in the cloud until you delete it.',
      switchError:
        'We couldn\'t change your storage just now. Please try again — your data is safe.',
      exportButton: 'Export my data',
      exportSuccess: 'Your data has been exported.',
      exportError:
        'We couldn\'t export your data just now. Please try again.',
      privacyNote:
        'When synced, your data is stored securely in the cloud and only you can read it. In on-device mode it never leaves this phone.',
    },
    delete: {
      button: 'Delete my synced data',
      confirmTitle: 'Delete everything?',
      confirmBody:
        'This removes all your synced data from the cloud. It cannot be undone. This does not delete your Google sign-in.',
      confirm: 'Delete everything',
      keep: 'Keep',
      success: 'Your synced data has been removed.',
      error:
        'We couldn\'t delete your data just now. Please try again.',
    },
  },
  auth: {
    signInTitle: 'Sign in to continue',
    signInBody:
      'Sign in with your Google account to reach your baby\'s synced data.',
    signInWithGoogle: 'Continue with Google',
    signingIn: 'Signing in…',
    signInError:
      'We couldn\'t sign you in just now. Please try again — your data is safe.',
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
    title: 'Profile',
    edit: 'Edit',
    editAriaLabel: "Edit baby's profile",
    dobLabel: 'Date of birth',
    sexLabel: 'Sex',
    empty: {
      title: 'Add your baby to begin',
      cta: 'Add your baby',
    },
    error: {
      title: "We couldn't load your profile",
      description: 'Please try again.',
    },
    sex: {
      label: "Baby's sex",
      male: 'Boy',
      female: 'Girl',
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
  growth: {
    title: 'Growth',
    addWeight: 'Add weight',
    latestWeight: 'Latest weight',
    percentile: 'Percentile',
    zScore: 'Z-score',
    empty: {
      title: "Add your baby's first weight to see the chart",
      cta: 'Add weight',
    },
    error: {
      title: "We couldn't load your measurements",
      description: 'Please try again.',
    },
    chart: {
      title: 'Weight for age',
      fallbackHeading: 'Latest measurements',
      ageAxis: 'Age (months)',
      weightAxis: 'Weight (kg)',
      babyLabel: 'Your baby',
    },
    history: {
      title: 'History',
      editAria: 'Edit weight entry',
      deleteAria: 'Delete weight entry',
      empty: 'No weights recorded yet.',
    },
    alert: {
      title: 'A gentle heads-up',
      belowThird: "Your baby's latest weight is below the 3rd percentile line.",
      currentPercentile: 'Current percentile',
      gramGap: 'to reach the 3rd-percentile line',
      trendLabel: 'Recent trend',
      trendImproving: 'improving',
      trendSteady: 'holding steady',
      trendDeclining: 'declining',
      nextStep: "Bring this to your pediatrician or dietitian — they're your best guide.",
    },
    projection: {
      title: '4-week outlook',
      velocity: 'Recent weight gain',
      forecast: 'Projected weight in 4 weeks',
      projectedPercentile: 'Projected percentile',
      gainNeeded: 'To reach the 3rd percentile',
      perDay: 'per day',
      perWeek: 'per week',
      notEnough: 'Add one more weight to see a projection.',
      assumptions: 'Based on the recent rate of gain, if it continues.',
    },
    insights: {
      title: 'Insights',
      empty: 'Add a couple of weights to unlock insights.',
      severity: {
        info: 'Info',
        caution: 'Caution',
      },
      'weight-loss': {
        title: 'Weight loss detected',
        body: 'Your baby lost weight between two consecutive measurements. This can be normal shortly after birth but warrants attention if it continues.',
      },
      'slow-velocity': {
        title: 'Slow weight gain',
        body: 'Weight gain is below {threshold} g/day. Speak with your healthcare provider if this continues.',
      },
      'percentile-drop': {
        title: 'Percentile dropping',
        body: 'Your baby\'s weight percentile has fallen between measurements. A single drop may be normal, but a sustained trend is worth discussing with your doctor.',
      },
    },
    weightForm: {
      titleAdd: 'Add weight',
      titleEdit: 'Edit weight',
      weightLabel: 'Weight (kg)',
      dateLabel: 'Date',
      weightError: 'Please enter a weight.',
      dateBeforeBirthError: 'Date cannot be before your baby was born.',
      dateBeyondRangeError: 'This tool covers the first 24 months.',
      saveError: "Couldn't save — your entry is still here.",
      deleteConfirmTitle: 'Delete this weight?',
      deleteConfirmBody: 'This entry will be removed from the chart and history.',
    },
    chartToggle: {
      label: 'Chart view',
      weight: 'Weight',
      zscore: 'Z-score',
    },
    chartRange: {
      label: 'Time range',
      m1: '1 mo',
      m3: '3 mo',
      m6: '6 mo',
      all: 'All',
      full: '2 yr',
    },
    import: {
      button: 'Import from Nara Baby',
      title: 'Import from Nara Baby',
      summary: 'Found {found} weights: {new} new, {update} to update, {skipped} skipped',
      confirm: 'Import',
      cancel: 'Cancel',
      success: 'Imported {count} weight entries',
      parseError: 'Could not read the file. Please make sure it is a valid Nara Baby CSV export.',
      empty: 'No weight entries were found in this file.',
      fileInputLabel: 'Select Nara Baby CSV file',
    },
    zChart: {
      title: 'Z-score for age',
      yAxis: 'Z-score',
      refMedian: 'Median (0)',
      refLow: '−2',
      refVeryLow: '−3',
      fallbackHeading: 'Z-score measurements',
      colDate: 'Date',
      colAge: 'Age',
      colWeight: 'Weight (kg)',
      colZScore: 'Z-score',
      colPercentile: 'Percentile',
    },
  },
  feeding: {
    title: 'Feeding',
    weightLabel: "Baby's weight (kg)",
    dailyRange: 'Daily amount',
    perFeed: 'Per feed',
    feedsPerDay: 'Feeds per day',
    mlPerDay: 'ml per day',
    ml: 'ml',
    empty: {
      title: 'Enter a weight to see feeding amounts',
      cta: 'Add a weight',
    },
    weightError: 'Please enter a valid weight.',
    feedsError: 'Feeds per day must be at least 1.',
    stepper: {
      increase: 'Increase feeds per day',
      decrease: 'Decrease feeds per day',
    },
    highCalorie: {
      toggle: 'High-calorie / special formula',
      kcalLabel: 'Formula calories',
      unitMl: 'kcal/ml',
      calorieTarget: 'Calorie target',
      adjustedRange: 'Adjusted daily amount',
      explainer:
        'A more concentrated formula needs a smaller volume to deliver the same calories.',
      kcalError: "Enter your formula's calorie content.",
    },
    rangeNote: 'Based on 120–200 ml per kg per day.',
    intake: {
      label: 'Average daily intake — last 7 days',
      unit: 'ml/day',
      prompt: "Enter your baby's average daily intake to compare it with their needs.",
      recommended: 'recommended {min}–{max} ml/day',
      value: '≈ {value} ml/day',
      within: 'within the recommended range',
      below: 'below the recommended range',
      above: 'above the recommended range',
      gaugeTitle: 'Intake vs. need',
    },
  },
  clinic: {
    entry: {
      heading: 'Clinic Mode',
      description:
        'A fast, exact WHO growth read for the visit — no account, no setup.',
      noticeNotSaved:
        'Nothing is saved. The read stays on screen during the visit and is gone when you close it.',
      noticeJudgment:
        'Clinic Mode supports — it does not replace — your clinical judgment.',
      cta: 'Start a read',
      back: 'Back to GrowUp',
      openLink: 'Are you a clinician? Open Clinic Mode',
    },
    form: {
      title: 'Enter the baby’s details',
      dobLabel: 'Date of birth',
      sexLabel: 'Sex',
      birthWeightLabel: 'Birth weight (g)',
      currentWeightLabel: 'Current weight (g)',
      currentWeightDateLabel: 'Measurement date',
      whyWeAsk:
        'WHO standards differ by sex, age is computed to the exact day, and birth weight anchors the trend at day 0.',
      getRead: 'Get read',
      clear: 'Clear',
      validation: {
        dobRequired: 'Please enter the date of birth',
        dobFuture: 'Date of birth cannot be in the future',
        sexRequired: 'Please select a sex',
        birthWeightRequired: 'Please enter the birth weight',
        birthWeightPositive: 'Birth weight must be greater than zero',
        currentWeightRequired: 'Please enter at least one current weight',
        currentWeightPositive: 'Weight must be greater than zero',
        dateBeforeBirth: 'Measurement date cannot be before the date of birth',
        ageOutOfRange: 'This age is outside the WHO 0–24 month standard',
        secondDateBeforeFirst: 'The second weight must be on or after the first',
        sameDatePair: 'The two weights must be on different dates',
        implausibleWeight: 'That weight looks unusual — please confirm it’s correct.',
      },
    },
    result: {
      bornAndNow: 'Born at the {birth} percentile, now at the {current} percentile.',
      belowThird:
        'The latest weight is below the 3rd percentile line — a calm, factual read to share.',
      onTrack: 'The latest weight is tracking on a healthy percentile.',
      maintenance: 'On or above a healthy percentile — the goal is to maintain, not catch up.',
      trendTitle: 'Trend since birth',
      trendGain: 'Gaining',
      trendLoss: 'Losing',
      trendFlat: 'Holding steady',
      perDay: 'per day',
      perWeek: 'per week',
      catchUpTitle: 'Catch-up target',
      catchUpLabel: 'To reach the 3rd-percentile line',
      maintenanceTitle: 'Maintenance',
      maintenanceLabel: 'To hold the current percentile',
      newRead: 'New read',
      addWeight: '+ Add another weight',
      addWeightTitle: 'Add another weight',
      addWeightSave: 'Add',
      addWeightCancel: 'Cancel',
      disclaimer:
        'This read supports — it does not replace — clinical judgment. Nothing is saved.',
    },
  },
} as const;

export default en;

/** Shape that every locale must match. Derived from the English source. */
export type Copy = typeof en;
