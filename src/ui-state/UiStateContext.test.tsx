/**
 * Tests for UiStateContext.
 *
 * Covers:
 * - A value set through the provider is written to localStorage.
 * - A provider mounted with existing valid `growup:ui` hydrates from it.
 * - An invalid/garbage stored value falls back to defaults.
 * - `useUiState` outside the provider throws a clear error.
 *
 * Note: Node 22+ does not support localStorage.clear(). We stub globalThis.localStorage
 * with an in-memory implementation on each test to ensure full isolation (same
 * pattern as src/auth/AuthContext.test.tsx).
 */

// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { UiStateProvider, useUiState } from './UiStateContext';
import type { GrowthChartView } from './UiStateContext';
import type { ChartRange } from '../lib/growth/chartWindow';

// ---------------------------------------------------------------------------
// In-memory localStorage stub (Node 22+ does not implement .clear())
// ---------------------------------------------------------------------------

function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() { return store.size; },
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'growup:ui';

/** A minimal consumer component that shows current state and lets us mutate it. */
function Consumer(): React.JSX.Element {
  const { growthChartView, setGrowthChartView, growthChartRange, setGrowthChartRange } =
    useUiState();
  return (
    <div>
      <span data-testid="view">{growthChartView}</span>
      <span data-testid="range">{growthChartRange}</span>
      <button
        onClick={() => { setGrowthChartView('zscore'); }}
        data-testid="set-zscore"
      >
        set zscore
      </button>
      <button
        onClick={() => { setGrowthChartRange('6mo'); }}
        data-testid="set-6mo"
      >
        set 6mo
      </button>
    </div>
  );
}

function renderInProvider(storage: Storage): void {
  vi.stubGlobal('localStorage', storage);
  render(
    <UiStateProvider>
      <Consumer />
    </UiStateProvider>,
  );
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let storage: Storage;

beforeEach(() => {
  storage = createMemoryStorage();
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('UiStateContext', () => {
  // -------------------------------------------------------------------------
  // Default values
  // -------------------------------------------------------------------------
  it('defaults to weight view and 3mo range when localStorage is empty', () => {
    renderInProvider(storage);
    expect(screen.getByTestId('view').textContent).toBe('weight');
    expect(screen.getByTestId('range').textContent).toBe('3mo');
  });

  // -------------------------------------------------------------------------
  // Persistence: value written to localStorage when set
  // -------------------------------------------------------------------------
  it('writes to localStorage when growthChartView is changed', async () => {
    const user = userEvent.setup();
    renderInProvider(storage);

    await user.click(screen.getByTestId('set-zscore'));

    const stored = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as {
      growthChartView?: string;
    };
    expect(stored.growthChartView).toBe('zscore');
  });

  it('writes to localStorage when growthChartRange is changed', async () => {
    const user = userEvent.setup();
    renderInProvider(storage);

    await user.click(screen.getByTestId('set-6mo'));

    const stored = JSON.parse(storage.getItem(STORAGE_KEY) ?? '{}') as {
      growthChartRange?: string;
    };
    expect(stored.growthChartRange).toBe('6mo');
  });

  // -------------------------------------------------------------------------
  // Hydration: valid stored value is read on mount
  // -------------------------------------------------------------------------
  it('hydrates growthChartView from a valid stored value', () => {
    const persisted: { growthChartView: GrowthChartView; growthChartRange: ChartRange } = {
      growthChartView: 'zscore',
      growthChartRange: '1mo',
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(persisted));

    renderInProvider(storage);

    expect(screen.getByTestId('view').textContent).toBe('zscore');
    expect(screen.getByTestId('range').textContent).toBe('1mo');
  });

  it('hydrates growthChartRange from a valid stored value', () => {
    const persisted: { growthChartView: GrowthChartView; growthChartRange: ChartRange } = {
      growthChartView: 'weight',
      growthChartRange: 'all',
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(persisted));

    renderInProvider(storage);

    expect(screen.getByTestId('range').textContent).toBe('all');
  });

  // -------------------------------------------------------------------------
  // Validation: invalid stored values fall back to defaults
  // -------------------------------------------------------------------------
  it('falls back to default view when stored growthChartView is invalid', () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ growthChartView: 'nonsense', growthChartRange: '3mo' }),
    );
    renderInProvider(storage);
    expect(screen.getByTestId('view').textContent).toBe('weight');
  });

  it('falls back to default range when stored growthChartRange is invalid', () => {
    storage.setItem(
      STORAGE_KEY,
      JSON.stringify({ growthChartView: 'weight', growthChartRange: 'invalid-range' }),
    );
    renderInProvider(storage);
    expect(screen.getByTestId('range').textContent).toBe('3mo');
  });

  it('falls back to all defaults when stored value is garbage JSON', () => {
    storage.setItem(STORAGE_KEY, 'NOT_VALID_JSON{{{');
    renderInProvider(storage);
    expect(screen.getByTestId('view').textContent).toBe('weight');
    expect(screen.getByTestId('range').textContent).toBe('3mo');
  });

  it('falls back to all defaults when stored value is a non-object', () => {
    storage.setItem(STORAGE_KEY, '"just-a-string"');
    renderInProvider(storage);
    expect(screen.getByTestId('view').textContent).toBe('weight');
    expect(screen.getByTestId('range').textContent).toBe('3mo');
  });

  // -------------------------------------------------------------------------
  // useUiState outside the provider throws
  // -------------------------------------------------------------------------
  it('throws when useUiState is called outside the provider', () => {
    // Suppress React's error boundary output in the test console.
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    function Orphan(): React.JSX.Element {
      useUiState();
      return <div />;
    }

    expect(() => {
      render(<Orphan />);
    }).toThrow('useUiState must be used within a UiStateProvider');

    consoleSpy.mockRestore();
  });

  // -------------------------------------------------------------------------
  // Round-trip: state survives set → fresh mount (simulates tab switch + reload)
  // -------------------------------------------------------------------------
  it('persists a range change so a fresh mount reads the new value', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <UiStateProvider>
        <Consumer />
      </UiStateProvider>,
    );

    await user.click(screen.getByTestId('set-6mo'));
    unmount();

    // New mount — should hydrate from the persisted value written above.
    render(
      <UiStateProvider>
        <Consumer />
      </UiStateProvider>,
    );

    expect(screen.getByTestId('range').textContent).toBe('6mo');
  });

  // -------------------------------------------------------------------------
  // localStorage quota failure is silently swallowed (never throws)
  // -------------------------------------------------------------------------
  it('does not throw when localStorage.setItem throws (quota exceeded)', async () => {
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    const user = userEvent.setup();

    expect(() => {
      renderInProvider(storage);
    }).not.toThrow();

    await act(async () => {
      await user.click(screen.getByTestId('set-zscore'));
    });

    // The in-memory state still updates even if localStorage fails.
    expect(screen.getByTestId('view').textContent).toBe('zscore');
  });
});
