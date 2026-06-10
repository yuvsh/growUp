/**
 * WeightRow — a single row in the weight history list.
 *
 * Displays date, weight in kg, WHO percentile, and z-score for one entry.
 * Edit and Delete are accessible icon buttons (≥44×44px) with aria-labels.
 */
import type { WeightEntry, Sex } from '../../types';
import { weightToZResult } from '../../lib/who';
import { ageFromDob } from '../../lib/growth/age';
import { t } from '../../i18n/t';

interface WeightRowProps {
  entry: WeightEntry;
  sex: Sex;
  dateOfBirth: string;
  onEdit: (entry: WeightEntry) => void;
  onDelete: (entry: WeightEntry) => void;
}

/** Format weight in grams to kg string with 3 significant figures. */
function formatWeightKg(grams: number): string {
  const kg = grams / 1000;
  // 3 sig figs: e.g. 3450g → "3.45 kg", 12300g → "12.3 kg"
  return `${parseFloat(kg.toPrecision(3))} kg`;
}

/** Format a percentile number as "42nd", "3rd", "11th" etc. */
function formatPercentile(percentile: number): string {
  const rounded = Math.round(percentile);
  const mod10 = rounded % 10;
  const mod100 = rounded % 100;
  let suffix: string;
  if (mod100 >= 11 && mod100 <= 13) {
    suffix = 'th';
  } else if (mod10 === 1) {
    suffix = 'st';
  } else if (mod10 === 2) {
    suffix = 'nd';
  } else if (mod10 === 3) {
    suffix = 'rd';
  } else {
    suffix = 'th';
  }
  return `${rounded}${suffix}`;
}

/** Format a date ISO string (YYYY-MM-DD) to a readable form, e.g. "Jun 10, 2026". */
function formatDate(iso: string): string {
  // Parse without timezone to avoid off-by-one from UTC conversion
  const [yearStr, monthStr, dayStr] = iso.split('-');
  const year = parseInt(yearStr ?? '0', 10);
  const month = parseInt(monthStr ?? '0', 10) - 1;
  const day = parseInt(dayStr ?? '0', 10);
  const date = new Date(year, month, day);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function WeightRow({
  entry,
  sex,
  dateOfBirth,
  onEdit,
  onDelete,
}: WeightRowProps): React.JSX.Element {
  const ageDays = ageFromDob(dateOfBirth, entry.dateMeasured).days;
  const { z, percentile } = weightToZResult(entry.weightGrams, sex, ageDays);

  const formattedDate = formatDate(entry.dateMeasured);
  const editLabel = `${t('growth.history.editAria')} — ${formattedDate}`;
  const deleteLabel = `${t('growth.history.deleteAria')} — ${formattedDate}`;

  return (
    <li
      className={[
        'flex items-center justify-between',
        'gap-[var(--space-3)]',
        'py-[var(--space-3)] px-[var(--space-4)]',
        'border-b border-[var(--color-border)]',
        'last:border-b-0',
      ].join(' ')}
    >
      {/* Date + weight info */}
      <div className="flex flex-col gap-[var(--space-1)] min-w-0 flex-1">
        <span
          className={[
            'text-[var(--text-body)]',
            'font-medium',
            'text-[var(--color-foreground)]',
          ].join(' ')}
        >
          {formattedDate}
        </span>
        <span
          className={[
            'text-[var(--text-body-lg)]',
            'font-semibold',
            'text-[var(--color-foreground)]',
          ].join(' ')}
        >
          {formatWeightKg(entry.weightGrams)}
        </span>
        <div className="flex items-center gap-[var(--space-3)]">
          <span
            className={[
              'text-[var(--text-sm)]',
              'text-[var(--color-text-muted)]',
            ].join(' ')}
          >
            {t('growth.percentile')}: {formatPercentile(percentile)}
          </span>
          <span
            className={[
              'text-[var(--text-sm)]',
              'text-[var(--color-text-muted)]',
            ].join(' ')}
          >
            {t('growth.zScore')}: {z.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-[var(--space-2)] shrink-0">
        {/* Edit button */}
        <button
          type="button"
          aria-label={editLabel}
          onClick={() => onEdit(entry)}
          className={[
            'inline-flex items-center justify-center',
            'min-h-[44px] min-w-[44px]',
            'rounded-[var(--radius-sm)]',
            'text-[var(--color-primary)]',
            'hover:bg-[var(--color-muted)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
            'motion-safe:active:scale-[0.98]',
          ].join(' ')}
        >
          {/* Pencil / edit icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="20"
            height="20"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </button>

        {/* Delete button */}
        <button
          type="button"
          aria-label={deleteLabel}
          onClick={() => onDelete(entry)}
          className={[
            'inline-flex items-center justify-center',
            'min-h-[44px] min-w-[44px]',
            'rounded-[var(--radius-sm)]',
            'text-[var(--color-destructive)]',
            'hover:bg-[var(--color-muted)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-ring)]',
            'motion-safe:active:scale-[0.98]',
          ].join(' ')}
        >
          {/* Trash / delete icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="20"
            height="20"
            aria-hidden="true"
            focusable="false"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
        </button>
      </div>
    </li>
  );
}
