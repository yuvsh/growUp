/**
 * Tests for WeightHistoryList and WeightRow.
 *
 * Coverage:
 * - list with entries renders one row per entry, newest first, each showing a percentile
 * - empty list → empty state shown
 * - clicking edit on a row calls onEdit with that entry
 * - clicking delete on a row calls onDelete with that entry
 * - buttons have aria-labels
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WeightEntry, Sex } from '../../types';
import { WeightHistoryList } from './WeightHistoryList';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DOB = '2025-01-01';
const SEX: Sex = 'male';

function makeEntry(overrides: Partial<WeightEntry> = {}): WeightEntry {
  return {
    id: 'entry-1',
    childId: 'child-1',
    ownerId: 'owner-1',
    dateMeasured: '2025-06-01',
    weightGrams: 6000,
    createdAt: '2025-06-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
    ...overrides,
  };
}

const ENTRY_OLD = makeEntry({
  id: 'entry-old',
  dateMeasured: '2025-04-01',
  weightGrams: 5000,
});

const ENTRY_NEW = makeEntry({
  id: 'entry-new',
  dateMeasured: '2025-06-01',
  weightGrams: 6500,
});

const ENTRY_MIDDLE = makeEntry({
  id: 'entry-middle',
  dateMeasured: '2025-05-01',
  weightGrams: 5800,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderList(
  entries: WeightEntry[],
  onEdit = vi.fn(),
  onDelete = vi.fn(),
) {
  return render(
    <WeightHistoryList
      entries={entries}
      sex={SEX}
      dateOfBirth={DOB}
      onEdit={onEdit}
      onDelete={onDelete}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WeightHistoryList', () => {
  describe('when entries list is empty', () => {
    it('renders the empty state instead of rows', () => {
      renderList([]);
      expect(screen.getByText('No weights recorded yet.')).toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('still renders the History heading', () => {
      renderList([]);
      expect(screen.getByRole('heading', { name: 'History' })).toBeInTheDocument();
    });
  });

  describe('when entries are provided', () => {
    beforeEach(() => {
      renderList([ENTRY_OLD, ENTRY_NEW, ENTRY_MIDDLE]);
    });

    it('renders exactly one list item per entry', () => {
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });

    it('renders entries newest-first', () => {
      const items = screen.getAllByRole('listitem');
      // newest entry (Jun 2025) should come first
      expect(within(items[0]!).getByText(/Jun 1, 2025/)).toBeInTheDocument();
      // middle entry (May 2025) should come second
      expect(within(items[1]!).getByText(/May 1, 2025/)).toBeInTheDocument();
      // oldest entry (Apr 2025) should come last
      expect(within(items[2]!).getByText(/Apr 1, 2025/)).toBeInTheDocument();
    });

    it('each row shows a percentile value', () => {
      const items = screen.getAllByRole('listitem');
      items.forEach((item) => {
        expect(within(item).getByText(/Percentile:/)).toBeInTheDocument();
      });
    });

    it('each row shows a z-score value', () => {
      const items = screen.getAllByRole('listitem');
      items.forEach((item) => {
        expect(within(item).getByText(/Z-score:/)).toBeInTheDocument();
      });
    });

    it('edit buttons have accessible aria-labels', () => {
      const editButtons = screen.getAllByRole('button', {
        name: /Edit weight entry/i,
      });
      expect(editButtons).toHaveLength(3);
    });

    it('delete buttons have accessible aria-labels', () => {
      const deleteButtons = screen.getAllByRole('button', {
        name: /Delete weight entry/i,
      });
      expect(deleteButtons).toHaveLength(3);
    });
  });

  describe('edit and delete callbacks', () => {
    it('calls onEdit with the correct entry when edit button is clicked', async () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      renderList([ENTRY_NEW], onEdit, onDelete);

      const editButton = screen.getByRole('button', { name: /Edit weight entry/i });
      await userEvent.click(editButton);

      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onEdit).toHaveBeenCalledWith(ENTRY_NEW);
      expect(onDelete).not.toHaveBeenCalled();
    });

    it('calls onDelete with the correct entry when delete button is clicked', async () => {
      const onEdit = vi.fn();
      const onDelete = vi.fn();
      renderList([ENTRY_NEW], onEdit, onDelete);

      const deleteButton = screen.getByRole('button', { name: /Delete weight entry/i });
      await userEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onDelete).toHaveBeenCalledWith(ENTRY_NEW);
      expect(onEdit).not.toHaveBeenCalled();
    });

    it('calls onEdit with the specific entry among multiple rows', async () => {
      const onEdit = vi.fn();
      renderList([ENTRY_OLD, ENTRY_NEW, ENTRY_MIDDLE], onEdit, vi.fn());

      // Click the edit button on the newest (first) row
      const items = screen.getAllByRole('listitem');
      const firstRowEditButton = within(items[0]!).getByRole('button', {
        name: /Edit weight entry/i,
      });
      await userEvent.click(firstRowEditButton);

      // newest-first means items[0] corresponds to ENTRY_NEW
      expect(onEdit).toHaveBeenCalledWith(ENTRY_NEW);
    });

    it('calls onDelete with the specific entry among multiple rows', async () => {
      const onDelete = vi.fn();
      renderList([ENTRY_OLD, ENTRY_NEW, ENTRY_MIDDLE], vi.fn(), onDelete);

      // Click the delete button on the last (oldest) row
      const items = screen.getAllByRole('listitem');
      const lastRowDeleteButton = within(items[2]!).getByRole('button', {
        name: /Delete weight entry/i,
      });
      await userEvent.click(lastRowDeleteButton);

      // oldest-last means items[2] corresponds to ENTRY_OLD
      expect(onDelete).toHaveBeenCalledWith(ENTRY_OLD);
    });
  });
});
