// Routing smoke tests (M0-4)
// Tests the RootRedirect component directly: verifies it calls navigate to
// /onboarding when no child exists, and to /growth when a child is stored.
//
// Strategy: render RootRedirect inside a MemoryRouter; mock the repository and
// localStorage; assert that the correct navigation happens.
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';
import { AuthProvider } from '../auth/AuthContext.js';
import { LocaleProvider } from '../i18n/LocaleContext.js';
import * as repositoryModule from '../data/repository/index.js';
import type { Child } from '../types/index.js';
import { RootRedirect } from './RootRedirect.js';

// ---------------------------------------------------------------------------
// In-memory storage (avoids Node 22+ localStorage.clear() issues)
// ---------------------------------------------------------------------------

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Displays the current pathname so we can assert on navigation. */
function CurrentPath(): React.JSX.Element {
  const { pathname } = useLocation();
  return <div data-testid="current-path">{pathname}</div>;
}

/** A minimal valid Child fixture. */
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

function Providers({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <AuthProvider>
      <LocaleProvider>{children}</LocaleProvider>
    </AuthProvider>
  );
}

/**
 * Renders the route tree in a MemoryRouter starting at "/".
 * Both /onboarding and /growth show a testid so assertions are deterministic.
 */
function renderRootRoute(): void {
  render(
    <Providers>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/onboarding" element={<div data-testid="screen-onboarding">Onboarding</div>} />
          <Route path="/growth" element={<div data-testid="screen-growth">Growth</div>} />
          <Route path="*" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>
    </Providers>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Root route redirect', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('redirects to /onboarding when no child exists in the repository', async () => {
    vi.spyOn(repositoryModule.repository.children, 'list').mockResolvedValue([]);

    renderRootRoute();

    await waitFor(() => {
      expect(screen.getByTestId('screen-onboarding')).toBeInTheDocument();
    });
  });

  it('redirects to /growth when a child is present in the repository', async () => {
    vi.spyOn(repositoryModule.repository.children, 'list').mockResolvedValue([makeChild()]);

    renderRootRoute();

    await waitFor(() => {
      expect(screen.getByTestId('screen-growth')).toBeInTheDocument();
    });
  });
});
