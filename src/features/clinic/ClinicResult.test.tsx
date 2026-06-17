// Tests for ClinicResult — the Clinic Mode result screen.
// Blueprint: docs/ui-blueprints.md → "Clinic Result"
//
// UPDATED birth-weight model: trend + catchUp are ALWAYS present, so the
// TrendCard ALWAYS renders. There is no single-weight EmptyState branch.
//
// State is seeded through the REAL ClinicReadProvider via a tiny harness that
// calls useClinicReadContext().submit() before assertions — mirroring how the
// form (a different route) feeds the shared instance the result screen reads.

import { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { ClinicReadProvider, useClinicReadContext } from './ClinicReadContext';
import { ClinicResult } from './ClinicResult';
import { t } from '../../i18n/t';
import { weightToZResult } from '../../lib/who';
import { ageFromDob } from '../../lib/growth/age';
import { formatPercentileOrdinal } from '../../lib/growth/format';
import type { ClinicInput } from './types';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: (): typeof mockNavigate => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_INPUT: ClinicInput = {
  dateOfBirth: '2026-01-01',
  sex: 'male',
  birthWeightGrams: 3400,
  currentWeights: [{ weightGrams: 4600, measuredOn: '2026-01-31' }],
};

/** The ordinal the callout headline must show for VALID_INPUT's latest weight. */
function expectedCurrentOrdinal(input: ClinicInput): string {
  const latest = input.currentWeights[input.currentWeights.length - 1];
  const ageDays = ageFromDob(input.dateOfBirth, latest.measuredOn).days;
  const { percentile } = weightToZResult(latest.weightGrams, input.sex, ageDays);
  return formatPercentileOrdinal(percentile);
}

// ---------------------------------------------------------------------------
// Harness — seeds the shared clinic state, then renders the result screen.
// ---------------------------------------------------------------------------

/** Calls submit() once on mount so the provider holds a valid read. */
function SeedInput({ input }: { input: ClinicInput }): null {
  const { submit } = useClinicReadContext();
  useEffect(() => {
    submit(input);
  }, [submit, input]);
  return null;
}

function renderResult({ seed }: { seed: ClinicInput | null }): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <ClinicReadProvider>
          {seed !== null ? <SeedInput input={seed} /> : null}
          <ClinicResult />
        </ClinicReadProvider>
      </LocaleProvider>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe('ClinicResult — redirect guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders no result content when there is no submitted input (redirects)', () => {
    renderResult({ seed: null });

    // The TrendCard title is unique to the result screen — its absence proves
    // the <Navigate> guard fired instead of rendering the result body.
    expect(screen.queryByText(t('clinic.result.trendTitle'))).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: t('clinic.result.newRead') }),
    ).not.toBeInTheDocument();
  });
});

describe('ClinicResult — with a valid read', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the callout percentile, the TrendCard and the chart', () => {
    renderResult({ seed: VALID_INPUT });

    // (b) callout percentile — headline ordinal for the latest weight.
    expect(
      screen.getByLabelText(`Current percentile: ${expectedCurrentOrdinal(VALID_INPUT)}`),
    ).toBeInTheDocument();

    // TrendCard — always rendered under the updated birth-weight model.
    expect(screen.getByText(t('clinic.result.trendTitle'))).toBeInTheDocument();

    // Chart container — WeightChart's <section aria-label={chart title}>.
    expect(
      screen.getByRole('region', { name: t('growth.chart.title') }),
    ).toBeInTheDocument();
  });

  it('"New read" calls reset and navigates back to the form route', async () => {
    const user = userEvent.setup();
    renderResult({ seed: VALID_INPUT });

    const newRead = screen.getByRole('button', { name: t('clinic.result.newRead') });
    await user.click(newRead);

    // reset() clears the input → the guard re-fires and the result body unmounts.
    expect(mockNavigate).toHaveBeenCalledWith('/clinic/read');
    expect(screen.queryByText(t('clinic.result.trendTitle'))).not.toBeInTheDocument();
  });
});

describe('ClinicResult — add another weight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows the "Add another weight" button with a single current weight', () => {
    renderResult({ seed: VALID_INPUT });
    expect(
      screen.getByRole('button', { name: t('clinic.result.addWeight') }),
    ).toBeInTheDocument();
  });

  it('reveals the add-weight panel and, on valid add, hides the button (capped at two)', async () => {
    const user = userEvent.setup();
    renderResult({ seed: VALID_INPUT });

    await user.click(
      screen.getByRole('button', { name: t('clinic.result.addWeight') }),
    );

    // Panel revealed with a weight + date input.
    const weightInput = screen.getByLabelText(t('clinic.form.currentWeightLabel'));
    const dateInput = screen.getByLabelText(t('clinic.form.currentWeightDateLabel'));
    await user.type(weightInput, '5.0'); // 5000 g
    await user.clear(dateInput);
    await user.type(dateInput, '2026-02-15'); // after the first current date, in range

    await user.click(
      screen.getByRole('button', { name: t('clinic.result.addWeightSave') }),
    );

    // Two current weights now → the add affordance is gone.
    expect(
      screen.queryByRole('button', { name: t('clinic.result.addWeight') }),
    ).not.toBeInTheDocument();
    // Result body still present (trend card).
    expect(screen.getByText(t('clinic.result.trendTitle'))).toBeInTheDocument();
  });

  it('accepts a weight dated between birth and the existing reading', async () => {
    const user = userEvent.setup();
    renderResult({ seed: VALID_INPUT });

    await user.click(
      screen.getByRole('button', { name: t('clinic.result.addWeight') }),
    );

    const weightInput = screen.getByLabelText(t('clinic.form.currentWeightLabel'));
    const dateInput = screen.getByLabelText(t('clinic.form.currentWeightDateLabel'));
    await user.type(weightInput, '4.0');
    await user.clear(dateInput);
    // Between DOB (01-01) and the existing current weight (01-31).
    await user.type(dateInput, '2026-01-15');

    await user.click(
      screen.getByRole('button', { name: t('clinic.result.addWeightSave') }),
    );

    // Accepted → two current weights → the add affordance is gone, no error.
    expect(
      screen.queryByText(t('clinic.form.validation.secondDateBeforeFirst')),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: t('clinic.result.addWeight') }),
    ).not.toBeInTheDocument();
  });

  it('rejects a weight on the same date as the existing reading', async () => {
    const user = userEvent.setup();
    renderResult({ seed: VALID_INPUT });

    await user.click(
      screen.getByRole('button', { name: t('clinic.result.addWeight') }),
    );

    const weightInput = screen.getByLabelText(t('clinic.form.currentWeightLabel'));
    const dateInput = screen.getByLabelText(t('clinic.form.currentWeightDateLabel'));
    await user.type(weightInput, '5.0');
    await user.clear(dateInput);
    await user.type(dateInput, '2026-01-31'); // same as the existing current date

    await user.click(
      screen.getByRole('button', { name: t('clinic.result.addWeightSave') }),
    );

    expect(
      screen.getByText(t('clinic.form.validation.sameDatePair')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: t('clinic.result.addWeightSave') }),
    ).toBeInTheDocument();
  });
});
