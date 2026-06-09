// Add / Edit Child
// Blueprint: docs/ui-blueprints.md → "Add / Edit Child"
// Design system: design-system/MASTER.md
// Uses from ui/: Input, Button, Card, Modal (delete confirm), Toast
// Screen components to create alongside: SexSelector.tsx
// Philosophy: Apple — calm single-purpose form.
// Data: repository.children.create/update/delete; Zod validation; ownerId from AuthContext.
// States: blank (add) / prefilled (edit); Save spinner; field errors below each field;
//         save failure → Toast "Couldn't save — your details are still here".
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'

export function ChildForm(): React.JSX.Element {
  // TODO: react-hook-form + Zod schema (name required; sex required; DOB not in future).
  // TODO: stamp ownerId from AuthContext; persist via repository; copy via t().
  return (
    <main>
      <Card>
        {/* Section: title "Tell us about your baby" / "Edit baby" */}
        {/* Section: Name field */}
        <Input id="name" label="Name" />
        {/* Section: Sex segmented control (male/female) + "why we ask" helper (WHO differs by sex) */}
        {/* <SexSelector /> */}
        {/* Section: Date of birth (date input; cannot be future; error below field) */}
        <Input id="dob" label="Date of birth" type="date" />
        {/* Section: actions — primary Save, secondary Cancel; edit mode: quiet Delete (Modal confirm) */}
        <Button variant="primary">{/* t('common.save') */}</Button>
      </Card>
    </main>
  )
}
