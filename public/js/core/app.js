/* ── CU Hub App Core v5.2 ───────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  CUAvatar.initGuest();

  // Dev avatar fallback — if photo.jpeg fails, show the person silhouette
  const devAvaFallback = document.getElementById('devAvaFallback');
  if (devAvaFallback) {
    const fallbackImg = document.createElement('img');
    fallbackImg.src = CUAvatar.generate('G', 40, true);
    fallbackImg.style.cssText = 'width:100%;height:100%;border-radius:50%';
    devAvaFallback.appendChild(fallbackImg);
  }
  initSidebar();
  initSearch();
  initNotifications();
  initProfileDropdown();
  initNavDelegation();
  initAIPopup();
  updateGreeting();
  loadDashboardStats();
  initRatingWidget();
  Router.navigate('dashboard');
  setTimeout(checkProfileCompletion, 1500); // check after session restores
  updateBookmarkBadge(); // initialise badge count from localStorage
});

/* ── Greeting ─────────────────────────────────────────────── */
function updateGreeting() {
  const h = new Date().getHours();
  const user = AuthService.getUser();
  const name = user ? user.name.split(' ')[0] : 'there';
  let part, emoji;
  if (h < 12)      { part = 'Morning';   emoji = '☀️'; }
  else if (h < 17) { part = 'Afternoon'; emoji = '🌤️'; }
  else             { part = 'Evening';   emoji = '🌙'; }
  const el  = document.getElementById('greetingTitle');
  const sub = document.getElementById('greetingSub');
  if (el && (!Router.current() || Router.current() === 'dashboard')) {
    // Use textContent for name to prevent XSS if localStorage is tampered with
    el.textContent = '';
    const textNode = document.createTextNode(`Good ${part}, ${name} `);
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = emoji;
    el.appendChild(textNode);
    el.appendChild(emojiSpan);
    if (sub) sub.textContent = 'Your campus hub awaits';
  }
}

/* ── Dashboard Stats — uses /api/stats endpoint ─────────── */
async function loadDashboardStats() {
  const set = (id, val) => {
    const e = document.getElementById(id);
    if (e) { e.textContent = val; e.style.opacity = '1'; }
  };
  set('statMarket', '—'); set('statLF', '—'); set('statNotes', '—'); set('statEvents', '—');
  try {
    const s = await Api.get('/api/stats');
    if (s.marketplace !== undefined) set('statMarket', s.marketplace);
    if (s.lost_found  !== undefined) set('statLF',     s.lost_found);
    if (s.notes       !== undefined) set('statNotes',  s.notes);
    if (s.events      !== undefined) set('statEvents', s.events);
  } catch {
    /* keep dashes — server may not be running */
  }
}

/* ── Profile Completion Nudge ─────────────────────────────── */
function checkProfileCompletion() {
  const user = AuthService.getUser();
  if (!user) return;
  const prog = (user.program || '').trim();
  const progMissing = !prog || /^[-\u2013\u2014\s]+$/.test(prog) || prog.toLowerCase() === 'null' || /^\d+$/.test(prog);
  const existingBanner = document.getElementById('profileNudgeBanner');
  if (existingBanner) existingBanner.remove();
  if (!progMissing) return;
  const banner = document.createElement('div');
  banner.id = 'profileNudgeBanner';
  banner.style.cssText = `
    background: linear-gradient(90deg, rgba(91,95,199,.15), rgba(99,102,241,.1));
    border: 1.5px solid rgba(91,95,199,.3);
    border-radius: 10px;
    padding: .65rem 1rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: .75rem;
    font-size: .85rem;
    color: var(--text);
  `;
  banner.innerHTML = `
    <span style="font-size:1.1rem">✏️</span>
    <span style="flex:1">Your <strong>program</strong> isn't set yet — set it so your notes and PYQs are personalised.</span>
    <button onclick="ProfileModal.open();setTimeout(()=>document.getElementById('pmEditBtn')?.click(),300);document.getElementById('profileNudgeBanner')?.remove()"
      style="background:var(--primary);color:#fff;border:none;border-radius:7px;padding:.35rem .85rem;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap">
      Set Program →
    </button>
    <button onclick="this.closest('#profileNudgeBanner').remove()"
      style="background:none;border:none;color:var(--text-muted);font-size:1rem;cursor:pointer;padding:.2rem .4rem;line-height:1" title="Dismiss">✕</button>
  `;
  const dashPage = document.getElementById('dashboardPage');
  if (dashPage) dashPage.prepend(banner);
}

