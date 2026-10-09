const BASE = import.meta.env.VITE_API_URL || '/api';

async function request(path, options = {}) {
  const t0 = Date.now();
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  const text = await res.text();
  // #region agent log
  fetch('http://127.0.0.1:7618/ingest/e176f1cd-2325-4489-82d4-cb737f29d94a',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'fee15e'},body:JSON.stringify({sessionId:'fee15e',runId:'pre-fix',hypothesisId:'D',location:'api.js:request',message:'frontend api request',data:{path,ms:Date.now()-t0,bytes:text.length,method:options.method||'GET'},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  return JSON.parse(text);
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' }),
  delete: (path) => request(path, { method: 'DELETE' }),
  postForm: async (path, formData) => {
    const res = await fetch(BASE + path, {
      method: 'POST',
      body: formData
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  },
  putForm: async (path, formData) => {
    const res = await fetch(BASE + path, {
      method: 'PUT',
      body: formData
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Request failed: ${res.status}`);
    }
    return res.json();
  }
};
