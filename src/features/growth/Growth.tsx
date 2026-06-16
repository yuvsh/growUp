// Growth (complex screen)
// Blueprint: docs/ui-blueprints.md → "Growth"
// Design system: design-system/pages/growth.md (overrides) → design-system/MASTER.md
// Uses from ui/: Card, Badge, Button, Skeleton, EmptyState, ErrorState, Modal, BottomTabs
// Screen components to create: WeightChart, BelowThirdAlert, ProjectionCard, InsightsList,
//   InsightCard, WeightHistoryList, WeightRow, WeightForm (modal)
// Philosophy: Apple shell + Google data density inside the chart/history.
// Data: repository.weights.listByChild + lib/who (LMS/z/percentile/curves) + lib/growth (velocity/projection/insights).
// All math is pure + client-side. Chart must have an accessible text/table fallback (not sole source).

// ---------------------------------------------------------------------------
// NOTE: Two useWeights instances
// ---------------------------------------------------------------------------
// This screen owns one `useWeights(childId)` instance for display.
// `WeightForm` owns a separate instance internally for mutations (add/edit/delete).
// Because they are independent React state, closing the form calls this screen's
// `reload()` to trigger a fresh fetch and sync both lists to the source of truth.
// ---------------------------------------------------------------------------

import React, { Suspense, useState } from 'react';
import { useUiState } from '../../ui-state/UiStateContext';
import { useChild } from '../../lib/hooks/useChild';
import { useWeights } from '../../lib/hooks/useWeights';
import { weightToZResult } from '../../lib/who';
import { ageFromDob, formatAge } from '../../lib/growth/age';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { EmptyState } from '../../components/ui/empty-state';
import { ErrorState } from '../../components/ui/error-state';
import { BelowThirdAlert } from './BelowThirdAlert';
import { WeightChart } from './WeightChart';
// ZScoreChart is only shown when the chart toggle is on "z-score". Lazy-load it so
// its (Recharts-heavy) slice loads on demand rather than with the default view.
const ZScoreChart = React.lazy(() =>
  import('./ZScoreChart').then((m) => ({ default: m.ZScoreChart })),
);
import { ProjectionCard } from './ProjectionCard';
import { InsightsList } from './InsightsList';
import { WeightHistoryList } from './WeightHistoryList';
import { WeightForm } from './WeightForm';
import { ImportNaraBaby } from './ImportNaraBaby';
import { t } from '../../i18n/t';
import type { WeightEntry } from '../../types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModalState {
  open: boolean;
  /** Undefined = add mode; defined = edit mode */
  entry?: WeightEntry;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format weight in grams as a human-readable kg string (e.g. 6350 → "6.350 kg"). */
function formatWeightKg(grams: number): string {
  return `${(grams / 1000).toFixed(3)} kg`;
}

/** Format a percentile number as a one-decimal string (e.g. 24.7 → "24.7th"). */
function formatPercentile(p: number): string {
  return `${p.toFixed(1)}th`;
}

