/* ── Detail Modal – full info popup when a card is clicked ── */
const DetailModal = (() => {

  const CAT_EMOJI  = { books:'📚', electronics:'💻', stationery:'✏️', furniture:'🪑', clothing:'👕', sports:'⚽', other:'📦' };
  const COND_LABEL = { 'like-new':'Like New', good:'Good', fair:'Fair', poor:'Poor' };
  const EV_EMOJI   = { workshop:'🔧', hackathon:'💻', seminar:'🎤', talk:'💬', club:'👥', sports:'⚽', cultural:'🎭', tech:'🖥️', event:'🗓️', other:'📌' };

  function v(val, fallback) {
    if (val === null || val === undefined || val === '' || String(val).trim() === '' ||
        String(val) === '--' || String(val) === 'null' || String(val) === 'undefined') {
      return fallback !== undefined ? fallback : null;
    }
    return val;
  }

  function infoRow(icon, label, value) {
    const display = v(value, null);
    if (!display) return '';
    return `<div class="dm-info-row">
      <span class="dm-info-icon">${icon}</span>
      <div><span class="dm-info-label">${label}</span><span class="dm-info-value">${Utils.sanitize(String(display))}</span></div>
    </div>`;
  }

  function show(html) {
    const box = document.getElementById('detailModalBox');
    const overlay = document.getElementById('detailModalOverlay');
    if (!box || !overlay) return;
    box.innerHTML = html;
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('active'));
  }

  function close() {
    const overlay = document.getElementById('detailModalOverlay');
    if (!overlay) return;
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
      overlay.style.display = 'none';
      const box = document.getElementById('detailModalBox');
      if (box) box.innerHTML = '';
    }, 250);
  }

  /* ── Marketplace ── */
  function openMarketplace(item) {
    const emoji   = CAT_EMOJI[item.category] || '📦';
    const cond    = COND_LABEL[item.condition] || v(item.condition, '');
    const seller  = v(item.seller_name, 'Student');
    const dept    = v(item.department, '');
    const prog    = v(item.seller_program, '');
    const contact = v(item.contact, '') || v(item.seller_phone, '');
    const desc    = v(item.description, '');

    show(`
      <div class="dm-modal marketplace-modal">
        <button class="dm-close" onclick="DetailModal.close()">✕</button>
        <div class="dm-hero">
          ${item.image_url ? `<img class="dm-hero-img" src="${item.image_url}" alt="${Utils.sanitize(String(item.title))}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
          <div class="dm-hero-emoji" style="${item.image_url ? 'display:none' : ''}">${emoji}</div>
          <div class="dm-hero-overlay">
            <div class="dm-badges">
              <span class="dm-badge dm-badge-cat">${emoji} ${Utils.sanitize(item.category || 'other')}</span>
              ${cond ? `<span class="dm-badge">${cond}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="dm-body">
          <div class="dm-title">${Utils.sanitize(String(item.title))}</div>
          <div class="dm-price">${Utils.formatPrice(item.price)}</div>
          ${desc ? `<p class="dm-desc">${Utils.sanitize(desc)}</p>` : ''}
          <div class="dm-info-grid">
            ${infoRow('👤', 'Seller', seller)}
            ${dept ? infoRow('🏫', 'Department', dept) : ''}
            ${prog ? infoRow('📖', 'Program', prog) : ''}
            ${cond ? infoRow('🏷️', 'Condition', cond) : ''}
            ${contact ? infoRow('📞', 'Contact', contact) : ''}
            ${infoRow('🕐', 'Listed', Utils.timeAgo(item.created_at))}
          </div>
          <div class="dm-actions">
            ${contact || seller
              ? `<button class="dm-action-btn" data-contact="${Utils.sanitize(contact || seller)}" data-dept="${Utils.sanitize(dept)}" onclick="const c=this.dataset.contact,d=this.dataset.dept;showToast('Contact: '+c+(d?' · '+d:''),'info',6000);DetailModal.close()">📨 Contact Seller</button>`
              : ''}
          </div>
        </div>
      </div>`);
  }

  /* ── Lost & Found ── */
  function openLostFound(item) {
    const isLost   = item.type === 'lost';
    const isOpen   = item.status === 'open';
    const emoji    = isLost ? '😢' : '😊';
    const user     = AuthService.getUser();
    const isOwn    = user && user.id === item.user_id;
    const contact  = v(item.contact, '') || v(item.reporter_phone, '');
    const location = v(item.location, '');
    const desc     = v(item.description, '');
    const reporter = v(item.reporter_name, 'Student');
    const reporterDept = v(item.reporter_department, '');
    const reporterProg = v(item.reporter_program, '');

    show(`
      <div class="dm-modal lf-modal ${isLost ? 'lf-lost' : 'lf-found'}">
        <button class="dm-close" onclick="DetailModal.close()">✕</button>
        <div class="dm-hero">
          ${item.image_url ? `<img class="dm-hero-img" src="${item.image_url}" alt="${Utils.sanitize(String(item.title))}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
          <div class="dm-hero-emoji" style="${item.image_url ? 'display:none' : ''}">${emoji}</div>
          <div class="dm-hero-overlay">
            <div class="dm-badges">
              <span class="dm-badge ${isLost ? 'dm-badge-lost' : 'dm-badge-found'}">${isLost ? '🔴 LOST' : '🟢 FOUND'}</span>
              ${!isOpen ? '<span class="dm-badge dm-badge-resolved">✓ Resolved</span>' : ''}
            </div>
          </div>
        </div>
        <div class="dm-body">
          <div class="dm-title">${Utils.sanitize(String(item.title))}</div>
          ${desc ? `<p class="dm-desc">${Utils.sanitize(desc)}</p>` : ''}
          <div class="dm-info-grid">
            ${infoRow('👤', 'Reported by', reporter)}
            ${reporterDept ? infoRow('🏫', 'Department', reporterDept) : ''}
            ${reporterProg ? infoRow('📖', 'Program', reporterProg) : ''}
            ${location ? infoRow('📍', 'Location', location) : ''}
            ${contact ? infoRow('📞', 'Contact', contact) : ''}
            ${infoRow('📅', 'Reported', Utils.formatDate(item.created_at))}
            ${infoRow('🔖', 'Status', isOpen ? 'Open' : '✓ Resolved')}
          </div>
          <div class="dm-actions">
            ${contact
              ? `<button class="dm-action-btn ${isLost ? '' : 'dm-action-success'}" data-contact="${Utils.sanitize(contact)}" onclick="showToast('Contact: '+this.dataset.contact,'info',6000);DetailModal.close()">
                  📨 ${isLost ? 'I Found This' : 'I Lost This'}
                </button>`
              : `<button class="dm-action-btn" onclick="showToast('No contact info provided','warning');DetailModal.close()">💬 I Know This!</button>`}
            ${isOwn && isOpen
              ? `<button class="dm-action-btn dm-action-resolve" onclick="DetailModal.close();setTimeout(()=>LostFoundModule.resolve(${item.id},{_confirmPending:true,disabled:false,textContent:''}),50)">
                  ✓ Mark as Resolved
                </button>`
              : ''}
          </div>
        </div>
      </div>`);
  }

  /* ── Events ── */
  function openEvent(item) {
    const emoji     = EV_EMOJI[item.category] || '🗓️';
    const user      = AuthService.getUser();
    const isOwn     = user && user.id === item.user_id;
    const venue     = v(item.venue, '');
    const organizer = v(item.organizer, '');
    const contact   = v(item.contact, '') || v(item.poster_phone, '');
    const desc      = v(item.description, '');
    const poster    = v(item.organizer_name, 'Student');
    const posterDept = v(item.poster_department, '');
    const posterProg = v(item.poster_program, '');

    const isPast = new Date(item.event_date) < new Date(new Date().toDateString());
    const isCancelled = item.status === 'cancelled';
    const statusBadge = isCancelled
      ? `<span class="dm-badge" style="background:rgba(239,68,68,.15);color:#f87171">CANCELLED</span>`
      : isPast
        ? `<span class="dm-badge" style="background:rgba(156,163,175,.15);color:var(--text-muted)">PAST</span>`
        : `<span class="dm-badge dm-badge-upcoming">UPCOMING</span>`;

    const safeRegLink = item.registration_link && /^https?:\/\//i.test(item.registration_link)
      ? item.registration_link : '';

    show(`
      <div class="dm-modal events-modal">
        <button class="dm-close" onclick="DetailModal.close()">✕</button>
        <div class="dm-hero">
          ${item.image_url ? `<img class="dm-hero-img" src="${item.image_url}" alt="${Utils.sanitize(String(item.title))}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">` : ''}
          <div class="dm-hero-emoji" style="${item.image_url ? 'display:none' : ''};font-size:2.5rem">${emoji}</div>
          <div class="dm-hero-overlay">
            <div class="dm-badges">
              <span class="dm-badge dm-badge-cat">${Utils.sanitize(item.category || 'event')}</span>
              ${statusBadge}
            </div>
          </div>
        </div>
        <div class="dm-body">
          <div class="dm-title">${Utils.sanitize(String(item.title))}</div>
          ${desc ? `<p class="dm-desc">${Utils.sanitize(desc)}</p>` : ''}
          <div class="dm-info-grid">
            <div class="dm-info-row dm-info-highlight">
              <span class="dm-info-icon">📅</span>
              <div>
                <span class="dm-info-label">Date & Time</span>
                <span class="dm-info-value">${Utils.formatDate(item.event_date)}${item.event_time ? ' · ' + Utils.sanitize(item.event_time) : ''}</span>
              </div>
            </div>
            ${venue ? infoRow('📍', 'Venue', venue) : ''}
            ${organizer ? infoRow('🏢', 'Organizer', organizer) : ''}
            ${contact ? infoRow('📞', 'Contact', contact) : ''}
            ${infoRow('👤', 'Posted by', poster)}
            ${posterDept ? infoRow('🏫', 'Department', posterDept) : ''}
            ${posterProg ? infoRow('📖', 'Program', posterProg) : ''}
            ${infoRow('🕐', 'Posted', Utils.timeAgo(item.created_at))}
          </div>
          <div class="dm-actions">
            ${safeRegLink
              ? `<a href="${safeRegLink}" target="_blank" rel="noopener noreferrer" class="dm-action-btn dm-action-register" onclick="DetailModal.close()">🎟️ Register Now</a>`
              : `<button class="dm-action-btn" onclick="showToast('No registration link provided','info')">ℹ️ Event Details</button>`}
            ${contact
              ? `<button class="dm-action-btn dm-action-outline" data-contact="${Utils.sanitize(contact)}" onclick="showToast('Contact: '+this.dataset.contact,'info',6000);DetailModal.close()">📨 Contact</button>`
              : ''}
            ${isOwn && !isCancelled
              ? `<button class="dm-action-btn" style="background:rgba(239,68,68,.15);color:#f87171;border:1.5px solid rgba(239,68,68,.3)" onclick="DetailModal.close();setTimeout(()=>EventsModule.cancel(${item.id},{_confirmPending:true,disabled:false,textContent:''}),50)">🗑️ Cancel Event</button>`
              : ''}
          </div>
        </div>
      </div>`);
  }

  /* ── Notes & PYQ ── */
  function openNote(item) {
    const noteEmoji = item.type === 'pyq' ? '📋' : '📝';
    const hasLink   = item.drive_link && item.drive_link.replace(/\/+$/, '') !== 'https://drive.google.com' && item.drive_link.trim() !== '';
    const hasFile   = !!(item.download_url || item.file_url);
    const fileHref  = item.download_url || `/api/notes/${item.id}/file`;
    const dept      = v(item.department, '');
    const program   = v(item.program, '');
    const subject   = v(item.subject, '');
    const uploader  = v(item.uploader_name, 'Student');
    const desc      = v(item.description, '');
    const semester  = item.semester ? `Semester ${item.semester}` : null;

    show(`
      <div class="dm-modal notes-modal">
        <button class="dm-close" onclick="DetailModal.close()">✕</button>
        <div class="dm-hero dm-hero-notes">
          <div class="dm-hero-emoji dm-hero-emoji-notes">${noteEmoji}</div>
          <div class="dm-hero-overlay">
            <div class="dm-badges">
              <span class="dm-badge dm-badge-cat">${item.type === 'pyq' ? 'PYQ' : 'Notes'}</span>
              ${subject ? `<span class="dm-badge">${Utils.sanitize(subject)}</span>` : ''}
            </div>
          </div>
        </div>
        <div class="dm-body">
          <div class="dm-title">${Utils.sanitize(String(item.title))}</div>
          ${desc ? `<p class="dm-desc">${Utils.sanitize(desc)}</p>` : ''}
          <div class="dm-info-grid">
            ${dept ? infoRow('🏫', 'Department', dept) : ''}
            ${program ? infoRow('📖', 'Program', program) : ''}
            ${subject ? infoRow('📚', 'Subject', subject) : ''}
            ${semester ? infoRow('🗓️', 'Semester', semester) : ''}
            ${item.type === 'pyq' && item.exam_type ? infoRow('📝', 'Exam Type', item.exam_type.replace('_',' ')) : ''}
            ${item.type === 'pyq' && item.year ? infoRow('📅', 'Year', String(item.year)) : ''}
            ${infoRow('👤', 'Uploaded by', uploader)}
            ${infoRow('⬇️', 'Downloads', String(item.downloads || 0))}
            ${infoRow('🕐', 'Uploaded', Utils.timeAgo(item.created_at))}
          </div>
          <div class="dm-actions">
            ${hasLink
              ? `<a href="${Utils.safeHref(item.drive_link)}" target="_blank" rel="noopener noreferrer" class="dm-action-btn dm-action-download" onclick="NotesModule.trackDownload(${item.id});DetailModal.close()">📂 Open Drive Link</a>`
              : hasFile
                ? `<a href="${fileHref}" download class="dm-action-btn dm-action-download" onclick="NotesModule.trackDownload(${item.id});DetailModal.close()">⬇️ Download File</a>`
                : `<button class="dm-action-btn dm-action-disabled" disabled>⚠ No File Available</button>`}
          </div>
        </div>
      </div>`);
  }

  document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'detailModalOverlay') close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  return { openMarketplace, openLostFound, openEvent, openNote, close };
})();
