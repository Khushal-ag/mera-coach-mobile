import type { CoachPackage } from '../types/models';

export const MAX_COACH_PACKAGES = 5;

export function createEmptyPackage(): CoachPackage {
  return {
    id: `pkg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    price: '',
    duration: '',
    description: '',
  };
}

/** Accept arrays or JSON strings from profile GET/save responses. */
export function parseCoachPackages(raw: unknown): CoachPackage[] {
  const list = coerceList(raw);
  return list
    .map((item, index) => {
      if (!item || typeof item !== 'object') return null;
      const row = item as Record<string, unknown>;
      const name = String(row.name ?? row.title ?? '').trim();
      if (!name) return null;
      return {
        id: String(row.id ?? `pkg_${index}`),
        name,
        price: String(row.price ?? row.priceInr ?? '').trim(),
        duration: String(row.duration ?? row.sessions ?? row.durationOrSessions ?? '').trim(),
        description: String(row.description ?? row.desc ?? '').trim(),
      } satisfies CoachPackage;
    })
    .filter((p): p is CoachPackage => !!p)
    .slice(0, MAX_COACH_PACKAGES);
}

export function validateCoachPackagesDraft(packages: CoachPackage[]): string | null {
  for (let i = 0; i < packages.length; i++) {
    const pkg = packages[i]!;
    const name = pkg.name.trim();
    const hasDetails = pkg.price.trim() || pkg.duration.trim() || pkg.description.trim();
    if (!name && hasDetails) {
      return `Package ${i + 1} needs a name before saving.`;
    }
  }
  return null;
}

export function serializeCoachPackages(packages: CoachPackage[]): CoachPackage[] {
  return packages
    .map(p => ({
      id: p.id || createEmptyPackage().id,
      name: p.name.trim(),
      price: p.price.trim(),
      duration: p.duration.trim(),
      description: p.description.trim(),
    }))
    .filter(p => p.name)
    .slice(0, MAX_COACH_PACKAGES);
}

function coerceList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
