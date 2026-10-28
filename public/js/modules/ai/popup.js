/* ── CU Hub AI Popup — Floating assistant widget ─────────────
   Handles: FAB, bottom-sheet popup, navigation, typing,
            close-on-navigate, mobile swipe, clear chat.
   Depends on: Utils, Api, Router (loaded before this file)
──────────────────────────────────────────────────────────── */
'use strict';

/* ── Navigation keyword map ── */
const AI_NAV = {
  marketplace:  ['marketplace', 'market', 'buy', 'sell', 'shop', 'items', 'listing'],
  'lost-found': ['lost', 'found', 'lost & found', 'lost and found', 'missing'],
  notes:        ['notes', 'pyq', 'study', 'papers', 'resources', 'material', 'upload notes'],
  events:       ['events', 'clubs', 'event', 'hackathon', 'seminar', 'workshop'],
  feedback:     ['feedback', 'report bug', 'suggest', 'complaint'],
  bookmarks:    ['bookmarks', 'saved', 'bookmark'],
  about:        ['about', 'info', 'developer', 'creator'],
  dashboard:    ['home', 'dashboard', 'main'],
  ai:           ['ai', 'assistant', 'chat', 'full chat'],
};

/* ── State ── */
let _inited = false;
let _open   = false;

/* ══════════════════════════════════════════════════════════
   INIT — called once from app.js DOMContentLoaded
   ══════════════════════════════════════════════════════════ */
function initAIPopup() {
  const fab      = document.getElementById('aiFab');
  const popup    = document.getElementById('aiPopup');
  const overlay  = document.getElementById('aiOverlay');
  const closeBtn = document.getElementById('aiPopupClose');
  const clearBtn = document.getElementById('aiClearBtn');
  const input    = document.getElementById('aiPopupInput');
  const sendBtn  = document.getElementById('aiPopupSendBtn');

  if (!fab || !popup) return;

  /* FAB toggle */
  fab.addEventListener('click', e => {
    e.stopPropagation();
    _open ? closeAIPopup() : _openPopup();
  });

  /* Close triggers */
  closeBtn?.addEventListener('click', closeAIPopup);
  overlay?.addEventListener('click',  closeAIPopup);

  /* Clear chat */
  clearBtn?.addEventListener('click', () => {
    const msgs = document.getElementById('aiPopupMsgs');
    if (msgs) msgs.innerHTML = '';
    _addMsg('bot', 'Chat cleared! How can I help you? 😊');
  });

  /* Send */
  sendBtn?.addEventListener('click', () => _send());
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); _send(); }
  });

  /* Disable send when empty */
  input?.addEventListener('input', () => {
    if (sendBtn) sendBtn.disabled = !(input.value.trim());
  });
  if (sendBtn) sendBtn.disabled = true;

  /* Mobile: swipe down to close */
  let _ty = 0;
  popup.addEventListener('touchstart', e => { _ty = e.touches[0].clientY; }, { passive: true });
  popup.addEventListener('touchend',   e => {
    if (e.changedTouches[0].clientY - _ty > 70 && window.innerWidth <= 480) closeAIPopup();
  }, { passive: true });
}

/* ══════════════════════════════════════════════════════════
   OPEN / CLOSE
   ══════════════════════════════════════════════════════════ */
function _openPopup() {
  const popup   = document.getElementById('aiPopup');
  const overlay = document.getElementById('aiOverlay');
  const fab     = document.getElementById('aiFab');
  const input   = document.getElementById('aiPopupInput');
  const badge   = document.getElementById('aiFabBadge');
  if (!popup) return;

  popup.classList.add('open');
  if (overlay) {
    overlay.style.display = 'block';
    requestAnimationFrame(() => overlay.classList.add('show'));
  }
  if (fab)   fab.classList.add('open');
  if (badge) badge.style.display = 'none';
  _open = true;

  /* First-open welcome message */
  const isFirstOpen = !_inited;
  if (!_inited) {
    _inited = true;
    _addMsg('bot', "👋 Hi! I'm your CURAJ AI Assistant. Ask me anything about campus, or say 'open marketplace' to navigate!");
  }

  /* Prefill only on the very first open ever */
  setTimeout(() => {
    if (input && isFirstOpen && !input.value.trim()) {
      input.value = 'Tell me about CURAJ';
      input.dispatchEvent(new Event('input')); // enable send button
      input.select();                          // select all so user can type over it instantly
    }
    input?.focus();
  }, 260);
  if (window.innerWidth <= 480) {
    document.body.style.overflow = 'hidden';
    // When keyboard opens on mobile, adjust popup height so input stays visible
    if (window.visualViewport) {
      _bindViewport();
    }
  }
}

function _bindViewport() {
  const popup = document.getElementById('aiPopup');
  if (!popup || !window.visualViewport) return;
  const handler = () => {
    if (!_open) { window.visualViewport.removeEventListener('resize', handler); return; }
    const vh = window.visualViewport.height;
    const offset = window.visualViewport.offsetTop;
    popup.style.maxHeight = `${vh - offset - 8}px`;
    popup.style.top = `${offset}px`;
    // Scroll msgs to bottom when keyboard shifts view
    const msgs = document.getElementById('aiPopupMsgs');
    if (msgs) setTimeout(() => { msgs.scrollTop = msgs.scrollHeight; }, 100);
  };
  window.visualViewport.addEventListener('resize', handler);
  // Reset when popup closes
  const origClose = closeAIPopup;
  window.closeAIPopup = function() {
    popup.style.maxHeight = '';
    popup.style.top = '';
    window.visualViewport.removeEventListener('resize', handler);
    window.closeAIPopup = origClose;
    origClose();
  };
}

