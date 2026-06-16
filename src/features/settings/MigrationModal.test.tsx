import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { MigrationModal } from './MigrationModal';
import { t } from '../../i18n/t';
import type { MigrationCounts } from '../../lib/sync/migrateLocalToRemote';

const COUNTS: MigrationCounts = { children: 2, weights: 14, feedingConfigs: 2 };

function renderModal(
  overrides: Partial<React.ComponentProps<typeof MigrationModal>> = {},
): {
  onConfirm: ReturnType<typeof vi.fn>;
  onCancel: ReturnType<typeof vi.fn>;
} {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(
    <MigrationModal
      open
      counts={COUNTS}
      running={false}
      onConfirm={onConfirm}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onConfirm, onCancel };
}

describe('MigrationModal', () => {
  it('renders the title and the counts in the body', () => {
    renderModal();
    expect(screen.getByText(t('sync.migration.title'))).toBeInTheDocument();
    // Body interpolates {children}=2 and {weights}=14.
    expect(screen.getByText(/2 baby profile/i)).toBeInTheDocument();
    expect(screen.getByText(/14 weight entries/i)).toBeInTheDocument();
  });

  it('calls onConfirm when Upload is pressed', async () => {
    const user = userEvent.setup();
    const { onConfirm } = renderModal();
    await user.click(screen.getByRole('button', { name: t('sync.migration.upload') }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Not now is pressed', async () => {
    const user = userEvent.setup();
    const { onCancel } = renderModal();
    await user.click(screen.getByRole('button', { name: t('sync.migration.notNow') }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('disables Upload and shows progress copy while running', () => {
    renderModal({ running: true });
    const uploadButton = screen.getByRole('button', {
      name: new RegExp(t('sync.migration.uploading')),
    });
    expect(uploadButton).toBeDisabled();
  });

  it('renders nothing when closed', () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(
      <MigrationModal
        open={false}
        counts={COUNTS}
        running={false}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
