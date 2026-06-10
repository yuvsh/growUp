/**
 * InsightCard — renders a single growth insight in a calm, warm card.
 *
 * Design rules (MASTER.md):
 *   - Card component (surface bg, organic radius, soft shadow)
 *   - Badge tone maps from severity: caution → caution, info → muted
 *   - Icon + text — never color alone (Badge already enforces this)
 *   - Logical CSS only (no left/right — RTL-ready)
 *   - All section strings via t(); insight title/body come from the data
 */

import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import type { Insight } from './types';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface InsightCardProps {
  insight: Insight;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Maps an insight severity to the matching Badge tone.
 * caution → amber "caution" tone; info → quieter "muted" tone.
 */
function severityToTone(severity: Insight['severity']): 'caution' | 'muted' {
  return severity === 'caution' ? 'caution' : 'muted';
}

/**
 * Maps an insight severity to a human-readable label shown in the Badge.
 * This ensures non-color-alone communication of the severity level.
 */
function severityLabel(severity: Insight['severity']): string {
  return severity === 'caution' ? 'Caution' : 'Info';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsightCard({ insight }: InsightCardProps): React.JSX.Element {
  const tone = severityToTone(insight.severity);
  const label = severityLabel(insight.severity);

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-2)]">
        {/* Badge — severity with icon + text (no color-alone) */}
        <div>
          <Badge tone={tone}>{label}</Badge>
        </div>

        {/* Insight title — card heading level */}
        <p className="text-[var(--text-h3)] font-semibold text-[var(--color-foreground)] leading-snug">
          {insight.title}
        </p>

        {/* Insight body — warm, calm explanation */}
        <p className="text-[var(--text-body)] text-[var(--color-text-muted)] leading-relaxed">
          {insight.body}
        </p>
      </div>
    </Card>
  );
}
