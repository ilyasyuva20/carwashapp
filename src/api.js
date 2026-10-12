const isLocalhost = typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.startsWith('192.168.')
);

const BASE = isLocalhost ? '/api' : (import.meta.env.VITE_API_URL || '/api');
const FALLBACK_BASE = isLocalhost ? 'http://localhost:4000/api' : '/api';

async function request(path, options = {}) {
  const url = BASE + path;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch (err) {
    if (FALLBACK_BASE && FALLBACK_BASE !== BASE && !path.startsWith('http')) {
      try {
        res = await fetch(FALLBACK_BASE + path, {
          headers: { 'Content-Type': 'application/json' },
          ...options
        });
      } catch (fallbackErr) {
        throw err;
      }
    } else {
      throw err;
    }
  }

  if (!res.ok) {
    if (FALLBACK_BASE && FALLBACK_BASE !== BASE && !path.startsWith('http')) {
      try {
        const fallbackRes = await fetch(FALLBACK_BASE + path, {
          headers: { 'Content-Type': 'application/json' },
          ...options
        });
        if (fallbackRes.ok) {
          const text = await fallbackRes.text();
          return JSON.parse(text);
        }
      } catch (e) {}
    }
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  const text = await res.text();
  return JSON.parse(text);
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  delete: (path) => request(path, { method: 'DELETE' }),
  postForm: async (path, formData) => {
    let res;
    try {
      res = await fetch(BASE + path, { method: 'POST', body: formData });
    } catch (e) {
      if (FALLBACK_BASE && FALLBACK_BASE !== BASE) {
        res = await fetch(FALLBACK_BASE + path, { method: 'POST', body: formData });
      } else {
        throw e;
      }
    }
    if (!res.ok && FALLBACK_BASE && FALLBACK_BASE !== BASE) {
      try {
        const fallbackRes = await fetch(FALLBACK_BASE + path, { method: 'POST', body: formData });
        if (fallbackRes.ok) return fallbackRes.json();
      } catch (e) {}
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  },
  putForm: async (path, formData) => {
    let res;
    try {
      res = await fetch(BASE + path, { method: 'PUT', body: formData });
    } catch (e) {
      if (FALLBACK_BASE && FALLBACK_BASE !== BASE) {
        res = await fetch(FALLBACK_BASE + path, { method: 'PUT', body: formData });
      } else {
        throw e;
      }
    }
    if (!res.ok && FALLBACK_BASE && FALLBACK_BASE !== BASE) {
      try {
        const fallbackRes = await fetch(FALLBACK_BASE + path, { method: 'PUT', body: formData });
        if (fallbackRes.ok) return fallbackRes.json();
      } catch (e) {}
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }
};
