/* ── CU Hub AI Assistant — Full Page Module ──────────────────
   Calls /api/ai/chat with fallback to local responses
──────────────────────────────────────────────────────────── */
const AIModule = (() => {
  let inited = false;

  const SUGGESTIONS = [
    'Hostel rules & timings', 'Library hours',
    'Exam schedule info', 'How to join clubs?',
    'Fee payment help', 'WiFi & IT support',
    'Scholarship info', 'Transcript request',
    'Placement cell info', 'Canteen timings'
  ];

  function init() {
    if (inited) return;
    inited = true;

    const sugBox  = document.getElementById('aiSuggestions');
    const chat    = document.getElementById('aiChat');
    const input   = document.getElementById('aiInput');
    const sendBtn = document.getElementById('aiSendBtn');
    const clearBtn= document.getElementById('aiPageClearBtn');

    if (!chat) return;

    // Build suggestion chips
    if (sugBox && !sugBox.children.length) {
      SUGGESTIONS.forEach(s => {
        const chip = document.createElement('button');
        chip.className = 'suggestion-chip';
        chip.textContent = s;
        chip.addEventListener('click', () => sendMessage(s));
        sugBox.appendChild(chip);
      });
    }

    // Welcome message
    if (!chat.children.length) {
      addMsg('assistant', "👋 Hi! I'm your CURAJ AI Assistant. Ask me anything about campus life — hostels, exams, library, fees, clubs, and more!");
    }

    // Prefill input with suggestion
    if (input && !input.value.trim()) {
      input.value = 'Tell me about CURAJ';
      input.dispatchEvent(new Event('input'));
    }

    sendBtn?.addEventListener('click', () => sendMessage(input?.value));
    input?.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) sendMessage(input.value); });
    clearBtn?.addEventListener('click', () => {
      if (chat) chat.innerHTML = '';
      addMsg('assistant', "Chat cleared! How can I help you today? 😊");
    });

    async function sendMessage(msg) {
      msg = (msg || '').trim();
      if (!msg) return;
      addMsg('user', msg);
      if (input) input.value = '';
      if (sendBtn) sendBtn.disabled = true;

      // Typing indicator
      const typingEl = addTyping();

      try {
        const data = await Api.post('/api/ai/chat', { message: msg });
        typingEl.remove();
        addMsg('assistant', data.reply || 'Sorry, I could not understand that.');
      } catch {
        typingEl.remove();
        addMsg('assistant', 'The AI assistant is temporarily unavailable. Please try again shortly.');
      } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (input) input.focus();
      }
    }

    function addMsg(role, text) {
      const wrap = document.createElement('div');
      wrap.className = `ai-message ai-${role}`;
      wrap.innerHTML = `
        <div class="ai-msg-av-lg">${role === 'user' ? '👤' : '✦'}</div>
        <div class="ai-msg-text">${Utils.sanitize(String(text))}</div>`;
      chat.appendChild(wrap);
      chat.scrollTop = chat.scrollHeight;
      return wrap;
    }

    function addTyping() {
      const wrap = document.createElement('div');
      wrap.className = 'ai-message ai-assistant';
      wrap.innerHTML = `
        <div class="ai-msg-av-lg">✦</div>
        <div class="ai-msg-text" style="padding:.5rem .7rem">
          <div class="aip-typing"><span></span><span></span><span></span></div>
        </div>`;
      chat.appendChild(wrap);
      chat.scrollTop = chat.scrollHeight;
      return wrap;
    }
  }

  return { init };
})();
