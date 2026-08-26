import { ApiError, apiGet, apiPost } from './client';

export interface UploadDocumentParams {
  base64DataUrl: string;
  coachCode: string;
  refCode: string;
  refType: string;
  docType: string;
  savedBy: number;
}

export interface UploadDocumentResult {
  url: string;
  docId?: number;
}

/** Stored path is often relative (e.g. `/document/…`); pass through resolveMediaUrl for Image. */
export async function uploadDocument(params: UploadDocumentParams): Promise<string> {
  const result = await uploadDocumentWithMeta(params);
  return result.url;
}

/** Like uploadDocument, plus docId when the API includes it (progress-photo uploads). */
export async function uploadDocumentWithMeta(
  params: UploadDocumentParams,
): Promise<UploadDocumentResult> {
  const data = await apiPost<{ url?: string; docId?: number } | string>(
    '/v{version}/Document/upload',
    params,
  );
  if (typeof data === 'string') {
    const url = data.trim();
    if (!url) throw new ApiError('Upload succeeded but no image URL was returned.', 0);
    return { url };
  }
  const url = typeof data?.url === 'string' ? data.url.trim() : '';
  if (!url) {
    throw new ApiError('Upload succeeded but no image URL was returned.', 0);
  }
  const docId = typeof data.docId === 'number' ? data.docId : undefined;
  return { url, docId };
}

export interface DocumentListItem {
  docId: number;
  filePath: string;
  /** Display-ready create date from the API when present. */
  fcdt?: string;
}

export interface ListDocumentsParams {
  coachCode: string;
  refCode: string;
  refType: string;
  docType: string;
}

export async function listDocuments(params: ListDocumentsParams): Promise<DocumentListItem[]> {
  const data = await apiGet<{ docId?: number; filePath?: string; fcdt?: string }[] | null>(
    '/v{version}/Document/list',
    {
      coachCode: params.coachCode,
      refCode: params.refCode,
      refType: params.refType,
      docType: params.docType,
    },
  );
  return (data ?? [])
    .map(item => ({
      docId: item.docId ?? 0,
      filePath: item.filePath ?? '',
      fcdt: item.fcdt,
    }))
    .filter(item => item.docId > 0 && item.filePath);
}

export interface DeleteDocumentParams {
  docId: number;
  coachCode: string;
}

export async function deleteDocument(params: DeleteDocumentParams): Promise<void> {
  await apiPost('/v{version}/Document/delete', params);
}
