import type { Coach } from '../types/models';

/** Prefer profile-by-id; fill gaps from the directory row. */
export function mergeCoachProfile(
  api: Coach | undefined,
  list: Coach | undefined,
): Coach | undefined {
  if (!api && !list) return undefined;
  if (!api) return list;
  if (!list || list.id !== api.id) return api;
  return {
    ...list,
    ...api,
    // Strings/arrays: keep list only when API left them empty.
    category: api.category || list.category,
    categoryCode: api.categoryCode || list.categoryCode,
    bio: api.bio || list.bio,
    tagline: api.tagline || list.tagline,
    tags: api.tags.length ? api.tags : list.tags,
    city: api.city || list.city,
    country: api.country || list.country,
    profilePicUrl: api.profilePicUrl || list.profilePicUrl,
    logoUrl: api.logoUrl || list.logoUrl,
    mobile: api.mobile || list.mobile,
    packages: api.packages?.length ? api.packages : list.packages,
    events: api.events?.length ? api.events : list.events,
    // Numbers from profile-by-id: keep API zeros for clients (happyClientCount) / experience.
    // rating/reviews are not client reviews; keep list numbers only so directory data is not dropped.
    rating: api.rating > 0 ? api.rating : list.rating,
    reviews: api.reviews > 0 ? api.reviews : list.reviews,
    clients: api.clients,
    experience: api.experience > 0 ? api.experience : list.experience,
  };
}
