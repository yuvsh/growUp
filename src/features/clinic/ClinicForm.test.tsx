// Tests for ClinicForm (M1-1).
// Blueprint: docs/ui-blueprints.md → "Clinic Form"
// PRD stories: CLM-2, CLM-3, CLM-4
//
// Providers: MemoryRouter + LocaleProvider + ClinicReadProvider (so
// useClinicReadContext() resolves). Mirrors the setup used in ClinicEntry.test.tsx
// and WeightForm.test.tsx.

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { ClinicReadProvider } from './ClinicReadContext';
import { ClinicForm } from './ClinicForm';
import { t } from '../../i18n/t';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();
const mockSubmit = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// Mock useClinicReadContext so tests can assert submit() is called without
// needing the full derivation chain (who LMS tables, etc.).
vi.mock('./ClinicReadContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./ClinicReadContext')>();
  return {
    ...actual,
    useClinicReadContext: () => ({
      submit: mockSubmit,
      reset: vi.fn(),
      input: null,
      read: null,
    }),
  };
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// A DOB in the recent past so measurements are well within the WHO 0–24 month window.
const VALID_DOB = '2025-06-01';
// A measurement date that is on/after VALID_DOB and within 0–24 months.
const VALID_MEASURED_DATE_1 = '2025-08-01';

// Plausible weights in kg (≥ 0.1 kg = 100 g, ≤ 20 kg = 20 000 g).
const BIRTH_WEIGHT_KG = '3.2'; // 3200 g
const CURRENT_WEIGHT_KG_1 = '5.5'; // 5500 g

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

function renderClinicForm(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <ClinicReadProvider>
          <ClinicForm />
        </ClinicReadProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Helper: fill the minimum required fields
// ---------------------------------------------------------------------------

async function fillMinimumValidForm(
  user: ReturnType<typeof userEvent.setup>,
): Promise<void> {
  // DOB
  const dobInput = screen.getByLabelText(t('clinic.form.dobLabel'));
  await user.clear(dobInput);
  await user.type(dobInput, VALID_DOB);

  // Sex — click "Boy"
  const maleLabel = screen.getByRole('radio', { name: t('profile.sex.male') });
  await user.click(maleLabel);

  // Birth weight
  const birthWeightInput = screen.getByLabelText(t('clinic.form.birthWeightLabel'));
  await user.clear(birthWeightInput);
  await user.type(birthWeightInput, BIRTH_WEIGHT_KG);

  // Current weight #1
  const w1Input = screen.getByLabelText(t('clinic.form.currentWeightLabel'));
  await user.clear(w1Input);
  await user.type(w1Input, CURRENT_WEIGHT_KG_1);

  // Current weight #1 date
  const w1DateInput = screen.getByLabelText(t('clinic.form.currentWeightDateLabel'));
  await user.clear(w1DateInput);
  await user.type(w1DateInput, VALID_MEASURED_DATE_1);
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe('ClinicForm — layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form title from i18n copy', () => {
    renderClinicForm();
    expect(
      screen.getByRole('heading', { name: t('clinic.form.title') }),
    ).toBeInTheDocument();
  });

  it('renders the DOB field with a visible label', () => {
    renderClinicForm();
    expect(screen.getByLabelText(t('clinic.form.dobLabel'))).toBeInTheDocument();
  });

  it('renders the sex selector', () => {
    renderClinicForm();
    // SexSelector renders a radiogroup and individual radio inputs.
    expect(screen.getByRole('radio', { name: t('profile.sex.male') })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: t('profile.sex.female') })).toBeInTheDocument();
  });

  it('renders the birth weight field with a visible label', () => {
    renderClinicForm();
    expect(screen.getByLabelText(t('clinic.form.birthWeightLabel'))).toBeInTheDocument();
  });

  it('renders current weight #1 with visible labels', () => {
    renderClinicForm();
    expect(screen.getByLabelText(t('clinic.form.currentWeightLabel'))).toBeInTheDocument();
    expect(screen.getByLabelText(t('clinic.form.currentWeightDateLabel'))).toBeInTheDocument();
  });

  it('renders the "Get read" button and the "Clear" button', () => {
    renderClinicForm();
    expect(screen.getByRole('button', { name: t('clinic.form.getRead') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: t('clinic.form.clear') })).toBeInTheDocument();
  });

  it('"Get read" is disabled initially (required fields empty)', () => {
    renderClinicForm();
    const getReadButton = screen.getByRole('button', { name: t('clinic.form.getRead') });
    expect(getReadButton).toBeDisabled();
  });

  it('does not render a second-weight field (a second weight is added on the result screen)', () => {
    renderClinicForm();
    // Only the single current-weight row is present.
    expect(
      screen.getAllByLabelText(t('clinic.form.currentWeightLabel')),
    ).toHaveLength(1);
  });
});

