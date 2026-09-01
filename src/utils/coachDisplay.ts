/** Display-only normalization; does not mutate API/storage values. */
export function formatExpertiseLabel(raw: string): string {
  return raw
    .trim()
    .replace(/`/g, "'")
    .split(/\s+/)
    .map(word => {
      if (!word) return word;
      if (word === '&') return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

function normalizeTagForMatch(value: string): string {
  return value.trim().replace(/`/g, "'").toLowerCase();
}

/** Remove trailing inline tag lists from bio when a dedicated expertise section exists. */
export function stripTrailingTagsFromBio(bio: string, tags: string[]): string {
  if (!bio.trim() || !tags.length) return bio;

  const tagSet = new Set(tags.map(normalizeTagForMatch));
  const matchesTag = (fragment: string): boolean => {
    const norm = normalizeTagForMatch(fragment);
    if (tagSet.has(norm)) return true;
    return [...tagSet].some(tag => tag.includes(norm) || norm.includes(tag));
  };

  const connectorMatch = bio.match(
    /^(.*?)(?:\s+(?:through|including|such as|like|in(?:cluding)?)\s+)(.+)$/is,
  );
  if (!connectorMatch) return bio;

  const [, prefix, suffix] = connectorMatch;
  const parts = suffix
    .split(/\s*,\s*|\s+and\s+/i)
    .map(part => part.trim().replace(/[.,;]+$/, ''))
    .filter(Boolean);

  if (!parts.length || !parts.every(matchesTag)) return bio;

  const cleaned = prefix.trim().replace(/[,.\s]+$/, '');
  return cleaned ? `${cleaned}.` : bio;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Drop a leading "Name is a …" prefix when the card header already shows the name. */
function stripNamePrefixFromBio(bio: string, name: string): string {
  const trimmed = bio.trim();
  const coachName = name.trim();
  if (!trimmed || !coachName) return trimmed;

  const pattern = new RegExp(`^${escapeRegExp(coachName)}\\s*(?:is\\s+(?:a|an|the)\\s+)?`, 'i');
  const stripped = trimmed.replace(pattern, '').trim();
  if (!stripped || stripped === trimmed) return trimmed;
  return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

export function prepareCoachCardBio(bio: string, name: string, tags: string[]): string {
  if (!bio.trim()) return '';
  let result = stripNamePrefixFromBio(bio, name);
  if (tags.length) result = stripTrailingTagsFromBio(result, tags);
  return result.trim();
}

const COACH_CARD_VISIBLE_TAGS = 3;

export function visibleCoachTags(tags: string[], max = COACH_CARD_VISIBLE_TAGS) {
  const visible = tags.slice(0, max);
  const remaining = Math.max(0, tags.length - visible.length);
  return { visible, remaining };
}

export function pluralizeCoaches(count: number): string {
  return count === 1 ? 'coach' : 'coaches';
}
