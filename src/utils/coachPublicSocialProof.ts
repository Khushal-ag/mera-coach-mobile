import type { IoniconName } from '../types/icons';

/**
 * No coach-specific testimonials API; website hardcodes sample clients — do not copy those.
 * Derive highlights from happyClientCount, experience, tagline/bio, and services.
 */

interface CoachSuccessHighlight {
  id: string;
  badge: string;
  icon: IoniconName;
  body: string;
}

function truncate(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trimEnd()}…`;
}

export function buildCoachSuccessHighlights(
  coach: {
    name: string;
    clients: number;
    experience: number;
    bio: string;
    tagline?: string;
    tags: string[];
    category: string;
  },
  opts?: {
    /** Stats strip already shows client count. */
    skipClients?: boolean;
    /** Stats strip already shows years of experience. */
    skipExperience?: boolean;
    /** Bio is shown in the profile hero. */
    skipBio?: boolean;
    /** Dedicated expertise section lists services/tags. */
    skipTags?: boolean;
  },
): CoachSuccessHighlight[] {
  const items: CoachSuccessHighlight[] = [];

  if (coach.clients > 0 && !opts?.skipClients) {
    items.push({
      id: 'clients',
      badge: `${coach.clients}+ happy clients`,
      icon: 'people-outline',
      body: `${coach.name} has worked with ${coach.clients}+ clients on their wellness goals.`,
    });
  }

  if (coach.experience > 0 && !opts?.skipExperience) {
    const focus = coach.category ? ` in ${coach.category}` : '';
    items.push({
      id: 'experience',
      badge: `${coach.experience}+ years experience`,
      icon: 'ribbon-outline',
      body: `${coach.experience}+ years coaching${focus}.`,
    });
  }

  const tagline = coach.tagline?.trim();
  if (tagline) {
    items.push({
      id: 'tagline',
      badge: 'Coach focus',
      icon: 'bulb-outline',
      body: tagline,
    });
  } else if (coach.bio.trim() && !opts?.skipBio) {
    items.push({
      id: 'bio',
      badge: 'Coach approach',
      icon: 'chatbubble-ellipses-outline',
      body: truncate(coach.bio, 200),
    });
  }

  if (!opts?.skipTags) {
    for (const tag of coach.tags.slice(0, 2)) {
      items.push({
        id: `svc-${tag}`,
        badge: 'Specialises in',
        icon: 'medal-outline',
        body: `${tag} listed among this coach's services.`,
      });
    }
  }

  return items;
}
