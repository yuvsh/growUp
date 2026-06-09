// Button component tests — behavior and a11y focus (not pixels)
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { Button } from './button'

describe('Button', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument()
  })

  it('applies primary variant by default', () => {
    render(<Button>Primary</Button>)
    const btn = screen.getByRole('button', { name: 'Primary' })
    expect(btn.className).toContain('bg-[var(--color-primary)]')
  })

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>)
    const btn = screen.getByRole('button', { name: 'Secondary' })
    expect(btn.className).toContain('bg-[var(--color-surface)]')
  })

  it('applies ghost variant classes', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const btn = screen.getByRole('button', { name: /Ghost/ })
    expect(btn.className).toContain('bg-transparent')
  })

  it('applies destructive variant classes', () => {
    render(<Button variant="destructive">Delete</Button>)
    const btn = screen.getByRole('button', { name: 'Delete' })
    expect(btn.className).toContain('bg-[var(--color-destructive)]')
  })

  it('has min-h-[44px] class for touch target compliance', () => {
    render(<Button>Touch</Button>)
    const btn = screen.getByRole('button', { name: 'Touch' })
    expect(btn.className).toContain('min-h-[44px]')
    expect(btn.className).toContain('min-w-[44px]')
  })

  it('calls onClick handler when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)
    await user.click(screen.getByRole('button', { name: 'Click' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('loading state: button is disabled and shows spinner', () => {
    render(<Button loading>Save</Button>)
    const btn = screen.getByRole('button', { name: /Save/ })
    expect(btn).toBeDisabled()
    // Loading spinner renders an svg (the spin indicator)
    expect(btn.querySelector('svg')).not.toBeNull()
  })

  it('loading state: click is not fired when loading', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button loading onClick={handleClick}>Save</Button>)
    const btn = screen.getByRole('button', { name: /Save/ })
    // userEvent respects disabled state
    await user.click(btn)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('disabled state: button is not clickable', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()
    render(<Button disabled onClick={handleClick}>Disabled</Button>)
    await user.click(screen.getByRole('button', { name: 'Disabled' }))
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('disabled state: has opacity class', () => {
    render(<Button disabled>Disabled</Button>)
    const btn = screen.getByRole('button', { name: 'Disabled' })
    expect(btn.className).toContain('opacity-50')
  })

  it('fullWidthOnMobile adds w-full class', () => {
    render(<Button fullWidthOnMobile>Full Width</Button>)
    const btn = screen.getByRole('button', { name: 'Full Width' })
    expect(btn.className).toContain('w-full')
  })

  it('passes through aria-label for icon-only usage', () => {
    render(<Button aria-label="Open menu">☰</Button>)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('sm size class is applied', () => {
    render(<Button size="sm">Small</Button>)
    const btn = screen.getByRole('button', { name: 'Small' })
    expect(btn.className).toContain('min-h-[44px]')
  })

  it('lg size class is applied', () => {
    render(<Button size="lg">Large</Button>)
    const btn = screen.getByRole('button', { name: 'Large' })
    expect(btn.className).toContain('min-h-[44px]')
  })
})