/* ── Sidebar ─────────────────────────────────────────────── */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const main    = document.getElementById('mainContent');
  const colBtn  = document.getElementById('sidebarCollapseBtn');
  const mobBtn  = document.getElementById('mobileMenuToggle');
  const overlay = document.getElementById('sidebarOverlay');

  // Desktop collapse
  colBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('sb-collapsed');
  });

  // Mobile hamburger — explicit open/close (no toggle race condition)
  mobBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (sidebar.classList.contains('open')) closeMobile();
    else openMobile();
  });

  // Mobile ✕ close button inside sidebar
  document.getElementById('sidebarCloseMob')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeMobile();
  });

  overlay?.addEventListener('click', closeMobile);

  // Swipe left on sidebar to close
  let _tx = 0;
  sidebar.addEventListener('touchstart', e => { _tx = e.touches[0].clientX; }, { passive: true });
  sidebar.addEventListener('touchend', e => {
    if (_tx - e.changedTouches[0].clientX > 55) closeMobile();
  }, { passive: true });

  function openMobile() {
    sidebar.classList.add('open');
    overlay.classList.add('active');
    mobBtn.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeMobile() {
    sidebar.classList.remove('open');
    overlay.classList.remove('active');
    mobBtn?.classList.remove('open');
    document.body.style.overflow = '';
  }

  // Expose so Router can call it after navigation
  window._closeMobileSidebar = closeMobile;

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeMobile(); closeAllDropdowns(); closeAIPopup(); }
  });

  sidebar.addEventListener('click', (e) => {
    if (e.target.closest('.nav-item') && window.innerWidth < 768) {
      setTimeout(closeMobile, 150);
    }
  });
}

/* ── Mobile Bottom Nav active state sync ─────────────────── */
function syncMobBottomNav(page) {
  document.querySelectorAll('.mob-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-page') === page);
  });
}

/* ── Nav Delegation ─────────────────────────────────────── */
function initNavDelegation() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-page]');
    if (!el) return;
    if (el.closest('#authOverlay') || el.closest('#comingSoonModal')) return;
    const page = el.getAttribute('data-page');
    if (page) { e.stopPropagation(); Router.navigate(page); closeAllDropdowns(); }
  });
}

/* ── Search ─────────────────────────────────────────────── */
const SEARCH_ITEMS = [
  { icon:'🛒', title:'Marketplace',    meta:'Buy & sell items',           page:'marketplace' },
  { icon:'🔍', title:'Lost & Found',   meta:'Report lost/found items',    page:'lost-found'  },
  { icon:'📚', title:'Notes & PYQs',   meta:'Study materials & papers',   page:'notes'       },
  { icon:'🗓️', title:'Events & Clubs', meta:'Upcoming campus events',     page:'events'      },
  { icon:'🔖', title:'Bookmarks',      meta:'Your saved items',           page:'bookmarks'   },
  { icon:'ℹ️', title:'About CU Hub',   meta:'About the platform',         page:'about'       },
  { icon:'💬', title:'Feedback',       meta:'Share your feedback',        page:'feedback'    },
  { icon:'🤖', title:'AI Assistant',   meta:'Chat with CURAJ AI',         page:'ai'          },
  { icon:'🏠', title:'Dashboard',      meta:'Home page',                  page:'dashboard'   },
];

