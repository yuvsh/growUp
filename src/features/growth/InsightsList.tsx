/**
 * InsightsList — section that computes and renders growth insight cards.
 *
 * Design rules (MASTER.md):
 *   - Section heading via t() — no hardcoded strings
 *   - Empty state via t() — calm, inviting
 *   - Logical CSS only — RTL-ready
 *   - No inline styles; Tailwind + CSS token classes
 *   - One InsightCard per insight from computeInsights()
 *   - EXTENSION POINT clearly marked so future agents know where to add more
 */

import type { WeightEntry, Sex } from '../../types';
import { computeInsights } from '../../lib/growth/insights';
import { t } from '../../i18n/t';
import { InsightCard } from './InsightCard';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InsightsListProps {
  entries: WeightEntry[];
  sex: Sex;
  dateOfBirth: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsightsList({
  entries,
  sex,
  dateOfBirth,
}: InsightsListProps): React.JSX.Element {
  const insights = computeInsights(entries, sex, dateOfBirth);

  return (
    <section aria-labelledby="insights-heading">
      {/* Section heading — copy from i18n */}
      <h2
        id="insights-heading"
        className="text-[var(--text-h2)] font-semibold text-[var(--color-foreground)] mb-[var(--space-3)]"
      >
        {t('growth.insights.title')}
      </h2>

      {insights.length === 0 ? (
        /* Empty state — calm encouragement, no data yet */
        <p className="text-[var(--text-body)] text-[var(--color-text-muted)] leading-relaxed">
          {t('growth.insights.empty')}
        </p>
      ) : (
        <div className="flex flex-col gap-[var(--space-3)]">
          {insights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}

          {/* EXTENSION POINT: render additional insight cards / custom insight UIs here */}
        </div>
      )}
    </section>
  );
}
