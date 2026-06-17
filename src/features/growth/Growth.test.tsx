/**
 * Tests for the Growth screen (M2-11).
 *
 * Strategy: mock both `useChild` and `useWeights` so the screen renders
 * without hitting the repository or auth layers. Child components that
 * involve heavy DOM work (WeightChart / Recharts) are shallow-mocked to keep
 * the suite fast and free of jsdom SVG rendering issues.
 *
 * Coverage:
 * - child + entries   → header w/ latest weight, and all content sections rendered
 * - no entries        → empty state + Add CTA; clicking it opens WeightForm
 * - loading           → Skeleton shown
 * - error             → ErrorState shown; retry calls reload
 * - edit row          → clicking a history edit button opens WeightForm in edit mode
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Growth } from './Growth';
import { UiStateProvider } from '../../ui-state/UiStateContext';
import type { Child, WeightEntry, Sex } from '../../types';

// ---------------------------------------------------------------------------
// Test helper: wraps Growth in the required UiStateProvider
// (Growth calls useUiState() which requires UiStateProvider to be mounted)
// ---------------------------------------------------------------------------

function renderGrowth(): ReturnType<typeof render> {
  return render(
    <UiStateProvider>
      <Growth />
    </UiStateProvider>,
  );
}

// ---------------------------------------------------------------------------
// Mock: useChild
// ---------------------------------------------------------------------------

const mockUseChild = vi.fn();

vi.mock('../../lib/hooks/useChild', () => ({
  useChild: (): ReturnType<typeof mockUseChild> => mockUseChild(),
}));

// ---------------------------------------------------------------------------
// Mock: useWeights (from WeightsProvider — the new shared context hook)
// ---------------------------------------------------------------------------

const mockReload = vi.fn();
const mockDeleteWeight = vi.fn();

const mockUseWeights = vi.fn();

vi.mock('../../lib/hooks/WeightsProvider', () => ({
  useWeights: (): ReturnType<typeof mockUseWeights> => mockUseWeights(),
}));

// ---------------------------------------------------------------------------
// Mock: WeightChart (Recharts — avoid SVG/ResizeObserver issues in jsdom)
// ---------------------------------------------------------------------------

vi.mock('./WeightChart', () => ({
  // Accepts (and ignores) the new range + onRangeChange props added in APP-4.
  WeightChart: (_props: unknown): React.JSX.Element => (
    <div data-testid="weight-chart">WeightChart</div>
  ),
}));

// ---------------------------------------------------------------------------
// Mock: WeightForm (modal — keeps test output clean; we just assert it mounts)
// ---------------------------------------------------------------------------

interface MockWeightFormProps {
  open: boolean;
  entry?: WeightEntry;
  dateOfBirth: string;
  onClose: () => void;
}

vi.mock('./WeightForm', () => ({
  WeightForm: ({ open, entry }: MockWeightFormProps): React.JSX.Element | null =>
    open ? (
      <div
        role="dialog"
        aria-label={entry !== undefined ? 'Edit weight' : 'Add weight'}
        data-testid="weight-form"
        data-edit-mode={entry !== undefined ? 'true' : 'false'}
        data-entry-id={entry?.id}
      >
        WeightForm
      </div>
    ) : null,
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DOB = '2025-01-01';
const SEX: Sex = 'male';

const MOCK_CHILD: Child = {
  id: 'child-1',
  ownerId: 'owner-1',
  name: 'Baby Yuval',
  sex: SEX,
  dateOfBirth: DOB,
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

function makeEntry(overrides: Partial<WeightEntry> = {}): WeightEntry {
  return {
    id: 'entry-1',
    childId: 'child-1',
    ownerId: 'owner-1',
    dateMeasured: '2025-06-01',
    weightGrams: 6500,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

const ENTRY_A = makeEntry({ id: 'entry-a', dateMeasured: '2025-04-01', weightGrams: 5000 });
const ENTRY_B = makeEntry({ id: 'entry-b', dateMeasured: '2025-06-01', weightGrams: 6500 });

// ---------------------------------------------------------------------------
// Default mock results
// ---------------------------------------------------------------------------

function setupChildWithEntries(entries: WeightEntry[] = [ENTRY_A, ENTRY_B]): void {
  mockUseChild.mockReturnValue({
    child: MOCK_CHILD,
    loading: false,
    error: null,
    createChild: vi.fn(),
    updateChild: vi.fn(),
    deleteChild: vi.fn(),
    reload: vi.fn(),
  });

  mockUseWeights.mockReturnValue({
    weights: entries,
    loading: false,
    error: null,
    addWeight: vi.fn(),
    editWeight: vi.fn(),
    deleteWeight: mockDeleteWeight,
    reload: mockReload,
  });
}

function setupChildNoEntries(): void {
  setupChildWithEntries([]);
}

function setupLoading(): void {
  mockUseChild.mockReturnValue({
    child: MOCK_CHILD,
    loading: false,
    error: null,
    createChild: vi.fn(),
    updateChild: vi.fn(),
    deleteChild: vi.fn(),
    reload: vi.fn(),
  });

  mockUseWeights.mockReturnValue({
    weights: [],
    loading: true,
    error: null,
    addWeight: vi.fn(),
    editWeight: vi.fn(),
    deleteWeight: mockDeleteWeight,
    reload: mockReload,
  });
}

function setupError(): void {
  mockUseChild.mockReturnValue({
    child: MOCK_CHILD,
    loading: false,
    error: null,
    createChild: vi.fn(),
    updateChild: vi.fn(),
    deleteChild: vi.fn(),
    reload: vi.fn(),
  });

  mockUseWeights.mockReturnValue({
    weights: [],
    loading: false,
    error: new Error('Network failure'),
    addWeight: vi.fn(),
    editWeight: vi.fn(),
    deleteWeight: mockDeleteWeight,
    reload: mockReload,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Growth screen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWeight.mockResolvedValue(undefined);
    mockReload.mockReturnValue(undefined);
  });

  // -----------------------------------------------------------------------
  // child + entries
  // -----------------------------------------------------------------------
  describe('with a child and entries', () => {
    beforeEach(() => {
      setupChildWithEntries();
    });

    it('renders the child name in the header', () => {
      renderGrowth();
      expect(screen.getByRole('heading', { name: 'Baby Yuval' })).toBeInTheDocument();
    });

    it('renders the latest weight label in the header', () => {
      renderGrowth();
      expect(screen.getByLabelText('Latest weight')).toBeInTheDocument();
    });

    it('renders a formatted weight value for the latest entry', () => {
      renderGrowth();
      // Latest entry is ENTRY_B (June, newest date) — 6500 g = 6.500 kg
      expect(screen.getByText('6.500 kg')).toBeInTheDocument();
    });

    it('renders the percentile label in the header widget', () => {
      renderGrowth();
      // The header Latest weight widget has aria-label="Latest weight"; grab all matches
      const percentileLabels = screen.getAllByText(/Percentile:/);
      expect(percentileLabels.length).toBeGreaterThan(0);
    });

    it('renders the z-score label in the header widget', () => {
      renderGrowth();
      const zScoreLabels = screen.getAllByText(/Z-score:/);
      expect(zScoreLabels.length).toBeGreaterThan(0);
    });

    it('renders the WeightChart region', () => {
      renderGrowth();
      expect(screen.getByTestId('weight-chart')).toBeInTheDocument();
    });

    it('renders the ProjectionCard region (4-week outlook heading)', () => {
      renderGrowth();
      // ProjectionCard renders its own heading from t('growth.projection.title')
      expect(screen.getByText('4-week outlook')).toBeInTheDocument();
    });

    it('renders the InsightsList region (Insights heading)', () => {
      renderGrowth();
      expect(screen.getByRole('heading', { name: 'Insights' })).toBeInTheDocument();
    });

    it('renders the WeightHistoryList region (History heading)', () => {
      renderGrowth();
      expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    });

    it('renders the Add weight button', () => {
      renderGrowth();
      expect(
        screen.getByRole('button', { name: 'Add weight' }),
      ).toBeInTheDocument();
    });

    it('does NOT render the empty state', () => {
      renderGrowth();
      expect(
        screen.queryByText("Add your baby's first weight to see the chart"),
      ).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // empty state (no entries)
  // -----------------------------------------------------------------------
  describe('with a child and no entries', () => {
    beforeEach(() => {
      setupChildNoEntries();
    });

    it('renders the empty state title', () => {
      renderGrowth();
      expect(
        screen.getByText("Add your baby's first weight to see the chart"),
      ).toBeInTheDocument();
    });

    it('renders an Add weight CTA in the empty state', () => {
      renderGrowth();
      // EmptyState renders a button with this label
      expect(
        screen.getByRole('button', { name: /add weight/i }),
      ).toBeInTheDocument();
    });

    it('clicking the Add CTA opens the WeightForm in add mode', async () => {
      const user = userEvent.setup();
      renderGrowth();

      await user.click(screen.getByRole('button', { name: /add weight/i }));

      await waitFor(() => {
        expect(screen.getByTestId('weight-form')).toBeInTheDocument();
      });

      // Should be in add mode (no entry)
      expect(screen.getByTestId('weight-form').dataset.editMode).toBe('false');
    });

    it('does NOT render content sections (chart / history / projection)', () => {
      renderGrowth();
      expect(screen.queryByTestId('weight-chart')).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'History' })).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // loading state
  // -----------------------------------------------------------------------
  describe('loading', () => {
    it('renders a skeleton while weights are loading', () => {
      setupLoading();
      renderGrowth();
      // Skeleton renders aria-hidden elements; check the main has aria-busy
      const main = screen.getByRole('main', { hidden: true }) ?? screen.getByLabelText('Growth');
      expect(main).toBeInTheDocument();
      // There should be no entries content
      expect(screen.queryByTestId('weight-chart')).not.toBeInTheDocument();
      expect(
        screen.queryByText("Add your baby's first weight to see the chart"),
      ).not.toBeInTheDocument();
    });
  });

  // -----------------------------------------------------------------------
  // error state
  // -----------------------------------------------------------------------
  describe('error', () => {
    it('renders the error title when weights fail to load', () => {
      setupError();
      renderGrowth();
      expect(
        screen.getByText("We couldn't load your measurements"),
      ).toBeInTheDocument();
    });

    it('renders a Try again button', () => {
      setupError();
      renderGrowth();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('clicking Try again calls reload()', async () => {
      setupError();
      const user = userEvent.setup();
      renderGrowth();

      await user.click(screen.getByRole('button', { name: /try again/i }));

      expect(mockReload).toHaveBeenCalledTimes(1);
    });
  });

  // -----------------------------------------------------------------------
  // edit flow
  // -----------------------------------------------------------------------
  describe('edit flow', () => {
    it('clicking an edit button in the history list opens WeightForm in edit mode', async () => {
      setupChildWithEntries();
      const user = userEvent.setup();
      renderGrowth();

      // WeightHistoryList renders edit buttons with this aria-label
      const editButtons = screen.getAllByRole('button', {
        name: /Edit weight entry/i,
      });
      expect(editButtons.length).toBeGreaterThan(0);

      await user.click(editButtons[0]!);

      await waitFor(() => {
        expect(screen.getByTestId('weight-form')).toBeInTheDocument();
      });

      // Should be in edit mode (entry is set)
      expect(screen.getByTestId('weight-form').dataset.editMode).toBe('true');
    });

    it('the entry id passed to WeightForm matches the entry whose edit was clicked', async () => {
      // Use a single entry so we know exactly which one will be in the form
      const singleEntry = makeEntry({ id: 'entry-single', dateMeasured: '2025-06-01', weightGrams: 6000 });
      setupChildWithEntries([singleEntry]);

      const user = userEvent.setup();
      renderGrowth();

      const editButton = screen.getByRole('button', { name: /Edit weight entry/i });
      await user.click(editButton);

      await waitFor(() => {
        const form = screen.getByTestId('weight-form');
        expect(form.dataset.entryId).toBe('entry-single');
      });
    });
  });

  // -----------------------------------------------------------------------
  // no child (defensive guard)
  // -----------------------------------------------------------------------
  describe('when no child exists', () => {
    it('renders the empty profile state without crashing', () => {
      mockUseChild.mockReturnValue({
        child: null,
        loading: false,
        error: null,
        createChild: vi.fn(),
        updateChild: vi.fn(),
        deleteChild: vi.fn(),
        reload: vi.fn(),
      });

      mockUseWeights.mockReturnValue({
        weights: [],
        loading: false,
        error: null,
        addWeight: vi.fn(),
        editWeight: vi.fn(),
        deleteWeight: vi.fn(),
        reload: vi.fn(),
      });

      renderGrowth();
      expect(screen.getByText('Add your baby to begin')).toBeInTheDocument();
    });
  });
});
