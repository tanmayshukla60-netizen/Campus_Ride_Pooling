// frontend/src/api/client.ts

const API_BASE = 'http://127.0.0.1:5000';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
}

export function getToken(): string | null {
  return localStorage.getItem('campus_rides_token');
}

export function setToken(token: string): void {
  localStorage.setItem('campus_rides_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('campus_rides_token');
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  let json: ApiResponse<T>;
  try {
    json = await response.json();
  } catch {
    json = {
      success: false,
      error: {
        code: `HTTP_${response.status}`,
        message: response.status === 401
          ? 'Session expired or please log in to continue.'
          : response.status === 404
          ? 'API route not found on server.'
          : `Server returned error (${response.status})`,
      },
    };
  }

  if (!response.ok || !json.success) {
    const errorMsg = json.error?.message || 'Request failed';
    const err = new Error(errorMsg) as any;
    err.code = json.error?.code || 'UNKNOWN_ERROR';
    err.status = response.status;
    err.details = json.error?.details;
    throw err;
  }

  return json.data as T;
}
