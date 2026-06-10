// Profile
// Blueprint: docs/ui-blueprints.md → "Profile"
// Design system: design-system/MASTER.md
// Uses from ui/: Card, Button, EmptyState, ErrorState, Skeleton
// Philosophy: Apple — quiet summary.
// Data: current child via useChild + ageFromDob (lib/growth).
// States: no child → EmptyState "Add your baby to begin" (action → /profile/child);
//         skeleton card on load; calm error + retry.
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useChild } from '../../lib/hooks/useChild';
import { ageFromDob, formatAge } from '../../lib/growth/age';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { EmptyState } from '../../components/ui/empty-state';
import { ErrorState } from '../../components/ui/error-state';
import { Skeleton } from '../../components/ui/skeleton';
import { t } from '../../i18n/t';

// ---------------------------------------------------------------------------
// Profile screen
// ---------------------------------------------------------------------------

export function Profile(): React.JSX.Element {
  const { child, loading, error, reload } = useChild();
  const navigate = useNavigate();

  // ---- Loading state -------------------------------------------------------
  if (loading) {
    return (
      <main className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)] max-w-[560px] mx-auto w-full">
        <Skeleton variant="text" />
        <Skeleton variant="card" />
      </main>
    );
  }

  // ---- Error state ---------------------------------------------------------
  if (error !== null) {
    return (
      <main className="flex flex-col gap-[var(--space-4)] p-[var(--space-4)] max-w-[560px] mx-auto w-full">
        <ErrorState
          variant="with-retry"
          title={t('profile.error.title')}
          description={t('profile.error.description')}
          onRetry={reload}
        />
      </main>
    );
  }

  // ---- Empty state (no child) ----------------------------------------------
  if (child === null) {
    return (
      <main className="flex flex-col items-center justify-center min-h-[60vh] p-[var(--space-4)]">
        <EmptyState
          title={t('profile.empty.title')}
          action={
            <Button
              variant="primary"
              size="md"
              fullWidthOnMobile
              onClick={(): void => { navigate('/profile/child'); }}
            >
              {t('profile.empty.cta')}
            </Button>
          }
        />
      </main>
    );
  }

  // ---- Child data ----------------------------------------------------------
  const age = ageFromDob(child.dateOfBirth);
  const formattedAge = formatAge(age);
  const sexLabel =
    child.sex === 'male' ? t('profile.sex.male') : t('profile.sex.female');

  return (
    <main className="flex flex-col gap-[var(--space-6)] p-[var(--space-4)] max-w-[560px] mx-auto w-full pb-[var(--space-20)]">

      {/* ---- Header: name + current age (plain text, not color-coded) ------- */}
      <header className="flex flex-col gap-[var(--space-1)]">
        <h1 className="text-[var(--text-h1)] font-[var(--font-heading)] text-[var(--color-foreground)] m-0">
          {child.name}
        </h1>
        <p className="text-[var(--text-body-lg)] text-[var(--color-text-muted)] m-0">
          {formattedAge}
        </p>
      </header>

      {/* ---- Summary card: sex + DOB + Edit button -------------------------- */}
      <Card variant="default">
        <div className="flex flex-col gap-[var(--space-4)]">

          {/* Sex row */}
          <div className="flex items-center justify-between gap-[var(--space-3)]">
            <span className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
              {t('profile.sexLabel')}
            </span>
            <span className="text-[var(--text-body)] text-[var(--color-foreground)] font-medium">
              {sexLabel}
            </span>
          </div>

          {/* DOB row */}
          <div className="flex items-center justify-between gap-[var(--space-3)]">
            <span className="text-[var(--text-sm)] text-[var(--color-text-muted)]">
              {t('profile.dobLabel')}
            </span>
            <span className="text-[var(--text-body)] text-[var(--color-foreground)] font-medium">
              {child.dateOfBirth}
            </span>
          </div>

          {/* Edit button */}
          <div className="flex justify-end pt-[var(--space-2)]">
            <Button
              variant="secondary"
              size="md"
              aria-label={t('profile.editAriaLabel')}
              onClick={(): void => { navigate('/profile/child'); }}
            >
              {t('profile.edit')}
            </Button>
          </div>
        </div>
      </Card>

      {/*
       * ---- FUTURE PLACEHOLDER: child switcher + account -------------------
       * When multi-child support and account management are implemented,
       * add the child switcher UI and account section here.
       * Suggested slot:
       *   <ChildSwitcher />
       *   <AccountSection />
       * -----------------------------------------------------------------------
       */}

    </main>
  );
}
