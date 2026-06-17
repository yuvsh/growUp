/**
 * UiStateContext — holds ephemeral UI view-state above the routed screens.
 *
 * This is the React equivalent of an Android ViewModel: it lives OUTSIDE the
 * RouterProvider so it never unmounts on tab switches. State is also persisted
 * to localStorage so it survives a full page reload.
 *
 * Currently stores:
 *   - growthChartView: which chart tab is active (Weight | Z-score)
 *   - growthChartRange: the selected time-window for the weight chart
 *
 * These are view-only preferences — they never touch child or weight data.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { ChartRange } from '../lib/growth/chartWindow';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Which chart variant is currently shown on the Growth screen. */
export type GrowthChartView = 'weight' | 'zscore';

/** Valid values for GrowthChartView — used for runtime validation on read. */
const VALID_CHART_VIEWS: ReadonlyArray<GrowthChartView> = ['weight', 'zscore'];

/** Valid values for ChartRange — used for runtime validation on read. */
const VALID_CHART_RANGES: ReadonlyArray<ChartRange> = ['1mo', '3mo', '6mo', 'all', '2y'];

/** The default values used when localStorage has no valid entry. */
const DEFAULT_CHART_VIEW: GrowthChartView = 'weight';
const DEFAULT_CHART_RANGE: ChartRange = '3mo';

/** localStorage key for the persisted UI state blob. */
const STORAGE_KEY = 'growup:ui';

// ---------------------------------------------------------------------------
// Persisted state shape
// ---------------------------------------------------------------------------

interface PersistedUiState {
  growthChartView: GrowthChartView;
  growthChartRange: ChartRange;
}

// ---------------------------------------------------------------------------
// Context value
// ---------------------------------------------------------------------------

interface UiState {
  growthChartView: GrowthChartView;
  setGrowthChartView: (v: GrowthChartView) => void;
  growthChartRange: ChartRange;
  setGrowthChartRange: (r: ChartRange) => void;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const UiStateContext = createContext<UiState | null>(null);

// ---------------------------------------------------------------------------
// localStorage helpers (try/catch guards for private mode / quota errors)
// ---------------------------------------------------------------------------

function readFromStorage(): PersistedUiState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      return { growthChartView: DEFAULT_CHART_VIEW, growthChartRange: DEFAULT_CHART_RANGE };
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return { growthChartView: DEFAULT_CHART_VIEW, growthChartRange: DEFAULT_CHART_RANGE };
    }
    const obj = parsed as Record<string, unknown>;

    // Validate each field; fall back to default if invalid.
    const view = VALID_CHART_VIEWS.includes(obj.growthChartView as GrowthChartView)
      ? (obj.growthChartView as GrowthChartView)
      : DEFAULT_CHART_VIEW;

    const range = VALID_CHART_RANGES.includes(obj.growthChartRange as ChartRange)
      ? (obj.growthChartRange as ChartRange)
      : DEFAULT_CHART_RANGE;

    return { growthChartView: view, growthChartRange: range };
  } catch {
    return { growthChartView: DEFAULT_CHART_VIEW, growthChartRange: DEFAULT_CHART_RANGE };
  }
}

function writeToStorage(state: PersistedUiState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing or storage quota exceeded — silently ignore.
  }
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

interface UiStateProviderProps {
  children: ReactNode;
}

export function UiStateProvider({ children }: UiStateProviderProps): React.JSX.Element {
  // Lazy initializer: reads from localStorage once on mount (avoids a rerender).
  // Both fields are derived from a single read/parse so we never hit
  // localStorage or JSON.parse twice for the same mount.
  const [initialState] = useState<PersistedUiState>(readFromStorage);
  const [growthChartView, setGrowthChartView] = useState<GrowthChartView>(
    initialState.growthChartView,
  );
  const [growthChartRange, setGrowthChartRange] = useState<ChartRange>(
    initialState.growthChartRange,
  );

  // Persist to localStorage whenever either value changes.
  useEffect(() => {
    writeToStorage({ growthChartView, growthChartRange });
  }, [growthChartView, growthChartRange]);

  return (
    <UiStateContext.Provider
      value={{ growthChartView, setGrowthChartView, growthChartRange, setGrowthChartRange }}
    >
      {children}
    </UiStateContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useUiState(): UiState {
  const context = useContext(UiStateContext);
  if (context === null) {
    throw new Error('useUiState must be used within a UiStateProvider');
  }
  return context;
}
