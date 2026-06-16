// Routing tests for RootRedirect — branches on auth status (SYNC-1/2).
// Verifies: loading → spinner; local → /growth or /onboarding by child presence;
// remote-signed-in → /growth or /profile/child; remote-signed-out → /onboarding.
//
// Strategy: render RootRedirect in a MemoryRouter; mock useAuth + useRepository.
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import type { AuthStatus } from '../auth/AuthContext.js';
import type { Child } from '../types/index.js';
import { RootRedirect } from './RootRedirect.js';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockListChildren = vi.fn<() => Promise<Child[]>>();

vi.mock('../data/repository/useRepository', () => ({
  useRepository: (): { children: { list: () => Promise<Child[]> } } => ({
    children: {
      list: (): Promise<Child[]> =>
        (mockListChildren as () => Promise<Child[]>)(),
    },
  }),
}));

interface MockAuthState {
  user: { id: string; isAnonymous: boolean } | null;
  status: AuthStatus;
}

let mockAuthState: MockAuthState = {
  user: { id: 'owner-1', isAnonymous: true },
  status: 'local',
};

vi.mock('../auth/AuthContext', () => ({
  useAuth: (): MockAuthState => mockAuthState,
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function CurrentPath(): React.JSX.Element {
  const { pathname } = useLocation();
  return <div data-testid="current-path">{pathname}</div>;
}

function makeChild(): Child {
  return {
    id: 'child-1',
    ownerId: 'owner-1',
    name: 'Test Baby',
    sex: 'female',
    dateOfBirth: '2024-01-01',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

function renderRootRoute(): void {
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route
          path="/onboarding"
          element={<div data-testid="screen-onboarding">Onboarding</div>}
        />
        <Route
          path="/growth"
          element={<div data-testid="screen-growth">Growth</div>}
        />
        <Route
          path="/profile/child"
          element={<div data-testid="screen-child">Child</div>}
        />
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RootRedirect — local mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      user: { id: 'owner-1', isAnonymous: true },
      status: 'local',
    };
  });

  it('redirects to /onboarding when no child exists', async () => {
    mockListChildren.mockResolvedValue([]);
    renderRootRoute();

    await waitFor(() => {
      expect(screen.getByTestId('screen-onboarding')).toBeInTheDocument();
    });
  });

  it('redirects to /growth when a child is present', async () => {
    mockListChildren.mockResolvedValue([makeChild()]);
    renderRootRoute();

    await waitFor(() => {
      expect(screen.getByTestId('screen-growth')).toBeInTheDocument();
    });
  });
});

describe('RootRedirect — remote signed-in', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = {
      user: { id: 'remote-1', isAnonymous: false },
      status: 'remote-signed-in',
    };
  });

  it('redirects to /profile/child when the cloud is empty (first sign-in)', async () => {
    mockListChildren.mockResolvedValue([]);
    renderRootRoute();

    await waitFor(() => {
      expect(screen.getByTestId('screen-child')).toBeInTheDocument();
    });
  });

  it('redirects to /growth when a child already exists', async () => {
    mockListChildren.mockResolvedValue([makeChild()]);
    renderRootRoute();

    await waitFor(() => {
      expect(screen.getByTestId('screen-growth')).toBeInTheDocument();
    });
  });
});

describe('RootRedirect — remote signed-out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { user: null, status: 'remote-signed-out' };
  });

  it('redirects to /onboarding (sign-in view)', async () => {
    renderRootRoute();

    await waitFor(() => {
      expect(screen.getByTestId('screen-onboarding')).toBeInTheDocument();
    });
    expect(mockListChildren).not.toHaveBeenCalled();
  });
});

describe('RootRedirect — loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthState = { user: null, status: 'loading' };
  });

  it('shows a loading spinner while the session resolves', async () => {
    renderRootRoute();

    await waitFor(() => {
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('screen-onboarding')).not.toBeInTheDocument();
  });
});
