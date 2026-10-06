const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333/api';
const IS_VERCEL_GATEWAY = /\/api\/index\/?$/.test(API_URL);

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export function getToken() { return localStorage.getItem('controle-av-token'); }

function buildApiUrl(path: string) {
  if (!IS_VERCEL_GATEWAY) return `${API_URL}${path}`;

  const clean = path.replace(/^\/+/, '');
  const question = clean.indexOf('?');
  const route = question >= 0 ? clean.slice(0, question) : clean;
  const query = question >= 0 ? clean.slice(question + 1) : '';
  const params = new URLSearchParams(query);
  params.set('_route', route);
  return `${API_URL}?${params.toString()}`;
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!(options.body instanceof FormData) && options.body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(buildApiUrl(path), { ...options, headers });
  if (response.status === 401 && token) window.dispatchEvent(new Event('auth:expired'));
  if (!response.ok) {
    let payload: any = null;
    try { payload = await response.json(); } catch { /* ignore */ }
    throw new ApiError(payload?.message || payload?.error || 'Não foi possível concluir a operação.', response.status, payload);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function assetUrl(path: string | null | undefined) {
  if (!path) return null;
  if (/^(https?:\/\/|data:|blob:)/.test(path)) return path;
  const base = IS_VERCEL_GATEWAY ? '' : API_URL.replace(/\/api\/?$/, '');
  return `${base}${path}`;
}

export async function downloadApiFile(path: string, fallbackName: string) {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(buildApiUrl(path), { headers });
  if (response.status === 401 && token) window.dispatchEvent(new Event('auth:expired'));
  if (!response.ok) {
    let payload: any = null;
    try { payload = await response.json(); } catch { /* ignore */ }
    throw new ApiError(payload?.message || payload?.error || 'Não foi possível baixar o arquivo.', response.status, payload);
  }
  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename="?([^";]+)"?/i);
  const filename = match?.[1] || fallbackName;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
