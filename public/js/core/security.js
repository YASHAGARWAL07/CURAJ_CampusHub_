/* ── CU Hub Security Layer ─────────────────────────────────
   Anti-tampering and source protection (production only)
──────────────────────────────────────────────────────────── */
(function() {
  'use strict';

  const isProd = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  // ── 1. Disable right-click in production only ────────────
  if (isProd) {
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
    });
  }

  // ── 2. Block devtools shortcuts in production ─────────────
  // IMPORTANT: Does NOT block Ctrl+K (search), Ctrl+S on forms, or Ctrl+A in inputs
  if (isProd) {
    document.addEventListener('keydown', function(e) {
      // F12
      if (e.key === 'F12') { e.preventDefault(); return; }
      // Ctrl/Cmd + Shift + I (devtools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i')) { e.preventDefault(); return; }
      // Ctrl/Cmd + Shift + J (console)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j')) { e.preventDefault(); return; }
      // Ctrl/Cmd + Shift + C (inspector) — only block if NOT in an input/textarea
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        const tag = document.activeElement?.tagName;
        if (!['INPUT', 'TEXTAREA'].includes(tag)) { e.preventDefault(); return; }
      }
      // Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U') && !e.shiftKey) { e.preventDefault(); return; }
    }, true); // capture phase so it fires before other handlers
  }

  // ── 3. Console override in production ─────────────────────
  // Only suppress log/debug/info; keep error/warn for crash reporting
  if (isProd) {
    const _noop = () => {};
    ['log', 'debug', 'info', 'table', 'dir', 'trace'].forEach(m => {
      try { console[m] = _noop; } catch(e) {}
    });
  }

  // ── 4. Security warning in console ───────────────────────
  if (isProd) {
    setTimeout(() => {
      console.warn('%c⛔ STOP!', 'color:red;font-size:40px;font-weight:bold');
      console.warn('%cThis is a browser developer tool for developers.\nIf someone told you to paste something here, it is a scam.', 'color:red;font-size:14px');
    }, 800);
  }

  // ── 5. Freeze AuthService after load ─────────────────────
  window.addEventListener('load', function() {
    setTimeout(function() {
      try {
        if (window.AuthService) {
          const desc = Object.getOwnPropertyDescriptor(window, 'AuthService');
          // Only freeze if the property is configurable — otherwise defineProperty throws
          if (!desc || desc.configurable) {
            Object.defineProperty(window, 'AuthService', { configurable: false, writable: false });
          }
        }
      } catch(e) { /* silent — non-critical hardening */ }
    }, 2000);
  });

})();
