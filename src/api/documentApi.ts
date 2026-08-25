import { ApiError, apiFetch } from './client';

export interface UploadDocumentParams {
  base64DataUrl: string;
  coachCode: string;
  refCode: string;
  refType: string;
  docType: string;
  savedBy: number;
}

/** Returns the stored media path (often relative, e.g. `/document/…`). Pass through resolveMediaUrl for Image. */
export async function uploadDocument(params: UploadDocumentParams): Promise<string> {
  const data = await apiFetch<{ url?: string } | string>('/v{version}/Document/upload', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  const url =
    typeof data === 'string' ? data.trim() : typeof data?.url === 'string' ? data.url.trim() : '';
  if (!url) {
    throw new ApiError('Upload succeeded but no image URL was returned.', 0);
  }
  return url;
}
