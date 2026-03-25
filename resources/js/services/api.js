/*
export async function apiRequest(url, options = {}) {
  const token = localStorage.getItem('token');

  const headers = options.headers || {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  headers['Accept'] = 'application/json';

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API Error');
  }

  return response.json();
}
*/


import { useAuthStore } from '@/stores/auth';

let isRefreshing = false;
let queue = [];

function processQueue(token) {
  queue.forEach(cb => cb(token));
  queue = [];
}

export async function apiRequest(url, options = {}) {
  const auth = useAuthStore();

  const headers = {
    Accept: 'application/json',
    ...(options.headers || {}),
  };

  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  const makeRequest = async (customHeaders = headers) => {
    const response = await fetch(url, {
      ...options,
      headers: customHeaders,
    });

    if (!response.ok) {
      // ⚠️ Gestion spéciale 401 (token expiré)
      if (response.status === 401 && auth.token) {
        return handle401(url, options, customHeaders, auth);
      }

      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'API Error');
    }

    return response.json();
  };

  return makeRequest();
}

// 🔥 Gestion du refresh token
async function handle401(url, options, headers, auth) {

  if (!isRefreshing) {
    isRefreshing = true;

    try {
      const refreshRes = await fetch('/api/refresh', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${auth.token}`,
          Accept: 'application/json',
        },
      });

      if (!refreshRes.ok) throw new Error();

      const data = await refreshRes.json();

      // ✅ même structure que ton backend
      const newToken = data.data.token;

      auth.token = newToken;
      localStorage.setItem('token', newToken);

      processQueue(newToken);

    } catch (e) {
      auth.logout();
      window.location.href = '/login';
      throw new Error('Session expirée');
    } finally {
      isRefreshing = false;
    }
  }

  // 🔁 Attente du refresh
  return new Promise((resolve, reject) => {
    queue.push(async (newToken) => {
      try {
        const newHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        };

        const retry = await fetch(url, {
          ...options,
          headers: newHeaders,
        });

        if (!retry.ok) {
          const error = await retry.json().catch(() => ({}));
          return reject(new Error(error.message || 'API Error'));
        }

        resolve(await retry.json());
      } catch (err) {
        reject(err);
      }
    });
  });
}