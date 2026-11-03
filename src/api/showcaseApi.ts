import { apiFetch, apiGet, apiPost } from './client';
import { fetchMasterItems } from './masterApi';
import { num, pick, text } from './parse';

export interface PackageItem {
  itemCode?: string | null;
  itemName: string;
  amount: number;
}

export interface ShowcasePackage {
  packageId: number;
  brandCode: string;
  brandName: string;
  packageName: string;
  totalAmount: number;
  /** False when the coach has switched the package off (hidden from the public profile). */
  isActive: boolean;
  items: PackageItem[];
}

export interface CoachPost {
  postId: number;
  categoryCode: string;
  categoryName: string;
  title: string;
  description: string;
  /** yyyy-MM-dd */
  postDate: string;
  location: string;
  /** Only present for the signed-in coach; public reads leave it out. */
  clientCode: string | null;
  clientName: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  consentAccepted: boolean;
}

export interface Showcase {
  packages: ShowcasePackage[];
  posts: CoachPost[];
}

export interface SavePackageInput {
  packageId: number;
  brandCode: string;
  packageName: string;
  totalAmount: number;
  /** Omit to keep the current setting (shown for a new package). */
  isActive?: boolean;
  items: PackageItem[];
}

export interface SavePostInput {
  postId: number;
  categoryCode: string;
  title: string;
  description: string;
  postDate: string;
  location: string;
  clientCode: string;
  mediaUrl: string;
  consentAccepted: boolean;
}

/** A post category with the rules the master describes for it. */
export interface PostCategoryOption {
  code: string;
  label: string;
  requiresClient: boolean;
  requiresConsent: boolean;
}

export interface MasterChoice {
  code: string;
  label: string;
  /** Suggested price from the product master (products only). The coach can change it. */
  price?: number;
  /** Product group (products only), for example WEIGHT MANAGEMENT PRODUCTS. */
  category?: string;
  packSize?: string;
}

export const POST_CATEGORY = {
  gallery: 'GALLERY',
  event: 'EVENT',
  success: 'SUCCESS',
} as const;

/** Document type for a post's photo or video. */
export const POST_MEDIA_DOC_TYPE = 'POST_MEDIA';
/** Same limits as the API (DocumentAppService): photos 5 MB, videos 25 MB. */
export const POST_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const POST_VIDEO_MAX_BYTES = 25 * 1024 * 1024;
export const PACKAGE_MAX_ITEMS = 30;
export const PACKAGE_MAX_AMOUNT = 99_999_999;
export const MAX_PACKAGES = 10;
export const POST_TITLE_MAX = 150;
export const POST_DESCRIPTION_MAX = 1000;
export const POST_LOCATION_MAX = 200;
export const PACKAGE_NAME_MAX = 100;

function mapPackage(raw: unknown): ShowcasePackage {
  const r = (raw ?? {}) as Record<string, unknown>;
  const items = Array.isArray(r.items) ? r.items : [];
  return {
    packageId: num(r.packageId),
    brandCode: text(r.brandCode),
    brandName: text(r.brandName),
    packageName: text(r.packageName),
    totalAmount: num(r.totalAmount),
    isActive: r.isActive !== false,
    items: items.map(item => {
      const i = (item ?? {}) as Record<string, unknown>;
      return {
        itemCode: i.itemCode ? text(i.itemCode) : null,
        itemName: text(i.itemName),
        amount: num(i.amount),
      };
    }),
  };
}

function mapPost(raw: unknown): CoachPost {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    postId: num(r.postId),
    categoryCode: text(r.categoryCode),
    categoryName: text(r.categoryName),
    title: text(r.title),
    description: text(r.description),
    postDate: text(r.postDate).slice(0, 10),
    location: text(r.location),
    clientCode: r.clientCode ? text(r.clientCode) : null,
    clientName: text(r.clientName),
    mediaUrl: text(r.mediaUrl),
    mediaType: r.mediaType === 'video' ? 'video' : 'image',
    consentAccepted: r.consentAccepted === true,
  };
}

// Masters

export async function getPostCategories(): Promise<PostCategoryOption[]> {
  const items = await fetchMasterItems({ ItemType: 'POSTCATEGORY' });
  return items.map(item => ({
    code: item.itemCode,
    label: item.itemName,
    requiresClient: /\bclient\b/.test(item.description ?? ''),
    requiresConsent: /\bconsent\b/.test(item.description ?? ''),
  }));
}

export async function getProductBrands(): Promise<MasterChoice[]> {
  const items = await fetchMasterItems({ ItemType: 'PRODUCTBRAND' });
  return items.map(item => ({ code: item.itemCode, label: item.itemName }));
}

export async function getProductItems(brandCode: string): Promise<MasterChoice[]> {
  if (!brandCode) return [];
  const rows = await apiGet<unknown[] | null>('/Showcase/products', { brandCode });
  return (rows ?? []).map(raw => {
    const r = (raw ?? {}) as Record<string, unknown>;
    return {
      code: text(pick(r, 'itemCode', 'ItemCode')),
      label: text(pick(r, 'itemName', 'ItemName')),
      price: num(pick(r, 'price', 'Price')),
      category: text(pick(r, 'category', 'Category')),
      packSize: text(pick(r, 'packSize', 'PackSize')),
    };
  });
}

// Coach's own packages and posts

export async function getMyPackages(): Promise<ShowcasePackage[]> {
  const rows = await apiGet<unknown[] | null>('/Showcase/packages');
  return (rows ?? []).map(mapPackage);
}

export async function savePackage(input: SavePackageInput): Promise<ShowcasePackage> {
  return mapPackage(await apiPost<unknown>('/Showcase/packages', input));
}

export async function setPackageActive(packageId: number, isActive: boolean): Promise<void> {
  await apiPost(`/Showcase/packages/${packageId}/active`, { isActive });
}

export async function deletePackage(packageId: number): Promise<void> {
  await apiFetch(`/Showcase/packages/${packageId}`, { method: 'DELETE' });
}

export async function getMyPosts(): Promise<CoachPost[]> {
  const rows = await apiGet<unknown[] | null>('/Showcase/posts');
  return (rows ?? []).map(mapPost);
}

export async function savePost(input: SavePostInput): Promise<CoachPost> {
  return mapPost(await apiPost<unknown>('/Showcase/posts', input));
}

export async function deletePost(postId: number): Promise<void> {
  await apiFetch(`/Showcase/posts/${postId}`, { method: 'DELETE' });
}

/** Packages and posts for a public coach page. */
export async function getPublicShowcase(coachCode: string): Promise<Showcase> {
  if (!coachCode) return { packages: [], posts: [] };
  const r = ((await apiGet<unknown>('/Showcase/public', { coachCode })) ?? {}) as Record<
    string,
    unknown
  >;
  return {
    packages: (Array.isArray(r.packages) ? r.packages : []).map(mapPackage),
    posts: (Array.isArray(r.posts) ? r.posts : []).map(mapPost),
  };
}
