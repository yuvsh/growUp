// Tests for ChildForm component (M1-4)
// Blueprint: docs/ui-blueprints.md → "Add / Edit Child"
// Design system: design-system/MASTER.md
//
// Mocks: useChild (src/lib/hooks/useChild), useNavigate (react-router-dom)

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChildForm } from './ChildForm';
import { t } from '../../i18n/t';
import type { Child } from '../../types/index';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: (): typeof mockNavigate => mockNavigate,
}));

const mockCreateChild = vi.fn();
const mockUpdateChild = vi.fn();
const mockDeleteChild = vi.fn();

// Default state — no child (ADD mode)
const defaultUseChildResult = {
  child: null as Child | null,
  loading: false,
  error: null,
  createChild: mockCreateChild,
  updateChild: mockUpdateChild,
  deleteChild: mockDeleteChild,
  reload: vi.fn(),
};

vi.mock('../../lib/hooks/useChild', () => ({
  useChild: (): typeof defaultUseChildResult => defaultUseChildResult,
}));

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderForm(): void {
  render(<ChildForm />);
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe('ChildForm — ADD mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    defaultUseChildResult.child = null;
    mockCreateChild.mockResolvedValue({
      id: 'c1',
      ownerId: 'u1',
      name: 'Alice',
      sex: 'female',
      dateOfBirth: '2024-01-15',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies Child);
  });

  it('renders the "Tell us about your baby" title', () => {
    renderForm();
    expect(
      screen.getByRole('heading', {
        name: t('profile.childForm.titleAdd'),
      }),
    ).toBeInTheDocument();
  });

  it('fill valid fields → submit → createChild called with entered values and navigates to /profile', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByLabelText(t('profile.childForm.nameLabel')),
      'Alice',
    );
    await user.click(
      screen.getByRole('radio', { name: t('profile.sex.female') }),
    );
    await user.type(
      screen.getByLabelText(t('profile.childForm.dobLabel')),
      '2024-01-15',
    );

    await user.click(
      screen.getByRole('button', { name: t('common.save') }),
    );

    await waitFor(() => {
      expect(mockCreateChild).toHaveBeenCalledTimes(1);
    });

    expect(mockCreateChild).toHaveBeenCalledWith({
      name: 'Alice',
      sex: 'female',
      dateOfBirth: '2024-01-15',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('future DOB → submit blocked, error shown below DOB field', async () => {
    const user = userEvent.setup();
    renderForm();

    // Fill name and sex to isolate the DOB error
    await user.type(
      screen.getByLabelText(t('profile.childForm.nameLabel')),
      'Alice',
    );
    await user.click(
      screen.getByRole('radio', { name: t('profile.sex.female') }),
    );

    // Enter a future date
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0] as string;

    await user.type(
      screen.getByLabelText(t('profile.childForm.dobLabel')),
      futureDateStr,
    );

    await user.click(
      screen.getByRole('button', { name: t('common.save') }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    // createChild must NOT have been called
    expect(mockCreateChild).not.toHaveBeenCalled();

    // Error must appear below the DOB field
    const alerts = screen.getAllByRole('alert');
    const dobError = alerts.find((el) =>
      el.textContent?.includes('future') || el.textContent?.includes('Date'),
    );
    expect(dobError).toBeDefined();
  });

  it('missing sex → submit blocked, error shown', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByLabelText(t('profile.childForm.nameLabel')),
      'Alice',
    );
    await user.type(
      screen.getByLabelText(t('profile.childForm.dobLabel')),
      '2024-01-15',
    );

    await user.click(
      screen.getByRole('button', { name: t('common.save') }),
    );

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    expect(mockCreateChild).not.toHaveBeenCalled();

    const alerts = screen.getAllByRole('alert');
    const sexError = alerts.find((el) =>
      el.textContent?.toLowerCase().includes('sex'),
    );
    expect(sexError).toBeDefined();
  });
});

