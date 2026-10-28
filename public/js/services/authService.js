/* ── CU Hub Auth Service ─────────────────────────────────────
   Server returns session_id (not token). We store it as cuhub_token
   and send it back as x-session-id header (handled in api.js)
─────────────────────────────────────────────────────────── */
const AuthService = {
  getUser()    { try { return JSON.parse(localStorage.getItem('cuhub_user')); } catch { return null; } },
  getToken()   { return localStorage.getItem('cuhub_token'); },
  isLoggedIn() { return !!this.getToken(); },

  setSession(user, sessionId) {
    localStorage.setItem('cuhub_user',  JSON.stringify(user));
    localStorage.setItem('cuhub_token', sessionId);   // store session_id as token
    this._updateUI(user);
    if (typeof updateGreeting === 'function') updateGreeting();
  },

  logout() {
    const token = this.getToken();
    // Always clear local state immediately — don't wait for server
    localStorage.removeItem('cuhub_user');
    localStorage.removeItem('cuhub_token');
    this._updateUI(null);
    if (typeof updateGreeting === 'function') updateGreeting();
    if (typeof showToast === 'function') showToast('Logged out successfully', 'info');
    // Invalidate session on server (fire-and-forget; non-blocking)
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-session-id': token }
      }).catch(() => {});
    }
  },

  requireLogin(cb) {
    if (this.isLoggedIn()) { cb?.(); return true; }
    AuthUI.open('login'); return false;
  },

  _updateUI(user) {
    const nameEl    = document.getElementById('profileName');
    const metaEl    = document.getElementById('profileMeta');
    const ava       = document.getElementById('profAva');
    const mobAva    = document.getElementById('mobProfAva');
    const loginBtn  = document.getElementById('loginNavBtn');
    const logoutBtn = document.getElementById('dropdownLogout');
    const viewProfBtn = document.getElementById('viewProfileBtn');
    const dropCard  = document.getElementById('dropUserCard');
    const dropCardAva  = document.getElementById('dropCardAva');
    const dropCardName = document.getElementById('dropCardName');
    const dropCardMeta = document.getElementById('dropCardMeta');

    if (user) {
      const initials = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
      const SKIP = new Set(['and','of','the','in','for','&']);
      const deptShort = (user.department || '')
        .split(' ')
        .filter(w => w.length > 0 && !SKIP.has(w.toLowerCase()))
        .map(w => w[0])
        .join('')
        .slice(0, 4)
        .toUpperCase() || 'CURAJ';
      const semN = user.semester ? parseInt(user.semester, 10) : 0;
      const yrN  = user.year     ? parseInt(user.year, 10)     : (semN ? Math.ceil(semN / 2) : 0);
      const yr   = yrN ? yrN + (semN ? ` Yr · Sem ${semN}` : ' Year') : '';
      if (nameEl)   nameEl.textContent = user.name || 'Student';
      if (metaEl)   metaEl.textContent = [deptShort, yr].filter(Boolean).join(' · ');
      const avatarUrl = (user.avatar_url || '').trim() || CUAvatar.generate(user.name || 'U', 40);
      function _setAva(el, url, size) {
        if (!el) return;
        el.src = url;
        el.onerror = () => { el.src = CUAvatar.generate(user.name || 'U', size); el.onerror = null; };
      }
      _setAva(ava,    avatarUrl, 40);
      _setAva(mobAva, avatarUrl, 36);
      if (loginBtn)  loginBtn.style.display  = 'none';
      if (logoutBtn) logoutBtn.style.display = 'flex';
      if (viewProfBtn) viewProfBtn.style.display = 'flex';
      // Dropdown user card
      if (dropCard)  { dropCard.classList.add('show'); }
      if (dropCardAva) {
        dropCardAva.src = user.avatar_url ? user.avatar_url : CUAvatar.generate(user.name || 'U', 36);
        dropCardAva.onerror = () => { dropCardAva.src = CUAvatar.generate(user.name || 'U', 36); dropCardAva.onerror = null; };
      }
      if (dropCardName) dropCardName.textContent = user.name || 'Student';
      if (dropCardMeta) dropCardMeta.textContent = [deptShort, yr].filter(Boolean).join(' · ');
    } else {
      if (nameEl)   nameEl.textContent = 'Guest';
      if (metaEl)   metaEl.textContent = 'Click to login';
      const guestUrl   = CUAvatar.generate('G', 40, true);
      const guestUrl36 = CUAvatar.generate('G', 36, true);
      if (ava)    ava.src    = guestUrl;
      if (mobAva) mobAva.src = guestUrl36;
      if (loginBtn)  loginBtn.style.display  = 'flex';
      if (logoutBtn) logoutBtn.style.display = 'none';
      if (viewProfBtn) viewProfBtn.style.display = 'none';
      if (dropCard)  dropCard.classList.remove('show');
    }
  },

  async restoreSession() {
    const token = this.getToken();
    if (!token) { this._updateUI(null); return; }
    // Verify session with server
    try {
      const data = await Api.get('/api/auth/me');
      if (data.user) {
        localStorage.setItem('cuhub_user', JSON.stringify(data.user));
        this._updateUI(data.user);
        if (typeof updateGreeting === 'function') updateGreeting();
      } else {
        // Session expired on server - clear silently (no toast at page load)
        localStorage.removeItem('cuhub_user');
        localStorage.removeItem('cuhub_token');
        this._updateUI(null);
        if (typeof updateGreeting === 'function') updateGreeting();
      }
    } catch {
      // Keep local state if server unreachable
      this._updateUI(this.getUser());
    }
  }
};
