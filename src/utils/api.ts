/**
 * Client authentication helper utilities. User IDs are display hints only;
 * authorization is carried by a signed HttpOnly session cookie.
 */

const STORAGE_KEY = 'ai_movie_uid';

export function getStoredUserId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredUserId(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {}
}

export function clearStoredUserId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

/** Same-origin API wrapper; authentication is carried only by the signed HttpOnly cookie. */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});

  return fetch(input, {
    ...init,
    credentials: 'same-origin',
    headers
  });
}

export interface ApiErrorPayload {
  error?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * Parse an API response without assuming that every server error is JSON.
 * Vercel and reverse proxies can return HTML/text for missing functions.
 */
export async function readApiJson<T extends ApiErrorPayload = ApiErrorPayload>(
  response: Response
): Promise<T> {
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  const body = await response.text();

  if (!contentType.includes('application/json')) {
    const detail = body.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (response.status === 404) {
      throw new Error('API endpoint олдсонгүй (404). Vercel дээр backend API function deploy хийгдсэн эсэхийг шалгана уу.');
    }
    throw new Error(
      `Сервер JSON биш хариу буцаалаа (HTTP ${response.status}).${detail ? ` ${detail}` : ''}`
    );
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error(`Серверийн JSON хариу буруу форматтай байна (HTTP ${response.status}).`);
  }
}

/** Obtain the same-origin CSRF token before a state-changing auth request. */
export async function getCsrfToken(): Promise<string> {
  const response = await fetch('/api/auth/csrf', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store'
  });
  const data = await readApiJson<{ csrfToken?: string; message?: string }>(response);

  if (!response.ok || !data.csrfToken) {
    throw new Error(data.message || 'CSRF token авахад алдаа гарлаа.');
  }

  return data.csrfToken;
}
