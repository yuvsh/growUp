/**
 * Tests for WeightRow component.
 *
 * Coverage:
 * - renders the date, weight in kg, percentile, and z-score
 * - edit and delete buttons have aria-labels
 * - clicking edit calls onEdit with the entry
 * - clicking delete calls onDelete with the entry
 */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import type { WeightEntry, Sex } from '../../types';
import { WeightRow } from './WeightRow';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DOB = '2025-01-01';
const SEX: Sex = 'female';

const ENTRY: WeightEntry = {
  id: 'entry-1',
  childId: 'child-1',
  ownerId: 'owner-1',
  dateMeasured: '2025-05-15',
  weightGrams: 5500,
  createdAt: '2025-05-15T00:00:00Z',
  updatedAt: '2025-05-15T00:00:00Z',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderRow(
  entry: WeightEntry = ENTRY,
  onEdit = vi.fn(),
  onDelete = vi.fn(),
) {
  return render(
    <ul>
      <WeightRow
        entry={entry}
        sex={SEX}
        dateOfBirth={DOB}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </ul>,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WeightRow', () => {
  it('renders the formatted date', () => {
    renderRow();
    expect(screen.getByText(/May 15, 2025/)).toBeInTheDocument();
  });

  it('renders the weight in kg', () => {
    renderRow();
    // 5500g → 5.5kg → "5.5 kg"
    expect(screen.getByText('5.5 kg')).toBeInTheDocument();
  });

  it('renders the percentile label', () => {
    renderRow();
    expect(screen.getByText(/Percentile:/)).toBeInTheDocument();
  });

  it('renders the z-score label', () => {
    renderRow();
    expect(screen.getByText(/Z-score:/)).toBeInTheDocument();
  });

  it('edit button has an accessible aria-label containing the key phrase', () => {
    renderRow();
    const editButton = screen.getByRole('button', { name: /Edit weight entry/i });
    expect(editButton).toBeInTheDocument();
  });

  it('delete button has an accessible aria-label containing the key phrase', () => {
    renderRow();
    const deleteButton = screen.getByRole('button', { name: /Delete weight entry/i });
    expect(deleteButton).toBeInTheDocument();
  });

  it('aria-labels include the date for screen-reader clarity', () => {
    renderRow();
    const editButton = screen.getByRole('button', { name: /Edit weight entry/i });
    expect(editButton.getAttribute('aria-label')).toContain('May 15, 2025');
    const deleteButton = screen.getByRole('button', { name: /Delete weight entry/i });
    expect(deleteButton.getAttribute('aria-label')).toContain('May 15, 2025');
  });

  it('calls onEdit with the entry when edit button is clicked', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderRow(ENTRY, onEdit, onDelete);

    await userEvent.click(screen.getByRole('button', { name: /Edit weight entry/i }));

    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(ENTRY);
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('calls onDelete with the entry when delete button is clicked', async () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    renderRow(ENTRY, onEdit, onDelete);

    await userEvent.click(screen.getByRole('button', { name: /Delete weight entry/i }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(ENTRY);
    expect(onEdit).not.toHaveBeenCalled();
  });

  it('renders the computed z-score as a decimal number', () => {
    renderRow();
    // The z-score is computed from WHO LMS — just verify it looks like a decimal
    const zscore = screen.getByText(/Z-score: -?\d+\.\d+/);
    expect(zscore).toBeInTheDocument();
  });
});
