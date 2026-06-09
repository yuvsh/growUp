// Add / Edit Weight (modal / bottom-sheet over /growth)
// Blueprint: docs/ui-blueprints.md → "Add / Edit Weight"
// Design system: design-system/MASTER.md
// Uses from ui/: Modal, Input, Button, Toast
// Philosophy: Apple — two fields, fast.
// Data: repository.weights.create/update/delete; Zod validation; weight stored as INTEGER GRAMS.
// States: blank (add) / prefilled (edit); Save spinner; errors below fields
//         ("Please enter a weight"; "Date must be between birth and 24 months"); save fail → Toast.
import { Modal } from '../../components/ui/modal'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'

interface WeightFormProps {
  open: boolean
  onClose: () => void
  // entryId?: string  // edit mode when provided
}

export function WeightForm({ open, onClose }: WeightFormProps): React.JSX.Element {
  // TODO: react-hook-form + Zod (weight > 0; date ≥ DOB and within 0–24 months).
  // On save: recompute percentile/z; update chart + history. inputMode="decimal" for weight.
  return (
    <Modal open={open} onClose={onClose} title="Add weight">
      {/* Section: Weight field (kg + grams, unit shown) */}
      <Input id="weight" label="Weight" inputMode="decimal" />
      {/* Section: Date field (defaults today) */}
      <Input id="measured-date" label="Date" type="date" />
      {/* Section: actions — Save (primary); edit mode adds Delete (destructive confirm) */}
      <Button variant="primary">{/* t('common.save') */}</Button>
    </Modal>
  )
}
