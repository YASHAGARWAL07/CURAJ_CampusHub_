window.Router = (() => {
  const PAGE_IDS = {
    home:        'dashboardPage',
    dashboard:   'dashboardPage',
    marketplace: 'marketplacePage',
    'lost-found':'lostfoundPage',
    lostfound:   'lostfoundPage',
    notes:       'notesPage',
    events:      'eventsPage',
    feedback:    'feedbackPage',
    bookmarks:   'bookmarksPage',
    ai:          'aiPage',
    about:       'aboutPage',
    rides:       'dashboardPage',
    complaints:  'dashboardPage',
  };

  const MODAL_PAGES = { rides: true, complaints: true };

  const PAGE_TITLES = {
    dashboard:   'Dashboard',
    marketplace: '🛒 Marketplace',
    'lost-found':'🔍 Lost & Found',
    notes:       '📚 Notes & PYQs',
    events:      '🗓️ Events & Clubs',
    feedback:    '💬 Feedback',
    bookmarks:   '🔖 Bookmarks',
    ai:          '🤖 AI Assistant',
    about:       'About CU Hub',
  };

  const PAGE_SUBS = {
    dashboard:   'Your campus hub awaits',
    marketplace: 'Buy & sell with CURAJ students',
    'lost-found':'Report or find lost items',
    notes:       'Study materials & PYQs',
    events:      'Campus activities & clubs',
    feedback:    'Help us improve CU Hub',
    bookmarks:   'Your saved items across CU Hub',
    ai:          'Your 24/7 campus companion',
    about:       'Built for CURAJ students',
  };

  let _current = null;
  let _isPopState = false;

  function _renderPage(key) {
    const targetId = PAGE_IDS[key];
    if (!targetId) return;

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => {
      p.classList.remove('page-active');
      p.style.display = 'none';
    });

    // Show target
    const target = document.getElementById(targetId);
    if (target) {
      target.style.display = 'block';
      requestAnimationFrame(() => target.classList.add('page-active'));
    }

    // Update nav active
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.classList.remove('active');
      const bp = btn.getAttribute('data-page')?.toLowerCase();
      if (bp === key) btn.classList.add('active');
    });

    // Update topbar
    const titleEl = document.getElementById('greetingTitle');
    const subEl   = document.getElementById('greetingSub');
    if (key === 'dashboard') {
      if (typeof updateGreeting === 'function') updateGreeting();
      if (subEl) subEl.textContent = 'Your campus hub awaits';
    } else {
      if (titleEl) titleEl.textContent = PAGE_TITLES[key] || key;
      if (subEl)   subEl.textContent = PAGE_SUBS[key] || '';
    }

    document.getElementById('mainContent')?.scrollTo(0, 0);
    window.scrollTo(0, 0);
    _current = key;

    // Close mobile sidebar on navigation
    if (typeof window._closeMobileSidebar === 'function') window._closeMobileSidebar();

    // Close AI popup on navigation (if open)
    if (typeof window.closeAIPopup === 'function') window.closeAIPopup();

    // Close any open modals on navigation
    if (typeof ProfileModal !== 'undefined' && document.getElementById('profileModal')?.classList.contains('active')) {
      ProfileModal.close();
    }
    if (typeof DetailModal !== 'undefined') DetailModal.close();
    const postOverlay = document.getElementById('postModalOverlay');
    if (postOverlay?.classList.contains('active')) {
      postOverlay.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(() => { postOverlay.style.display = 'none'; document.getElementById('postModalBox').innerHTML = ''; }, 200);
    }

    // Sync mobile bottom nav
    if (typeof syncMobBottomNav === 'function') syncMobBottomNav(key);

    // Trigger module loads
    switch (key) {
      case 'marketplace': setTimeout(() => MarketplaceModule?.load?.(), 0); break;
      case 'lost-found':  setTimeout(() => LostFoundModule?.load?.(), 0);   break;
      case 'notes':       setTimeout(() => NotesModule?.load?.('notes'), 0); break;
      case 'events':      setTimeout(() => EventsModule?.load?.(), 0);       break;
      case 'bookmarks':   setTimeout(() => { BookmarksModule?.load?.(); updateBookmarkBadge?.(); }, 0); break;
      case 'ai':          setTimeout(() => AIModule?.init?.(), 0);           break;
      case 'feedback':    setTimeout(() => initFeedbackPage?.(), 0);         break;
    }
  }

  function navigate(page) {
    const key = page.toLowerCase().replace(/\s+/g, '-');

    // Rides & Complaints → open coming soon modal, stay on dashboard
    if (MODAL_PAGES[key]) {
      if (_current !== 'dashboard') navigate('dashboard');
      setTimeout(() => {
        if (typeof ComingSoonModal !== 'undefined') ComingSoonModal.open(key);
      }, 50);
      return;
    }

    if (!PAGE_IDS[key]) return;

    // Push browser history so back button works
    // Skip if already on this page or if triggered by popstate (back/forward)
    if (!_isPopState && _current !== key) {
      history.pushState({ page: key }, '', '?page=' + key);
    }

    _renderPage(key);
  }

  // ── Handle browser back/forward button ──────────────────────
  window.addEventListener('popstate', (e) => {
    const page = e.state?.page || 'dashboard';
    _isPopState = true;
    navigate(page);
    _isPopState = false;
  });

  // ── On first load: set initial history state ─────────────────
  // Replaces the blank state so pressing back from dashboard
  // goes to dashboard instead of exiting the app
  window.addEventListener('DOMContentLoaded', () => {
    history.replaceState({ page: 'dashboard' }, '', '?page=dashboard');
  });

  function current() { return _current; }

  return { navigate, current };
})();
