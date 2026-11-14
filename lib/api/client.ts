import { AUTH_STORAGE_KEY } from '../auth';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || '';

export function getApiAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    const authState = localStorage.getItem(AUTH_STORAGE_KEY);
    if (authState) {
      try {
        const parsed = JSON.parse(authState);
        const token = parsed?.token ?? parsed?.access ?? parsed?.key;
        if (typeof token === 'string' && token) return token;
      } catch (e) {
        console.error('Error parsing auth state:', e);
      }
    }

    return localStorage.getItem('access_token') || localStorage.getItem('token') || null;
  }

  return null;
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = getApiAuthToken();
  const headers = {
    'Content-Type': 'application/json',
    // If token exists, attach DRF Token auth header. If it looks like a Bearer token,
    // client code should still work with DRF TokenAuthentication for local dev.
    ...(token ? { 'Authorization': `Token ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.detail || `HTTP error! status: ${response.status}`);
  }

  // Handle 204 No Content responses (common for DELETE operations)
  if (response.status === 204) {
    return null;
  }

  // For other successful responses, parse the JSON body
  const contentLength = response.headers.get('content-length');
  if (contentLength === '0' || response.status === 205) {
    return null;
  }

  return response.json();
}

export const client = {
  get: (url: string) => fetchWithAuth(url, { method: 'GET' }),
  post: (url: string, data?: any) => fetchWithAuth(url, { 
    method: 'POST', 
    body: data ? JSON.stringify(data) : undefined 
  }),
  put: (url: string, data: any) => fetchWithAuth(url, { 
    method: 'PUT', 
    body: JSON.stringify(data) 
  }),
  patch: (url: string, data: any) => fetchWithAuth(url, { 
    method: 'PATCH', 
    body: JSON.stringify(data) 
  }),
  delete: (url: string) => fetchWithAuth(url, { method: 'DELETE' }),
};