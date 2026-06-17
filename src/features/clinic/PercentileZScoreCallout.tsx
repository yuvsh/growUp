/**
 * PercentileZScoreCallout — the headline block on the Clinic Result screen.
 *
 * Design rules (design-system/pages/clinic.md + MASTER.md):
 *   - Big current percentile uses --text-display; no raw hex, no raw px.
 *   - Below-3rd → caution amber framing (--color-caution / --color-caution-surface)
 *     with icon + words. NEVER red. NEVER color alone.
 *   - On/above → accent green (--color-accent / --color-accent-strong) with icon + words.
 *   - The "born at X, now at Y" sentence is read aloud by the clinician; it
 *     mentions BOTH birth and current percentile (clinic.result.bornAndNow copy).
 *   - All strings via t(); placeholders interpolated locally (t() does not interpolate).
 *   - Logical CSS only — no physical left/right.
 *   - Pure presentational: no data fetching, no hooks beyond rendering.
 *
 * A11y:
 *   - role="status" on the status banner so screen readers announce it.
 *   - Icon is aria-hidden; status label next to it provides the text equivalent.
 */

import React from 'react';
import { t } from '../../i18n/t';
import { formatPercentileOrdinal, formatPercentileTh } from '../../lib/growth/format';
import type { ZResult } from '../growth/types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PercentileZScoreCalloutProps {
  /** Latest current measurement: percentile + z-score. */
  zResult: ZResult;
  /** Birth measurement: percentile + z-score (anchored at day 0). */
  birthZResult: ZResult;
  /** Age in days at the latest current measurement. */
  ageDaysAtLatest: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The 3rd-percentile threshold below which we show caution amber framing. */
const BELOW_THIRD_THRESHOLD = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Substitute `{birth}` and `{current}` placeholders in the bornAndNow copy
 * string. t() itself does not interpolate — this is the one spot that does.
 */
function interpolateBornAndNow(
  template: string,
  birth: string,
  current: string,
): string {
  return template.replace('{birth}', birth).replace('{current}', current);
}

// ---------------------------------------------------------------------------
// Sub-components — inline SVG icons (aria-hidden; text label always present)
// ---------------------------------------------------------------------------

function CautionIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 mt-0.5"
    >
      <path
        d="M10 2.5L17.5 16.25H2.5L10 2.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M10 8.75V11.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="10" cy="14" r="0.875" fill="currentColor" />
    </svg>
  );
}

function OnTrackIcon(): React.JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="shrink-0 mt-0.5"
    >
      <path
        d="M4 10l4 4 8-8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const PercentileZScoreCallout = React.memo(
  function PercentileZScoreCallout({
    zResult,
    birthZResult,
    ageDaysAtLatest: _ageDaysAtLatest,
  }: PercentileZScoreCalloutProps): React.JSX.Element {
    const isBelowThird = zResult.percentile < BELOW_THIRD_THRESHOLD;

    // Formatted ordinals used in the read-aloud sentence and the status label.
    const currentOrdinal = formatPercentileOrdinal(zResult.percentile);
    const birthOrdinal = formatPercentileOrdinal(birthZResult.percentile);

    // The bornAndNow template from i18n: "Born at the {birth} percentile, now at the {current} percentile."
    const bornAndNowSentence = interpolateBornAndNow(
      t('clinic.result.bornAndNow'),
      birthOrdinal,
      currentOrdinal,
    );

    // Status copy — icon + words always accompany the color cue (never color alone).
    const statusCopy = isBelowThird
      ? t('clinic.result.belowThird')
      : t('clinic.result.onTrack');

    // Token-based color classes — no raw hex.
    const statusBg = isBelowThird
      ? 'bg-[var(--color-caution-surface)]'
      : 'bg-[color-mix(in_srgb,var(--color-accent)_12%,transparent)]';

    const statusBorder = isBelowThird
      ? 'border-[var(--color-caution)]'
      : 'border-[var(--color-accent)]';

    const statusText = isBelowThird
      ? 'text-[var(--color-caution)]'
      : 'text-[var(--color-accent-strong)]';

    return (
      <section aria-label={bornAndNowSentence}>
        {/* Big current percentile — --text-display, primary foreground */}
        <p
          className="text-[var(--text-display)] font-bold text-[var(--color-foreground)] leading-none"
          aria-label={`Current percentile: ${currentOrdinal}`}
        >
          {currentOrdinal}
        </p>

        {/* Z-score — secondary label */}
        <p className="text-[var(--text-body)] text-[var(--color-text-muted)] mt-[var(--space-1)]">
          {`z = ${zResult.z.toFixed(2)}`}
        </p>

        {/* Read-aloud sentence: mentions BOTH birth and current percentile */}
        <p className="text-[var(--text-body-lg)] text-[var(--color-foreground)] mt-[var(--space-3)] leading-relaxed">
          {bornAndNowSentence}
        </p>

        {/* Status banner: icon + words + color. role="status" for a11y announcement. */}
        <div
          role="status"
          className={[
            'mt-[var(--space-4)]',
            'rounded-[var(--radius)]',
            'border',
            statusBg,
            statusBorder,
            statusText,
            'p-[var(--space-3)]',
            'flex items-start gap-[var(--space-2)]',
            'shadow-[var(--shadow-sm)]',
          ].join(' ')}
        >
          {/* Icon — aria-hidden; text below is the accessible label */}
          {isBelowThird ? <CautionIcon /> : <OnTrackIcon />}

          {/* Words — the status is NEVER conveyed by color alone */}
          <p className="text-[var(--text-body)] font-medium leading-snug">
            {statusCopy}
          </p>
        </div>

        {/* Percentile at birth — plain line, supports the "born at X" context */}
        <p className="text-[var(--text-sm)] text-[var(--color-text-muted)] mt-[var(--space-2)] leading-relaxed">
          {`Born at the ${birthOrdinal} percentile (${formatPercentileTh(birthZResult.percentile, 1)} · z = ${birthZResult.z.toFixed(2)})`}
        </p>
      </section>
    );
  },
);
