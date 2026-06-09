// Input component tests — behavior and a11y focus
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, it, expect } from 'vitest'
import { Input } from './input'

describe('Input', () => {
  it('renders a visible label associated with the input', () => {
    render(<Input id="email" label="Email address" />)
    const input = screen.getByLabelText('Email address')
    expect(input).toBeInTheDocument()
  })

  it('label is always visible (not placeholder-only)', () => {
    render(<Input id="name" label="Full name" placeholder="e.g. Alice" />)
    const label = screen.getByText('Full name')
    expect(label.tagName).toBe('LABEL')
  })

  it('renders hint text below the input when provided', () => {
    render(<Input id="bio" label="Bio" hint="Keep it short" />)
    expect(screen.getByText('Keep it short')).toBeInTheDocument()
  })

  it('does not render hint when error is shown', () => {
    render(<Input id="bio" label="Bio" hint="Keep it short" error="Too long" />)
    expect(screen.queryByText('Keep it short')).not.toBeInTheDocument()
    expect(screen.getByText('Too long')).toBeInTheDocument()
  })

  it('error: renders role="alert" below the field', () => {
    render(<Input id="name" label="Name" error="Name is required" />)
    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(alert).toHaveTextContent('Name is required')
  })

  it('error: sets aria-invalid on the input element', () => {
    render(<Input id="name" label="Name" error="Required" />)
    const input = screen.getByLabelText('Name')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('error: links error message via aria-describedby', () => {
    render(<Input id="email" label="Email" error="Invalid email" />)
    const input = screen.getByLabelText('Email')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBe('email-error')
    const errorEl = document.getElementById('email-error')
    expect(errorEl).not.toBeNull()
    expect(errorEl?.textContent).toBe('Invalid email')
  })

  it('hint: links hint via aria-describedby when no error', () => {
    render(<Input id="bio" label="Bio" hint="50 chars max" />)
    const input = screen.getByLabelText('Bio')
    const describedBy = input.getAttribute('aria-describedby')
    expect(describedBy).toBe('bio-hint')
  })

  it('no error: aria-invalid is not set to true', () => {
    render(<Input id="name" label="Name" />)
    const input = screen.getByLabelText('Name')
    expect(input).not.toHaveAttribute('aria-invalid', 'true')
  })

  it('min-h-[44px] class is present on input for touch target', () => {
    render(<Input id="name" label="Name" />)
    const input = screen.getByLabelText('Name')
    expect(input.className).toContain('min-h-[44px]')
  })

  it('accepts user typing input', async () => {
    const user = userEvent.setup()
    render(<Input id="name" label="Name" />)
    const input = screen.getByLabelText('Name')
    await user.type(input, 'Alice')
    expect(input).toHaveValue('Alice')
  })

  it('forwardRef: ref is forwarded to the underlying input element', () => {
    const ref = createRef<HTMLInputElement>()
    render(<Input id="name" label="Name" ref={ref} />)
    expect(ref.current).not.toBeNull()
    expect(ref.current?.tagName).toBe('INPUT')
  })

  it('spreads additional props (e.g. data-testid) onto the input', () => {
    render(<Input id="name" label="Name" data-testid="custom-input" />)
    expect(screen.getByTestId('custom-input')).toBeInTheDocument()
  })

  it('disabled state: input is disabled', () => {
    render(<Input id="name" label="Name" disabled />)
    expect(screen.getByLabelText('Name')).toBeDisabled()
  })

  it('renders icon slot when icon is provided', () => {
    const Icon = (): React.JSX.Element => <svg data-testid="input-icon" />
    render(<Input id="name" label="Name" icon={<Icon />} />)
    expect(screen.getByTestId('input-icon')).toBeInTheDocument()
  })
})
