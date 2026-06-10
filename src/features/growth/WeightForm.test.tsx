// Tests for WeightForm component (M2-10)
// Blueprint: docs/ui-blueprints.md → "Add / Edit Weight"
// Design system: design-system/MASTER.md
//
// Mocks: useWeights (src/lib/hooks/useWeights)

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WeightForm } from './WeightForm'
import { t } from '../../i18n/t'
import type { WeightEntry } from '../../types/index'

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockAddWeight = vi.fn()
const mockEditWeight = vi.fn()
const mockDeleteWeight = vi.fn()

const defaultUseWeightsResult = {
  weights: [] as WeightEntry[],
  loading: false,
  error: null,
  addWeight: mockAddWeight,
  editWeight: mockEditWeight,
  deleteWeight: mockDeleteWeight,
  reload: vi.fn(),
}

vi.mock('../../lib/hooks/useWeights', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/hooks/useWeights')>()
  return {
    ...actual,
    useWeights: (): typeof defaultUseWeightsResult => defaultUseWeightsResult,
  }
})

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CHILD_ID = 'child-1'
// Use a recent DOB so that today's date falls within the 0-24 month window
const DATE_OF_BIRTH = '2025-10-01'
const TODAY = new Date().toISOString().split('T')[0] as string

// A date that is within the valid window for DATE_OF_BIRTH
const VALID_MEASURED_DATE = '2025-12-01'

