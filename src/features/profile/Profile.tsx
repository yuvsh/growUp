// Profile
// Blueprint: docs/ui-blueprints.md → "Profile"
// Design system: design-system/MASTER.md
// Uses from ui/: Card, Button, Badge, MedicalDisclaimer, BottomTabs
// Philosophy: Apple — quiet summary.
// Data: current child + ageFromDob (lib/growth).
// States: no child → EmptyState "Add your baby to begin" (action → /profile/child);
//         skeleton card on load; calm error + retry.
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'

export function Profile(): React.JSX.Element {
  // TODO: read current child via repository; compute age via ageFromDob; copy via t().
  // Future slot: child switcher + account live here (leave clearly-commented placeholder).
  return (
    <main>
      {/* Section: header — baby name + current age ("3 months, 1 week") as text (not color-coded) */}
      <Card>
        {/* Section: sex + DOB summary */}
        {/* Section: Edit button → /profile/child */}
        <Button variant="secondary" aria-label="Edit baby's profile">{/* t('profile.edit') */}</Button>
      </Card>
      {/* Section: persistent MedicalDisclaimer footer */}
      {/* Section: BottomTabs (Growth/Feeding/Profile) */}
    </main>
  )
}
