// Tests for Onboarding screen (M1-6)
// Blueprint: docs/ui-blueprints.md → "Onboarding / Welcome"
// Design system: design-system/MASTER.md
//
// Mocks: repository (data/repository/index), AuthContext, react-router-dom (useNavigate)

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Onboarding } from './Onboarding';
import { t } from '../../i18n/t';
import type { Child } from '../../types/index';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: (): typeof mockNavigate => mockNavigate,
}));

const mockListChildren = vi.fn<() => Promise<Child[]>>();

vi.mock('../../data/repository/index', () => ({
  repository: {
    children: {
      list: (_ownerId: string): Promise<Child[]> =>
        (mockListChildren as () => Promise<Child[]>)(),
    },
  },
}));

const MOCK_USER_ID = 'test-user-1';

vi.mock('../../auth/AuthContext', () => ({
  useAuth: (): { user: { id: string; isAnonymous: true } } => ({
    user: { id: MOCK_USER_ID, isAnonymous: true },
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

describe('Onboarding — no child (happy path)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No existing child — show the welcome screen
    mockListChildren.mockResolvedValue([]);
  });

  it('renders the welcome heading', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: t('onboarding.welcomeTitle') }),
      ).toBeInTheDocument();
    });
  });

  it('renders the reassuring welcome body copy', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(screen.getByText(t('onboarding.welcomeBody'))).toBeInTheDocument();
    });
  });

  it('renders the medical disclaimer body text', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(screen.getByText(t('disclaimer.body'))).toBeInTheDocument();
    });
  });

  it('disclaimer has no dismiss or close control', async () => {
    renderOnboarding();

    await waitFor(() => {
      // Wait until the screen is ready (heading present)
      expect(
        screen.getByRole('heading', { name: t('onboarding.welcomeTitle') }),
      ).toBeInTheDocument();
    });

    // No close/dismiss button
    expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /dismiss/i })).not.toBeInTheDocument();
  });

  it('renders the CTA button with correct accessible label', async () => {
    renderOnboarding();

    await waitFor(() => {
      const cta = screen.getByRole('button', { name: t('onboarding.cta') });
      expect(cta).toBeInTheDocument();
    });
  });

  it('CTA has min touch target (≥44×44px class applied)', async () => {
    renderOnboarding();

    await waitFor(() => {
      const cta = screen.getByRole('button', { name: t('onboarding.cta') });
      expect(cta.className).toMatch(/min-h-\[44px\]/);
      expect(cta.className).toMatch(/min-w-\[44px\]/);
    });
  });

  it('CTA navigates to /profile/child on click', async () => {
    const user = userEvent.setup();
    renderOnboarding();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: t('onboarding.cta') }),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: t('onboarding.cta') }));

    expect(mockNavigate).toHaveBeenCalledWith('/profile/child');
  });
});

describe('Onboarding — child already exists (redirect guard)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListChildren.mockResolvedValue([fixtureChild]);
  });

  it('redirects to /growth when a child already exists', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/growth', { replace: true });
    });
  });

  it('does not render the CTA after redirect', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/growth', { replace: true });
    });

    expect(
      screen.queryByRole('button', { name: t('onboarding.cta') }),
    ).not.toBeInTheDocument();
  });
});

describe('Onboarding — repository error (graceful fallback)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListChildren.mockRejectedValue(new Error('Storage error'));
  });

  it('falls back to showing the welcome screen on repository error', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: t('onboarding.welcomeTitle') }),
      ).toBeInTheDocument();
    });
  });

  it('still renders the CTA on error fallback', async () => {
    renderOnboarding();

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: t('onboarding.cta') }),
      ).toBeInTheDocument();
    });
  });
});
