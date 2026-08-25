const API_BASE = import.meta.env.VITE_API_BASE || `http://${window.location.hostname || '127.0.0.1'}:8000`;

export function getDeviceFingerprint() {
  return {
    user_agent: navigator.userAgent,
    screen_resolution: `${window.screen.width}x${window.screen.height}`,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };
}

export async function apiRequest(
  method: string,
  path: string,
  body?: any,
  skipAuth = false
): Promise<any> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (!skipAuth) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);

  if (response.status === 401 && !skipAuth && !path.includes('/refresh')) {
    // Attempt Token Refresh
    const refreshed = await attemptTokenRefresh();
    if (refreshed) {
      // Retry request with new token
      headers['Authorization'] = `Bearer ${localStorage.getItem('accessToken')}`;
      const retryResponse = await fetch(`${API_BASE}${path}`, options);
      const data = await retryResponse.json();
      if (!retryResponse.ok) {
        throw new Error(data.detail || 'Request failed');
      }
      return data;
    } else {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new Event('auth_change'));
      throw new Error('Session expired. Please log in again.');
    }
  }

  // Handle file downloads/streams (for CSV export)
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('text/csv')) {
    return response; // Return raw response for handle_download
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || 'Request failed');
  }

  return data;
}

async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${refreshToken}`
      }
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
  } catch (e) {
    return false;
  }
}