function initSearch() {
  const input = document.getElementById('globalSearch');
  const clear = document.getElementById('searchClear');
  const kbd   = document.getElementById('searchKbd');
  const wrap  = input?.closest('.search-wrap');
  if (!input || !wrap) return;

  const dropdown = document.createElement('div');
  dropdown.className = 'search-results';
  dropdown.id = 'searchResults';
  wrap.appendChild(dropdown);

  document.addEventListener('keydown', e => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); input.focus(); }
  });

  input.addEventListener('input', () => {
    const v = input.value.trim();
    if (clear) clear.style.display = v ? 'block' : 'none';
    if (kbd)   kbd.style.display   = v ? 'none'  : '';
    if (v.length >= 1) showSearchResults(v);
    else hideSearchResults();
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && input.value.trim()) {
      const v = input.value.trim().toLowerCase();
      const match = SEARCH_ITEMS.find(s =>
        s.title.toLowerCase().includes(v) || s.meta.toLowerCase().includes(v)
      );
      if (match) { Router.navigate(match.page); input.value = ''; hideSearchResults(); }
    }
    if (e.key === 'Escape') { hideSearchResults(); input.blur(); }
  });

  input.addEventListener('focus', () => {
    if (input.value.trim()) showSearchResults(input.value.trim());
  });

  clear?.addEventListener('click', () => {
    input.value = ''; input.focus();
    if (clear) clear.style.display = 'none';
    if (kbd)   kbd.style.display = '';
    hideSearchResults();
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) hideSearchResults();
  });

  function showSearchResults(query) {
    const q = query.toLowerCase();
    const matches = SEARCH_ITEMS.filter(s =>
      s.title.toLowerCase().includes(q) || s.meta.toLowerCase().includes(q)
    );
    dropdown.innerHTML = matches.length
      ? matches.map(s => `
          <div class="search-result-item" data-page="${s.page}">
            <span class="search-result-icon">${s.icon}</span>
            <div>
              <div class="search-result-title">${s.title}</div>
              <div class="search-result-meta">${s.meta}</div>
            </div>
          </div>`).join('')
      : `<div class="search-no-results">No results for "<strong>${Utils.sanitize(query)}</strong>"</div>`;
    dropdown.classList.add('open');
    dropdown.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        Router.navigate(item.dataset.page);
        input.value = '';
        if (clear) clear.style.display = 'none';
        if (kbd) kbd.style.display = '';
        hideSearchResults();
      });
    });
  }

  function hideSearchResults() { dropdown.classList.remove('open'); }
}

