/**
 * Shared error-normalisation helper for hook mutations.
 *
 * `useChild`, `useFeeding`, and `useWeights` each wrap repository calls in
 * try/catch and need to coerce an `unknown` caught value into a proper
 * `Error` before storing it in state / re-throwing it. Centralised here so
 * all three hooks share identical error semantics.
 */
export function normaliseError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}
