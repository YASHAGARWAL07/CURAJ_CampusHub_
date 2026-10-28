/* ── Lost & Found Module ────────────────────────────────────
   API: GET /api/lost-found → plain array
─────────────────────────────────────────────────────────── */
const LostFoundModule = (() => {
  let all = [];
  const _map = {};

  function clean(val, fallback) {
    if (!val || val === '--' || String(val).trim() === '' || String(val) === 'null' || String(val) === 'undefined') return fallback || '';
    return val;
  }

  async function load() {
    const grid = document.getElementById('lostFoundGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="padding:2rem;color:var(--text-muted);text-align:center">Loading…</div>';
    try {
      const data = await Api.get('/api/lost-found');
      all = Array.isArray(data) ? data : (data.items || []);
    } catch { all = []; }
    render(all, grid);
  }

  function filter(type) {
    const grid = document.getElementById('lostFoundGrid');
    if (!grid) return;
    render(type === 'all' ? all : all.filter(i => i.type === type), grid);
  }

  function render(items, grid) {
    if (!items.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>No lost or found items reported yet.</p></div>';
      return;
    }
    const user = AuthService.getUser();
    items.forEach(i => { _map[i.id] = i; });

    grid.innerHTML = items.map(i => {
      const isOwn  = user && user.id === i.user_id;
      const isOpen = i.status === 'open';
      const lfEmoji = i.type === 'lost' ? '😢' : '😊';
      const saved   = isBookmarked(i.id, 'lostfound');
      const bmTitle = JSON.stringify((i.title || '').trim()).replace(/"/g, '&quot;');
      const bmEmoji = JSON.stringify(lfEmoji).replace(/"/g, '&quot;');
      const location = clean(i.location);
      const contact  = clean(i.contact) || clean(i.reporter_phone);
      const desc     = clean(i.description);
      const reporter = clean(i.reporter_name, 'Student');
      return `
        <article class="card" data-module="lostfound" data-id="${i.id}">
          <span class="lf-type-badge badge-${i.type}">${i.type === 'lost' ? '🔴 LOST' : '🟢 FOUND'}</span>
          ${i.image_url
            ? `<img class="card-img" src="${i.image_url}" alt="${Utils.sanitize(i.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="card-img-placeholder" style="height:80px;display:none">${lfEmoji}</div>`
            : `<div class="card-img-placeholder" style="height:80px">${lfEmoji}</div>`}
          <button class="bookmark-btn ${saved ? 'bookmarked' : ''}" title="${saved ? 'Remove bookmark' : 'Bookmark'}"
            onclick="event.stopPropagation();toggleBookmark(${i.id},'lostfound',${bmTitle},${bmEmoji},this)">🔖</button>
          <div class="card-body">
            <div class="card-title">${Utils.sanitize(i.title)}</div>
            <div style="font-size:.8rem;color:var(--text-muted);margin:.25rem 0">
              👤 ${Utils.sanitize(reporter)} · ${location ? `📍 ${Utils.sanitize(location)} · ` : ''}${Utils.timeAgo(i.created_at)}
            </div>
            ${desc ? `<div class="card-desc">${Utils.sanitize(desc)}</div>` : ''}
            <div class="card-footer">
              <div class="card-actions">
                ${contact
                  ? `<button class="btn btn-${i.type==='found'?'success':'primary'} btn-sm" data-contact="${Utils.sanitize(contact)}" onclick="event.stopPropagation();showToast('📞 Contact: ' + this.dataset.contact, 'info', 6000)">Contact</button>`
                  : `<button class="btn btn-${i.type==='found'?'success':'primary'} btn-sm" onclick="event.stopPropagation();LostFoundModule._openModal(${i.id})">View Details</button>`}
                ${isOwn && isOpen ? `<button class="btn-resolve btn-sm" onclick="event.stopPropagation();LostFoundModule.resolve(${i.id},this)">✓ Mark Resolved</button>` : ''}
              </div>
              ${!isOpen ? '<span class="badge-resolved-card">✓ Resolved</span>' : ''}
            </div>
          </div>
        </article>`;
    }).join('');

    grid.onclick = (e) => {
      const card = e.target.closest('[data-module="lostfound"]');
      if (!card) return;
      if (e.target.closest('button,a')) return;
      const item = _map[card.dataset.id];
      if (item) DetailModal.openLostFound(item);
    };
  }

  function _openModal(id) {
    const item = _map[id];
    if (item) DetailModal.openLostFound(item);
  }

  async function resolve(id, btn) {
    if (btn._confirmPending) {
      btn._confirmPending = false;
      clearTimeout(btn._confirmTimer);
    } else {
      btn._confirmPending = true;
      btn.textContent = 'Tap again to confirm';
      btn._confirmTimer = setTimeout(() => {
        btn._confirmPending = false;
        btn.textContent = '✓ Mark Resolved';
      }, 3000);
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Resolving…'; }
    try {
      await Api.patch(`/api/lost-found/${id}/resolve`);
      showToast('Item marked as resolved. Great job helping the community! 🎉', 'success');
      await load();
    } catch (e) {
      showToast(e.message || 'Unable to update this report. Please try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = '✓ Mark Resolved'; }
    }
  }

  return { load, filter, resolve, _openModal };
})();
