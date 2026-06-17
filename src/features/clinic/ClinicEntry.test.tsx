// Tests for ClinicEntry — static notice screen for Clinic Mode.
// Blueprint: docs/ui-blueprints.md → "Clinic Entry"
//
// Mocks: react-router-dom (useNavigate, Link)
// Providers: LocaleProvider (from LocaleContext) wraps the render so t() resolves correctly.

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LocaleProvider } from '../../i18n/LocaleContext';
import { ClinicEntry } from './ClinicEntry';
import { t } from '../../i18n/t';

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
// Helper
// ---------------------------------------------------------------------------

function renderClinicEntry(): ReturnType<typeof render> {
  return render(
    <MemoryRouter>
      <LocaleProvider>
        <ClinicEntry />
      </LocaleProvider>
    </MemoryRouter>,
  );
}

// ---------------------------------------------------------------------------
// Suites
// ---------------------------------------------------------------------------

describe('ClinicEntry — layout and copy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Clinic Mode" heading from i18n copy', () => {
    renderClinicEntry();

    expect(
      screen.getByRole('heading', { name: t('clinic.entry.heading') }),
    ).toBeInTheDocument();
  });

  it('renders the description text from i18n copy', () => {
    renderClinicEntry();

    expect(screen.getByText(t('clinic.entry.description'))).toBeInTheDocument();
  });

  it('renders the "nothing is saved" notice from i18n copy', () => {
    renderClinicEntry();

    expect(screen.getByText(t('clinic.entry.noticeNotSaved'))).toBeInTheDocument();
  });

  it('renders the "supports clinical judgment" notice from i18n copy', () => {
    renderClinicEntry();

    expect(screen.getByText(t('clinic.entry.noticeJudgment'))).toBeInTheDocument();
  });
});

describe('ClinicEntry — CTA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a "Start a read" button with the correct aria-label', () => {
    renderClinicEntry();

    const cta = screen.getByRole('button', { name: t('clinic.entry.cta') });
    expect(cta).toBeInTheDocument();
  });

  it('navigates to /clinic/read when the CTA is clicked', async () => {
    const user = userEvent.setup();
    renderClinicEntry();

    const cta = screen.getByRole('button', { name: t('clinic.entry.cta') });
    await user.click(cta);

    expect(mockNavigate).toHaveBeenCalledWith('/clinic/read');
  });
});

describe('ClinicEntry — back link', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Back to GrowUp" link with the correct text', () => {
    renderClinicEntry();

    const backLink = screen.getByRole('link', { name: t('clinic.entry.back') });
    expect(backLink).toBeInTheDocument();
  });

  it('"Back to GrowUp" link points to the root path', () => {
    renderClinicEntry();

    const backLink = screen.getByRole('link', { name: t('clinic.entry.back') });
    expect(backLink).toHaveAttribute('href', '/');
  });
});
