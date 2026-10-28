const BookmarksModule = {
  TYPE_LABEL: {
    marketplace: { label: 'Marketplace', badge: 'badge-books', icon: '🛒' },
    events:      { label: 'Event',       badge: 'badge-exam',  icon: '🗓️' },
    notes:       { label: 'Notes/PYQ',   badge: 'badge-dept',  icon: '📚' },
    lostfound:   { label: 'Lost & Found',badge: '',            icon: '🔍' },
  },

  _decode(str) {
    // Decode HTML entities stored in title (from Utils.sanitize)
    if (!str) return '';
    try {
      const txt = document.createElement('textarea');
      txt.innerHTML = str;
      return txt.value;
    } catch { return str; }
  },

  load() {
    const grid = document.getElementById('bookmarksGrid');
    if (!grid) return;
    const bms = JSON.parse(localStorage.getItem('cuhub_bookmarks') || '[]');
    if (!bms.length) {
      grid.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔖</div>
          <p>No bookmarks yet!</p>
          <p style="font-size:.85rem;color:var(--text-muted);margin-top:.5rem">
            Click the 🔖 button on any card in<br>
            Marketplace, Events, Notes, or Lost &amp; Found to save it here.
          </p>
        </div>`;
      return;
    }

    const sorted = [...bms].sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

    // Header with clear all
    const headerHtml = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:.75rem;padding:0 .1rem">
        <span style="font-size:.85rem;color:var(--text-muted)">${bms.length} saved item${bms.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-secondary btn-sm" onclick="BookmarksModule.clearAll(this)" style="font-size:.78rem">🗑 Clear All</button>
      </div>`;

    grid.innerHTML = headerHtml + sorted.map(b => {
      const meta = this.TYPE_LABEL[b.type] || { label: b.type, badge: '', icon: '📌' };
      const key  = b.key || `${b.type}-${b.id}`;
      // Sanitize type — only allow known safe values to prevent localStorage XSS
      const safeType = ['marketplace','events','notes','lostfound'].includes(b.type) ? b.type : 'marketplace';
      const safeKey  = key.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');
      const displayTitle = this._decode(b.title) || 'Untitled';
      return `
        <article class="card bookmark-card">
          <div class="card-img-placeholder" style="height:75px;font-size:2.2rem">${Utils.sanitize(b.emoji || meta.icon)}</div>
          <div class="card-body">
            <div class="card-meta">
              <span class="badge ${meta.badge}">${meta.label}</span>
              <span style="font-size:.75rem;color:var(--text-muted)">Saved ${this._timeAgo(b.savedAt)}</span>
            </div>
            <div class="card-title">${Utils.sanitize(displayTitle)}</div>
            <div class="card-footer">
              <div class="card-actions">
                <button class="btn btn-primary btn-sm" onclick="BookmarksModule._goTo('${safeType}')">Go to ${meta.label}</button>
                <button class="btn btn-secondary btn-sm" onclick="BookmarksModule.remove('${safeKey}', this)">✕ Remove</button>
              </div>
            </div>
          </div>
        </article>`;
    }).join('');
  },

  clearAll(btn) {
    if (btn && btn._confirmPending) {
      btn._confirmPending = false;
      clearTimeout(btn._confirmTimer);
    } else {
      if (btn) {
        btn._confirmPending = true;
        btn.textContent = '🗑 Tap again to confirm';
        btn._confirmTimer = setTimeout(() => {
          btn._confirmPending = false;
          btn.textContent = '🗑 Clear All';
        }, 3000);
      }
      return;
    }
    localStorage.setItem('cuhub_bookmarks', '[]');
    if (typeof updateBookmarkBadge === 'function') updateBookmarkBadge();
    this.load();
    if (typeof showToast === 'function') showToast('All bookmarks have been cleared.', 'info');
  },

  remove(key, btn) {
    let bms = JSON.parse(localStorage.getItem('cuhub_bookmarks') || '[]');
    bms = bms.filter(b => (b.key || `${b.type}-${b.id}`) !== String(key));
    localStorage.setItem('cuhub_bookmarks', JSON.stringify(bms));
    if (typeof updateBookmarkBadge === 'function') updateBookmarkBadge();
    const card = btn?.closest('.bookmark-card');
    if (card) {
      card.style.transition = 'opacity .25s, transform .25s';
      card.style.opacity = '0';
      card.style.transform = 'scale(.95)';
      setTimeout(() => this.load(), 270);
    } else {
      this.load();
    }
    if (typeof showToast === 'function') showToast('Bookmark removed successfully.', 'info');
  },

  _goTo(type) {
    const pageMap = { marketplace: 'marketplace', events: 'events', notes: 'notes', lostfound: 'lost-found' };
    if (typeof Router !== 'undefined') Router.navigate(pageMap[type] || type);
  },

  _timeAgo(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }
};