/* ── Notifications ────────────────────────────────────────────
   Uses localStorage to track last-seen timestamp.
   Only items posted AFTER that timestamp are "unread".
   Badge count = number of genuinely new items.
──────────────────────────────────────────────────────────── */
function initNotifications() {
  const desktopBtn = document.getElementById('notifBtn');
  const mobileBtn  = document.getElementById('mobNotifBtn');
  const panel      = document.getElementById('notifDropdown');
  const markAll    = document.getElementById('markAllRead');
  const list       = document.getElementById('notifList');
  if (!panel) return;

  // ── Helpers ──────────────────────────────────────────────
  const STORAGE_KEY = 'cuhub_notif_last_seen';

  function getLastSeen() {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      return val ? new Date(val) : new Date(0); // epoch = never seen
    } catch { return new Date(0); }
  }

  function saveLastSeen(date) {
    try { localStorage.setItem(STORAGE_KEY, date.toISOString()); } catch {}
  }

  const parseTS = t => {
    if (!t) return null;
    const s = String(t).trim().replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1');
    const d = new Date(s);
    return isNaN(d) ? null : d;
  };

  const relTime = t => {
    const dt = parseTS(t);
    if (!dt) return '';
    const diff = (Date.now() - dt.getTime()) / 1000;
    if (diff < 5)     return 'just now';
    if (diff < 60)    return Math.floor(diff) + 's ago';
    if (diff < 3600)  return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hr ago';
    return Math.floor(diff / 86400) + 'd ago';
  };

  // ── Load & render ─────────────────────────────────────────
  async function loadNotifications() {
    if (!list) return;
    list.innerHTML = '<div class="notif-loading">Loading…</div>';
    try {
      const [mktRes, notesRes, evRes, lfRes] = await Promise.allSettled([
        Api.get('/api/marketplace'),
        Api.get('/api/notes'),
        Api.get('/api/events'),
        Api.get('/api/lost-found'),
      ]);

      const mkt    = mktRes.status    === 'fulfilled' ? (Array.isArray(mktRes.value)    ? mktRes.value    : []) : [];
      const notes  = notesRes.status  === 'fulfilled' ? (Array.isArray(notesRes.value)  ? notesRes.value  : []) : [];
      const events = evRes.status     === 'fulfilled' ? (Array.isArray(evRes.value)     ? evRes.value     : []) : [];
      const lf     = lfRes.status     === 'fulfilled' ? (Array.isArray(lfRes.value)     ? lfRes.value     : []) : [];

      const items = [
        ...mkt.slice(0, 5).map(i => ({
          icon: '🛒', color: '#5b5fc7', bg: 'rgba(91,95,199,.15)',
          page: 'marketplace',
          title: i.title,
          meta: ['₹' + Number(i.price||0).toLocaleString('en-IN'), i.condition||'', i.seller_name ? 'by ' + i.seller_name : ''].filter(Boolean).join(' · '),
          time: i.created_at,
        })),
        ...notes.slice(0, 5).map(i => ({
          icon: i.type === 'pyq' ? '📋' : '📝', color: '#10b981', bg: 'rgba(16,185,129,.15)',
          page: 'notes',
          title: i.title,
          meta: [i.subject, i.semester ? 'Sem ' + i.semester : '', i.uploader_name ? 'by ' + i.uploader_name : ''].filter(Boolean).join(' · '),
          time: i.created_at,
        })),
        ...events.slice(0, 5).map(i => ({
          icon: '🗓️', color: '#f59e0b', bg: 'rgba(245,158,11,.15)',
          page: 'events',
          title: i.title,
          meta: [i.event_date ? Utils.formatDate(i.event_date) : '', i.venue||''].filter(Boolean).join(' · '),
          time: i.created_at,
        })),
        ...lf.slice(0, 4).map(i => ({
          icon: i.type === 'found' ? '🔍' : '❓', color: '#ef4444', bg: 'rgba(239,68,68,.15)',
          page: 'lost-found',
          title: (i.type === 'found' ? 'Found: ' : 'Lost: ') + i.title,
          meta: [i.location||'', i.status === 'open' ? 'Open' : 'Resolved'].filter(Boolean).join(' · '),
          time: i.created_at,
        })),
      ]
      .filter(i => i.title)
      .sort((a, b) => (parseTS(b.time)||0) - (parseTS(a.time)||0))
      .slice(0, 15);

      if (!items.length) {
        list.innerHTML = '<div class="notif-empty">📭 No recent activity yet</div>';
        _updateBadge(0);
        return;
      }

      // ── Determine unread: items newer than last-seen timestamp ──
      const lastSeen  = getLastSeen();
      const unreadIds = new Set();
      items.forEach((n, idx) => {
        const ts = parseTS(n.time);
        if (ts && ts > lastSeen) unreadIds.add(idx);
      });

      list.innerHTML = items.map((n, idx) => {
        const isUnread = unreadIds.has(idx);
        return '<div class="notif-item' + (isUnread ? ' unread' : '') + '" data-page="' + n.page + '" style="cursor:pointer">' +
          '<div class="notif-ico" style="background:' + n.bg + ';color:' + n.color + '">' + n.icon + '</div>' +
          '<div class="notif-body">' +
          '<div class="notif-title">' + Utils.sanitize(n.title) + '</div>' +
          (n.meta ? '<div class="notif-time">' + Utils.sanitize(n.meta) + '</div>' : '') +
          '<div class="notif-time" style="opacity:.65">' + relTime(n.time) + (isUnread ? ' <span class="notif-new-dot"></span>' : '') + '</div>' +
          '</div></div>';
      }).join('');

      // Click on notification → navigate to that page
      list.querySelectorAll('.notif-item[data-page]').forEach(el => {
        el.addEventListener('click', () => {
          Router.navigate(el.dataset.page);
          _markAllRead();
          _closePanel();
        });
      });

      _updateBadge(unreadIds.size);
    } catch (err) {
      list.innerHTML = '<div class="notif-empty">Could not load notifications</div>';
    }
  }

  function _markAllRead() {
    // Save current time as last-seen — everything before now is "read"
    saveLastSeen(new Date());
    document.querySelectorAll('.notif-item.unread').forEach(i => i.classList.remove('unread'));
    document.querySelectorAll('.notif-new-dot').forEach(d => d.remove());
    _updateBadge(0);
  }

  function _updateBadge(count) {
    const cnt    = document.getElementById('notifCount');
    const mobCnt = document.getElementById('mobNotifCount');
    if (cnt)    { cnt.textContent = count; cnt.style.display = count ? '' : 'none'; }
    if (mobCnt) { mobCnt.textContent = count; mobCnt.style.display = count ? '' : 'none'; }
  }

  function _positionPanel(btn) {
    if (window.innerWidth < 768) {
      if (panel.parentElement !== document.body) document.body.appendChild(panel);
      const r = btn.getBoundingClientRect();
      panel.style.cssText = 'position:fixed!important;top:' + (r.bottom+6) + 'px;right:12px;left:auto;width:min(320px,calc(100vw - 24px));z-index:9999;max-height:calc(100dvh - ' + (r.bottom+20) + 'px);overflow-y:auto;';
    } else {
      const wrap = document.querySelector('.notif-wrap');
      if (wrap && panel.parentElement !== wrap) wrap.appendChild(panel);
      panel.style.cssText = '';
    }
  }

  function _closePanel() {
    panel.classList.remove('open');
    panel.style.cssText = '';
  }

  function _toggle(btn, e) {
    e.stopPropagation();
    document.getElementById('profileDropdown')?.classList.remove('open');
    if (panel.classList.contains('open')) {
      _closePanel();
    } else {
      _positionPanel(btn);
      panel.classList.add('open');
      loadNotifications();
    }
  }

  desktopBtn?.addEventListener('click', e => _toggle(desktopBtn, e));
  mobileBtn?.addEventListener('click',  e => _toggle(mobileBtn, e));

  document.addEventListener('click', e => {
    if (!panel.classList.contains('open')) return;
    if (panel.contains(e.target)) return;
    if (desktopBtn?.contains(e.target) || mobileBtn?.contains(e.target)) return;
    _closePanel();
  });

  window.addEventListener('resize', () => {
    if (panel.classList.contains('open')) {
      const btn = document.getElementById(window.innerWidth < 768 ? 'mobNotifBtn' : 'notifBtn');
      if (btn) _positionPanel(btn);
    }
  });

  markAll?.addEventListener('click', () => {
    _markAllRead();
    showToast('All notifications marked as read.', 'success');
  });

  // ── Init: load badge count silently on page load ──────────
  (async () => {
    try {
      const lastSeen = getLastSeen();
      const [mktRes, notesRes, evRes, lfRes] = await Promise.allSettled([
        Api.get('/api/marketplace'),
        Api.get('/api/notes'),
        Api.get('/api/events'),
        Api.get('/api/lost-found'),
      ]);
      const all = [
        ...(mktRes.status    === 'fulfilled' && Array.isArray(mktRes.value)    ? mktRes.value    : []),
        ...(notesRes.status  === 'fulfilled' && Array.isArray(notesRes.value)  ? notesRes.value  : []),
        ...(evRes.status     === 'fulfilled' && Array.isArray(evRes.value)     ? evRes.value     : []),
        ...(lfRes.status     === 'fulfilled' && Array.isArray(lfRes.value)     ? lfRes.value     : []),
      ];
      const unread = all.filter(i => {
        const ts = parseTS(i.created_at);
        return ts && ts > lastSeen;
      }).length;
      _updateBadge(Math.min(unread, 99)); // cap at 99
    } catch { /* silent */ }
  })();
}


