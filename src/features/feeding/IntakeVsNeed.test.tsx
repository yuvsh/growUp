/**
 * IntakeVsNeed tests (M3-6 / FEED-4)
 *
 * Strategy: assert against DOM text and roles — the accessible readout is the
 * primary source of truth (the gauge itself is aria-hidden).
 * Weight 5 kg → need band 600–1000 ml/day.
 */

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IntakeVsNeed } from './IntakeVsNeed'

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface ComponentProps {
  weightKg?: number
  intakeMlPerDay?: number | null
  onIntakeChange?: ReturnType<typeof vi.fn>
}

function renderComponent({
  weightKg = 5,
  intakeMlPerDay = null,
  onIntakeChange = vi.fn(),
}: ComponentProps = {}): { onIntakeChange: ReturnType<typeof vi.fn> } {
  render(
    <IntakeVsNeed
      weightKg={weightKg}
      intakeMlPerDay={intakeMlPerDay}
      onIntakeChange={onIntakeChange}
    />,
  )
  return { onIntakeChange }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('IntakeVsNeed', () => {
  describe('with weight 5 kg (need 600–1000 ml/day)', () => {
    it('shows "below" status text when intake is 400 ml/day', () => {
      renderComponent({ weightKg: 5, intakeMlPerDay: 400 })
      expect(screen.getByText('below the recommended range')).toBeInTheDocument()
    })

    it('shows "within" status text when intake is 800 ml/day', () => {
      renderComponent({ weightKg: 5, intakeMlPerDay: 800 })
      expect(screen.getByText('within the recommended range')).toBeInTheDocument()
    })

    it('shows "above" status text when intake is 1200 ml/day', () => {
      renderComponent({ weightKg: 5, intakeMlPerDay: 1200 })
      expect(screen.getByText('above the recommended range')).toBeInTheDocument()
    })

    it('shows status as icon + text (not color alone) — text label is present', () => {
      renderComponent({ weightKg: 5, intakeMlPerDay: 400 })
      // The text label must be visible in the DOM (icon + text rule)
      const statusText = screen.getByText('below the recommended range')
      expect(statusText).toBeInTheDocument()
      // The status element is the paragraph containing the text
      expect(statusText.closest('p')).not.toBeNull()
    })
  })

  describe('input interaction', () => {
    it('calls onIntakeChange with the numeric value when a valid number is typed', () => {
      const onIntakeChange = vi.fn()
      render(
        <IntakeVsNeed
          weightKg={5}
          intakeMlPerDay={null}
          onIntakeChange={onIntakeChange}
        />,
      )
      const input = screen.getByLabelText('Average daily intake — last 7 days')
      fireEvent.change(input, { target: { value: '750' } })
      expect(onIntakeChange).toHaveBeenCalledWith(750)
    })

    it('calls onIntakeChange with null when the input is cleared', () => {
      const onIntakeChange = vi.fn()
      render(
        <IntakeVsNeed
          weightKg={5}
          intakeMlPerDay={700}
          onIntakeChange={onIntakeChange}
        />,
      )
      const input = screen.getByLabelText('Average daily intake — last 7 days')
      fireEvent.change(input, { target: { value: '' } })
      expect(onIntakeChange).toHaveBeenCalledWith(null)
    })

    it('calls onIntakeChange with null when a negative number is entered', () => {
      const onIntakeChange = vi.fn()
      render(
        <IntakeVsNeed
          weightKg={5}
          intakeMlPerDay={null}
          onIntakeChange={onIntakeChange}
        />,
      )
      const input = screen.getByLabelText('Average daily intake — last 7 days')
      fireEvent.change(input, { target: { value: '-5' } })
      expect(onIntakeChange).toHaveBeenCalledWith(null)
    })
  })

  describe('null intake (no intake entered)', () => {
    it('shows the prompt text when intake is null', () => {
      renderComponent({ weightKg: 5, intakeMlPerDay: null })
      expect(
        screen.getByText(
          "Enter your baby's average daily intake to compare it with their needs.",
        ),
      ).toBeInTheDocument()
    })

    it('does not show any status text when intake is null', () => {
      renderComponent({ weightKg: 5, intakeMlPerDay: null })
      expect(screen.queryByText('below the recommended range')).not.toBeInTheDocument()
      expect(screen.queryByText('within the recommended range')).not.toBeInTheDocument()
      expect(screen.queryByText('above the recommended range')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('renders a visible label for the intake input', () => {
      renderComponent()
      // getByLabelText finds the input via its associated label
      expect(
        screen.getByLabelText('Average daily intake — last 7 days'),
      ).toBeInTheDocument()
    })

    it('renders the card title', () => {
      renderComponent()
      expect(screen.getByText('Intake vs. need')).toBeInTheDocument()
    })

    it('readout region has aria-live="polite"', () => {
      renderComponent({ weightKg: 5, intakeMlPerDay: 800 })
      const liveRegion = screen.getByText('within the recommended range').closest('[aria-live]')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
    })
  })
})
