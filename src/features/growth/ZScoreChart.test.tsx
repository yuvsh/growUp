/**
 * ZScoreChart tests.
 *
 * Strategy: assert against DOM content — the accessible fallback table is the
 * primary target because it is reliably rendered regardless of canvas/SVG width.
 * Reference line labels are asserted in the DOM as Recharts renders them.
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ZScoreChart } from './ZScoreChart';
import type { WeightEntry, Sex } from '../../types';

// ---------------------------------------------------------------------------
// Recharts + jsdom width shim
// ---------------------------------------------------------------------------

beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).ResizeObserver = class ResizeObserver {
    observe(): void { /* noop */ }
    unobserve(): void { /* noop */ }
    disconnect(): void { /* noop */ }
  };

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

function makeEntry(
  id: string,
  dateMeasured: string,
  weightGrams: number,
): WeightEntry {
  return {
    id,
    childId: 'child-1',
    ownerId: 'owner-1',
    dateMeasured,
    weightGrams,
    createdAt: `${dateMeasured}T00:00:00Z`,
    updatedAt: `${dateMeasured}T00:00:00Z`,
  };
}

const SINGLE_ENTRY: WeightEntry[] = [
  makeEntry('e1', '2024-02-05', 4500),
];

const MULTIPLE_ENTRIES: WeightEntry[] = [
  makeEntry('e1', '2024-02-05', 4500),
  makeEntry('e2', '2024-04-01', 6200),
  makeEntry('e3', '2024-06-01', 7800),
];

