interface ValidationErrorBody {
  errors: Record<string, string[]>;
}

interface BusinessErrorEntry {
  errorCode: number;
  errorMessage: string;
}

interface BusinessResponseBody {
  /**
   * Standard envelope: array of business errors. A lone object is accepted defensively.
   * errorCode 0 (or empty) means success; non-zero entries are failures even on HTTP 200.
   */
  errorObj?: BusinessErrorEntry[] | BusinessErrorEntry | null;
  responseObj?: unknown;
  /** Some endpoints return a single business error at the top level. */
  errorCode?: number;
  errorMessage?: string;
}

// 401 responses use ProblemDetails instead of the errorObj wrapper.
interface ProblemDetailsBody {
  title?: string;
  detail?: string;
  status?: number;
}

export type ApiResponseBody = Partial<
  ValidationErrorBody & BusinessResponseBody & ProblemDetailsBody
> | null;

export class ApiError extends Error {
  status: number;
  body: ApiResponseBody;

  constructor(message: string, status: number, body: ApiResponseBody = null) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function isBusinessErrorEntry(value: unknown): value is BusinessErrorEntry {
  if (!value || typeof value !== 'object') return false;
  const entry = value as Partial<BusinessErrorEntry>;
  return entry.errorCode != null || typeof entry.errorMessage === 'string';
}

/** Normalize `errorObj` (array | single object) plus flat top-level fields into entries. */
function businessErrorEntries(body: ApiResponseBody): BusinessErrorEntry[] {
  if (!body) return [];

  const raw = body.errorObj;
  let entries: BusinessErrorEntry[] = [];
  if (Array.isArray(raw)) {
    entries = raw.filter(isBusinessErrorEntry);
  } else if (isBusinessErrorEntry(raw)) {
    entries = [raw];
  }

  if (entries.length === 0 && body.errorCode != null && body.errorCode !== 0) {
    entries = [
      {
        errorCode: body.errorCode,
        errorMessage: typeof body.errorMessage === 'string' ? body.errorMessage : '',
      },
    ];
  }

  return entries.filter(e => e.errorCode != null && Number(e.errorCode) !== 0);
}

function businessErrorCode(body: ApiResponseBody): number | undefined {
  const code = businessErrorEntries(body)[0]?.errorCode;
  return code != null && Number(code) !== 0 ? Number(code) : undefined;
}

/** Join non-empty `errorMessage` values from the business envelope (source of truth: errorObj[0]+). */
function rawBusinessErrorMessage(body: ApiResponseBody): string | undefined {
  const messages = businessErrorEntries(body)
    .map(e => (typeof e.errorMessage === 'string' ? e.errorMessage.trim() : ''))
    .filter(Boolean);
  if (messages.length === 0) return undefined;
  // De-dupe while preserving order (APIs sometimes repeat the same phrase).
  return [...new Set(messages)].join('. ');
}

/**
 * Map API / thrown errors to coach-facing copy for Alerts, banners, and empty states.
 * Prefer a cleaned backend `errorMessage` over jargon; never surface stack traces or JSON dumps.
 */
export function toUserMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (error instanceof ApiError) {
    // Prefer re-reading the envelope so UI never shows raw errorObj arrays/JSON.
    const fromBody = extractErrorMessage(error.body, error.status);
    if (fromBody) return fromBody;
    return (
      mapToUserFacingMessage(error.message, error.status, businessErrorCode(error.body)) || fallback
    );
  }
  if (error instanceof Error && error.message.trim()) {
    return mapToUserFacingMessage(error.message) || fallback;
  }
  return fallback;
}

/** Alias kept for existing screen call sites; same as `toUserMessage`. */
export function getErrorMessage(error: unknown, fallback: string): string {
  return toUserMessage(error, fallback);
}

/** Strip opaque internals and map common backend phrases to readable copy. */
export function mapToUserFacingMessage(message: string, status = 0, errorCode?: number): string {
  const trimmed = message.trim();
  if (!trimmed) return '';

  // Never show stack traces or raw JSON / array dumps.
  if (/\n\s+at\s+/.test(trimmed) || /stack trace/i.test(trimmed)) {
    return 'Something went wrong on the server. Please try again.';
  }
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    return '';
  }

  if (/key was not present in the dictionary/i.test(trimmed)) {
    return 'Something went wrong generating the plan. Check the client details and try again.';
  }
  if (/^object reference not set/i.test(trimmed) || /nullreferenceexception/i.test(trimmed)) {
    return 'Something went wrong on the server. Please try again.';
  }

  const lower = trimmed.toLowerCase();

  // Login / credentials (message first: backend often uses errorCode 401 for "Invalid User").
  if (
    lower === 'invalid user' ||
    lower === 'invalid username' ||
    lower === 'invalid password' ||
    lower === 'invalid credentials' ||
    lower === 'user not found' ||
    lower.includes('invalid user')
  ) {
    return 'Invalid email or password. Please try again.';
  }

  if (
    lower === 'unauthorized' ||
    lower.includes('token expired') ||
    lower.includes('session expired') ||
    lower.includes('access denied') ||
    (lower.includes('jwt') && lower.includes('expired'))
  ) {
    return 'Your session has expired. Please sign in again.';
  }

  // HTTP/business 401 without a more specific phrase (stale token, empty body, etc.).
  // Do not override credentials copy or other readable messages on a second pass.
  if (
    (status === 401 || errorCode === 401) &&
    (!trimmed || lower === 'unauthorized' || lower.startsWith('request failed'))
  ) {
    return 'Your session has expired. Please sign in again.';
  }

  if (
    (status === 403 || errorCode === 403) &&
    (!trimmed || lower === 'forbidden' || lower.startsWith('request failed'))
  ) {
    return 'You do not have permission to do that.';
  }

  if (
    (status === 404 || errorCode === 404) &&
    (!trimmed || lower === 'not found' || lower.startsWith('request failed'))
  ) {
    return 'We could not find what you were looking for.';
  }

  if (
    (status >= 500 || (errorCode != null && errorCode >= 500)) &&
    (!trimmed || lower.startsWith('request failed'))
  ) {
    return 'Something went wrong on the server. Please try again.';
  }

  return trimmed;
}

// Backend uses 3 error shapes: field validation errors, {errorObj, responseObj} business
// responses, and ProblemDetails for 401s. Check each in turn.
export function extractErrorMessage(body: ApiResponseBody, httpStatus: number): string | null {
  if (!body) return null;
  if (body.errors) {
    const firstField = Object.keys(body.errors)[0];
    const raw = firstField ? (body.errors[firstField]?.[0] ?? null) : null;
    return raw ? mapToUserFacingMessage(raw, httpStatus) : null;
  }

  const businessMessage = rawBusinessErrorMessage(body);
  const code = businessErrorCode(body);
  if (businessMessage || code != null) {
    return (
      mapToUserFacingMessage(businessMessage || '', httpStatus, code) ||
      (code != null ? mapToUserFacingMessage(`Request failed (${code})`, httpStatus, code) : null)
    );
  }

  if (body.detail || body.title) {
    return mapToUserFacingMessage(body.detail || body.title || '', httpStatus, body.status);
  }
  return null;
}
