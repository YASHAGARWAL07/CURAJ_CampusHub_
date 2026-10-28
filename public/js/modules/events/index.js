/* ── Events Module ─────────────────────────────────────────
   API: GET /api/events → plain array
─────────────────────────────────────────────────────────── */
const EventsModule = (() => {
  let all = [];
  const _map = {};

  const CAT_EMOJI = {
    workshop:'🔧', hackathon:'💻', seminar:'🎤', talk:'💬',
    club:'👥', sports:'⚽', cultural:'🎭', tech:'🖥️', event:'🗓️', other:'📌'
  };

  function clean(val, fallback) {
    if (!val || val === '--' || String(val).trim() === '' || String(val) === 'null' || String(val) === 'undefined') return fallback || '';
    return val;
  }

  async function load() {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    grid.innerHTML = '<div style="padding:2rem;color:var(--text-muted);text-align:center">Loading…</div>';
    try {
      const data = await Api.get('/api/events');
      all = Array.isArray(data) ? data : (data.items || []);
    } catch { all = []; }
    render(all, grid);
  }

  function filter(cat) {
    const grid = document.getElementById('eventsGrid');
    if (!grid) return;
    render(cat === 'all' ? all : all.filter(i => i.category === cat), grid);
  }

  function render(items, grid) {
    if (!items.length) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🗓️</div><p>No upcoming events. Post one to get started!</p></div>';
      return;
    }
    const user = AuthService.getUser();
    items.forEach(i => { _map[i.id] = i; });

    grid.innerHTML = items.map(i => {
      const emoji     = CAT_EMOJI[i.category] || '🗓️';
      const isPast    = new Date(i.event_date) < new Date(new Date().toDateString());
      const statusBadge = isPast
        ? `<span class="badge" style="background:rgba(156,163,175,.15);color:var(--text-muted)">PAST</span>`
        : `<span class="badge badge-exam">UPCOMING</span>`;
      const isOwn     = user && user.id === i.user_id;
      const saved     = isBookmarked(i.id, 'events');
      const bmTitle   = JSON.stringify((i.title || '').trim()).replace(/"/g, '&quot;');
      const bmEmoji   = JSON.stringify(emoji).replace(/"/g, '&quot;');
      const venue     = clean(i.venue);
      const organizer = clean(i.organizer);
      const contact   = clean(i.contact) || clean(i.poster_phone);
      const desc      = clean(i.description);
      const poster    = clean(i.organizer_name, 'Student');
      return `
        <article class="card" data-module="events" data-id="${i.id}">
          ${i.image_url
            ? `<img class="card-img" src="${i.image_url}" alt="${Utils.sanitize(i.title)}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="card-img-placeholder" style="height:90px;font-size:2.5rem;display:none">${emoji}</div>`
            : `<div class="card-img-placeholder" style="height:90px;font-size:2.5rem">${emoji}</div>`}
          <button class="bookmark-btn ${saved ? 'bookmarked' : ''}" title="${saved ? 'Remove bookmark' : 'Bookmark'}"
            onclick="event.stopPropagation();toggleBookmark(${i.id},'events',${bmTitle},${bmEmoji},this)">🔖</button>
          <div class="card-body">
            <div class="card-meta">
              <span class="badge">${i.category || 'event'}</span>
              ${statusBadge}
            </div>
            <div class="card-title">${Utils.sanitize(i.title)}</div>
            <div style="font-size:.8rem;color:var(--text-muted);margin:.3rem 0;line-height:1.6">
              📅 ${Utils.formatDate(i.event_date)}${i.event_time ? ' · ⏰ ' + Utils.sanitize(i.event_time) : ''}
              ${venue ? `<br>📍 ${Utils.sanitize(venue)}` : ''}
              ${organizer ? `<br>👤 ${Utils.sanitize(organizer)}` : ''}
            </div>
            ${desc ? `<div class="card-desc">${Utils.sanitize(desc)}</div>` : ''}
            <div class="card-footer">
              <div class="card-actions">
                ${i.registration_link && /^https?:\/\//i.test(i.registration_link)
                  ? `<a href="${Utils.safeHref(i.registration_link)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm" onclick="event.stopPropagation()">Register →</a>`
                  : `<button class="btn btn-primary btn-sm" onclick="event.stopPropagation();EventsModule._openModal(${i.id})">Details</button>`}
                ${contact ? `<button class="btn btn-secondary btn-sm" data-contact="${Utils.sanitize(contact)}" onclick="event.stopPropagation();showToast('📞 Contact: ' + this.dataset.contact, 'info', 6000)">Contact</button>` : ''}
                ${isOwn ? `<button class="btn btn-danger btn-sm" onclick="event.stopPropagation();EventsModule.cancel(${i.id},this)">Cancel</button>` : ''}
              </div>
            </div>
            <div style="font-size:.78rem;color:var(--text-muted);margin-top:.25rem">Posted by ${Utils.sanitize(poster)} · ${Utils.timeAgo(i.created_at)}</div>
          </div>
        </article>`;
    }).join('');

    grid.onclick = (e) => {
      const card = e.target.closest('[data-module="events"]');
      if (!card) return;
      if (e.target.closest('button,a')) return;
      const item = _map[card.dataset.id];
      if (item) DetailModal.openEvent(item);
    };
  }

  function _openModal(id) {
    const item = _map[id];
    if (item) DetailModal.openEvent(item);
  }

  async function cancel(id, btn) {
    if (btn._confirmPending) {
      btn._confirmPending = false;
      clearTimeout(btn._confirmTimer);
    } else {
      btn._confirmPending = true;
      btn.textContent = 'Tap again to confirm';
      btn._confirmTimer = setTimeout(() => {
        btn._confirmPending = false;
        btn.textContent = 'Cancel';
      }, 3000);
      return;
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Cancelling…'; }
    try {
      await Api.delete(`/api/events/${id}`);
      showToast('Your event has been cancelled successfully.', 'success');
      await load();
    } catch (e) {
      showToast(e.message || 'Unable to cancel the event. Please try again.', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Cancel'; }
    }
  }

  return { load, filter, cancel, _openModal };
})();
