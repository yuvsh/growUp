// HighCaloriePanel tests — behavior and a11y (not pixels)
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { HighCaloriePanel } from './HighCaloriePanel'
import type { KcalUnit } from './types'

// ---------------------------------------------------------------------------
// Default props helpers
// ---------------------------------------------------------------------------

interface PanelProps {
  weightKg?: number
  feedsPerDay?: number
  enabled?: boolean
  kcalValue?: number
  unit?: KcalUnit
  onChange?: ReturnType<typeof vi.fn>
}

function renderPanel({
  weightKg = 5,
  feedsPerDay = 8,
  enabled = false,
  kcalValue = 0,
  unit = 'kcal/ml',
  onChange = vi.fn(),
}: PanelProps = {}): { onChange: ReturnType<typeof vi.fn> } {
  render(
    <HighCaloriePanel
      weightKg={weightKg}
      feedsPerDay={feedsPerDay}
      enabled={enabled}
      kcalValue={kcalValue}
      unit={unit}
      onChange={onChange}
    />,
  )
  return { onChange }
}

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

describe('HighCaloriePanel — toggle', () => {
  it('renders the toggle with the correct label', () => {
    renderPanel()
    expect(
      screen.getByRole('checkbox', { name: 'High-calorie / special formula' }),
    ).toBeInTheDocument()
  })

  it('toggle is unchecked when enabled=false', () => {
    renderPanel({ enabled: false })
    const toggle = screen.getByRole('checkbox', { name: 'High-calorie / special formula' })
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('toggle is checked when enabled=true', () => {
    renderPanel({ enabled: true, kcalValue: 1.0 })
    const toggle = screen.getByRole('checkbox', { name: 'High-calorie / special formula' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
  })

  it('clicking the toggle calls onChange({ enabled: true }) when currently disabled', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPanel({ enabled: false })

    await user.click(screen.getByRole('checkbox', { name: 'High-calorie / special formula' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ enabled: true })
  })

  it('clicking the toggle calls onChange({ enabled: false }) when currently enabled', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPanel({ enabled: true, kcalValue: 1.0 })

    await user.click(screen.getByRole('checkbox', { name: 'High-calorie / special formula' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith({ enabled: false })
  })

  it('hides the input fields when disabled', () => {
    renderPanel({ enabled: false })
    expect(screen.queryByLabelText('Formula calories')).not.toBeInTheDocument()
  })

  it('shows the input fields when enabled', () => {
    renderPanel({ enabled: true, kcalValue: 1.0 })
    expect(screen.getByLabelText('Formula calories')).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Valid kcal input — adjusted range
// ---------------------------------------------------------------------------

describe('HighCaloriePanel — valid kcal input', () => {
  /**
   * Key invariant: at 1.0 kcal/ml (more concentrated than the standard 0.67),
   * the adjusted daily range (402–670 ml) is LOWER than the standard 600–1000 ml.
   *
   * Math:
   *   standard: 5kg × 120 = 600 ml/day, 5kg × 200 = 1000 ml/day
   *   calorie target: 600 × 0.67 = 402 kcal, 1000 × 0.67 = 670 kcal
   *   adjusted at 1.0 kcal/ml: 402 / 1.0 = 402 ml, 670 / 1.0 = 670 ml
   */
  it('shows an adjusted daily range LOWER than the standard 600–1000 ml at 1.0 kcal/ml, 5 kg', () => {
    renderPanel({ enabled: true, kcalValue: 1.0, weightKg: 5 })

    // Adjusted range row should be present.
    expect(screen.getByText('Adjusted daily amount')).toBeInTheDocument()

    // The displayed ml values should both be below the standard range bounds.
    // We find the ml-per-day text and check numeric content.
    // Expected: "402–670 ml per day"
    const mlPerDayText = screen.getByText(/ml per day/i)
    expect(mlPerDayText).toBeInTheDocument()

    const textContent = mlPerDayText.textContent ?? ''
    // Extract first and last numbers from "402–670 ml per day"
    const numbers = textContent.match(/\d+/g)?.map(Number) ?? []
    expect(numbers.length).toBeGreaterThanOrEqual(2)

    const displayedMin = numbers[0]
    const displayedMax = numbers[1]

    // Both must be below the standard 600 min and 1000 max
    expect(displayedMin).toBeLessThan(600)
    expect(displayedMax).toBeLessThan(1000)

    // Sanity: the adjusted range should be approximately 402–670 ml
    expect(displayedMin).toBeGreaterThan(300)
    expect(displayedMax).toBeGreaterThan(500)
  })

  it('shows a calorie target when enabled with a valid kcal value', () => {
    renderPanel({ enabled: true, kcalValue: 1.0, weightKg: 5 })

    expect(screen.getByText('Calorie target')).toBeInTheDocument()
    // Should show kcal range text (the result span contains "kcal")
    const kcalElements = screen.getAllByText(/kcal/i)
    expect(kcalElements.length).toBeGreaterThan(0)
  })

  it('shows the explainer text when results are present', () => {
    renderPanel({ enabled: true, kcalValue: 1.0, weightKg: 5 })

    expect(
      screen.getByText(
        'A more concentrated formula needs a smaller volume to deliver the same calories.',
      ),
    ).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Invalid / empty kcal input
// ---------------------------------------------------------------------------

describe('HighCaloriePanel — invalid/empty kcal', () => {
  it('shows kcalError when enabled and kcalValue is 0 (empty)', () => {
    renderPanel({ enabled: true, kcalValue: 0 })
    expect(
      screen.getByText("Enter your formula's calorie content."),
    ).toBeInTheDocument()
  })

  it('does NOT show results when kcalValue is 0', () => {
    renderPanel({ enabled: true, kcalValue: 0 })
    expect(screen.queryByText('Calorie target')).not.toBeInTheDocument()
    expect(screen.queryByText('Adjusted daily amount')).not.toBeInTheDocument()
  })

  it('does not show kcalError when panel is disabled', () => {
    renderPanel({ enabled: false, kcalValue: 0 })
    expect(
      screen.queryByText("Enter your formula's calorie content."),
    ).not.toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// Unit selector
// ---------------------------------------------------------------------------

describe('HighCaloriePanel — unit selector', () => {
  it('shows kcal/ml and kcal/oz unit buttons when enabled', () => {
    renderPanel({ enabled: true, kcalValue: 1.0 })
    expect(screen.getByRole('button', { name: 'kcal/ml' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'kcal/oz' })).toBeInTheDocument()
  })

  it('kcal/ml button is pressed when unit is kcal/ml', () => {
    renderPanel({ enabled: true, kcalValue: 1.0, unit: 'kcal/ml' })
    expect(screen.getByRole('button', { name: 'kcal/ml' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'kcal/oz' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('kcal/oz button is pressed when unit is kcal/oz', () => {
    renderPanel({ enabled: true, kcalValue: 20, unit: 'kcal/oz' })
    expect(screen.getByRole('button', { name: 'kcal/oz' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('clicking kcal/oz calls onChange({ unit: "kcal/oz" })', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPanel({ enabled: true, kcalValue: 1.0, unit: 'kcal/ml' })

    await user.click(screen.getByRole('button', { name: 'kcal/oz' }))

    expect(onChange).toHaveBeenCalledWith({ unit: 'kcal/oz' })
  })

  it('clicking kcal/ml calls onChange({ unit: "kcal/ml" })', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPanel({ enabled: true, kcalValue: 20, unit: 'kcal/oz' })

    await user.click(screen.getByRole('button', { name: 'kcal/ml' }))

    expect(onChange).toHaveBeenCalledWith({ unit: 'kcal/ml' })
  })
})

// ---------------------------------------------------------------------------
// Kcal input — onChange
// ---------------------------------------------------------------------------

describe('HighCaloriePanel — kcal input onChange', () => {
  it('changing the kcal input calls onChange with a kcalValue', async () => {
    const user = userEvent.setup()
    const { onChange } = renderPanel({ enabled: true, kcalValue: 0 })

    const input = screen.getByLabelText('Formula calories')
    await user.clear(input)
    await user.type(input, '2')

    // onChange is called with the parsed numeric value
    expect(onChange).toHaveBeenCalledWith({ kcalValue: 2 })
  })
})
