// Tests for the useRequireChild guard — auth-status aware (SYNC-1/2).
// Verifies: loading → 'loading'; remote-signed-out → redirect; local with no
// child → redirect; local with a child → allowed.
//
// Strategy: render a tiny probe component, mock useAuth + useRepository +
// useNavigate.
import { render, screen, waitFor } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import type { AuthStatus } from '../auth/AuthContext.js';
import type { Child } from '../types/index.js';
import { useRequireChild } from './useRequireChild.js';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: (): typeof mockNavigate => mockNavigate,
}));

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
// Probe
// ---------------------------------------------------------------------------

function Probe(): React.JSX.Element {
  const state = useRequireChild();
  return <div data-testid="guard-state">{state}</div>;
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

function readState(): string {
  return screen.getByTestId('guard-state').textContent ?? '';
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useRequireChild', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stays loading while the session resolves', () => {
    mockAuthState = { user: null, status: 'loading' };
    render(<Probe />);
    expect(readState()).toBe('loading');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('redirects to /onboarding when remote-signed-out', async () => {
    mockAuthState = { user: null, status: 'remote-signed-out' };
    render(<Probe />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding', {
        replace: true,
      });
    });
    expect(mockListChildren).not.toHaveBeenCalled();
  });

  it('redirects to /onboarding when local and no child exists', async () => {
    mockAuthState = {
      user: { id: 'owner-1', isAnonymous: true },
      status: 'local',
    };
    mockListChildren.mockResolvedValue([]);
    render(<Probe />);

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/onboarding', {
        replace: true,
      });
    });
  });

  it('allows render when a child exists', async () => {
    mockAuthState = {
      user: { id: 'owner-1', isAnonymous: true },
      status: 'local',
    };
    mockListChildren.mockResolvedValue([makeChild()]);
    render(<Probe />);

    await waitFor(() => {
      expect(readState()).toBe('allowed');
    });
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
