# Design Page — Clinic Mode

> Page-specific overrides for the **Clinic Mode** screens. Read **with** `design-system/MASTER.md`.
> Clinic Mode reuses the global tokens, fonts, and palette unchanged — this file only notes the
> deviations that come from the different *user* (a clinician in a fast visit) and the *ephemeral*
> nature of the feature.

## Audience shift
The rest of growUp speaks to an anxious parent. Clinic Mode speaks to a **clinician with seconds to
spare, reading the result aloud to the parent**. Copy stays warm but is denser and more efficient;
the layout favours speed-to-read over hand-holding.

## Philosophy anchor
- **Google accent (data-forward)** for `ClinicForm` and `ClinicResult` — numbers and the chart are
  the point; minimise chrome, maximise legibility of the percentile/z-score/velocity.
- **Apple anchor (calm, single-purpose)** for `ClinicEntry` — one clear notice + one CTA.

## Token usage (no new tokens)
- Percentile / z-score callout → `--text-display` number, `--color-foreground`.
- Below-3rd / "watch" framing → **caution amber** (`--color-caution` / `--color-caution-surface`),
  never `--color-destructive`. Same health-app rule as the parent app.
- "On track" / maintenance framing → `--color-accent` (health green).
- "Nothing is saved" + "not a diagnosis" notices → muted text on `--color-muted` surface.

## Anti-patterns (in addition to MASTER)
- ❌ No bottom tabs, no profile chrome — Clinic Mode is outside `PrimaryLayout`.
- ❌ No "save", "history", "account", or "sync" affordances anywhere — the feature stores nothing.
- ❌ Never colour-only status — pair amber/green with icon + words (color-blind clinician/parent).
- ❌ No alarming red for a low percentile — calm amber, factual, with a hopeful next number.

## Reused components (do not rebuild)
| Need | Reuse | From |
|---|---|---|
| Curves + 1–2 points chart | `WeightChart` | `features/growth/WeightChart.tsx` |
| Catch-up target | `ProjectionCard` | `features/growth/ProjectionCard.tsx` |
| Weight input row | pattern from `WeightForm` | `features/growth/WeightForm.tsx` |
| Sex selector | `SexSelector` | `features/profile/SexSelector.tsx` |
| Disclaimer line | `MedicalDisclaimer` | `components/ui/medical-disclaimer.tsx` |
| Primitives | Button, Input, Card, EmptyState | `components/ui/*` |
