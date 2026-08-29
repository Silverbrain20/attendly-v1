/// <reference types="vite/client" />
const PRIMARY_API = import.meta.env.VITE_API_BASE || `http://${window.location.hostname || '127.0.0.1'}:8000`;
const FALLBACK_API = import.meta.env.VITE_API_FALLBACK || 'https://attendly-v1.onrender.com';

async function fetchWithFailover(path: string, options: RequestInit): Promise<Response> {
  try {
    const res = await fetch(`${PRIMARY_API}${path}`, options);
    if (res.status >= 502 && res.status <= 504) {
      throw new Error(`Primary server status ${res.status}`);
    }
    return res;
  } catch (err) {
    if (FALLBACK_API && FALLBACK_API !== PRIMARY_API && !PRIMARY_API.includes('localhost') && !PRIMARY_API.includes('127.0.0.1')) {
      console.warn(`Primary API unreachable, falling back to secondary backup: ${FALLBACK_API}`);
      return await fetch(`${FALLBACK_API}${path}`, options);
    }
    throw err;
  }
}

import { getDeviceId } from './pwa';

export function getDeviceFingerprint() {
  return {
    device_id: getDeviceId(),
    user_agent: navigator.userAgent,
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export async function apiRequest(
  method: string,
  path: string,
  body?: any,
  skipAuth = false
): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (!skipAuth) {
    const token = localStorage.getItem('accessToken');
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  const options: RequestInit = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetchWithFailover(path, options);

  if (response.status === 401 && !skipAuth && !path.includes('/refresh')) {
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
      const retryResponse = await fetchWithFailover(path, options);
      const data = await retryResponse.json();
      if (!retryResponse.ok) throw new Error(data.detail || 'Request failed');
      return data;
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth_change'));
      throw new Error('Session expired. Please log in again.');
    }
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('text/csv')) return response;

  const data = await response.json();
  if (!response.ok) {
    let msg = 'Request failed';
    if (typeof data.detail === 'string') {
      msg = data.detail;
    } else if (Array.isArray(data.detail)) {
      msg = data.detail.map((item: any) => {
        if (typeof item === 'string') return item;
        const field = item.loc ? item.loc.slice(1).join('.') : '';
        return field ? `${field}: ${item.msg}` : item.msg || JSON.stringify(item);
      }).join('; ');
    } else if (data.detail && typeof data.detail === 'object') {
      msg = data.detail.msg || JSON.stringify(data.detail);
    } else if (data.message) {
      msg = data.message;
    }
    throw new Error(msg);
  }

  return data;
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await fetchWithFailover('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`,
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.access_token && data.refresh_token) {
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export async function downloadFile(path: string, fallbackFilename: string) {
  const token = localStorage.getItem('accessToken');
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetchWithFailover(path, { headers });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Failed to download file');
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;

  const disposition = response.headers.get('Content-Disposition');
  let filename = fallbackFilename;
  if (disposition && disposition.includes('filename=')) {
    filename = disposition.split('filename=')[1].replace(/"/g, '');
  }

  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
