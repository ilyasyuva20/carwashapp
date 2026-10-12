const BASE = import.meta.env.VITE_API_URL || '/api';
const FALLBACK_BASE = 'http://localhost:4000/api';

async function request(path, options = {}) {
  const url = BASE + path;
  let res;
  try {
    res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    });
  } catch (err) {
    if (BASE !== FALLBACK_BASE && !path.startsWith('http')) {
      res = await fetch(FALLBACK_BASE + path, {
        headers: { 'Content-Type': 'application/json' },
        ...options
      });
    } else {
      throw err;
    }
  }

  if (!res.ok) {
    if (res.status === 404 && BASE !== FALLBACK_BASE && !path.startsWith('http')) {
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
      res = await fetch(FALLBACK_BASE + path, { method: 'POST', body: formData });
    }
    if (!res.ok && res.status === 404) {
      res = await fetch(FALLBACK_BASE + path, { method: 'POST', body: formData });
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
      res = await fetch(FALLBACK_BASE + path, { method: 'PUT', body: formData });
    }
    if (!res.ok && res.status === 404) {
      res = await fetch(FALLBACK_BASE + path, { method: 'PUT', body: formData });
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }
};