function initProfileDropdown() {
  const btn       = document.getElementById('profileBtn');
  const drop      = document.getElementById('profileDropdown');
  const loginBtn  = document.getElementById('loginNavBtn');
  const logoutBtn = document.getElementById('dropdownLogout');
  if (!btn || !drop) return;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    const open = drop.classList.toggle('open');
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) document.getElementById('notifDropdown')?.classList.remove('open');
  });
  loginBtn?.addEventListener('click',  () => { drop.classList.remove('open'); btn.setAttribute('aria-expanded','false'); AuthUI.open('login'); });
  logoutBtn?.addEventListener('click', () => { AuthService.logout(); drop.classList.remove('open'); btn.setAttribute('aria-expanded','false'); });
  document.addEventListener('click', () => closeAllDropdowns());
}

function closeAllDropdowns() {
  const drop = document.getElementById('profileDropdown');
  const btn  = document.getElementById('profileBtn');
  drop?.classList.remove('open');
  btn?.setAttribute('aria-expanded','false');
  // Close notif panel and reset its inline styles
  const notifPanel = document.getElementById('notifDropdown');
  if (notifPanel) {
    notifPanel.classList.remove('open');
    notifPanel.style.cssText = '';
  }
}

/* ── AI Popup Panel ────────────────────────────────────────── */
/* ── AI Popup — logic lives in js/modules/ai/popup.js ─── */
/* initAIPopup() and closeAIPopup() are defined there       */

/* ── Star Rating ─────────────────────────────────────────── */
let currentRating = 3;
function initRatingWidget() { setRating(3); }
window.setRating = function(val) {
  currentRating = val;
  document.querySelectorAll('.star-btn').forEach((btn, i) => btn.classList.toggle('active', i < val));
};

/* ── Filter/Tab helpers ──────────────────────────────────── */
window.setActiveFilter = function(el) {
  el.closest('.filter-bar')?.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
};
window.setActiveTab = function(el) {
  el.closest('.tab-bar')?.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
};

