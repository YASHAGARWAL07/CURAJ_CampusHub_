/* ── CU Hub API Service ─────────────────────────────────────
   Sends x-session-id header on every request so requireAuth works
─────────────────────────────────────────────────────────── */
const Api = {
  async request(method, url, body, isFormData = false) {
    const headers = {};
    if (!isFormData) headers['Content-Type'] = 'application/json';

    // Attach session token on every request
    const sid = localStorage.getItem('cuhub_token');
    if (sid) headers['x-session-id'] = sid;

    const opts = { method, headers };
    if (body) opts.body = isFormData ? body : JSON.stringify(body);

    const res = await fetch(url, opts);
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try { const j = await res.json(); msg = j.error || j.message || msg; } catch {}
      throw new Error(msg);
    }
    return res.json();
  },
  get:      (url)            => Api.request('GET',    url),
  post:     (url, body)      => Api.request('POST',   url, body),
  postForm: (url, formData)  => Api.request('POST',   url, formData, true),
  upload:   (url, formData)  => Api.request('POST',   url, formData, true),
  put:      (url, body)      => Api.request('PUT',    url, body),
  patch:    (url, body)      => Api.request('PATCH',  url, body),
  delete:   (url)            => Api.request('DELETE', url),
};
