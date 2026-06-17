/** Extracts a short, log-safe message from an unknown thrown/returned error. */
export function describeError(label: string, cause: unknown): string {
  if (cause instanceof Error) return `${label}: ${cause.message}`;
  if (typeof cause === 'object' && cause !== null && 'message' in cause) {
    const message = (cause as { message: unknown }).message;
    if (typeof message === 'string') return `${label}: ${message}`;
  }
  return label;
}