/* ── Feedback ─────────────────────────────────────────────── */
/* Called by Router every time the feedback page is navigated to */
window.initFeedbackPage = function() {
  const user = AuthService.getUser();
  const nameEl = document.getElementById('fbName');
  // Only auto-fill name if the field is empty (don't overwrite what user typed)
  if (nameEl && user && user.name && !nameEl.value.trim()) {
    nameEl.value = user.name;
  }
  // Sync rating widget to current state
  if (typeof currentRating !== 'undefined') setRating(currentRating);
};
window.submitFeedback = async function() {
  const text = document.getElementById('fbText')?.value?.trim();
  const name = document.getElementById('fbName')?.value?.trim();
  const cat  = document.getElementById('fbCategory')?.value;
  if (!text) { showToast('Please write your feedback before submitting.', 'warning'); return; }
  const btn = document.querySelector('.feedback-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Submitting…'; }
  try {
    await Api.post('/api/feedback', { title: cat || 'general', body: text, category: cat, rating: currentRating, name });
    showToast('Thank you for your feedback! It helps us improve CU Hub. 🙏', 'success');
    const _fbText = document.getElementById('fbText'); if (_fbText) _fbText.value = '';
    const _fbName = document.getElementById('fbName'); if (_fbName) _fbName.value = '';
    setRating(3);
  } catch(err) {
    showToast(err.message || 'Could not submit feedback. Please try again.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Submit Feedback'; }
  }
};

/* ── Coming Soon Modal ────────────────────────────────────── */
const COMING_SOON_DATA = {
  rides:      { emoji:'🚗', title:'Ride Share is Coming Soon!',  desc:"We're building a safe, student-verified carpooling system. Share rides to Jaipur, Ajmer and beyond.", pct:65 },
  complaints: { emoji:'📢', title:'Complaints is Coming Soon!',  desc:'An anonymous, secure channel to report campus issues — hostels, mess, infrastructure.', pct:40 }
};
window.ComingSoonModal = {
  open(page) {
    const data = COMING_SOON_DATA[page] || COMING_SOON_DATA.rides;
    document.getElementById('csModalEmoji').textContent = data.emoji;
    document.getElementById('csModalTitle').textContent = data.title;
    document.getElementById('csModalDesc').textContent  = data.desc;
    document.getElementById('csModalPct').textContent   = data.pct + '%';
    document.getElementById('csModalFill').style.width  = '0%';
    document.getElementById('comingSoonModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    setTimeout(() => { document.getElementById('csModalFill').style.width = data.pct + '%'; }, 80);
  },
  close() {
    document.getElementById('comingSoonModal').style.display = 'none';
    document.body.style.overflow = '';
  },
  notify() { showToast('Got it! You will be notified as soon as this feature launches. 🔔', 'success'); this.close(); }
};
document.addEventListener('click', e => { if (e.target.id === 'comingSoonModal') ComingSoonModal.close(); });

/* ── Toast ───────────────────────────────────────────────── */
window.showToast = function(msg, type = 'info', duration = 3500) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('show')));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 350); }, duration);
};

/* ── Bookmark Badge ──────────────────────────────────────── */
window.updateBookmarkBadge = function() {
  const bms = JSON.parse(localStorage.getItem('cuhub_bookmarks') || '[]');
  const n = bms.length;
  // Desktop sidebar badge
  const badge = document.getElementById('bmBadge');
  if (badge) { badge.textContent = n; badge.style.display = n ? 'inline-flex' : 'none'; }
  // Mobile bottom nav badge
  const mobBadge = document.getElementById('mobBmBadge');
  if (mobBadge) { mobBadge.textContent = n; mobBadge.style.display = n ? 'flex' : 'none'; }
};

/* ── Bookmark Toggle ─────────────────────────────────────── */
window.toggleBookmark = function(id, type, title, emoji, btn) {
  let bms = JSON.parse(localStorage.getItem('cuhub_bookmarks') || '[]');
  const key = `${type}-${id}`;
  const idx = bms.findIndex(b => b.key === key);
  if (idx === -1) {
    bms.push({ key, id, type, title, emoji, savedAt: new Date().toISOString() });
    if (btn) { btn.classList.add('bookmarked'); btn.title = 'Remove bookmark'; }
    showToast('Saved to your Bookmarks! Find it anytime in the Bookmarks tab. 🔖', 'success');
  } else {
    bms.splice(idx, 1);
    if (btn) { btn.classList.remove('bookmarked'); btn.title = 'Bookmark'; }
    showToast('Bookmark removed successfully.', 'info');
  }
  localStorage.setItem('cuhub_bookmarks', JSON.stringify(bms));
  updateBookmarkBadge();
};

window.isBookmarked = function(id, type) {
  const bms = JSON.parse(localStorage.getItem('cuhub_bookmarks') || '[]');
  return bms.some(b => b.key === `${type}-${id}`);
};

window.Modal = { open: page => Router.navigate(page) };
