/**
 * TrendCard — displays the weight-gain trend on the Clinic Result screen.
 *
 * Design rules (design-system/pages/clinic.md + MASTER.md):
 *   - gain → accent green (--color-accent / --color-accent-strong) + icon + words.
 *   - loss → caution amber (--color-caution / --color-caution-surface) + icon + words.
 *   - flat → muted (--color-text-muted / --color-muted) + icon + words.
 *   - NEVER convey status by color alone.
 *   - No raw hex; token variables only. Logical CSS only.
 *   - Pure presentational: no data fetching, no hooks beyond rendering.
 *   - All strings via t().
 *
 * A11y:
 *   - The direction word and g/day number both appear as text alongside the icon.
 *   - The icon is aria-hidden; the adjacent text is the accessible label.
 */

import React from 'react';
import { Card } from '../../components/ui/card';
import { t } from '../../i18n/t';
import type { TrendDirection } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TrendCardProps {
  trend: {
    direction: TrendDirection;
    gramsPerDay: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers — direction → display mapping
// ---------------------------------------------------------------------------

interface DirectionDisplay {
  /** Resolved copy label, e.g. "Gaining" / "Losing" / "Holding steady". */
  label: string;
  /** Tailwind token classes for the color band (background + border + text). */
  bgClass: string;
  borderClass: string;
  textClass: string;
}

function resolveDirectionDisplay(direction: TrendDirection): DirectionDisplay {
  switch (direction) {
    case 'gain':
      return {
        label: t('clinic.result.trendGain'),
        bgClass: 'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]',
        borderClass: 'border-[var(--color-accent)]',
        textClass: 'text-[var(--color-accent-strong)]',
      };
    case 'loss':
      return {
        label: t('clinic.result.trendLoss'),
        bgClass: 'bg-[var(--color-caution-surface)]',
        borderClass: 'border-[var(--color-caution)]',
        textClass: 'text-[var(--color-caution)]',
      };
    case 'flat':
      return {
        label: t('clinic.result.trendFlat'),
        bgClass: 'bg-[var(--color-muted)]',
        borderClass: 'border-[var(--color-border)]',
        textClass: 'text-[var(--color-text-muted)]',
      };
  }
}

// ---------------------------------------------------------------------------
// Sub-components — inline SVG icons (aria-hidden; text always present alongside)
// ---------------------------------------------------------------------------

function GainIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path
        d="M10 15V5M10 5l-4 4M10 5l4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LossIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path
        d="M10 5v10M10 15l-4-4M10 15l4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FlatIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <path
        d="M4 10h12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DirectionIcon({ direction }: { direction: TrendDirection }): React.JSX.Element {
  switch (direction) {
    case 'gain':
      return <GainIcon />;
    case 'loss':
      return <LossIcon />;
    case 'flat':
      return <FlatIcon />;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const TrendCard = React.memo(
  function TrendCard({ trend }: TrendCardProps): React.JSX.Element {
    const { direction, gramsPerDay } = trend;
    const display = resolveDirectionDisplay(direction);

    // Round to one decimal; trim trailing .0 for cleaner display.
    const formattedGPerDay = Number.isInteger(gramsPerDay)
      ? `${gramsPerDay}`
      : `${gramsPerDay.toFixed(1)}`;

    return (
      <Card>
        {/* Card title */}
        <p className="text-[var(--text-h3)] font-semibold text-[var(--color-foreground)] leading-snug mb-[var(--space-3)]">
          {t('clinic.result.trendTitle')}
        </p>

        {/* Status band: icon + direction word + g/day. Never color alone. */}
        <div
          className={[
            'rounded-[var(--radius-sm)]',
            'border',
            display.bgClass,
            display.borderClass,
            display.textClass,
            'p-[var(--space-3)]',
            'flex items-center gap-[var(--space-2)]',
          ].join(' ')}
        >
          {/* Icon — aria-hidden; the direction label is the accessible text */}
          <DirectionIcon direction={direction} />

          {/* Direction word — always present alongside the icon */}
          <span className="text-[var(--text-body-lg)] font-semibold leading-none">
            {display.label}
          </span>

          {/* Separator */}
          <span
            className="text-[var(--text-body)] opacity-50 select-none"
            aria-hidden="true"
          >
            ·
          </span>

          {/* g/day velocity */}
          <span className="text-[var(--text-body)] font-medium leading-none">
            {`${formattedGPerDay} g/${t('clinic.result.perDay')}`}
          </span>
        </div>
      </Card>
    );
  },
);
