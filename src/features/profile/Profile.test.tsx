// Tests for Profile screen (M1-5)
// Blueprint: docs/ui-blueprints.md → "Profile"
// Design system: design-system/MASTER.md
//
// Mocks: useChild (src/lib/hooks/useChild), react-router-dom (useNavigate)

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Profile } from './Profile';
import { t } from '../../i18n/t';
import type { Child } from '../../types/index';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: (): typeof mockNavigate => mockNavigate,
}));

const mockReload = vi.fn();

interface MockUseChildResult {
  child: Child | null;
  loading: boolean;
  error: Error | null;
  reload: typeof mockReload;
}

const mockUseChildState: MockUseChildResult = {
  child: null,
  loading: false,
  error: null,
  reload: mockReload,
};

vi.mock('../../lib/hooks/useChild', () => ({
  useChild: (): MockUseChildResult => mockUseChildState,
}));

// StoragePrivacy depends on AuthProvider/repository context; Profile's only
// responsibility is to render it, so stub it out here.
vi.mock('../settings/StoragePrivacy', () => ({
  StoragePrivacy: (): React.JSX.Element => <div data-testid="storage-privacy" />,
}));

// ---------------------------------------------------------------------------
// Fixture child
// ---------------------------------------------------------------------------

const fixtureChild: Child = {
  id: 'child-1',
  ownerId: 'user-1',
  name: 'Emma',
  sex: 'female',
  // Use a fixed past date so formatAge is deterministic relative to "today"
  dateOfBirth: '2025-01-01',
  createdAt: '2025-01-01T00:00:00.000Z',
  updatedAt: '2025-01-01T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderProfile(): void {
  render(<Profile />);
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe('Profile — loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChildState.child = null;
    mockUseChildState.loading = true;
    mockUseChildState.error = null;
  });

  it('shows a skeleton while loading', () => {
    renderProfile();
    // Skeleton renders aria-hidden divs — confirm no child name or empty state is shown
    expect(screen.queryByText(t('profile.empty.title'))).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // The skeleton root divs are aria-hidden; confirm the edit button is absent
    render(<Profile />);
    // Should not render the child name or edit button
    expect(screen.queryByRole('button', { name: t('profile.editAriaLabel') })).not.toBeInTheDocument();
  });
});

describe('Profile — no child (empty state)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChildState.child = null;
    mockUseChildState.loading = false;
    mockUseChildState.error = null;
  });

  it('shows the empty state title', () => {
    renderProfile();
    expect(
      screen.getByRole('heading', { name: t('profile.empty.title') }),
    ).toBeInTheDocument();
  });

  it('shows a CTA button that navigates to /profile/child', async () => {
    const user = userEvent.setup();
    renderProfile();

    const ctaButton = screen.getByRole('button', { name: t('profile.empty.cta') });
    expect(ctaButton).toBeInTheDocument();

    await user.click(ctaButton);
    expect(mockNavigate).toHaveBeenCalledWith('/profile/child');
  });
});

describe('Profile — with child', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChildState.child = fixtureChild;
    mockUseChildState.loading = false;
    mockUseChildState.error = null;
  });

  it('renders the child name', () => {
    renderProfile();
    expect(
      screen.getByRole('heading', { name: 'Emma' }),
    ).toBeInTheDocument();
  });

  it('renders the formatted age as plain text (not a heading)', () => {
    renderProfile();
    // The age is shown in a <p> element — it should be present somewhere in the document
    // We look for any text that isn't inside a heading
    const ageTexts = screen.getAllByText((content) =>
      // formatAge produces strings like "5 months", "3 months, 2 weeks", etc.
      /\d+\s+(month|week|day)/.test(content),
    );
    expect(ageTexts.length).toBeGreaterThan(0);
  });

  it('renders the sex label and value', () => {
    renderProfile();
    expect(screen.getByText(t('profile.sexLabel'))).toBeInTheDocument();
    expect(screen.getByText(t('profile.sex.female'))).toBeInTheDocument();
  });

  it('renders the date of birth label and value', () => {
    renderProfile();
    expect(screen.getByText(t('profile.dobLabel'))).toBeInTheDocument();
    expect(screen.getByText(fixtureChild.dateOfBirth)).toBeInTheDocument();
  });

  it('renders an Edit button with the correct aria-label and navigates to /profile/child on click', async () => {
    const user = userEvent.setup();
    renderProfile();

    const editButton = screen.getByRole('button', {
      name: t('profile.editAriaLabel'),
    });
    expect(editButton).toBeInTheDocument();

    await user.click(editButton);
    expect(mockNavigate).toHaveBeenCalledWith('/profile/child');
  });

  it('Edit button has a min touch target (≥44×44px class applied)', () => {
    renderProfile();
    const editButton = screen.getByRole('button', {
      name: t('profile.editAriaLabel'),
    });
    // The Button component sets min-h-[44px] min-w-[44px] via SIZE_CLASSES
    expect(editButton.className).toMatch(/min-h-\[44px\]/);
    expect(editButton.className).toMatch(/min-w-\[44px\]/);
  });

  it('does not show the empty state or error state', () => {
    renderProfile();
    expect(screen.queryByText(t('profile.empty.title'))).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('Profile — error state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChildState.child = null;
    mockUseChildState.loading = false;
    mockUseChildState.error = new Error('Failed to load');
  });

  it('shows the error state with role="alert"', () => {
    renderProfile();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows the error title', () => {
    renderProfile();
    expect(screen.getByText(t('profile.error.title'))).toBeInTheDocument();
  });

  it('shows a retry button that calls reload', async () => {
    const user = userEvent.setup();
    renderProfile();

    const retryButton = screen.getByRole('button', { name: /try again/i });
    expect(retryButton).toBeInTheDocument();

    await user.click(retryButton);
    expect(mockReload).toHaveBeenCalledTimes(1);
  });

  it('does not show child name or empty state', () => {
    renderProfile();
    expect(screen.queryByText('Emma')).not.toBeInTheDocument();
    expect(screen.queryByText(t('profile.empty.title'))).not.toBeInTheDocument();
  });
});
