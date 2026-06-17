// Tests for ImportNaraBaby component (M2-13)

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ImportNaraBaby } from './ImportNaraBaby';
import { t } from '../../i18n/t';
import type { WeightEntry } from '../../types/index';

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

const mockAddWeight = vi.fn();
const mockEditWeight = vi.fn();

const defaultUseWeightsResult = {
  weights: [] as WeightEntry[],
  loading: false,
  error: null,
  addWeight: mockAddWeight,
  editWeight: mockEditWeight,
  deleteWeight: vi.fn(),
  reload: vi.fn(),
};

// ImportNaraBaby imports useWeights from WeightsProvider; mock that module.
// isWeightDateValid is still imported from useWeights — the actual implementation
// is preserved so date-validation logic continues to work in these tests.
vi.mock('../../lib/hooks/WeightsProvider', () => ({
  useWeights: (): typeof defaultUseWeightsResult => defaultUseWeightsResult,
}));

// ---------------------------------------------------------------------------
// Fixture CSV helpers
// ---------------------------------------------------------------------------

const CSV_HEADER =
  '"Type","Profile Name","Start Date/time","Start Date/time (Epoch)","[Bottle Feed] Type","[Growth] Weight","[Growth] Weight Unit"';

function makeCsvRow(
  type: string,
  date: string,
  weight: string,
  unit: string,
): string {
  return `"${type}","Ori","${date}","12345","","${weight}","${unit}"`;
}

function makeCsvFile(...rows: string[]): File {
  const csvText = [CSV_HEADER, ...rows].join('\n');
  return new File([csvText], 'export.csv', { type: 'text/csv' });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// DOB that puts valid dates around 2026
const DATE_OF_BIRTH = '2025-12-01';

const EXISTING_ENTRY: WeightEntry = {
  id: 'existing-entry-1',
  childId: 'child-test-1',
  ownerId: 'user-1',
  dateMeasured: '2026-01-15',
  weightGrams: 4000,
  createdAt: '2026-01-15T00:00:00.000Z',
  updatedAt: '2026-01-15T00:00:00.000Z',
};

// ---------------------------------------------------------------------------
// Render helper
// ---------------------------------------------------------------------------

interface RenderOptions {
  existingEntries?: WeightEntry[];
}

function renderComponent(
  onImported: () => void = vi.fn(),
  options: RenderOptions = {},
): void {
  render(
    <ImportNaraBaby
      dateOfBirth={DATE_OF_BIRTH}
      existingEntries={options.existingEntries ?? []}
      onImported={onImported}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ImportNaraBaby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddWeight.mockResolvedValue({
      id: 'new-entry',
      childId: 'child-test-1',
      ownerId: 'user-1',
      dateMeasured: '2026-02-01',
      weightGrams: 5000,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } satisfies WeightEntry);

    mockEditWeight.mockResolvedValue({
      ...EXISTING_ENTRY,
      weightGrams: 4200,
      updatedAt: new Date().toISOString(),
    } satisfies WeightEntry);
  });

  it('renders the Import from Nara Baby button', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: t('growth.import.button') }),
    ).toBeInTheDocument();
  });

  it('selecting a file with valid weights opens the confirm modal with correct counts', async () => {
    const user = userEvent.setup();
    renderComponent();

    const newRow = makeCsvRow('Growth', '2026-02-01 00:00:00', '5.0', 'KG');
    const file = makeCsvFile(newRow);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: t('growth.import.title') }),
      ).toBeInTheDocument();
    });

    // Summary should mention found=1, new=1, update=0, skipped=0
    const summaryText = t('growth.import.summary')
      .replace('{found}', '1')
      .replace('{new}', '1')
      .replace('{update}', '0')
      .replace('{skipped}', '0');
    expect(screen.getByText(summaryText)).toBeInTheDocument();
  });

  it('confirms: calls editWeight for existing-date weight and addWeight for new date, then onImported', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();

    // Existing entry is at 2026-01-15
    renderComponent(onImported, { existingEntries: [EXISTING_ENTRY] });

    const existingRow = makeCsvRow('Growth', '2026-01-15 00:00:00', '4.2', 'KG'); // update
    const newRow = makeCsvRow('Growth', '2026-02-01 00:00:00', '5.0', 'KG'); // new
    const file = makeCsvFile(existingRow, newRow);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: t('growth.import.title') }),
      ).toBeInTheDocument();
    });

    await user.click(
      screen.getByRole('button', { name: t('growth.import.confirm') }),
    );

    await waitFor(() => {
      expect(mockEditWeight).toHaveBeenCalledTimes(1);
      expect(mockAddWeight).toHaveBeenCalledTimes(1);
    });

    expect(mockEditWeight).toHaveBeenCalledWith('existing-entry-1', {
      dateMeasured: '2026-01-15',
      weightGrams: 4200,
    });

    expect(mockAddWeight).toHaveBeenCalledWith({
      dateMeasured: '2026-02-01',
      weightGrams: 5000,
    });

    expect(onImported).toHaveBeenCalledTimes(1);
  });

  it('non-Nara file (bad CSV) → parseError toast shown, modal not open', async () => {
    const user = userEvent.setup();
    renderComponent();

    // A CSV with no required headers
    const badFile = new File(['this is not,a nara,csv'], 'bad.csv', {
      type: 'text/csv',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, badFile);

    await waitFor(() => {
      expect(screen.getByText(t('growth.import.parseError'))).toBeInTheDocument();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('out-of-range date is counted as skipped and not imported on confirm', async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();
    renderComponent(onImported);

    // Out-of-range date: way before DOB (2025-12-01) or after 24 months
    const outOfRangeRow = makeCsvRow('Growth', '2024-01-01 00:00:00', '3.0', 'KG');
    // In-range date
    const inRangeRow = makeCsvRow('Growth', '2026-01-15 00:00:00', '4.5', 'KG');
    const file = makeCsvFile(outOfRangeRow, inRangeRow);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, file);

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: t('growth.import.title') }),
      ).toBeInTheDocument();
    });

    // Summary: found=2, new=1, update=0, skipped=1
    const summaryText = t('growth.import.summary')
      .replace('{found}', '2')
      .replace('{new}', '1')
      .replace('{update}', '0')
      .replace('{skipped}', '1');
    expect(screen.getByText(summaryText)).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: t('growth.import.confirm') }),
    );

    await waitFor(() => {
      expect(onImported).toHaveBeenCalledTimes(1);
    });

    // Only the in-range entry should have been added
    expect(mockAddWeight).toHaveBeenCalledTimes(1);
    expect(mockAddWeight).toHaveBeenCalledWith({
      dateMeasured: '2026-01-15',
      weightGrams: 4500,
    });
  });

  it('empty file (0 weights) → empty toast shown, modal not open', async () => {
    const user = userEvent.setup();
    renderComponent();

    // Nara header but no data rows
    const emptyFile = new File([CSV_HEADER], 'empty.csv', { type: 'text/csv' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    await user.upload(fileInput, emptyFile);

    await waitFor(() => {
      expect(screen.getByText(t('growth.import.empty'))).toBeInTheDocument();
    });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
