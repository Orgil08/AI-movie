/**
 * Client authentication helper utilities.
 * Ensures seamless user session persistence across cross-origin iframes,
 * browser refreshes, and third-party cookie restrictions.
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

/**
 * Universal fetch wrapper that attaches 'x-user-id' from localStorage
 * so that authenticated requests always work in iframe environments
 * even when third-party cookies are blocked or partitioned.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const uid = getStoredUserId();
  const headers = new Headers(init.headers || {});
  
  if (uid && !headers.has('x-user-id')) {
    headers.set('x-user-id', uid);
  }

  return fetch(input, {
    ...init,
    headers
  });
}
