/** A finite number, else 0, for loosely typed API fields. */
export function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** A string, else '', for loosely typed API fields. */
export function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}
