/**
 * Client authentication helper utilities.
 * Authorization is carried by a signed HttpOnly session cookie AND backed by
 * the same cryptographically signed session token in Authorization header
 * so mobile browsers / in-app webviews / iframes that evict cookies never lose session state.
 */

const STORAGE_KEY = 'ai_movie_uid';
const SESSION_TOKEN_KEY = 'ai_movie_session_token';

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

export function getStoredSessionToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionToken(token: string | null | undefined): void {
  if (typeof window === 'undefined' || !token) return;
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {}
}

export function clearStoredUserId(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {}
}

/** Same-origin API wrapper; sends both cookies and signed Bearer session token for mobile resilience. */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const token = getStoredSessionToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (token && !headers.has('x-session-token')) {
    headers.set('x-session-token', token);
  }

  return fetch(input, {
    ...init,
    credentials: 'include',
    headers
  });
}

/** Mobile-safe clipboard helper with textarea fallback for iOS/Android webviews. */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to legacy textarea copy for mobile webviews
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
  } catch {
    return false;
  }
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
    credentials: 'include',
    cache: 'no-store'
  });
  const data = await readApiJson<{ csrfToken?: string; message?: string }>(response);

  if (!response.ok || !data.csrfToken) {
    throw new Error(data.message || 'CSRF token авахад алдаа гарлаа.');
  }

  return data.csrfToken;
}

