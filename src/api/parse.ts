/** Read the first defined key from a camelCase / PascalCase ASP.NET payload. */
export function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key] as T;
  }
  return undefined;
}

/** A finite number, else 0, for loosely typed API fields. */
export function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** A string, else '', for loosely typed API fields. */
export function text(value: unknown): string {
  return typeof value === 'string' ? value : value == null ? '' : String(value);
}
