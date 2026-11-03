import { NONE_OPTION } from '../data/lifestyleOptions';

export interface MasterOption {
  code: string;
  label: string;
}

/** Master wire codes that are not LI-style item codes — show a fixed label. */
const WIRE_CODE_LABELS: Record<string, string> = {
  [NONE_OPTION.code]: NONE_OPTION.label,
  NONE_OF_THE_ABOVE: 'None of the above',
};

function looksLikeMasterCode(value: string): boolean {
  return /^[A-Za-z]{2,4}\d{2,}$/.test(value.trim());
}

export function resolveMasterLabel(
  value: string | undefined | null,
  options: MasterOption[],
): string {
  const v = (value ?? '').trim();
  if (!v) return '';

  const wireLabel = WIRE_CODE_LABELS[v.toUpperCase()];
  if (wireLabel) return wireLabel;

  const byCode = options.find(o => o.code === v);
  if (byCode) return byCode.label;
  const byLabel = options.find(o => o.label === v);
  if (byLabel) return byLabel.label;
  if (looksLikeMasterCode(v)) return '';
  return v;
}

/** Comma-separated codes or labels in, human-readable list out. */
export function resolveMasterLabels(
  value: string | undefined | null,
  options: MasterOption[],
): string {
  return (value ?? '')
    .split(',')
    .map(part => resolveMasterLabel(part, options))
    .filter(Boolean)
    .join(', ');
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
