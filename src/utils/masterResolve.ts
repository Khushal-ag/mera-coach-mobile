export interface MasterOption {
  code: string;
  label: string;
}

/** Map a stored master code (or already-human label) to the display name. */
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
  return v;
}

/** Normalize a stored code or legacy label to the master itemCode for form state / save. */
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

/** Normalize a CSV/multi-select list of codes or legacy labels to itemCodes. */
export function resolveMasterCodes(values: string[], options: MasterOption[]): string[] {
  return values.map(v => resolveMasterCode(v, options)).filter(Boolean);
}
