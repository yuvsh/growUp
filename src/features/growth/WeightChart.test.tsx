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
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WeightChart } from './WeightChart';
import type { WeightEntry, Sex } from '../../types';

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

function renderChart(entries: WeightEntry[] = SAMPLE_ENTRIES): void {
  render(
    // Fixed-size wrapper ensures Recharts has a usable container dimension.
    <div style={{ width: '600px', height: '400px' }}>
      <WeightChart entries={entries} sex={SEX} dateOfBirth={DOB} />
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

    // Every data row should contain a cell whose text ends with %.
    dataRows.forEach((row) => {
      const cells = row.querySelectorAll('td');
      const percentileCell = cells[2];
      expect(percentileCell?.textContent).toMatch(/%$/);
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
    // Column headers: Date, Weight (kg), Percentile
    expect(screen.getByText('Weight (kg)')).toBeInTheDocument();
    expect(screen.getByText('Percentile')).toBeInTheDocument();
  });
});
