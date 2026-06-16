import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncUploadPrompt } from './SyncUploadPrompt';
import { t } from '../../i18n/t';
import type { AuthContextValue } from '../../auth/AuthContext';
import type {
  MigrationCounts,
  MigrationResult,
} from '../../lib/sync/migrateLocalToRemote';

// ---------------------------------------------------------------------------
// Mocks: auth + the sync module
// ---------------------------------------------------------------------------

const LOCAL_ANON_ID = 'local-anon-id';
const REMOTE_USER_ID = 'remote-user-id';
const UPLOAD_OFFERED_KEY = 'growup:syncUploadOffered';

let authValue: AuthContextValue;

vi.mock('../../auth/AuthContext', () => ({
  useAuth: (): AuthContextValue => authValue,
  getLocalAnonUserId: (): string => LOCAL_ANON_ID,
}));

const mockGetLocalDataCounts = vi.fn();
const mockMigrateLocalToRemote = vi.fn();

vi.mock('../../lib/sync/migrateLocalToRemote', () => ({
  getLocalDataCounts: (ownerId: string): Promise<MigrationCounts> =>
    mockGetLocalDataCounts(ownerId),
  migrateLocalToRemote: (args: unknown): Promise<MigrationResult> =>
    mockMigrateLocalToRemote(args),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeAuth(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: { id: REMOTE_USER_ID, isAnonymous: false, email: 'parent@example.com' },
    status: 'remote-signed-in',
    mode: 'remote',
    signInWithGoogle: vi.fn(),
    signOut: vi.fn(),
    setMode: vi.fn(),
    ...overrides,
  };
}

const DATA_COUNTS: MigrationCounts = { children: 1, weights: 12, feedingConfigs: 1 };
const EMPTY_COUNTS: MigrationCounts = { children: 0, weights: 0, feedingConfigs: 0 };

function makeResult(uploaded: MigrationCounts, failed = 0): MigrationResult {
  return { uploaded, failed, errors: [] };
}

const reloadSpy = vi.fn();

// jsdom in this environment ships a non-functional localStorage (no methods),
// so we install a minimal in-memory Storage stub for deterministic tests.
function installMemoryLocalStorage(): void {
  const store = new Map<string, string>();
  const memoryStorage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = {
    getItem: (key: string): string | null => store.get(key) ?? null,
    setItem: (key: string, value: string): void => {
      store.set(key, value);
    },
    removeItem: (key: string): void => {
      store.delete(key);
    },
  };
  vi.stubGlobal('localStorage', memoryStorage);
}

beforeEach(() => {
  installMemoryLocalStorage();
  authValue = makeAuth();
  mockGetLocalDataCounts.mockReset();
  mockMigrateLocalToRemote.mockReset();
  reloadSpy.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload: reloadSpy },
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SyncUploadPrompt', () => {
  it('opens the modal with local counts when signed-in with un-offered local data', async () => {
    mockGetLocalDataCounts.mockResolvedValue(DATA_COUNTS);
    render(<SyncUploadPrompt />);

    expect(
      await screen.findByText(t('sync.migration.title')),
    ).toBeInTheDocument();
    expect(mockGetLocalDataCounts).toHaveBeenCalledWith(LOCAL_ANON_ID);
    // Body interpolates {children}=1 and {weights}=12.
    expect(screen.getByText(/1 baby profile/i)).toBeInTheDocument();
    expect(screen.getByText(/12 weight entries/i)).toBeInTheDocument();
  });

  it('uploads on confirm: calls migrate with the right ids, sets the flag, shows success', async () => {
    const user = userEvent.setup();
    mockGetLocalDataCounts.mockResolvedValue(DATA_COUNTS);
    mockMigrateLocalToRemote.mockResolvedValue(makeResult(DATA_COUNTS));
    render(<SyncUploadPrompt />);

    await screen.findByText(t('sync.migration.title'));
    await user.click(
      screen.getByRole('button', { name: t('sync.migration.upload') }),
    );

    await waitFor(() => {
      expect(mockMigrateLocalToRemote).toHaveBeenCalledWith({
        localOwnerId: LOCAL_ANON_ID,
        remoteOwnerId: REMOTE_USER_ID,
      });
    });
    expect(localStorage.getItem(UPLOAD_OFFERED_KEY)).toBe('true');
    // Success copy: total uploaded = 1 + 12 + 1 = 14.
    expect(
      await screen.findByText(t('sync.migration.success').replace('{n}', '14')),
    ).toBeInTheDocument();
    expect(reloadSpy).toHaveBeenCalled();
  });

  it('on cancel: sets the offered flag and runs no migration', async () => {
    const user = userEvent.setup();
    mockGetLocalDataCounts.mockResolvedValue(DATA_COUNTS);
    render(<SyncUploadPrompt />);

    await screen.findByText(t('sync.migration.title'));
    await user.click(
      screen.getByRole('button', { name: t('sync.migration.notNow') }),
    );

    await waitFor(() => {
      expect(localStorage.getItem(UPLOAD_OFFERED_KEY)).toBe('true');
    });
    expect(mockMigrateLocalToRemote).not.toHaveBeenCalled();
    expect(
      screen.queryByText(t('sync.migration.title')),
    ).not.toBeInTheDocument();
  });

  it('does not open in local mode', async () => {
    authValue = makeAuth({
      status: 'local',
      mode: 'local',
      user: { id: LOCAL_ANON_ID, isAnonymous: true },
    });
    render(<SyncUploadPrompt />);

    await Promise.resolve();
    expect(mockGetLocalDataCounts).not.toHaveBeenCalled();
    expect(screen.queryByText(t('sync.migration.title'))).not.toBeInTheDocument();
  });

  it('does not open when the device has no local data', async () => {
    mockGetLocalDataCounts.mockResolvedValue(EMPTY_COUNTS);
    render(<SyncUploadPrompt />);

    await waitFor(() => {
      expect(mockGetLocalDataCounts).toHaveBeenCalled();
    });
    expect(screen.queryByText(t('sync.migration.title'))).not.toBeInTheDocument();
  });

  it('does not open when the offer was already made on this device', async () => {
    localStorage.setItem(UPLOAD_OFFERED_KEY, 'true');
    mockGetLocalDataCounts.mockResolvedValue(DATA_COUNTS);
    render(<SyncUploadPrompt />);

    await Promise.resolve();
    expect(mockGetLocalDataCounts).not.toHaveBeenCalled();
    expect(screen.queryByText(t('sync.migration.title'))).not.toBeInTheDocument();
  });
});
