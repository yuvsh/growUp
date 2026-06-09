// Feeding calculator
// Blueprint: docs/ui-blueprints.md → "Feeding"
// Design system: design-system/MASTER.md
// Uses from ui/: Card, Input, Button, Badge, EmptyState, BottomTabs
// Screen components to create: FeedsPerDayStepper.tsx, HighCaloriePanel.tsx
// Philosophy: Apple — calm calculator, transparent math.
// Data: repository.feedingConfig (persist prefs) + lib/feeding (pure math).
// Constants (named, configurable): mlPerKgMin=120, mlPerKgMax=200, standard density 0.67 kcal/ml.
// States: no weight → EmptyState "Enter a weight to see feeding amounts" (+ link to add a weight);
//         errors: "Enter a valid weight" / "Feeds per day must be at least 1" / "Enter your formula's calories".
// Results announced via aria-live="polite" on input change.
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'

export function Feeding(): React.JSX.Element {
  // TODO: prefill weight from latest weight entry; compute dailyVolumeRange, perFeed, calorieAdjustedRange.
  return (
    <main>
      {/* Section 1: Weight input (prefilled from latest entry; editable) */}
      <Input id="feeding-weight" label="Baby's weight" inputMode="decimal" />
      {/* Section 2: Daily volume range card — 120–200 ml/kg/day (multipliers shown, editable constants) */}
      <Card>{/* daily ml range */}</Card>
      {/* Section 3: Per-feed — FeedsPerDayStepper (default 8) → per-feed ml */}
      {/* Section 4: HighCaloriePanel — toggle; kcal/ml or kcal/oz; calorie target + matched (lower) volume; math visible */}
      <Card>{/* high-calorie results */}</Card>
      {/* Section: BottomTabs */}
    </main>
  )
}
