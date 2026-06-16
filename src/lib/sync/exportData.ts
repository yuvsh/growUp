/**
 * Data export (PRD SYNC-6).
 *
 * Gathers all of a user's data (children + weights + feeding configs) into a
 * single serialisable bundle and offers a browser download as JSON. Works in
 * both storage modes — the caller passes the active repository and owner id.
 */
import type { Repository } from '../../data/repository/types.js';
import type { Child, WeightEntry, FeedingConfig } from '../../types/index.js';

// ---------------------------------------------------------------------------
// Public bundle shape
// ---------------------------------------------------------------------------

export interface ExportBundle {
  /** UTC ISO timestamp the export was generated. */
  exportedAt: string;
  children: Child[];
  weights: WeightEntry[];
  feedingConfigs: FeedingConfig[];
}

// ---------------------------------------------------------------------------
// Gather
// ---------------------------------------------------------------------------

/**
 * Collects every child, weight entry and feeding config owned by `ownerId` from
 * the given repository into a single {@link ExportBundle}.
 */
export async function gatherExportData(
  repo: Repository,
  ownerId: string,
): Promise<ExportBundle> {
  const children = await repo.children.list(ownerId);

  const weights: WeightEntry[] = [];
  const feedingConfigs: FeedingConfig[] = [];

  for (const child of children) {
    const childWeights = await repo.weights.listByChild(child.id);
    weights.push(...childWeights);

    const config = await repo.feedingConfig.getByChild(child.id);
    if (config !== null) {
      feedingConfigs.push(config);
    }
  }

  return {
    exportedAt: new Date().toISOString(),
    children,
    weights,
    feedingConfigs,
  };
}

// ---------------------------------------------------------------------------
// Download
// ---------------------------------------------------------------------------

const JSON_INDENT = 2;

/**
 * Triggers a browser download of the bundle as a JSON file. No-op when not
 * running in a DOM environment (guards SSR / tests).
 */
export function downloadJson(bundle: ExportBundle, filename: string): void {
  if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
    return;
  }

  const json = JSON.stringify(bundle, null, JSON_INDENT);
  const blob = new Blob([json], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(objectUrl);
}
