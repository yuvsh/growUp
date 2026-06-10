import en, { type Copy } from './copy/en.js';

// ---------------------------------------------------------------------------
// Dot-path key derivation
// ---------------------------------------------------------------------------

/**
 * Recursively produces all dot-separated paths through an object type whose
 * leaf values are `string` (as produced by `as const`).
 *
 * Example:
 *   DotPaths<{ app: { name: string }; common: { save: string } }>
 *   → 'app.name' | 'common.save'
 */
type DotPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? Prefix extends ''
      ? K
      : `${Prefix}.${K}`
    : T[K] extends Record<string, unknown>
      ? DotPaths<T[K], Prefix extends '' ? K : `${Prefix}.${K}`>
      : never;
}[keyof T & string];

/**
 * Resolves the value type for a given dot-path key.
 */
type DotValue<T, Path extends string> =
  Path extends `${infer Head}.${infer Tail}`
    ? Head extends keyof T
      ? DotValue<T[Head], Tail>
      : never
    : Path extends keyof T
      ? T[Path]
      : never;

// ---------------------------------------------------------------------------
// Public key type (exported so tests and components can type-check keys)
// ---------------------------------------------------------------------------

export type CopyKey = DotPaths<Copy>;

// ---------------------------------------------------------------------------
// Resolver — walks the object by splitting the dot-path
// ---------------------------------------------------------------------------

function resolve(obj: Record<string, unknown>, parts: string[]): string {
  const [head, ...rest] = parts;

  if (head === undefined) {
    // Should never happen given a valid key
    throw new Error('[i18n] t() called with an empty key');
  }

  const value = obj[head];

  if (rest.length === 0) {
    if (typeof value === 'string') return value;
    throw new Error(
      `[i18n] Key "${head}" does not resolve to a string — found ${typeof value}`,
    );
  }

  if (value === null || typeof value !== 'object') {
    throw new Error(
      `[i18n] Cannot traverse into "${head}" — expected an object, found ${typeof value}`,
    );
  }

  return resolve(value as Record<string, unknown>, rest);
}

// ---------------------------------------------------------------------------
// `t()` — the primary accessor
//
// Usage:  t('app.name')          → 'GrowUp'
//         t('nav.growth')        → 'Growth'
//
// A missing or mistyped key is a TypeScript error at compile time.
// An unknown key at runtime (e.g. via a dynamic cast) throws a clear error
// rather than returning an empty string — so issues are never silently hidden.
// ---------------------------------------------------------------------------

export function t<K extends CopyKey>(key: K): DotValue<Copy, K> {
  const parts = key.split('.');
  const result = resolve(en as unknown as Record<string, unknown>, parts);
  return result as DotValue<Copy, K>;
}
