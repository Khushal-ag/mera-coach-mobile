export interface MasterOption {
  code: string;
  label: string;
}

function looksLikeMasterCode(value: string): boolean {
  return /^[A-Za-z]{2,4}\d{2,}$/.test(value.trim());
}

export function resolveMasterLabel(
  value: string | undefined | null,
  options: MasterOption[],
): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  const byCode = options.find(o => o.code === v);
  if (byCode) return byCode.label;
  const byLabel = options.find(o => o.label === v);
  if (byLabel) return byLabel.label;
  if (looksLikeMasterCode(v)) return '';
  return v;
}

/** Prefer itemCode; accept legacy label when options are loaded. */
export function resolveMasterCode(
  value: string | undefined | null,
  options: MasterOption[],
): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  const byCode = options.find(o => o.code === v);
  if (byCode) return byCode.code;
  const byLabel = options.find(o => o.label === v);
  if (byLabel) return byLabel.code;
  return v;
}

export function resolveMasterCodes(values: string[], options: MasterOption[]): string[] {
  return values.map(v => resolveMasterCode(v, options)).filter(Boolean);
}
