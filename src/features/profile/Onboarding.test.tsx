// Tests for the Onboarding screen — storage choice + Google sign-in (SYNC-1/2)
// Blueprint: docs/PRD-remote-sync.md → SYNC-1/2; design-system/MASTER.md
//
// Mocks: useRepository, AuthContext (useAuth), react-router-dom (useNavigate)

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Onboarding } from './Onboarding';
import { t } from '../../i18n/t';
import type { AuthStatus } from '../../auth/AuthContext';
import type { Child } from '../../types/index';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: (): typeof mockNavigate => mockNavigate,
}));

const mockListChildren = vi.fn<() => Promise<Child[]>>();

vi.mock('../../data/repository/useRepository', () => ({
  useRepository: (): { children: { list: () => Promise<Child[]> } } => ({
    children: {
      list: (): Promise<Child[]> =>
        (mockListChildren as () => Promise<Child[]>)(),
    },
  }),
}));

const MOCK_USER_ID = 'test-user-1';

const mockSetMode = vi.fn();
const mockSignInWithGoogle = vi.fn<() => Promise<void>>();

interface MockAuthState {
  user: { id: string; isAnonymous: boolean } | null;
  status: AuthStatus;
}

let mockAuthState: MockAuthState = {
  user: { id: MOCK_USER_ID, isAnonymous: true },
  status: 'local',
};

vi.mock('../../auth/AuthContext', () => ({
  useAuth: (): {
    user: { id: string; isAnonymous: boolean } | null;
    status: AuthStatus;
    setMode: typeof mockSetMode;
    signInWithGoogle: typeof mockSignInWithGoogle;
  } => ({
    user: mockAuthState.user,
    status: mockAuthState.status,
    setMode: mockSetMode,
    signInWithGoogle: mockSignInWithGoogle,
  }),
}));

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

const fixtureChild: Child = {
  id: 'child-1',
  ownerId: MOCK_USER_ID,
  name: 'Aria',
  sex: 'female',
  dateOfBirth: '2025-01-01',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderOnboarding(): ReturnType<typeof render> {
  return render(<Onboarding />);
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe('Onboarding — storage choice (first run / local)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      user: { id: MOCK_USER_ID, isAnonymous: true },
      status: 'local',
    };
    mockListChildren.mockResolvedValue([]);
    mockSignInWithGoogle.mockResolvedValue(undefined);
  });

  it('renders the welcome heading', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: t('onboarding.welcomeTitle') }),
      ).toBeInTheDocument();
    });
  });

  it('renders the medical disclaimer body text', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(screen.getByText(t('disclaimer.body'))).toBeInTheDocument();
    });
  });

  it('renders both storage options', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: t('onboarding.storage.deviceTitle'),
        }),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByRole('button', {
        name: t('onboarding.storage.syncTitle'),
      }),
    ).toBeInTheDocument();
  });

  it('"Keep on this device" sets local mode and navigates to /profile/child', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    const deviceOption = await screen.findByRole('button', {
      name: t('onboarding.storage.deviceTitle'),
    });
    await user.click(deviceOption);

    expect(mockSetMode).toHaveBeenCalledWith('local');
    expect(mockNavigate).toHaveBeenCalledWith('/profile/child');
  });

  it('"Sync to my account" sets remote mode and starts Google sign-in', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    const syncOption = await screen.findByRole('button', {
      name: t('onboarding.storage.syncTitle'),
    });
    await user.click(syncOption);

    expect(mockSetMode).toHaveBeenCalledWith('remote');
    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  it('shows a calm error message when sign-in fails before redirect', async () => {
    mockSignInWithGoogle.mockRejectedValueOnce(new Error('redirect failed'));
    const user = userEvent.setup();
    renderOnboarding();

    const syncOption = await screen.findByRole('button', {
      name: t('onboarding.storage.syncTitle'),
    });
    await user.click(syncOption);

    await waitFor(() => {
      expect(screen.getByText(t('auth.signInError'))).toBeInTheDocument();
    });
  });
});

describe('Onboarding — remote signed out (sign-in view)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { user: null, status: 'remote-signed-out' };
    mockSignInWithGoogle.mockResolvedValue(undefined);
  });

  it('shows the "Continue with Google" button', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: t('auth.signInWithGoogle') }),
      ).toBeInTheDocument();
    });
  });

  it('does not show the storage choice options', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: t('auth.signInWithGoogle') }),
      ).toBeInTheDocument();
    });

    expect(
      screen.queryByRole('button', {
        name: t('onboarding.storage.deviceTitle'),
      }),
    ).not.toBeInTheDocument();
  });

  it('calls signInWithGoogle when the button is clicked', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    const signInButton = await screen.findByRole('button', {
      name: t('auth.signInWithGoogle'),
    });
    await user.click(signInButton);

    await waitFor(() => {
      expect(mockSignInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });
});

describe('Onboarding — child already exists (redirect guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      user: { id: MOCK_USER_ID, isAnonymous: true },
      status: 'local',
    };
    mockListChildren.mockResolvedValue([fixtureChild]);
  });

  it('redirects to /growth when a child already exists', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/growth', { replace: true });
    });
  });
});

describe('Onboarding — repository error (graceful fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      user: { id: MOCK_USER_ID, isAnonymous: true },
      status: 'local',
    };
    mockListChildren.mockRejectedValue(new Error('Storage error'));
  });

  it('falls back to showing the storage choice on repository error', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: t('onboarding.welcomeTitle') }),
      ).toBeInTheDocument();
    });
  });
});
