/**
 * WeightHistoryList — renders the full history of weight entries.
 *
 * Entries are displayed newest-first inside a Card with a titled heading.
 * When there are no entries, an EmptyState is shown instead.
 */
import type { WeightEntry, Sex } from '../../types';
import { Card } from '../../components/ui/card';
import { EmptyState } from '../../components/ui/empty-state';
import { WeightRow } from './WeightRow';
import { t } from '../../i18n/t';

interface WeightHistoryListProps {
  entries: WeightEntry[];
  sex: Sex;
  dateOfBirth: string;
  onEdit: (entry: WeightEntry) => void;
  onDelete: (entry: WeightEntry) => void;
}

export function WeightHistoryList({
  entries,
  sex,
  dateOfBirth,
  onEdit,
  onDelete,
}: WeightHistoryListProps): React.JSX.Element {
  // Sort newest first by dateMeasured (ISO string comparison is valid for YYYY-MM-DD)
  const sortedEntries = [...entries].sort((a, b) =>
    b.dateMeasured.localeCompare(a.dateMeasured),
  );

  return (
    <section aria-labelledby="weight-history-heading">
      <h2
        id="weight-history-heading"
        className={[
          'text-[var(--text-h2)]',
          'font-[var(--font-heading)]',
          'text-[var(--color-foreground)]',
          'font-semibold',
          'mb-[var(--space-3)]',
          'mt-0',
        ].join(' ')}
      >
        {t('growth.history.title')}
      </h2>

      <Card>
        {sortedEntries.length === 0 ? (
          <EmptyState
            title={t('growth.history.empty')}
          />
        ) : (
          <ul
            className="list-none m-0 p-0"
            role="list"
          >
            {sortedEntries.map((entry) => (
              <WeightRow
                key={entry.id}
                entry={entry}
                sex={sex}
                dateOfBirth={dateOfBirth}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </ul>
        )}
      </Card>
    </section>
  );
}