const EXISTING_ENTRY: WeightEntry = {
  id: 'entry-1',
  childId: CHILD_ID,
  ownerId: 'user-1',
  dateMeasured: VALID_MEASURED_DATE,
  weightGrams: 7500,
  createdAt: '2025-12-01T10:00:00.000Z',
  updatedAt: '2025-12-01T10:00:00.000Z',
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

interface RenderOptions {
  entry?: WeightEntry
  open?: boolean
}

function renderForm(
  onClose: () => void = vi.fn(),
  options: RenderOptions = {},
): void {
  render(
    <WeightForm
      open={options.open ?? true}
      onClose={onClose}
      childId={CHILD_ID}
      dateOfBirth={DATE_OF_BIRTH}
      entry={options.entry}
    />,
  )
}

// ---------------------------------------------------------------------------
// ADD mode
// ---------------------------------------------------------------------------

describe('WeightForm — ADD mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAddWeight.mockResolvedValue({
      ...EXISTING_ENTRY,
      id: 'new-entry',
    } satisfies WeightEntry)
  })

  it('renders the add title', () => {
    renderForm()
    expect(
      screen.getByRole('dialog', { name: t('growth.weightForm.titleAdd') }),
    ).toBeInTheDocument()
  })

  it('weight field defaults to empty and date defaults to today', () => {
    renderForm()
    expect(screen.getByLabelText(t('growth.weightForm.weightLabel'))).toHaveValue(
      '',
    )
    expect(screen.getByLabelText(t('growth.weightForm.dateLabel'))).toHaveValue(
      TODAY,
    )
  })

  it('enter weight + date → submit → addWeight called with weightGrams and date; onClose called', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderForm(onClose)

    await user.type(
      screen.getByLabelText(t('growth.weightForm.weightLabel')),
      '7.5',
    )

    const dateInput = screen.getByLabelText(t('growth.weightForm.dateLabel'))
    await user.clear(dateInput)
    await user.type(dateInput, VALID_MEASURED_DATE)

    await user.click(screen.getByRole('button', { name: t('common.save') }))

    await waitFor(() => {
      expect(mockAddWeight).toHaveBeenCalledTimes(1)
    })

    expect(mockAddWeight).toHaveBeenCalledWith({
      dateMeasured: VALID_MEASURED_DATE,
      weightGrams: 7500,
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('rounds kg to integer grams correctly', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(
      screen.getByLabelText(t('growth.weightForm.weightLabel')),
      '3.1416',
    )

    const dateInput = screen.getByLabelText(t('growth.weightForm.dateLabel'))
    await user.clear(dateInput)
    await user.type(dateInput, VALID_MEASURED_DATE)

    await user.click(screen.getByRole('button', { name: t('common.save') }))

    await waitFor(() => {
      expect(mockAddWeight).toHaveBeenCalledTimes(1)
    })

    // 3.1416 * 1000 = 3141.6 → round → 3142
    expect(mockAddWeight).toHaveBeenCalledWith(
      expect.objectContaining({ weightGrams: 3142 }),
    )
  })

  it('empty weight → weightError shown, addWeight NOT called', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: t('common.save') }))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })

    expect(screen.getByText(t('growth.weightForm.weightError'))).toBeInTheDocument()
    expect(mockAddWeight).not.toHaveBeenCalled()
  })

  it('zero weight → weightError shown, addWeight NOT called', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(
      screen.getByLabelText(t('growth.weightForm.weightLabel')),
      '0',
    )

    await user.click(screen.getByRole('button', { name: t('common.save') }))

    await waitFor(() => {
      expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    })

    expect(screen.getByText(t('growth.weightForm.weightError'))).toBeInTheDocument()
    expect(mockAddWeight).not.toHaveBeenCalled()
  })

  it('date before DOB → dateBeforeBirthError shown, addWeight NOT called', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(
      screen.getByLabelText(t('growth.weightForm.weightLabel')),
      '5.0',
    )

    const dateInput = screen.getByLabelText(t('growth.weightForm.dateLabel'))
    await user.clear(dateInput)
    // DOB is 2024-01-01, so 2023-12-31 is before birth
    await user.type(dateInput, '2023-12-31')

    await user.click(screen.getByRole('button', { name: t('common.save') }))

    await waitFor(() => {
      expect(
        screen.getByText(t('growth.weightForm.dateBeforeBirthError')),
      ).toBeInTheDocument()
    })

    expect(mockAddWeight).not.toHaveBeenCalled()
  })

  it('date beyond 24 months after DOB → dateBeyondRangeError shown, addWeight NOT called', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.type(
      screen.getByLabelText(t('growth.weightForm.weightLabel')),
      '10.0',
    )

    const dateInput = screen.getByLabelText(t('growth.weightForm.dateLabel'))
    await user.clear(dateInput)
    // DOB is 2025-10-01, 730+ days later → 2028-01-01 is beyond range
    await user.type(dateInput, '2028-01-01')

    await user.click(screen.getByRole('button', { name: t('common.save') }))

    await waitFor(() => {
      expect(
        screen.getByText(t('growth.weightForm.dateBeyondRangeError')),
      ).toBeInTheDocument()
    })

    expect(mockAddWeight).not.toHaveBeenCalled()
  })

  it('mutation rejects → Toast shown with saveError, onClose NOT called', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockAddWeight.mockRejectedValue(new Error('Network error'))
    renderForm(onClose)

    await user.type(
      screen.getByLabelText(t('growth.weightForm.weightLabel')),
      '5.0',
    )

    const dateInput = screen.getByLabelText(t('growth.weightForm.dateLabel'))
    await user.clear(dateInput)
    await user.type(dateInput, VALID_MEASURED_DATE)

    await user.click(screen.getByRole('button', { name: t('common.save') }))

    await waitFor(() => {
      expect(screen.getByText(t('growth.weightForm.saveError'))).toBeInTheDocument()
    })

    expect(onClose).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// EDIT mode
// ---------------------------------------------------------------------------

describe('WeightForm — EDIT mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEditWeight.mockResolvedValue({
      ...EXISTING_ENTRY,
      updatedAt: new Date().toISOString(),
    } satisfies WeightEntry)
  })

  it('renders the edit title', () => {
    renderForm(vi.fn(), { entry: EXISTING_ENTRY })
    expect(
      screen.getByRole('dialog', { name: t('growth.weightForm.titleEdit') }),
    ).toBeInTheDocument()
  })

  it('fields are prefilled with existing entry values', () => {
    renderForm(vi.fn(), { entry: EXISTING_ENTRY })

    // 7500g / 1000 = 7.5 kg
    expect(
      screen.getByLabelText(t('growth.weightForm.weightLabel')),
    ).toHaveValue('7.5')

    expect(
      screen.getByLabelText(t('growth.weightForm.dateLabel')),
    ).toHaveValue(VALID_MEASURED_DATE)
  })

  it('submit calls editWeight with entry id and updated values; onClose called', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    renderForm(onClose, { entry: EXISTING_ENTRY })

    const weightInput = screen.getByLabelText(t('growth.weightForm.weightLabel'))
    await user.clear(weightInput)
    await user.type(weightInput, '8.0')

    await user.click(screen.getByRole('button', { name: t('common.save') }))

    await waitFor(() => {
      expect(mockEditWeight).toHaveBeenCalledTimes(1)
    })

    expect(mockEditWeight).toHaveBeenCalledWith('entry-1', {
      dateMeasured: VALID_MEASURED_DATE,
      weightGrams: 8000,
    })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('delete flow: click delete → confirm modal → deleteWeight called → onClose called', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockDeleteWeight.mockResolvedValue(undefined)
    renderForm(onClose, { entry: EXISTING_ENTRY })

    // Click the Delete button in the form footer
    await user.click(
      screen.getByRole('button', { name: t('common.delete') }),
    )

    // Confirm modal should appear
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', {
          name: t('growth.weightForm.deleteConfirmTitle'),
        }),
      ).toBeInTheDocument()
    })

    expect(
      screen.getByText(t('growth.weightForm.deleteConfirmBody')),
    ).toBeInTheDocument()

    // Click the confirm Delete button inside the confirm modal
    const deleteButtons = screen.getAllByRole('button', {
      name: t('common.delete'),
    })
    // The last "Delete" button is inside the confirm modal
    const confirmDelete = deleteButtons[deleteButtons.length - 1]
    await user.click(confirmDelete as HTMLElement)

    await waitFor(() => {
      expect(mockDeleteWeight).toHaveBeenCalledTimes(1)
    })

    expect(mockDeleteWeight).toHaveBeenCalledWith('entry-1')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('cancel delete confirm → deleteWeight NOT called', async () => {
    const user = userEvent.setup()
    renderForm(vi.fn(), { entry: EXISTING_ENTRY })

    await user.click(
      screen.getByRole('button', { name: t('common.delete') }),
    )

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', {
          name: t('growth.weightForm.deleteConfirmTitle'),
        }),
      ).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: t('common.keep') }))

    expect(mockDeleteWeight).not.toHaveBeenCalled()
  })

  it('mutation rejects → Toast shown with saveError, onClose NOT called', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    mockEditWeight.mockRejectedValue(new Error('Server error'))
    renderForm(onClose, { entry: EXISTING_ENTRY })

    await user.click(screen.getByRole('button', { name: t('common.save') }))

    await waitFor(() => {
      expect(screen.getByText(t('growth.weightForm.saveError'))).toBeInTheDocument()
    })

    expect(onClose).not.toHaveBeenCalled()
  })
})