describe('ChildForm — EDIT mode', () => {
  const existingChild: Child = {
    id: 'child-1',
    ownerId: 'user-1',
    name: 'Bob',
    sex: 'male',
    dateOfBirth: '2024-03-10',
    createdAt: '2024-03-10T00:00:00.000Z',
    updatedAt: '2024-03-10T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultUseChildResult.child = existingChild;
    mockUpdateChild.mockResolvedValue({
      ...existingChild,
      name: 'Bobby',
      updatedAt: new Date().toISOString(),
    } satisfies Child);
    mockDeleteChild.mockResolvedValue(undefined);
  });

  it('renders "Edit baby" title in edit mode', () => {
    renderForm();
    expect(
      screen.getByRole('heading', {
        name: t('profile.childForm.titleEdit'),
      }),
    ).toBeInTheDocument();
  });

  it('fields are prefilled with existing child data', () => {
    renderForm();

    const nameInput = screen.getByLabelText(t('profile.childForm.nameLabel'));
    expect(nameInput).toHaveValue('Bob');

    const maleRadio = screen.getByRole('radio', {
      name: t('profile.sex.male'),
    });
    expect(maleRadio).toHaveAttribute('aria-checked', 'true');

    const dobInput = screen.getByLabelText(t('profile.childForm.dobLabel'));
    expect(dobInput).toHaveValue('2024-03-10');
  });

  it('submit calls updateChild with the entered values and navigates to /profile', async () => {
    const user = userEvent.setup();
    renderForm();

    // Clear name and type a new one
    const nameInput = screen.getByLabelText(t('profile.childForm.nameLabel'));
    await user.clear(nameInput);
    await user.type(nameInput, 'Bobby');

    await user.click(
      screen.getByRole('button', { name: t('common.save') }),
    );

    await waitFor(() => {
      expect(mockUpdateChild).toHaveBeenCalledTimes(1);
    });

    expect(mockUpdateChild).toHaveBeenCalledWith('child-1', {
      name: 'Bobby',
      sex: 'male',
      dateOfBirth: '2024-03-10',
    });

    expect(mockNavigate).toHaveBeenCalledWith('/profile');
  });

  it('delete flow: open modal → confirm → deleteChild called → navigate to /onboarding', async () => {
    const user = userEvent.setup();
    renderForm();

    // Click the "Delete baby" action button
    await user.click(
      screen.getByRole('button', {
        name: t('profile.childForm.deleteAction'),
      }),
    );

    // Modal should appear
    await waitFor(() => {
      expect(
        screen.getByRole('dialog', {
          name: t('profile.childForm.deleteModalTitle'),
        }),
      ).toBeInTheDocument();
    });

    // Confirm delete
    await user.click(
      screen.getByRole('button', { name: t('common.delete') }),
    );

    await waitFor(() => {
      expect(mockDeleteChild).toHaveBeenCalledTimes(1);
    });

    expect(mockDeleteChild).toHaveBeenCalledWith('child-1');
    expect(mockNavigate).toHaveBeenCalledWith('/onboarding');
  });
});

describe('ChildForm — mutation failure', () => {
  const existingChild: Child = {
    id: 'child-2',
    ownerId: 'user-1',
    name: 'Carol',
    sex: 'female',
    dateOfBirth: '2024-05-01',
    createdAt: '2024-05-01T00:00:00.000Z',
    updatedAt: '2024-05-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultUseChildResult.child = null;
    mockCreateChild.mockRejectedValue(new Error('Network error'));
  });

  it('mutation rejects → Toast shown with error message, form values preserved', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(
      screen.getByLabelText(t('profile.childForm.nameLabel')),
      'Alice',
    );
    await user.click(
      screen.getByRole('radio', { name: t('profile.sex.female') }),
    );
    await user.type(
      screen.getByLabelText(t('profile.childForm.dobLabel')),
      '2024-01-15',
    );

    await user.click(
      screen.getByRole('button', { name: t('common.save') }),
    );

    // Toast should appear
    await waitFor(() => {
      expect(
        screen.getByText(t('profile.childForm.saveMutationError')),
      ).toBeInTheDocument();
    });

    // Navigate must NOT have been called
    expect(mockNavigate).not.toHaveBeenCalled();

    // Form values must be preserved — name still "Alice"
    const nameInput = screen.getByLabelText(t('profile.childForm.nameLabel'));
    expect(nameInput).toHaveValue('Alice');
  });

  it('update mutation rejects → Toast shown, form values preserved', async () => {
    defaultUseChildResult.child = existingChild;
    mockUpdateChild.mockRejectedValue(new Error('Server error'));

    const user = userEvent.setup();
    renderForm();

    await user.click(
      screen.getByRole('button', { name: t('common.save') }),
    );

    await waitFor(() => {
      expect(
        screen.getByText(t('profile.childForm.saveMutationError')),
      ).toBeInTheDocument();
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    // Name must still have "Carol"
    expect(
      screen.getByLabelText(t('profile.childForm.nameLabel')),
    ).toHaveValue('Carol');
  });
});
