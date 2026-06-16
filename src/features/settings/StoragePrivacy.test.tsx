import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StoragePrivacy } from './StoragePrivacy';
import { t } from '../../i18n/t';
import type { Repository } from '../../data/repository/types';
import type { AuthContextValue } from '../../auth/AuthContext';
import type { Child } from '../../types/index';

// ---------------------------------------------------------------------------
// Mocks for auth, repository, and the sync modules
// ---------------------------------------------------------------------------

const mockSetMode = vi.fn();
const mockSignInWithGoogle = vi.fn();
const mockSignOut = vi.fn();
const mockGetLocalAnonUserId = vi.fn(() => 'local-anon-id');

let authValue: AuthContextValue;

vi.mock('../../auth/AuthContext', () => ({
  useAuth: (): AuthContextValue => authValue,
  getLocalAnonUserId: (): string => mockGetLocalAnonUserId(),
}));

const mockListChildren = vi.fn();
const mockDeleteChild = vi.fn();
let repository: Repository;

vi.mock('../../data/repository/useRepository', () => ({
  useRepository: (): Repository => repository,
}));

const mockMigrateRemoteToLocal = vi.fn();
vi.mock('../../lib/sync/migrateRemoteToLocal', () => ({
  migrateRemoteToLocal: (args: unknown): Promise<unknown> =>
    mockMigrateRemoteToLocal(args),
}));

const mockGatherExportData = vi.fn();
const mockDownloadJson = vi.fn();
vi.mock('../../lib/sync/exportData', () => ({
  gatherExportData: (...args: unknown[]): Promise<unknown> =>
    mockGatherExportData(...args),
  downloadJson: (...args: unknown[]): void => mockDownloadJson(...args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRepository(): Repository {
  return {
    children: {
      list: (ownerId: string): Promise<Child[]> => mockListChildren(ownerId),
      get: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: (id: string): Promise<void> => mockDeleteChild(id),
    },
    weights: {
      listByChild: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    feedingConfig: { getByChild: vi.fn(), upsert: vi.fn() },
  };
}

function localAuth(): AuthContextValue {
  return {
    user: { id: 'local-anon-id', isAnonymous: true },
    status: 'local',
    mode: 'local',
    signInWithGoogle: mockSignInWithGoogle,
    signOut: mockSignOut,
    setMode: mockSetMode,
  };
}

function remoteAuth(): AuthContextValue {
  return {
    user: { id: 'remote-uid', isAnonymous: false, email: 'parent@example.com' },
    status: 'remote-signed-in',
    mode: 'remote',
    signInWithGoogle: mockSignInWithGoogle,
    signOut: mockSignOut,
    setMode: mockSetMode,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  repository = makeRepository();
  mockSignInWithGoogle.mockResolvedValue(undefined);
  mockSignOut.mockResolvedValue(undefined);
  mockMigrateRemoteToLocal.mockResolvedValue({
    uploaded: { children: 1, weights: 0, feedingConfigs: 0 },
    failed: 0,
    errors: [],
  });
  mockGatherExportData.mockResolvedValue({
    exportedAt: 'x',
    children: [],
    weights: [],
    feedingConfigs: [],
  });
  mockListChildren.mockResolvedValue([
    {
      id: 'child-1',
      ownerId: 'remote-uid',
      name: 'Mia',
      sex: 'female',
      dateOfBirth: '2025-01-15',
      createdAt: '2025-01-16T00:00:00.000Z',
      updatedAt: '2025-01-16T00:00:00.000Z',
    },
  ]);
  mockDeleteChild.mockResolvedValue(undefined);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StoragePrivacy', () => {
  it('shows the on-device mode in local mode', () => {
    authValue = localAuth();
    render(<StoragePrivacy />);
    expect(screen.getByText(t('sync.settings.modeLocal'))).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t('sync.settings.switchToRemote') }),
    ).toBeInTheDocument();
  });

  it('shows the synced mode with email in remote mode', () => {
    authValue = remoteAuth();
    render(<StoragePrivacy />);
    expect(screen.getByText(/Synced — parent@example.com/)).toBeInTheDocument();
  });

  it('local → remote switch calls setMode("remote") then signInWithGoogle', async () => {
    const user = userEvent.setup();
    authValue = localAuth();
    render(<StoragePrivacy />);

    await user.click(
      screen.getByRole('button', { name: t('sync.settings.switchToRemote') }),
    );

    await waitFor(() => {
      expect(mockSetMode).toHaveBeenCalledWith('remote');
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  it('remote → local switch confirms, calls migrateRemoteToLocal + setMode("local")', async () => {
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    authValue = remoteAuth();
    render(<StoragePrivacy />);

    await user.click(
      screen.getByRole('button', { name: t('sync.settings.switchToLocal') }),
    );

    await waitFor(() => {
      expect(mockMigrateRemoteToLocal).toHaveBeenCalledWith({
        remoteOwnerId: 'remote-uid',
        localOwnerId: 'local-anon-id',
      });
      expect(mockSetMode).toHaveBeenCalledWith('local');
    });
    confirmSpy.mockRestore();
  });

  it('export calls gatherExportData and downloadJson', async () => {
    const user = userEvent.setup();
    authValue = remoteAuth();
    render(<StoragePrivacy />);

    await user.click(
      screen.getByRole('button', { name: t('sync.settings.exportButton') }),
    );

    await waitFor(() => {
      expect(mockGatherExportData).toHaveBeenCalledWith(repository, 'remote-uid');
      expect(mockDownloadJson).toHaveBeenCalledTimes(1);
    });
  });

  it('delete shows a confirm modal then deletes children and signs out', async () => {
    const user = userEvent.setup();
    authValue = remoteAuth();
    render(<StoragePrivacy />);

    await user.click(
      screen.getByRole('button', { name: t('sync.delete.button') }),
    );
    expect(screen.getByText(t('sync.delete.confirmTitle'))).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: t('sync.delete.confirm') }),
    );

    await waitFor(() => {
      expect(mockDeleteChild).toHaveBeenCalledWith('child-1');
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });

  it('does not show the delete button in local mode', () => {
    authValue = localAuth();
    render(<StoragePrivacy />);
    expect(
      screen.queryByRole('button', { name: t('sync.delete.button') }),
    ).not.toBeInTheDocument();
  });
});
