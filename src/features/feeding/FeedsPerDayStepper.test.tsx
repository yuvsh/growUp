// FeedsPerDayStepper tests — behavior and a11y (not pixels)
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { FeedsPerDayStepper } from './FeedsPerDayStepper'

describe('FeedsPerDayStepper', () => {
  it('renders the label text', () => {
    render(<FeedsPerDayStepper value={8} onChange={vi.fn()} />)
    expect(screen.getByText('Feeds per day')).toBeInTheDocument()
  })

  it('renders the current value', () => {
    render(<FeedsPerDayStepper value={8} onChange={vi.fn()} />)
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('clicking + calls onChange with value + 1', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<FeedsPerDayStepper value={8} onChange={handleChange} />)

    await user.click(screen.getByRole('button', { name: 'Increase feeds per day' }))

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith(9)
  })

  it('clicking − calls onChange with value − 1', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<FeedsPerDayStepper value={8} onChange={handleChange} />)

    await user.click(screen.getByRole('button', { name: 'Decrease feeds per day' }))

    expect(handleChange).toHaveBeenCalledTimes(1)
    expect(handleChange).toHaveBeenCalledWith(7)
  })

  it('at min (default 1) the − button is disabled and onChange is not called', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<FeedsPerDayStepper value={1} onChange={handleChange} />)

    const decrementButton = screen.getByRole('button', { name: 'Decrease feeds per day' })
    expect(decrementButton).toBeDisabled()

    await user.click(decrementButton)
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('at a custom min, − is disabled and does not go below it', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<FeedsPerDayStepper value={3} onChange={handleChange} min={3} />)

    const decrementButton = screen.getByRole('button', { name: 'Decrease feeds per day' })
    expect(decrementButton).toBeDisabled()

    await user.click(decrementButton)
    expect(handleChange).not.toHaveBeenCalled()
  })

  it('− is enabled when value is above min', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<FeedsPerDayStepper value={2} onChange={handleChange} min={1} />)

    const decrementButton = screen.getByRole('button', { name: 'Decrease feeds per day' })
    expect(decrementButton).not.toBeDisabled()

    await user.click(decrementButton)
    expect(handleChange).toHaveBeenCalledWith(1)
  })

  it('+ button has correct aria-label', () => {
    render(<FeedsPerDayStepper value={8} onChange={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: 'Increase feeds per day' }),
    ).toBeInTheDocument()
  })

  it('− button has correct aria-label', () => {
    render(<FeedsPerDayStepper value={8} onChange={vi.fn()} />)
    expect(
      screen.getByRole('button', { name: 'Decrease feeds per day' }),
    ).toBeInTheDocument()
  })
})