/** Format a z-score to two decimal places with sign (e.g. -1.23). */
function formatZ(z: number): string {
  return z.toFixed(2);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Growth(): React.JSX.Element {
  const { child } = useChild();
  const childId = child?.id ?? null;
  const { weights, loading, error, deleteWeight, reload } = useWeights(childId);

  const [modal, setModal] = useState<ModalState>({ open: false });
  const {
    growthChartView: chartView,
    setGrowthChartView: setChartView,
    growthChartRange,
    setGrowthChartRange,
  } = useUiState();

  // ---- Guard: no child (route guard normally handles this, but be defensive) --
  if (child === null) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen px-[var(--space-4)]">
        <EmptyState title={t('profile.empty.title')} />
      </main>
    );
  }

  const { id: activeChildId, name, sex, dateOfBirth } = child;

  // ---- Loading state ---------------------------------------------------
  if (loading) {
    return (
      <main
        className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)] max-w-2xl mx-auto w-full"
        aria-busy="true"
        aria-label={t('growth.title')}
      >
        <Skeleton variant="full-page" />
      </main>
    );
  }

  // ---- Error state -----------------------------------------------------
  if (error !== null) {
    return (
      <main
        className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)] max-w-2xl mx-auto w-full"
        aria-label={t('growth.title')}
      >
        <ErrorState
          variant="with-retry"
          title={t('growth.error.title')}
          description={t('growth.error.description')}
          onRetry={reload}
        />
      </main>
    );
  }

  // ---- Derived values (only computed when we have entries) ---------------
  const sortedEntries = [...weights].sort((a, b) =>
    b.dateMeasured.localeCompare(a.dateMeasured),
  );
  const latestEntry = sortedEntries[0];

  const ageBreakdown = ageFromDob(dateOfBirth);
  const ageLabel = formatAge(ageBreakdown);

  const latestZResult =
    latestEntry !== undefined
      ? weightToZResult(
          latestEntry.weightGrams,
          sex,
          ageFromDob(dateOfBirth, latestEntry.dateMeasured).days,
        )
      : null;

  // ---- Modal handlers ---------------------------------------------------

  function openAddModal(): void {
    setModal({ open: true });
  }

  function openEditModal(entry: WeightEntry): void {
    setModal({ open: true, entry });
  }

  function handleDeleteEntry(entry: WeightEntry): void {
    // Direct delete — relies on the hook to update its own state optimistically.
    deleteWeight(entry.id).catch(() => {
      // Error is stored in `error` state by the hook; no further action needed here.
    });
  }

  function handleFormClose(): void {
    setModal({ open: false });
    // Re-sync this screen's useWeights instance with the source of truth.
    // WeightForm has its own internal useWeights instance for mutations,
    // so we call reload() here to pull in any changes it made.
    reload();
  }

  // ---- Empty state -------------------------------------------------------
  const hasEntries = weights.length > 0;

  return (
    <main
      className="flex flex-col gap-[var(--space-5)] p-[var(--space-4)] max-w-2xl mx-auto w-full pb-[var(--space-20)]"
      aria-label={t('growth.title')}
    >
      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Header — name + age + latest weight with percentile & z  */}
      {/* ------------------------------------------------------------------ */}
      <header className="flex flex-col gap-[var(--space-2)]">
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div className="flex flex-col gap-[var(--space-1)]">
            <h1
              className={[
                'text-[length:var(--text-h1)]',
                'font-[family-name:var(--font-heading)]',
                'text-[var(--color-foreground)]',
                'font-semibold',
                'm-0',
              ].join(' ')}
            >
              {name}
            </h1>
            <p className="text-[length:var(--text-body)] text-[var(--color-text-muted)] m-0">
              {ageLabel}
            </p>
          </div>

          {/* Latest weight badge — only when entries exist */}
          {latestEntry !== undefined && latestZResult !== null && (
            <div
              className={[
                'flex flex-col items-end gap-[var(--space-1)]',
                'bg-[var(--color-surface)]',
                'rounded-[var(--radius)]',
                'shadow-[var(--shadow-sm)]',
                'p-[var(--space-3)]',
                'shrink-0',
              ].join(' ')}
              aria-label={t('growth.latestWeight')}
            >
              <span className="text-[length:var(--text-caption)] text-[var(--color-text-muted)] uppercase tracking-wide">
                {t('growth.latestWeight')}
              </span>
              <span className="text-[length:var(--text-body-lg)] font-semibold text-[var(--color-foreground)]">
                {formatWeightKg(latestEntry.weightGrams)}
              </span>
              <div className="flex gap-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
                <span>
                  <span className="font-medium">{t('growth.percentile')}:</span>{' '}
                  {formatPercentile(latestZResult.percentile)}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <span className="font-medium">{t('growth.zScore')}:</span>{' '}
                  {formatZ(latestZResult.z)}
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Empty state: no entries yet                                         */}
      {/* ------------------------------------------------------------------ */}
      {!hasEntries && (
        <EmptyState
          title={t('growth.empty.title')}
          action={
            <div className="flex flex-col items-center gap-[var(--space-3)]">
              <Button
                variant="primary"
                onClick={openAddModal}
                aria-label={t('growth.addWeight')}
                className="min-h-[44px] min-w-[44px]"
              >
                {t('growth.empty.cta')}
              </Button>
              {/* Import is most useful here — a parent migrating from Nara Baby
                  starts with no weights, so the entry point must exist in the empty state. */}
              <ImportNaraBaby
                childId={activeChildId}
                dateOfBirth={dateOfBirth}
                existingEntries={weights}
                onImported={reload}
              />
            </div>
          }
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Sections 2–6: only rendered when entries exist                      */}
      {/* ------------------------------------------------------------------ */}
      {hasEntries && (
        <>
          {/* Actions: Add weight + Import — kept at the top for quick access */}
          <div className="flex flex-wrap items-center justify-end gap-[var(--space-3)]">
            <ImportNaraBaby
              childId={activeChildId}
              dateOfBirth={dateOfBirth}
              existingEntries={weights}
              onImported={reload}
            />
            <Button
              variant="primary"
              onClick={openAddModal}
              aria-label={t('growth.addWeight')}
              className="min-h-[44px] min-w-[44px]"
            >
              {t('growth.addWeight')}
            </Button>
          </div>

          {/* Section 2: BelowThirdAlert — conditional caution amber */}
          <BelowThirdAlert entries={weights} sex={sex} dateOfBirth={dateOfBirth} />

          {/* ---------------------------------------------------------------- */}
          {/* Chart view toggle — Weight | Z-score segmented control          */}
          {/* Only shown when entries exist (guaranteed here by hasEntries).  */}
          {/* Radio-group semantics per ui-blueprints.md a11y requirements.  */}
          {/* ---------------------------------------------------------------- */}
          <div
            role="radiogroup"
            aria-label={t('growth.chartToggle.label')}
            className="flex gap-[var(--space-1)] rounded-[var(--radius-pill)] bg-[var(--color-muted)] p-[var(--space-1)] self-start"
          >
            <button
              role="radio"
              aria-checked={chartView === 'weight'}
              onClick={() => { setChartView('weight'); }}
              className={[
                'min-h-[44px] min-w-[44px]',
                'px-[var(--space-4)] py-[var(--space-2)]',
                'rounded-[var(--radius-pill)]',
                'text-[length:var(--text-sm)] font-medium',
                'transition-colors duration-[var(--duration-fast)]',
                'focus-visible:outline-[2px] focus-visible:outline-[var(--color-ring)] focus-visible:outline-offset-2',
                chartView === 'weight'
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
            >
              {t('growth.chartToggle.weight')}
            </button>
            <button
              role="radio"
              aria-checked={chartView === 'zscore'}
              onClick={() => { setChartView('zscore'); }}
              className={[
                'min-h-[44px] min-w-[44px]',
                'px-[var(--space-4)] py-[var(--space-2)]',
                'rounded-[var(--radius-pill)]',
                'text-[length:var(--text-sm)] font-medium',
                'transition-colors duration-[var(--duration-fast)]',
                'focus-visible:outline-[2px] focus-visible:outline-[var(--color-ring)] focus-visible:outline-offset-2',
                chartView === 'zscore'
                  ? 'bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--shadow-sm)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-foreground)]',
              ].join(' ')}
            >
              {t('growth.chartToggle.zscore')}
            </button>
          </div>

          {/* Section 3: Chart — Weight or Z-score depending on toggle state */}
          {chartView === 'weight' ? (
            <WeightChart
              entries={weights}
              sex={sex}
              dateOfBirth={dateOfBirth}
              range={growthChartRange}
              onRangeChange={setGrowthChartRange}
            />
          ) : (
            <Suspense fallback={<Skeleton variant="full-page" />}>
              <ZScoreChart entries={weights} sex={sex} dateOfBirth={dateOfBirth} />
            </Suspense>
          )}

          {/* Section 4: ProjectionCard — velocity + 4-week forecast */}
          <ProjectionCard entries={weights} sex={sex} dateOfBirth={dateOfBirth} />

          {/* Section 5: InsightsList — starter cards + EXTENSION POINT */}
          <InsightsList entries={weights} sex={sex} dateOfBirth={dateOfBirth} />

          {/* Section 6: WeightHistoryList — rows with edit/delete */}
          <WeightHistoryList
            entries={weights}
            sex={sex}
            dateOfBirth={dateOfBirth}
            onEdit={openEditModal}
            onDelete={handleDeleteEntry}
          />
        </>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* WeightForm modal — add or edit mode                                 */}
      {/* ------------------------------------------------------------------ */}
      <WeightForm
        open={modal.open}
        onClose={handleFormClose}
        childId={activeChildId}
        dateOfBirth={dateOfBirth}
        entry={modal.entry}
      />
    </main>
  );
}
