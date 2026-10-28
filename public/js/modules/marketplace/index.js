/* ── Marketplace Module ─────────────────────────────────────
   API: GET /api/marketplace → plain array
─────────────────────────────────────────────────────────── */
const MarketplaceModule = (() => {
  let all = [];
  const _map = {};  // id → item, for click lookup

  const CAT_EMOJI  = { books:'📚', electronics:'💻', stationery:'✏️', furniture:'🪑', clothing:'👕', sports:'⚽', other:'📦' };
  const COND_LABEL = { 'like-new':'Like New', good:'Good', fair:'Fair', poor:'Poor' };

  function clean(val, fallback) {
    if (!val || val === '--' || String(val).trim() === '' || String(val) === 'null' || String(val) === 'undefined') return fallback || '';
    return val;
  }

  async function load() {
    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="padding:2rem;color:var(--text-muted);text-align:center">Loading…</div>';
    try {
      const data = await Api.get('/api/marketplace');
      all = Array.isArray(data) ? data : (data.items || []);
    } catch { all = []; }
    render(all, grid);
  }

  function filter(cat) {
    const grid = document.getElementById('marketplaceGrid');
    if (!grid) return;
    render(cat === 'all' ? all : all.filter(i => i.category === cat), grid);
  }

  function render(items, grid) {
    if (!items.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><p>No items listed yet. Be the first to sell something!</p></div>';
      return;
    }
    const user = AuthService.getUser();
    // populate lookup map
    items.forEach(i => { _map[i.id] = i; });

    grid.innerHTML = items.map(i => {
      const emoji  = CAT_EMOJI[i.category] || '📦';
      const cond   = COND_LABEL[i.condition] || clean(i.condition);
      const isOwn  = user && user.id === i.user_id;
      const saved  = isBookmarked(i.id, 'marketplace');
      const dept   = clean(i.department);
      const bmTitle = JSON.stringify((i.title || '').trim()).replace(/"/g, '&quot;');
      const bmEmoji = JSON.stringify(emoji).replace(/"/g, '&quot;');
      const seller = clean(i.seller_name, 'Student');
      const contact = clean(i.contact) || clean(i.seller_phone);
      const desc   = clean(i.description);
      return `
        <article class="card" data-module="marketplace" data-id="${i.id}">
          ${i.image_url ? `<img class="card-img" src="${Utils.sanitize(i.image_url)}" alt="${Utils.sanitize(i.title)}" loading="lazy" onerror="var p=this.parentElement;if(p){var ph=p.querySelector('.card-img-placeholder');if(ph)ph.style.display='flex';}this.remove();">` : ''}
          <div class="card-img-placeholder" style="${i.image_url ? 'display:none' : ''}">${emoji}</div>
          <button class="bookmark-btn ${saved ? 'bookmarked' : ''}" title="${saved ? 'Remove bookmark' : 'Bookmark'}"
            onclick="event.stopPropagation();toggleBookmark(${i.id},'marketplace',${bmTitle},${bmEmoji},this)">🔖</button>
          <div class="card-body">
            <div class="card-meta">
              <span class="badge badge-${i.category}">${i.category || 'other'}</span>
              ${cond ? `<span class="badge">${cond}</span>` : ''}
              ${dept ? `<span class="badge badge-dept">${dept.split(' ')[0]}</span>` : ''}
            </div>
            <div class="card-title">${Utils.sanitize(i.title)}</div>
            ${desc ? `<div class="card-desc">${Utils.sanitize(desc)}</div>` : ''}
            <div class="card-footer">
              <span class="price">${Utils.formatPrice(i.price)}</span>
              <div class="card-actions">
                ${contact || seller ? `<button class="btn btn-primary btn-sm" data-contact="${Utils.sanitize(contact||seller)}" data-dept="${Utils.sanitize(dept)}" onclick="event.stopPropagation();const c=this.dataset.contact,d=this.dataset.dept;showToast('📞 Contact: ' + c + (d ? '  ·  ' + d : ''), 'info', 6000)">Contact Seller</button>` : ''}
                ${isOwn ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();MarketplaceModule.remove(${i.id},this)">Remove</button>` : ''}
              </div>
            </div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:.25rem">by ${Utils.sanitize(seller)} · ${Utils.timeAgo(i.created_at)}</div>
          </div>
        </article>`;
    }).join('');

    // event delegation for card clicks
    grid.onclick = (e) => {
      const card = e.target.closest('[data-module="marketplace"]');
      if (!card) return;
      if (e.target.closest('button,a')) return;
      const item = _map[card.dataset.id];
      if (item) DetailModal.openMarketplace(item);
    };
  }

  async function remove(id, btn) {
    if (btn._confirmPending) {
      btn._confirmPending = false;
      clearTimeout(btn._confirmTimer);
      btn.disabled = true; btn.textContent = 'Removing…';
    } else {
      btn._confirmPending = true;
      btn.textContent = 'Tap again to confirm';
      btn._confirmTimer = setTimeout(() => {
        btn._confirmPending = false;
        btn.textContent = 'Remove';
      }, 3000);
      return;
    }
    try {
      await Api.delete(`/api/marketplace/${id}`);
      showToast('Your listing has been removed successfully.', 'success');
      await load();
    } catch (e) {
      showToast(e.message || 'Unable to remove the listing. Please try again.', 'error');
      btn.disabled = false; btn.textContent = 'Remove';
    }
  }

  return { load, filter, remove };
})();
