// Add / Edit Weight (modal / bottom-sheet over /growth)
// Blueprint: docs/ui-blueprints.md → "Add / Edit Weight"
// Design system: design-system/MASTER.md
// Uses from ui/: Modal, Input, Button, Toast
// Philosophy: Apple — two fields, fast.
// Data: repository.weights.create/update/delete; Zod validation; weight stored as INTEGER GRAMS.
// States: blank (add) / prefilled (edit); Save spinner; errors below fields
//         ("Please enter a weight"; "Date must be between birth and 24 months"); save fail → Toast.
import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '../../components/ui/modal'
import { Input } from '../../components/ui/input'
import { Button } from '../../components/ui/button'
import { Toast } from '../../components/ui/toast'
import { useWeights, isWeightDateValid } from '../../lib/hooks/useWeights'
import { t } from '../../i18n/t'
import type { WeightEntry } from '../../types/index'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface WeightFormProps {
  open: boolean
  onClose: () => void
  childId: string
  dateOfBirth: string
  entry?: WeightEntry
}

// ---------------------------------------------------------------------------
// Form schema
// ---------------------------------------------------------------------------

interface WeightFormFields {
  weightKg: string
  dateMeasured: string
}

function getTodayIso(): string {
  return new Date().toISOString().split('T')[0] as string
}

// Return type is inferred so the concrete ZodObject is preserved for zodResolver
// (annotating it as the abstract z.ZodType breaks the resolver's overload match).
function buildSchema(dateOfBirth: string) {
  return z.object({
    weightKg: z
      .string()
      .min(1, t('growth.weightForm.weightError'))
      .refine(
        (v) => {
          const n = parseFloat(v)
          return !isNaN(n) && n > 0
        },
        { message: t('growth.weightForm.weightError') },
      ),
    dateMeasured: z
      .string()
      .min(1, t('growth.weightForm.weightError'))
      .superRefine((val, ctx) => {
        const result = isWeightDateValid(val, dateOfBirth)
        if (!result.ok) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              result.reason === 'before-birth'
                ? t('growth.weightForm.dateBeforeBirthError')
                : t('growth.weightForm.dateBeyondRangeError'),
          })
        }
      }),
  })
}

// ---------------------------------------------------------------------------
// Delete confirm nested modal
// ---------------------------------------------------------------------------

interface DeleteConfirmProps {
  open: boolean
  onConfirm: () => void
  onCancel: () => void
}

function DeleteConfirm({
  open,
  onConfirm,
  onCancel,
}: DeleteConfirmProps): React.JSX.Element {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('growth.weightForm.deleteConfirmTitle')}
      footer={
        <div className="flex justify-end gap-[var(--space-3)]">
          <Button variant="secondary" onClick={onCancel}>
            {t('common.keep')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('common.delete')}
          </Button>
        </div>
      }
    >
      <p className="text-[var(--text-body)] text-[var(--color-foreground)]">
        {t('growth.weightForm.deleteConfirmBody')}
      </p>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// WeightForm
// ---------------------------------------------------------------------------

export function WeightForm({
  open,
  onClose,
  childId,
  dateOfBirth,
  entry,
}: WeightFormProps): React.JSX.Element {
  const isEditMode = entry !== undefined

  const { addWeight, editWeight, deleteWeight } = useWeights(childId)

  const [saveError, setSaveError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const defaultWeightKg = isEditMode
    ? String(entry.weightGrams / 1000)
    : ''

  const defaultDate = isEditMode ? entry.dateMeasured : getTodayIso()

  const schema = buildSchema(dateOfBirth)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<WeightFormFields>({
    resolver: zodResolver(schema),
    defaultValues: {
      weightKg: defaultWeightKg,
      dateMeasured: defaultDate,
    },
  })

  // Re-populate form fields whenever the modal opens or the entry changes.
  // react-hook-form captures defaultValues once at mount, so the modal reuse
  // pattern requires an explicit reset on each open.
  useEffect(() => {
    if (!open) return
    reset({
      weightKg: entry !== undefined ? String(entry.weightGrams / 1000) : '',
      dateMeasured: entry !== undefined ? entry.dateMeasured : getTodayIso(),
    })
  }, [open, entry, reset])

  function handleClose(): void {
    setSaveError(null)
    reset()
    onClose()
  }

  async function onSubmit(data: WeightFormFields): Promise<void> {
    setSaveError(null)
    const weightGrams = Math.round(parseFloat(data.weightKg) * 1000)

    try {
      if (isEditMode) {
        await editWeight(entry.id, {
          dateMeasured: data.dateMeasured,
          weightGrams,
        })
      } else {
        await addWeight({
          dateMeasured: data.dateMeasured,
          weightGrams,
        })
      }
      handleClose()
    } catch {
      setSaveError(t('growth.weightForm.saveError'))
    }
  }

  async function handleDeleteConfirmed(): Promise<void> {
    if (!entry) return
    try {
      await deleteWeight(entry.id)
      setShowDeleteConfirm(false)
      handleClose()
    } catch {
      setShowDeleteConfirm(false)
      setSaveError(t('growth.weightForm.saveError'))
    }
  }

  const title = isEditMode
    ? t('growth.weightForm.titleEdit')
    : t('growth.weightForm.titleAdd')

  const footer = (
    <div
      className={[
        'flex items-center gap-[var(--space-3)]',
        isEditMode ? 'justify-between' : 'justify-end',
      ].join(' ')}
    >
      {isEditMode && (
        <Button
          type="button"
          variant="destructive"
          disabled={isSubmitting}
          onClick={() => setShowDeleteConfirm(true)}
        >
          {t('common.delete')}
        </Button>
      )}
      <div className="flex gap-[var(--space-3)]">
        <Button
          type="button"
          variant="secondary"
          disabled={isSubmitting}
          onClick={handleClose}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          form="weight-form"
          variant="primary"
          loading={isSubmitting}
          disabled={isSubmitting}
        >
          {t('common.save')}
        </Button>
      </div>
    </div>
  )

  return (
    <>
      <Modal open={open} onClose={handleClose} title={title} footer={footer}>
        {saveError !== null && (
          <div className="mb-[var(--space-4)]">
            <Toast
              tone="error"
              message={saveError}
              onDismiss={() => setSaveError(null)}
            />
          </div>
        )}

        <form
          id="weight-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-[var(--space-5)]"
        >
          {/* Weight field */}
          <Input
            id="weight-kg"
            label={t('growth.weightForm.weightLabel')}
            inputMode="decimal"
            type="text"
            autoComplete="off"
            error={errors.weightKg?.message}
            disabled={isSubmitting}
            {...register('weightKg')}
          />

          {/* Date field */}
          <Input
            id="date-measured"
            label={t('growth.weightForm.dateLabel')}
            type="date"
            error={errors.dateMeasured?.message}
            disabled={isSubmitting}
            {...register('dateMeasured')}
          />
        </form>
      </Modal>

      <DeleteConfirm
        open={showDeleteConfirm}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </>
  )
}
