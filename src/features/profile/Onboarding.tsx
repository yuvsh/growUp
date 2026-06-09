// Onboarding / Welcome
// Blueprint: docs/ui-blueprints.md → "Onboarding / Welcome" (read before any visual logic)
// Design system: design-system/MASTER.md
// Uses from ui/: Button, Card, MedicalDisclaimer
// Philosophy: Apple — warm, spacious, single CTA. First impression must calm, not overwhelm.
// States: this screen IS the empty state (no child yet); brief skeleton on load; calm error+retry.
// Responsive: mobile single column (CTA full width); desktop centered max-w ~480px.
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
// import { MedicalDisclaimer } from '../../components/ui/medical-disclaimer'

export function Onboarding(): React.JSX.Element {
  // TODO: if repository.children.list() returns any child → redirect to /growth (React Router).
  // TODO: copy via t() (i18n) — no literal strings. Tokens only, no raw hex/px.
  return (
    <main>
      {/* Section: soft organic blob accent + heading "Welcome to GrowUp" (motion-safe drift) */}
      {/* Section: one reassuring sentence about calm growth & feeding tracking */}
      <Card>
        {/* Section: MedicalDisclaimer — non-dismissable */}
      </Card>
      {/* Section: primary CTA → navigate to /profile/child */}
      <Button variant="primary" fullWidthOnMobile aria-label="Add your baby">
        {/* t('onboarding.cta') */}
      </Button>
    </main>
  )
}
