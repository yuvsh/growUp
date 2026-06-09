// Growth (complex screen)
// Blueprint: docs/ui-blueprints.md → "Growth"
// Design system: design-system/pages/growth.md (overrides) → design-system/MASTER.md
// Uses from ui/: Card, Badge, Button, Skeleton, EmptyState, ErrorState, Modal, BottomTabs
// Screen components to create: WeightChart, BelowThirdAlert, ProjectionCard, InsightsList,
//   InsightCard, WeightHistoryList, WeightRow, WeightForm (modal)
// Philosophy: Apple shell + Google data density inside the chart/history.
// Data: repository.weights.listByChild + lib/who (LMS/z/percentile/curves) + lib/growth (velocity/projection/insights).
// All math is pure + client-side. Chart must have an accessible text/table fallback (not sole source).
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { EmptyState } from '../../components/ui/empty-state'

export function Growth(): React.JSX.Element {
  // TODO: load weights; compute latest percentile/z; build curve series; derive projection + insights.
  // States: empty (no weights) → EmptyState + Add CTA; loading → Skeleton; error → ErrorState+retry.
  return (
    <main>
      {/* Section 1: header — baby name + age + latest weight w/ percentile & z (Badge) */}
      {/* Section 2: BelowThirdAlert — CONDITIONAL, caution amber (never red): percentile, grams to 3rd,
                     trend, hopeful next step. Icon + words (never color-only). */}
      {/* Section 3: WeightChart (Recharts) — 5 WHO curves (3/15/50/85/97) + baby's points */}
      {/* Section 4: ProjectionCard — velocity g/day, ~4-week forecast, gain to reach 3rd; math visible */}
      {/* Section 5: InsightsList — starter cards + EXTENSION POINT for more insights */}
      {/* Section 6: WeightHistoryList — rows (date, weight, percentile, z) with edit/delete */}
      <EmptyState title="Add your baby's first weight to see the chart" />
      {/* Section 7: "Add weight" → WeightForm modal */}
      <Button variant="primary" aria-label="Add weight">{/* t('growth.addWeight') */}</Button>
      {/* Section: BottomTabs */}
      <Card>{/* accessible fallback: latest values as text/table */}</Card>
    </main>
  )
}