function closeAIPopup() {
  const popup   = document.getElementById('aiPopup');
  const overlay = document.getElementById('aiOverlay');
  const fab     = document.getElementById('aiFab');
  if (!popup) return;

  popup.classList.remove('open');
  if (overlay) {
    overlay.classList.remove('show');
    setTimeout(() => { overlay.style.display = 'none'; }, 260);
  }
  if (fab) fab.classList.remove('open');
  _open = false;
  document.body.style.overflow = '';
}

/* ══════════════════════════════════════════════════════════
   SEND MESSAGE
   ══════════════════════════════════════════════════════════ */
async function _send() {
  const input   = document.getElementById('aiPopupInput');
  const sendBtn = document.getElementById('aiPopupSendBtn');
  const msg     = (input?.value || '').trim();
  if (!msg) return;

  _addMsg('user', msg);
  if (input)   { input.value = ''; input.dispatchEvent(new Event('input')); }
  if (sendBtn) sendBtn.disabled = true;

  const lower = msg.toLowerCase();

  /* 5ms micro-delay so user sees their message rendered before dots appear */
  await new Promise(r => setTimeout(r, 5));

  /* ── Navigation intent detection ── */
  const NAV_VERBS = ['go to ', 'open ', 'show me ', 'take me to ', 'navigate to ', 'switch to '];
  for (const [page, keywords] of Object.entries(AI_NAV)) {
    const isVerb    = NAV_VERBS.some(v => lower.startsWith(v));
    const hasKw     = keywords.some(k => lower.includes(k));
    const isExact   = keywords.some(k => lower === k);
    if ((isVerb && hasKw) || isExact) {
      const label    = page.replace(/-/g, ' & ');
      const capLabel = label.charAt(0).toUpperCase() + label.slice(1);

      /* Message with clickable nav button */
      const msgEl = _addMsg('bot', `Opening ${capLabel}… 🚀`);
      const bubble = msgEl?.querySelector('.aip-bubble');
      if (bubble) {
        const btn = document.createElement('button');
        btn.className = 'aip-nav-btn';
        btn.textContent = `→ Open ${capLabel}`;
        btn.addEventListener('click', () => { Router.navigate(page); closeAIPopup(); });
        bubble.appendChild(document.createElement('br'));
        bubble.appendChild(btn);
      }

      /* Auto-navigate + close after brief delay so user sees the message */
      setTimeout(() => { Router.navigate(page); closeAIPopup(); }, 900);
      if (sendBtn) sendBtn.disabled = false;
      return;
    }
  }

  /* ── Call AI API ── */
  const typingEl = _addTyping();
  try {
    const data = await Api.post('/api/ai/chat', { message: msg });
    typingEl.remove();
    _addMsg('bot', data.reply || 'Sorry, I could not understand that. Try asking differently!');
  } catch {
    typingEl.remove();
    _addMsg('bot', 'The AI assistant is temporarily unavailable. Please try again shortly.');
  } finally {
    if (sendBtn && input) sendBtn.disabled = !(input.value.trim());
    setTimeout(() => document.getElementById('aiPopupInput')?.focus(), 100);
  }
}

/* ══════════════════════════════════════════════════════════
   DOM HELPERS
   ══════════════════════════════════════════════════════════ */
function _addMsg(role, text) {
  const msgs = document.getElementById('aiPopupMsgs');
  if (!msgs) return null;
  const el = document.createElement('div');
  el.className = `aip-msg ${role === 'user' ? 'user' : 'bot'}`;
  el.innerHTML = `
    <div class="aip-msg-av">${role === 'user' ? '👤' : '✦'}</div>
    <div class="aip-bubble">${Utils.sanitize(String(text))}</div>`;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return el;
}

function _addTyping() {
  const msgs = document.getElementById('aiPopupMsgs');
  if (!msgs) return { remove: () => {} };
  const el = document.createElement('div');
  el.className = 'aip-msg bot';
  el.innerHTML = `
    <div class="aip-msg-av">✦</div>
    <div class="aip-bubble" style="padding:.45rem .7rem">
      <div class="aip-typing"><span></span><span></span><span></span></div>
    </div>`;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight;
  return el;
}

/* ══════════════════════════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════════════════════════ */

/* Called by quick-chip onclick="aiPopupSend('...')" in HTML */
window.aiPopupSend = function(msg) {
  if (!_open) _openPopup();
  const input = document.getElementById('aiPopupInput');
  if (input) {
    input.value = msg;
    input.dispatchEvent(new Event('input'));
  }
  setTimeout(() => _send(), 80);
};

/* Called by app.js initAIPopup() and Escape key handler */
window.initAIPopup  = initAIPopup;
window.closeAIPopup = closeAIPopup;