describe('ClinicForm — valid submission (CLM-2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('valid minimum input (DOB + sex + birth weight + 1 current weight) calls submit and navigates', async () => {
    const user = userEvent.setup();
    renderClinicForm();

    await fillMinimumValidForm(user);

    const getReadButton = screen.getByRole('button', { name: t('clinic.form.getRead') });
    expect(getReadButton).not.toBeDisabled();
    await user.click(getReadButton);

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/clinic/result');
  });

  it('submit passes correct kg→grams conversion for birth weight and current weight', async () => {
    const user = userEvent.setup();
    renderClinicForm();

    await fillMinimumValidForm(user);

    await user.click(screen.getByRole('button', { name: t('clinic.form.getRead') }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    const [clinicInput] = mockSubmit.mock.calls[0] as [
      { birthWeightGrams: number; currentWeights: Array<{ weightGrams: number }> },
    ];
    // 3.2 kg → 3200 g
    expect(clinicInput.birthWeightGrams).toBe(3200);
    // 5.5 kg → 5500 g
    expect(clinicInput.currentWeights[0]?.weightGrams).toBe(5500);
  });

  it('submit payload carries a single current weight', async () => {
    const user = userEvent.setup();
    renderClinicForm();

    await fillMinimumValidForm(user);

    await user.click(screen.getByRole('button', { name: t('clinic.form.getRead') }));

    await waitFor(() => {
      expect(mockSubmit).toHaveBeenCalledTimes(1);
    });

    const [clinicInput] = mockSubmit.mock.calls[0] as [
      { currentWeights: Array<{ weightGrams: number; measuredOn: string }> },
    ];
    expect(clinicInput.currentWeights).toHaveLength(1);
    expect(clinicInput.currentWeights[0]?.measuredOn).toBe(VALID_MEASURED_DATE_1);
  });

  it('"Clear" resets the form and disables "Get read" again', async () => {
    const user = userEvent.setup();
    renderClinicForm();

    await fillMinimumValidForm(user);
    expect(
      screen.getByRole('button', { name: t('clinic.form.getRead') }),
    ).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: t('clinic.form.clear') }));

    expect(
      screen.getByRole('button', { name: t('clinic.form.getRead') }),
    ).toBeDisabled();
  });
});

describe('ClinicForm — validation errors (CLM-2, CLM-3)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('future DOB shows the future-DOB error and does not submit', async () => {
    const user = userEvent.setup();
    renderClinicForm();

    // Enter a future date for DOB
    const futureDob = '2099-01-01';
    const dobInput = screen.getByLabelText(t('clinic.form.dobLabel'));
    await user.clear(dobInput);
    await user.type(dobInput, futureDob);

    // Tab out to trigger onBlur validation
    await user.tab();

    await waitFor(() => {
      expect(
        screen.getByText(t('clinic.form.validation.dobFuture')),
      ).toBeInTheDocument();
    });

    // "Get read" should still be disabled because the form is invalid
    expect(
      screen.getByRole('button', { name: t('clinic.form.getRead') }),
    ).toBeDisabled();

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('missing birth weight shows the birth weight required error and does not submit', async () => {
    const user = userEvent.setup();
    renderClinicForm();

    // Fill all fields except birth weight
    const dobInput = screen.getByLabelText(t('clinic.form.dobLabel'));
    await user.clear(dobInput);
    await user.type(dobInput, VALID_DOB);

    await user.click(screen.getByRole('radio', { name: t('profile.sex.male') }));

    const w1Input = screen.getByLabelText(t('clinic.form.currentWeightLabel'));
    await user.clear(w1Input);
    await user.type(w1Input, CURRENT_WEIGHT_KG_1);

    const w1DateInput = screen.getByLabelText(t('clinic.form.currentWeightDateLabel'));
    await user.clear(w1DateInput);
    await user.type(w1DateInput, VALID_MEASURED_DATE_1);

    // Touch the birth weight field and tab away without filling it
    const birthWeightInput = screen.getByLabelText(t('clinic.form.birthWeightLabel'));
    await user.click(birthWeightInput);
    await user.tab();

    await waitFor(() => {
      expect(
        screen.getByText(t('clinic.form.validation.birthWeightRequired')),
      ).toBeInTheDocument();
    });

    // "Get read" still disabled (birth weight missing)
    expect(
      screen.getByRole('button', { name: t('clinic.form.getRead') }),
    ).toBeDisabled();

    expect(mockSubmit).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('current weight date before DOB shows validation error', async () => {
    const user = userEvent.setup();
    renderClinicForm();

    const dobInput = screen.getByLabelText(t('clinic.form.dobLabel'));
    await user.clear(dobInput);
    await user.type(dobInput, VALID_DOB);

    // Set measurement date BEFORE DOB
    const w1DateInput = screen.getByLabelText(t('clinic.form.currentWeightDateLabel'));
    await user.clear(w1DateInput);
    await user.type(w1DateInput, '2025-01-01'); // before VALID_DOB = 2025-06-01

    await user.tab();

    await waitFor(() => {
      expect(
        screen.getByText(t('clinic.form.validation.dateBeforeBirth')),
      ).toBeInTheDocument();
    });

    expect(mockSubmit).not.toHaveBeenCalled();
  });
});

describe('ClinicForm — soft warn (CLM-4)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('implausible birth weight shows a soft warning (not a hard error)', async () => {
    const user = userEvent.setup();
    renderClinicForm();

    // Enter an implausibly high weight (e.g. 50 kg = 50000 g)
    const birthWeightInput = screen.getByLabelText(t('clinic.form.birthWeightLabel'));
    await user.clear(birthWeightInput);
    await user.type(birthWeightInput, '50');
    await user.tab();

    await waitFor(() => {
      expect(
        screen.getByText(t('clinic.form.validation.implausibleWeight')),
      ).toBeInTheDocument();
    });

    // It should not be rendered as an error (role="alert") — only role="status"
    const warnEl = screen.getByText(t('clinic.form.validation.implausibleWeight'));
    expect(warnEl).toHaveAttribute('role', 'status');
  });

  it('implausible current weight #1 shows a soft warning', async () => {
    const user = userEvent.setup();
    renderClinicForm();

    const w1Input = screen.getByLabelText(t('clinic.form.currentWeightLabel'));
    await user.clear(w1Input);
    // 0.05 kg = 50 g — below the 100 g implausible min
    await user.type(w1Input, '0.05');
    await user.tab();

    await waitFor(() => {
      const warns = screen.getAllByText(t('clinic.form.validation.implausibleWeight'));
      expect(warns.length).toBeGreaterThan(0);
    });
  });
});