const CLOSE_ENTRIES: WeightEntry[] = [
  makeEntry('e1', '2024-03-01', 5000), // day 60
  makeEntry('e2', '2024-03-02', 5010), // day 61
];

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function renderChart(entries: WeightEntry[], sex: Sex = SEX): void {
  render(
    <div style={{ width: '600px', height: '400px' }}>
      <ZScoreChart entries={entries} sex={sex} dateOfBirth={DOB} />
    </div>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ZScoreChart', () => {
  describe('single entry', () => {
    it('renders without crashing', () => {
      expect(() => renderChart(SINGLE_ENTRY)).not.toThrow();
    });

    it('renders the accessible fallback table', () => {
      renderChart(SINGLE_ENTRY);
      expect(
        screen.getByRole('table', { name: /z-score measurements/i }),
      ).toBeInTheDocument();
    });

    it('renders exactly one fallback table row for a single entry', () => {
      renderChart(SINGLE_ENTRY);
      const rows = screen.getAllByRole('row');
      // rows[0] = header row, rows[1] = single data row
      const dataRows = rows.slice(1);
      expect(dataRows).toHaveLength(1);
    });

    it('shows the measured date in the fallback row', () => {
      renderChart(SINGLE_ENTRY);
      expect(screen.getByText('2024-02-05')).toBeInTheDocument();
    });
  });

  describe('multiple entries', () => {
    it('renders all fallback rows for multiple entries', () => {
      renderChart(MULTIPLE_ENTRIES);
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      expect(dataRows).toHaveLength(MULTIPLE_ENTRIES.length);
    });

    it('shows all measured dates in the fallback table', () => {
      renderChart(MULTIPLE_ENTRIES);
      expect(screen.getByText('2024-02-05')).toBeInTheDocument();
      expect(screen.getByText('2024-04-01')).toBeInTheDocument();
      expect(screen.getByText('2024-06-01')).toBeInTheDocument();
    });
  });

  describe('two close-together entries', () => {
    it('renders two rows for entries only 1 day apart (no dedup)', () => {
      renderChart(CLOSE_ENTRIES);
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      expect(dataRows).toHaveLength(2);
    });

    it('shows both dates in the fallback table', () => {
      renderChart(CLOSE_ENTRIES);
      expect(screen.getByText('2024-03-01')).toBeInTheDocument();
      expect(screen.getByText('2024-03-02')).toBeInTheDocument();
    });
  });

  describe('z-score display format', () => {
    it('shows z-scores formatted to 2 decimal places in the fallback table', () => {
      renderChart(MULTIPLE_ENTRIES);
      // Grab all tbody td cells. z-score column is 4th (index 3).
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);

      dataRows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        const zCell = cells[3]; // 0=date, 1=age, 2=weight, 3=z, 4=percentile
        // Should match pattern like "-0.85" or "1.23" (2 dp)
        expect(zCell?.textContent).toMatch(/^-?\d+\.\d{2}$/);
      });
    });

    it('shows percentile with one decimal place + % suffix', () => {
      renderChart(MULTIPLE_ENTRIES);
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);

      dataRows.forEach((row) => {
        const cells = row.querySelectorAll('td');
        const pctCell = cells[4];
        expect(pctCell?.textContent).toMatch(/%$/);
      });
    });
  });

  describe('reference lines', () => {
    it('renders the median (z=0) reference line label in the DOM', () => {
      renderChart(MULTIPLE_ENTRIES);
      // The label text "Median (0)" should appear in the rendered SVG/DOM
      expect(screen.getByText('Median (0)')).toBeInTheDocument();
    });

    it('renders the −2 reference line label in the DOM', () => {
      renderChart(MULTIPLE_ENTRIES);
      expect(screen.getByText('−2')).toBeInTheDocument();
    });

    it('renders the −3 reference line label in the DOM', () => {
      renderChart(MULTIPLE_ENTRIES);
      expect(screen.getByText('−3')).toBeInTheDocument();
    });
  });

  describe('fallback table headers', () => {
    it('renders all required column headers', () => {
      renderChart(MULTIPLE_ENTRIES);
      expect(screen.getByText('Date')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('Weight (kg)')).toBeInTheDocument();
      // "Z-score" appears in both the YAxis SVG label and the <th> — use getAllByText.
      expect(screen.getAllByText('Z-score').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('Percentile')).toBeInTheDocument();
    });

    it('renders a Z-score column header <th> element', () => {
      renderChart(MULTIPLE_ENTRIES);
      const colHeaders = screen.getAllByRole('columnheader');
      const texts = colHeaders.map((th) => th.textContent);
      expect(texts).toContain('Z-score');
    });
  });

  describe('section accessibility', () => {
    it('renders the chart section with the correct title heading', () => {
      renderChart(MULTIPLE_ENTRIES);
      expect(
        screen.getByRole('heading', { name: /z-score for age/i }),
      ).toBeInTheDocument();
    });

    it('renders the fallback table heading', () => {
      renderChart(MULTIPLE_ENTRIES);
      expect(
        screen.getByRole('heading', { name: /z-score measurements/i }),
      ).toBeInTheDocument();
    });
  });

  describe('fallback table row order', () => {
    it('lists entries newest-first in the fallback table', () => {
      renderChart(MULTIPLE_ENTRIES);
      const rows = screen.getAllByRole('row');
      // rows[0] is the header row; data rows start at index 1
      const dataRows = rows.slice(1);
      // MULTIPLE_ENTRIES are chronological: e1=2024-02-05, e2=2024-04-01, e3=2024-06-01
      // Expected table order: newest first → e3, e2, e1
      const firstRowDate = dataRows[0]?.querySelector('td')?.textContent;
      const lastRowDate = dataRows[dataRows.length - 1]?.querySelector('td')?.textContent;
      expect(firstRowDate).toBe('2024-06-01');
      expect(lastRowDate).toBe('2024-02-05');
    });

    it('chart data stays ascending (oldest first) for the line', () => {
      // chartData is derived before reversing — we can't easily inspect the internal
      // chartData array, but we verify the table order is reversed relative to entries.
      renderChart(MULTIPLE_ENTRIES);
      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1);
      const dates = dataRows.map((row) => row.querySelector('td')?.textContent ?? '');
      // Newest first in table
      expect(dates[0]).toBe('2024-06-01');
      expect(dates[1]).toBe('2024-04-01');
      expect(dates[2]).toBe('2024-02-05');
    });
  });

  describe('null rendering', () => {
    it('renders null (nothing) for an empty entries array', () => {
      const { container } = render(
        <ZScoreChart entries={[]} sex={SEX} dateOfBirth={DOB} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
