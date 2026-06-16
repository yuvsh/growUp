// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock the two repository instances with identifiable sentinels so we can
// assert which one useRepository returns. vi.mock is hoisted; the factory
// must not reference outer variables.
// ---------------------------------------------------------------------------

vi.mock('./index.js', () => ({
  localRepository: { __kind: 'local' },
  supabaseRepository: { __kind: 'supabase' },
}));

// useAuth is swapped per test to drive the routing decision.
const mockUseAuth = vi.fn();

vi.mock('../../auth/AuthContext.js', () => ({
  useAuth: () => mockUseAuth(),
}));

import { useRepository } from './useRepository.js';
import { localRepository, supabaseRepository } from './index.js';

describe('useRepository', () => {
  it('returns the local repository in local mode', () => {
    mockUseAuth.mockReturnValue({
      mode: 'local',
      user: { id: 'anon-1', isAnonymous: true },
    });

    const { result } = renderHook(() => useRepository());
    expect(result.current).toBe(localRepository);
  });

  it('returns the supabase repository in remote mode when signed in', () => {
    mockUseAuth.mockReturnValue({
      mode: 'remote',
      user: { id: 'user-1', isAnonymous: false, email: 'a@b.com' },
    });

    const { result } = renderHook(() => useRepository());
    expect(result.current).toBe(supabaseRepository);
  });

  it('returns the local repository in remote mode when signed out', () => {
    mockUseAuth.mockReturnValue({ mode: 'remote', user: null });

    const { result } = renderHook(() => useRepository());
    expect(result.current).toBe(localRepository);
  });
});
