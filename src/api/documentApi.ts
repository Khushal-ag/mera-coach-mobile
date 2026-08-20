import { apiFetch } from './client';

export interface UploadDocumentParams {
  base64DataUrl: string;
  coachCode: string;
  refCode: string;
  refType: string;
  docType: string;
  savedBy: number;
}

export async function uploadDocument(params: UploadDocumentParams): Promise<string> {
  const data = await apiFetch<{ url?: string }>('/v{version}/Document/upload', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return data?.url ?? '';
}
