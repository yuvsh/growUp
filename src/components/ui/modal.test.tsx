// Modal component tests — behavior and a11y focus
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, it, expect, vi } from 'vitest'
import { Modal } from './modal'

// Helper component that controls modal open state
function ModalHost({
  title = 'Test Dialog',
  footer,
  onClose,
}: {
  title?: string
  footer?: React.ReactNode
  onClose?: () => void
}): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const handleClose = (): void => {
    setOpen(false)
    onClose?.()
  }
  return (
    <>
      <button type="button" onClick={(): void => setOpen(true)}>
        Open
      </button>
      <Modal open={open} onClose={handleClose} title={title} footer={footer}>
        <p>Modal content</p>
        <button type="button">Inner button</button>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('does not render when open=false', () => {
    render(
      <Modal open={false} onClose={vi.fn()} title="Hidden">
        <p>Content</p>
      </Modal>,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders when open=true', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Visible">
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has role=dialog and aria-modal=true', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="A11y Dialog">
        <p>Content</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
  })

  it('is labelled by the title prop (aria-label)', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="My Dialog Title">
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog', { name: 'My Dialog Title' })).toBeInTheDocument()
  })

  it('opens when trigger button is clicked', async () => {
    const user = userEvent.setup()
    render(<ModalHost title="Trigger Test" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Trigger Test' })).toBeInTheDocument()
    })
  })

  it('closes when the Close button is clicked', async () => {
    const user = userEvent.setup()
    render(<ModalHost title="Close Test" />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('closes when backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(<ModalHost onClose={onClose} title="Backdrop Test" />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    // Click the backdrop (the outer container, not the dialog panel)
    const backdrop = screen.getByRole('dialog').parentElement
    if (backdrop) {
      await user.click(backdrop)
    }
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('closes on Escape key', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    render(
      <Modal open={true} onClose={onClose} title="Escape Test">
        <p>Content</p>
      </Modal>,
    )
    const dialog = screen.getByRole('dialog')
    dialog.focus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders children content', () => {
    render(
      <Modal open={true} onClose={vi.fn()} title="Content Test">
        <p>Special modal content</p>
      </Modal>,
    )
    expect(screen.getByText('Special modal content')).toBeInTheDocument()
  })

  it('renders footer when provided', () => {
    render(
      <Modal
        open={true}
        onClose={vi.fn()}
        title="Footer Test"
        footer={<button type="button">Confirm</button>}
      >
        <p>Content</p>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
  })

  it('focus is moved into the dialog when opened', async () => {
    const user = userEvent.setup()
    render(<ModalHost title="Focus Test" />)
    await user.click(screen.getByRole('button', { name: 'Open' }))
    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Focus Test' })).toBeInTheDocument()
    })
    // The dialog panel or a focusable element within it should receive focus
    await waitFor(() => {
      const dialog = screen.getByRole('dialog', { name: 'Focus Test' })
      const isInsideDialog =
        dialog.contains(document.activeElement) ||
        document.activeElement === dialog
      expect(isInsideDialog).toBe(true)
    })
  })
})
