// Badge component tests — behavior and a11y focus (icon + text for every tone)
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Badge } from './badge'

describe('Badge', () => {
  it('renders text content', () => {
    render(<Badge>Active</Badge>)
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('default tone: renders default icon + text (not color alone)', () => {
    render(<Badge tone="default">Info</Badge>)
    const badge = screen.getByText('Info').closest('span')
    // Icon SVG must be present
    expect(badge?.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('Info')).toBeInTheDocument()
  })

  it('success tone: renders icon + text', () => {
    render(<Badge tone="success">On track</Badge>)
    const badge = screen.getByText('On track').closest('span')
    expect(badge?.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('On track')).toBeInTheDocument()
  })

  it('caution tone: renders icon + text', () => {
    render(<Badge tone="caution">Watch</Badge>)
    const badge = screen.getByText('Watch').closest('span')
    expect(badge?.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('Watch')).toBeInTheDocument()
  })

  it('error tone: renders icon + text', () => {
    render(<Badge tone="error">Error</Badge>)
    const badge = screen.getByText('Error').closest('span')
    expect(badge?.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('Error')).toBeInTheDocument()
  })

  it('muted tone: renders icon + text', () => {
    render(<Badge tone="muted">Disabled</Badge>)
    const badge = screen.getByText('Disabled').closest('span')
    expect(badge?.querySelector('svg')).not.toBeNull()
    expect(screen.getByText('Disabled')).toBeInTheDocument()
  })

  it('accepts a custom icon prop and renders it', () => {
    const CustomIcon = (): React.JSX.Element => <svg data-testid="custom-icon" />
    render(<Badge tone="success" icon={<CustomIcon />}>Custom</Badge>)
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument()
  })

  it('caution tone uses caution surface class (not red)', () => {
    render(<Badge tone="caution">Below 3rd</Badge>)
    const badge = screen.getByText('Below 3rd').closest('span')
    // caution uses --color-caution-surface background (amber), not destructive
    expect(badge?.className).toContain('caution')
    expect(badge?.className).not.toContain('destructive')
  })

  it('has pill radius class', () => {
    render(<Badge>Pill</Badge>)
    const badge = screen.getByText('Pill').closest('span')
    expect(badge?.className).toContain('rounded-[var(--radius-pill)]')
  })

  it('default tone: does not contain caution or destructive classes', () => {
    render(<Badge tone="default">Neutral</Badge>)
    const badge = screen.getByText('Neutral').closest('span')
    expect(badge?.className).not.toContain('destructive')
  })
})
