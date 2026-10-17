/** Indian rupee amount, whole rupees when possible: ₹2,500. */
export function formatMoney(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

/** Parse a typed amount like "1,200" or "500.50". Returns null when it is not a valid non-negative number. */
export function parseAmount(raw: string): number | null {
  const cleaned = raw.replace(/[,\s₹]/g, '');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  return Number(cleaned);
}
