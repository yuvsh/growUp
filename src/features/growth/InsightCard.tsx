/**
 * InsightCard — renders a single growth insight in a calm, warm card.
 *
 * Design rules (MASTER.md):
 *   - Card component (surface bg, organic radius, soft shadow)
 *   - Badge tone maps from severity: caution → caution, info → muted
 *   - Icon + text — never color alone (Badge already enforces this)
 *   - Logical CSS only (no left/right — RTL-ready)
 *   - All strings via t(); title/body/severity-label are resolved here from
 *     `insight.kind`/`insight.severity` — never hardcoded.
 */

import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { t } from '../../i18n/t';
import type { Insight, InsightBodyParams } from './types';

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
 * Substitutes `{token}` placeholders in a copy string with values from
 * `params`. Returns the copy unchanged when there are no params to apply —
 * `t()` itself never interpolates, so this is the one spot that does.
 */
function interpolate(copy: string, params: InsightBodyParams | undefined): string {
  if (params === undefined) {
    return copy;
  }

  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(`{${key}}`, String(value)),
    copy,
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function InsightCard({ insight }: InsightCardProps): React.JSX.Element {
  const tone = severityToTone(insight.severity);
  const severityLabel = t(`growth.insights.severity.${insight.severity}`);
  const title = t(`growth.insights.${insight.kind}.title`);
  const body = interpolate(t(`growth.insights.${insight.kind}.body`), insight.bodyParams);

  return (
    <Card>
      <div className="flex flex-col gap-[var(--space-2)]">
        {/* Badge — severity with icon + text (no color-alone) */}
        <div>
          <Badge tone={tone}>{severityLabel}</Badge>
        </div>

        {/* Insight title — card heading level */}
        <p className="text-[var(--text-h3)] font-semibold text-[var(--color-foreground)] leading-snug">
          {title}
        </p>

        {/* Insight body — warm, calm explanation */}
        <p className="text-[var(--text-body)] text-[var(--color-text-muted)] leading-relaxed">
          {body}
        </p>
      </div>
    </Card>
  );
}
