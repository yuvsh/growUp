/**
 * WeightChart tests.
 *
 * Recharts' ResponsiveContainer observes actual DOM width; in jsdom it returns 0
 * by default, which causes LineChart to skip rendering.
 * Strategy: mock ResizeObserver + wrap the component in a fixed-size container,
 * then assert against DOM content — the accessible fallback table is the primary
 * target because it is reliably rendered regardless of canvas/SVG width.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeightChart } from './WeightChart';
import type { WeightEntry, Sex } from '../../types';
import type { ChartRange } from '../../lib/growth/chartWindow';

// ---------------------------------------------------------------------------
// Recharts + jsdom width shim
// ---------------------------------------------------------------------------

// Recharts uses ResizeObserver internally. Provide a minimal stub.
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe(): void { /* noop */ }
    unobserve(): void { /* noop */ }
    disconnect(): void { /* noop */ }
  };

  // getBoundingClientRect returns 0 by default in jsdom. Override for the
  // ResponsiveContainer wrapper so Recharts has a usable width.
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 600,
    height: 320,
    top: 0,
    left: 0,
    right: 600,
    bottom: 320,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
});

// ---------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------

const DOB = '2024-01-01';
const SEX: Sex = 'male';

/** Two weight entries: one at roughly 1 month and one at roughly 3 months. */
const SAMPLE_ENTRIES: WeightEntry[] = [
  {
    id: 'entry-1',
    childId: 'child-1',
    ownerId: 'owner-1',
    dateMeasured: '2024-02-05', // ~35 days after DOB
    weightGrams: 4500,
    createdAt: '2024-02-05T10:00:00Z',
    updatedAt: '2024-02-05T10:00:00Z',
  },
  {
    id: 'entry-2',
    childId: 'child-1',
    ownerId: 'owner-1',
    dateMeasured: '2024-04-01', // ~91 days after DOB
    weightGrams: 6200,
    createdAt: '2024-04-01T10:00:00Z',
    updatedAt: '2024-04-01T10:00:00Z',
  },
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderChart(
  entries: WeightEntry[] = SAMPLE_ENTRIES,
  range: ChartRange = '3mo',
  onRangeChange: (r: ChartRange) => void = vi.fn(),
): void {
  render(
    // Fixed-size wrapper ensures Recharts has a usable container dimension.
    <div style={{ width: '600px', height: '400px' }}>
      <WeightChart
        entries={entries}
        sex={SEX}
        dateOfBirth={DOB}
        range={range}
        onRangeChange={onRangeChange}
      />
    </div>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WeightChart', () => {
  it('renders without crashing given a couple of entries', () => {
    // Should not throw; the section element should be present.
    expect(() => renderChart()).not.toThrow();
    // The section wrapping the chart should render.
    expect(screen.getByRole('region', { name: /weight for age/i })).toBeInTheDocument();
  });

  it('renders the accessible fallback table with the heading', () => {
    renderChart();
    // The fallback section heading should be present.
    expect(
      screen.getByRole('heading', { name: /latest measurements/i }),
    ).toBeInTheDocument();
    // The table itself should be present.
    expect(screen.getByRole('table', { name: /latest measurements/i })).toBeInTheDocument();
  });

  it('renders the baby entries in the fallback table', () => {
    renderChart();
    // Both measured dates should appear in the table (most-recent first).
    expect(screen.getByText('2024-04-01')).toBeInTheDocument();
    expect(screen.getByText('2024-02-05')).toBeInTheDocument();
  });

  it('shows the computed percentile for each entry in the fallback table', () => {
    renderChart();
    // The table should have two rows of data (one per entry). Each row in the
    // tbody should contain a percentile value (ends with %).
    const rows = screen.getAllByRole('row');
    // rows[0] = header, rows[1..] = data rows
    const dataRows = rows.slice(1);
    expect(dataRows).toHaveLength(SAMPLE_ENTRIES.length);

    // Every data row should contain a percentile cell (col index 4 — Date/Age/Weight/Z-score/Percentile).
    dataRows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      const percentileCell = cells[4];
      expect(percentileCell?.textContent).toMatch(/%$/);
    });
  });

  it('shows Age and Z-score columns in the fallback table', () => {
    renderChart();
    // Column headers matching ZScoreChart's keys
    expect(screen.getByRole('columnheader', { name: 'Age' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Z-score' })).toBeInTheDocument();

    // Each data row should have a z-score cell (col index 3) with a 2-decimal number
    const rows = screen.getAllByRole('row');
    const dataRows = rows.slice(1);
    dataRows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      const zCell = cells[3];
      // e.g. "-1.23" or "0.45"
      expect(zCell?.textContent).toMatch(/^-?\d+\.\d{2}$/);
    });
  });

  it('shows the empty message when there are no entries', () => {
    renderChart([]);
    expect(screen.getByText(/add your baby's first weight/i)).toBeInTheDocument();
  });

  it('renders the 5 percentile curve labels in the chart legend', () => {
    renderChart();
    // Recharts renders the Legend with the series names. We assert on the text
    // values that correspond to the 5 WHO percentile labels.
    const labels = ['3rd', '15th', '50th', '85th', '97th'];
    labels.forEach((label) => {
      // The label appears at least once in the document (legend entry).
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });

  it('renders the chart title', () => {
    renderChart();
    expect(
      screen.getByRole('heading', { name: /weight for age/i }),
    ).toBeInTheDocument();
  });

  it('renders axis column headers in the fallback table', () => {
    renderChart();
    // Column headers: Date, Age, Weight (kg), Z-score, Percentile
    expect(screen.getByText('Weight (kg)')).toBeInTheDocument();
    expect(screen.getByText('Percentile')).toBeInTheDocument();
    expect(screen.getByText('Age')).toBeInTheDocument();
    expect(screen.getByText('Z-score')).toBeInTheDocument();
  });

  // ---- Range toggle -------------------------------------------------------

  describe('time-range toggle', () => {
    it('renders 5 range options with radio semantics', () => {
      renderChart();
      // The radiogroup container should be present.
      const radioGroup = screen.getByRole('radiogroup', { name: /time range/i });
      expect(radioGroup).toBeInTheDocument();

      // All 5 options must be present.
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(5);
    });

    it('renders the labels: 1 mo, 3 mo, 6 mo, All, 2 yr', () => {
      renderChart();
      expect(screen.getByRole('radio', { name: '1 mo' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '3 mo' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '6 mo' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: 'All' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '2 yr' })).toBeInTheDocument();
    });

    it('reflects the range prop: 3mo is aria-checked=true when range="3mo"', () => {
      renderChart(SAMPLE_ENTRIES, '3mo');
      const m3Button = screen.getByRole('radio', { name: '3 mo' });
      expect(m3Button).toHaveAttribute('aria-checked', 'true');
    });

    it('reflects the range prop: 1mo is aria-checked=true when range="1mo"', () => {
      renderChart(SAMPLE_ENTRIES, '1mo');
      const m1 = screen.getByRole('radio', { name: '1 mo' });
      expect(m1).toHaveAttribute('aria-checked', 'true');
      const m3 = screen.getByRole('radio', { name: '3 mo' });
      expect(m3).toHaveAttribute('aria-checked', 'false');
    });

    it('non-selected options have aria-checked=false when range="3mo"', () => {
      renderChart(SAMPLE_ENTRIES, '3mo');
      const m1 = screen.getByRole('radio', { name: '1 mo' });
      const m6 = screen.getByRole('radio', { name: '6 mo' });
      const all = screen.getByRole('radio', { name: 'All' });
      const full = screen.getByRole('radio', { name: '2 yr' });
      expect(m1).toHaveAttribute('aria-checked', 'false');
      expect(m6).toHaveAttribute('aria-checked', 'false');
      expect(all).toHaveAttribute('aria-checked', 'false');
      expect(full).toHaveAttribute('aria-checked', 'false');
    });

    it('reflects the range prop: "All" is aria-checked=true when range="all"', () => {
      renderChart(SAMPLE_ENTRIES, 'all');
      expect(screen.getByRole('radio', { name: 'All' })).toHaveAttribute('aria-checked', 'true');
    });

    it('reflects the range prop: "2 yr" is aria-checked=true when range="2y"', () => {
      renderChart(SAMPLE_ENTRIES, '2y');
      expect(screen.getByRole('radio', { name: '2 yr' })).toHaveAttribute('aria-checked', 'true');
    });

    it('only one option is aria-checked=true at a time (controlled by prop)', () => {
      renderChart(SAMPLE_ENTRIES, '6mo');
      const radios = screen.getAllByRole('radio');
      const checkedRadios = radios.filter((r) => r.getAttribute('aria-checked') === 'true');
      expect(checkedRadios).toHaveLength(1);
      expect(checkedRadios[0]).toBe(screen.getByRole('radio', { name: '6 mo' }));
    });

    // ---- onRangeChange callback ----------------------------------------

    it('clicking "1 mo" calls onRangeChange with "1mo"', () => {
      const handleChange = vi.fn();
      renderChart(SAMPLE_ENTRIES, '3mo', handleChange);

      fireEvent.click(screen.getByRole('radio', { name: '1 mo' }));

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('1mo');
    });

    it('clicking "All" calls onRangeChange with "all"', () => {
      const handleChange = vi.fn();
      renderChart(SAMPLE_ENTRIES, '3mo', handleChange);

      fireEvent.click(screen.getByRole('radio', { name: 'All' }));

      expect(handleChange).toHaveBeenCalledWith('all');
    });

    it('clicking "2 yr" calls onRangeChange with "2y"', () => {
      const handleChange = vi.fn();
      renderChart(SAMPLE_ENTRIES, '3mo', handleChange);

      fireEvent.click(screen.getByRole('radio', { name: '2 yr' }));

      expect(handleChange).toHaveBeenCalledWith('2y');
    });

    it('clicking "6 mo" calls onRangeChange with "6mo"', () => {
      const handleChange = vi.fn();
      renderChart(SAMPLE_ENTRIES, '3mo', handleChange);

      fireEvent.click(screen.getByRole('radio', { name: '6 mo' }));

      expect(handleChange).toHaveBeenCalledWith('6mo');
    });
  });
});
