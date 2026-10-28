/* ── Post Modals ─────────────────────────────────────────────
   Dept → Program → Semester cascade everywhere via CURAJ
─────────────────────────────────────────────────────────── */
const PostModals = (() => {

  const MAX_FILE_MB = 25;
  const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;
  const MAX_IMAGE_MB    = 5;
  const MAX_IMAGE_BYTES = MAX_IMAGE_MB * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = ['image/jpeg','image/jpg','image/png','image/gif','image/webp'];
  const ALLOWED_DOC_TYPES   = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];

  // Returns true if OK, false (and shows toast) if not
  function validateFile(file, allowedTypes, maxBytes, maxMb) {
    if (!file) return true; // no file is fine, handled elsewhere
    const limit      = maxBytes || MAX_FILE_BYTES;
    const limitLabel = maxMb    || MAX_FILE_MB;
    if (file.size > limit) {
      showToast(`File too large. Your file is ${(file.size/1024/1024).toFixed(1)}MB but the maximum allowed size is ${limitLabel}MB.`, 'error', 6000);
      return false;
    }
    if (!allowedTypes.includes(file.type)) {
      const exts = allowedTypes.includes('application/pdf')
        ? 'JPG, PNG, GIF, WEBP or PDF'
        : 'JPG, PNG, GIF or WEBP';
      showToast(`Invalid file type. Please upload ${exts}.`, 'error', 5000);
      return false;
    }
    return true;
  }

  function show(html) {
    document.getElementById('postModalBox').innerHTML = html;
    const overlay = document.getElementById('postModalOverlay');
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => overlay.classList.add('active'));
    document.getElementById('postModalBox').querySelector('input,select,textarea')?.focus();
  }

  function close() {
    const overlay = document.getElementById('postModalOverlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    setTimeout(() => {
      overlay.style.display = 'none';
      document.getElementById('postModalBox').innerHTML = '';
    }, 200);
  }

  /* Shared dept/program/semester HTML snippet */
  function dpsHtml(prefix, optional) {
    const lbl = optional ? ' (optional)' : ' *';
    return `
      <div class="modal-row">
        <div>
          <label class="cu-label">Department${lbl}</label>
          <select class="cu-input" id="${prefix}Dept"></select>
        </div>
        <div>
          <label class="cu-label">Program${lbl}</label>
          <select class="cu-input" id="${prefix}Prog"></select>
        </div>
      </div>
      <div class="modal-row">
        <div>
          <label class="cu-label">Semester${lbl}</label>
          <select class="cu-input" id="${prefix}Sem"></select>
        </div>
        <div style="visibility:hidden"></div>
      </div>`;
  }

  /* Bind cascade after modal HTML is in DOM */
  function bindDPS(prefix) {
    CURAJ.CURAJSelect.bind({
      deptId: prefix + 'Dept',
      progId: prefix + 'Prog',
      semId:  prefix + 'Sem'
    });
  }

  /* Pre-fill dept → program → semester (and optionally contact) from user profile.
     Must be called AFTER bindDPS() so the select options already exist. */
  function prefillFromUser(prefix, { fillContact = false } = {}) {
    const user = (typeof AuthService !== 'undefined') ? AuthService.getUser() : null;
    if (!user) return;

    const dept = (user.department || '').trim();
    const prog = (user.program   || '').trim();
    const sem  = String(user.semester || '');

    // Step 1 — set Dept and fire change → populates Program options
    const deptEl = document.getElementById(prefix + 'Dept');
    if (deptEl && dept) {
      deptEl.value = dept;
      deptEl.dispatchEvent(new Event('change'));
    }

    // Step 2 — set Program and fire change → populates Semester options
    setTimeout(() => {
      const progEl = document.getElementById(prefix + 'Prog');
      if (progEl && prog && progEl.querySelector(`option[value="${prog.replace(/"/g, '&quot;')}"]`)) {
        progEl.value = prog;
        progEl.dispatchEvent(new Event('change'));
      }

      // Step 3 — set Semester and fire change → populates Subject options (Notes modal)
      setTimeout(() => {
        const semEl = document.getElementById(prefix + 'Sem');
        if (semEl && sem && semEl.querySelector(`option[value="${sem}"]`)) {
          semEl.value = sem;
          semEl.dispatchEvent(new Event('change'));  // triggers subject cascade in Notes
        }
      }, 60);
    }, 60);

    // Contact — pre-fill phone if requested
    if (fillContact) {
      const contEl = document.getElementById(prefix + 'Contact');
      const phone  = (user.phone || user.contact || '').trim();
      if (contEl && phone && !contEl.value) contEl.value = phone;
    }
  }

  // ── Marketplace ──────────────────────────────────────────
  function openMarketplace() {
    show(`
      <div class="modal-inner">
        <div class="modal-head"><h3>📦 List an Item</h3><button class="modal-x" onclick="PostModals.close()">✕</button></div>
        <form id="mktForm" onsubmit="PostModals.submitMarketplace(event)">
          <label class="cu-label">Title *</label>
          <input class="cu-input" id="mktTitle" placeholder="e.g. NCERT Physics Class 12" required>
          <label class="cu-label">Description *</label>
          <textarea class="cu-input" id="mktDesc" rows="3" placeholder="Describe condition, usage…" required></textarea>
          <div class="modal-row">
            <div><label class="cu-label">Price (₹) *</label>
            <input class="cu-input" id="mktPrice" type="number" min="0" max="500000" placeholder="0 for Free" required></div>
            <div><label class="cu-label">Category</label>
            <select class="cu-input" id="mktCat">
              <option value="books">📚 Books</option>
              <option value="electronics">💻 Electronics</option>
              <option value="stationery">✏️ Stationery</option>
              <option value="furniture">🪑 Furniture</option>
              <option value="clothing">👕 Clothing</option>
              <option value="sports">⚽ Sports</option>
              <option value="other">📦 Other</option>
            </select></div>
          </div>
          <div class="modal-row">
            <div><label class="cu-label">Condition</label>
            <select class="cu-input" id="mktCond">
              <option value="like-new">Like New</option>
              <option value="good" selected>Good</option>
              <option value="fair">Fair</option>
              <option value="poor">Poor</option>
            </select></div>
            <div><label class="cu-label">Contact Number</label>
            <input class="cu-input" id="mktContact" type="tel" placeholder="Your phone number"></div>
          </div>
          ${dpsHtml('mkt', true)}
          <label class="cu-label">Photo (optional) <span style="font-size:.75rem;color:var(--text-muted)">JPG/PNG/GIF/WEBP · max ${MAX_IMAGE_MB}MB</span></label>
          <input class="cu-input" id="mktImage" type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp">
          <button class="cu-btn" type="submit" id="mktSubmitBtn" style="width:100%;margin-top:.75rem">List Item</button>
        </form>
      </div>`);
    bindDPS('mkt');
    prefillFromUser('mkt', { fillContact: true });
  }

  async function submitMarketplace(e) {
    e.preventDefault();
    const titleVal = document.getElementById('mktTitle').value.trim();
    const descVal  = document.getElementById('mktDesc').value.trim();
    const priceVal = document.getElementById('mktPrice').value;
    if (!titleVal) { showToast('Please enter a title for your listing.', 'warning'); document.getElementById('mktTitle')?.focus(); return; }
    if (!descVal)  { showToast('Please add a description for your listing.', 'warning'); document.getElementById('mktDesc')?.focus(); return; }
    if (priceVal === '' || isNaN(Number(priceVal)) || Number(priceVal) < 0) { showToast('Please enter a valid price (0 for free).', 'warning'); document.getElementById('mktPrice')?.focus(); return; }
    const img = document.getElementById('mktImage')?.files?.[0];
    if (!validateFile(img, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB)) return;
    const btn = document.getElementById('mktSubmitBtn');
    btn.disabled = true; btn.textContent = 'Posting…';
    try {
      const fd = new FormData();
      fd.append('title',       document.getElementById('mktTitle').value.trim());
      fd.append('description', document.getElementById('mktDesc').value.trim());
      fd.append('price',       document.getElementById('mktPrice').value);
      fd.append('category',    document.getElementById('mktCat').value);
      fd.append('condition',   document.getElementById('mktCond').value);
      fd.append('contact',     document.getElementById('mktContact').value.trim());
      fd.append('department',  document.getElementById('mktDept').value);
      fd.append('program',     document.getElementById('mktProg').value);
      fd.append('semester',    document.getElementById('mktSem').value);
      if (img) fd.append('image', img);
      await Api.postForm('/api/marketplace', fd);
      showToast('Your item has been listed successfully! Other students can now see it. 🎉', 'success');
      close();
      if (typeof MarketplaceModule !== 'undefined') MarketplaceModule.load();
    } catch (err) {
      showToast(err.message || 'Unable to publish your listing. Please check all required fields and try again.', 'error');
      btn.disabled = false; btn.textContent = 'List Item';
    }
  }

  // ── Lost & Found ─────────────────────────────────────────
  function openLostFound() {
    show(`
      <div class="modal-inner">
        <div class="modal-head"><h3>🔍 Report Item</h3><button class="modal-x" onclick="PostModals.close()">✕</button></div>
        <form id="lfForm" onsubmit="PostModals.submitLostFound(event)">
          <label class="cu-label">Type *</label>
          <div style="display:flex;gap:.75rem;margin-bottom:.75rem">
            <label style="flex:1;cursor:pointer"><input type="radio" name="lfType" value="lost" checked style="margin-right:.4rem">🔴 Lost</label>
            <label style="flex:1;cursor:pointer"><input type="radio" name="lfType" value="found" style="margin-right:.4rem">🟢 Found</label>
          </div>
          <label class="cu-label">Item Name *</label>
          <input class="cu-input" id="lfTitle" placeholder="e.g. Blue Water Bottle" required>
          <label class="cu-label">Description *</label>
          <textarea class="cu-input" id="lfDesc" rows="2" placeholder="Color, brand, identifying features…" required></textarea>
          <label class="cu-label">Location *</label>
          <input class="cu-input" id="lfLocation" placeholder="e.g. Library 2nd floor, Lab Block B" required>
          <label class="cu-label">Your Contact Number</label>
          <input class="cu-input" id="lfContact" type="tel" placeholder="So others can reach you">
          ${dpsHtml('lf', true)}
          <label class="cu-label">Photo (optional) <span style="font-size:.75rem;color:var(--text-muted)">JPG/PNG/GIF/WEBP · max ${MAX_IMAGE_MB}MB</span></label>
          <input class="cu-input" id="lfImage" type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp">
          <button class="cu-btn" type="submit" id="lfSubmitBtn" style="width:100%;margin-top:.75rem">Submit Report</button>
        </form>
      </div>`);
    bindDPS('lf');
    prefillFromUser('lf', { fillContact: true });
  }

  async function submitLostFound(e) {
    e.preventDefault();
    const titleVal    = document.getElementById('lfTitle').value.trim();
    const descVal     = document.getElementById('lfDesc').value.trim();
    const locationVal = document.getElementById('lfLocation').value.trim();
    if (!titleVal)    { showToast('Please enter the item name.', 'warning'); document.getElementById('lfTitle')?.focus(); return; }
    if (!descVal)     { showToast('Please describe the item.', 'warning'); document.getElementById('lfDesc')?.focus(); return; }
    if (!locationVal) { showToast('Please enter the location.', 'warning'); document.getElementById('lfLocation')?.focus(); return; }
    const img = document.getElementById('lfImage')?.files?.[0];
    if (!validateFile(img, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB)) return;
    const btn = document.getElementById('lfSubmitBtn');
    btn.disabled = true; btn.textContent = 'Submitting…';
    try {
      const fd = new FormData();
      const lfTypeEl = document.querySelector('input[name="lfType"]:checked');
      fd.append('title',       document.getElementById('lfTitle').value.trim());
      fd.append('description', document.getElementById('lfDesc').value.trim());
      fd.append('type',        lfTypeEl ? lfTypeEl.value : 'lost');
      fd.append('location',    document.getElementById('lfLocation').value.trim());
      fd.append('contact',     document.getElementById('lfContact').value.trim());
      fd.append('department',  document.getElementById('lfDept').value);
      fd.append('program',     document.getElementById('lfProg').value);
      fd.append('semester',    document.getElementById('lfSem').value);
      if (img) fd.append('image', img);
      await Api.postForm('/api/lost-found', fd);
      showToast('Your report has been submitted. Thank you for helping the community! 🙏', 'success');
      close();
      if (typeof LostFoundModule !== 'undefined') LostFoundModule.load();
    } catch (err) {
      showToast(err.message || 'Unable to submit your report. Please try again.', 'error');
      btn.disabled = false; btn.textContent = 'Submit Report';
    }
  }

  // ── Notes & PYQs ─────────────────────────────────────────
  function openNotes() {
    show(`
      <div class="modal-inner">
        <div class="modal-head"><h3>📚 Upload Material</h3><button class="modal-x" onclick="PostModals.close()">✕</button></div>
        <form id="notesForm" onsubmit="PostModals.submitNotes(event)">

          <label class="cu-label">Type</label>
          <div style="display:flex;gap:.75rem;margin-bottom:.75rem">
            <label style="flex:1;cursor:pointer"><input type="radio" name="notesType" value="notes" checked style="margin-right:.4rem">📝 Notes</label>
            <label style="flex:1;cursor:pointer"><input type="radio" name="notesType" value="pyq" style="margin-right:.4rem">📋 PYQ Paper</label>
          </div>

          <label class="cu-label">Title *</label>
          <input class="cu-input" id="nTitle" placeholder="e.g. DSA Complete Notes Sem 3" required>

          <label class="cu-label">Description <span style="font-size:.75rem;color:var(--text-muted)">(optional – helps others find this)</span></label>
          <textarea class="cu-input" id="nDesc" rows="2" placeholder="Brief description of this material…" style="resize:vertical"></textarea>

          <div class="modal-row">
            <div>
              <label class="cu-label">Department</label>
              <select class="cu-input" id="nDept"></select>
            </div>
            <div>
              <label class="cu-label">Program</label>
              <select class="cu-input" id="nProg"></select>
            </div>
          </div>

          <div class="modal-row">
            <div>
              <label class="cu-label">Semester</label>
              <select class="cu-input" id="nSem"></select>
            </div>
            <div>
              <label class="cu-label">Subject *</label>
              <select class="cu-input" id="nSubject"></select>
            </div>
          </div>

          <div id="nSubjectManualWrap" style="display:none">
            <label class="cu-label" style="color:var(--warning,#f59e0b)">⚠ Subject * <span style="font-size:.75rem;font-weight:400;color:var(--text-muted)">Select Dept → Program → Semester above, or type manually</span></label>
            <input class="cu-input" id="nSubjectManual" placeholder="e.g. Data Structures and Algorithms">
          </div>

          <div class="modal-row" id="nPyqRow" style="display:none">
            <div>
              <label class="cu-label">Exam Type</label>
              <select class="cu-input" id="nExam"></select>
            </div>
            <div>
              <label class="cu-label">Exam Year</label>
              <select class="cu-input" id="nYear"></select>
            </div>
          </div>

          <label class="cu-label">Google Drive Link <span style="font-size:.75rem;color:var(--text-muted)">(make sure link has view access)</span></label>
          <input class="cu-input" id="nDriveLink" type="url" placeholder="https://drive.google.com/…">
          <p style="font-size:.8rem;color:var(--text-muted);margin:-.25rem 0 .5rem">Or upload a file below (PDF, JPG, PNG · max ${MAX_FILE_MB}MB)</p>
          <input class="cu-input" id="nFile" type="file" accept="application/pdf,image/jpeg,image/jpg,image/png,image/gif,image/webp">

          <button class="cu-btn" type="submit" id="nSubmitBtn" style="width:100%;margin-top:.75rem">⬆ Upload</button>
        </form>
      </div>`);

    CURAJ.CURAJSelect.bind({
      deptId:    'nDept',
      progId:    'nProg',
      semId:     'nSem',
      subjectId: 'nSubject',
      examId:    'nExam',
      yearId:    'nYear'
    });

    // Pre-fill dept → program → semester from user profile (shared helper)
    prefillFromUser('n');

    // Show/hide manual subject input depending on whether cascade has options
    function syncSubjectToggle() {
      const subjectSel = document.getElementById('nSubject');
      const manualWrap = document.getElementById('nSubjectManualWrap');
      const hasOptions = subjectSel && subjectSel.options.length > 1;
      if (manualWrap) manualWrap.style.display = hasOptions ? 'none' : '';
    }
    document.getElementById('nSem')?.addEventListener('change', () => setTimeout(syncSubjectToggle, 60));
    // Re-run after prefillFromUser finishes (prefill takes ~180ms total via nested setTimeouts)
    setTimeout(syncSubjectToggle, 250);
    syncSubjectToggle();

    document.querySelectorAll('input[name="notesType"]').forEach(r => {
      r.addEventListener('change', function() {
        document.getElementById('nPyqRow').style.display =
          this.value === 'pyq' ? 'flex' : 'none';
      });
    });
  }

  async function submitNotes(e) {
    e.preventDefault();
    const title = document.getElementById('nTitle').value.trim();
    if (!title) { showToast('Please enter a title for your notes.', 'warning'); document.getElementById('nTitle')?.focus(); return; }
    const link = document.getElementById('nDriveLink').value.trim();
    const file = document.getElementById('nFile')?.files?.[0];
    if (!link && !file) { showToast('Please either upload a file or paste a Google Drive link before submitting.', 'warning'); return; }
    if (file && !validateFile(file, ALLOWED_DOC_TYPES)) return;

    // Subject: prefer cascade select; fall back to manual input
    const subjectSel    = document.getElementById('nSubject');
    const subjectManual = document.getElementById('nSubjectManual');
    const hasCascade    = subjectSel && subjectSel.options.length > 1;
    const subject       = hasCascade
      ? (subjectSel.value || '').trim()
      : ((subjectManual && subjectManual.value.trim()) || '');
    if (!subject) {
      if (hasCascade) showToast('Please select a subject from the dropdown list.', 'warning');
      else showToast('Please enter the subject name.', 'warning');
      return;
    }

    // Semester: if cascade was used, nSem has value; otherwise 0 is OK (server accepts it)
    const semVal = (document.getElementById('nSem').value || '0');
    if (hasCascade && (!semVal || semVal === '0')) {
      showToast('Please select your semester before uploading.', 'warning'); return;
    }

    const btn = document.getElementById('nSubmitBtn');
    btn.disabled = true; btn.textContent = 'Uploading…';
    try {
      const fd = new FormData();
      fd.append('title',       document.getElementById('nTitle').value.trim());
      fd.append('description', (document.getElementById('nDesc')?.value || '').trim());
      fd.append('subject',     subject);
      fd.append('semester',    semVal);
      fd.append('type',        (document.querySelector('input[name="notesType"]:checked')?.value) || 'notes');
      fd.append('department',  document.getElementById('nDept').value);
      fd.append('program',     document.getElementById('nProg').value);
      fd.append('exam_type',   document.getElementById('nExam').value);
      fd.append('year',        document.getElementById('nYear').value);
      fd.append('drive_link',  link);
      if (file) fd.append('file', file);
      // Read active tab BEFORE close() clears the modal DOM
      const activeTab = document.querySelector('input[name="notesType"]:checked')?.value || 'notes';
      await Api.postForm('/api/notes', fd);
      showToast('Your notes have been uploaded successfully. Thank you for sharing! 🎉', 'success');
      close();
      if (typeof NotesModule !== 'undefined') NotesModule.load(activeTab);
    } catch (err) {
      showToast(err.message || 'Upload failed. Please check all required fields and try again.', 'error');
      btn.disabled = false; btn.textContent = '⬆ Upload';
    }
  }

  // ── Events ───────────────────────────────────────────────
  function openEvent() {
    const minDate = new Date().toISOString().split('T')[0];
    show(`
      <div class="modal-inner">
        <div class="modal-head"><h3>🗓️ Post an Event</h3><button class="modal-x" onclick="PostModals.close()">✕</button></div>
        <form id="evForm" onsubmit="PostModals.submitEvent(event)">
          <label class="cu-label">Event Title *</label>
          <input class="cu-input" id="evTitle" placeholder="e.g. Machine Learning Workshop" required>
          <label class="cu-label">Description *</label>
          <textarea class="cu-input" id="evDesc" rows="2" placeholder="What is this event about?" required></textarea>
          <div class="modal-row">
            <div><label class="cu-label">Category</label>
            <select class="cu-input" id="evCat">
              <option value="workshop">🔧 Workshop</option>
              <option value="hackathon">💻 Hackathon</option>
              <option value="seminar">🎤 Seminar</option>
              <option value="cultural">🎭 Cultural</option>
              <option value="sports">⚽ Sports</option>
              <option value="club">👥 Club</option>
              <option value="tech">🖥️ Tech</option>
              <option value="other">📌 Other</option>
            </select></div>
            <div><label class="cu-label">Date * (future)</label>
            <input class="cu-input" id="evDate" type="date" min="${minDate}" required></div>
          </div>
          <div class="modal-row">
            <div><label class="cu-label">Time</label>
            <input class="cu-input" id="evTime" type="time"></div>
            <div><label class="cu-label">Venue *</label>
            <input class="cu-input" id="evVenue" placeholder="e.g. Seminar Hall A" required></div>
          </div>
          <div class="modal-row">
            <div><label class="cu-label">Organizer *</label>
            <input class="cu-input" id="evOrganizer" placeholder="e.g. Tech Club CURAJ" required></div>
            <div><label class="cu-label">Contact</label>
            <input class="cu-input" id="evContact" type="tel" placeholder="Contact number"></div>
          </div>
          ${dpsHtml('ev', true)}
          <label class="cu-label">Registration Link (optional)</label>
          <input class="cu-input" id="evRegLink" type="url" placeholder="https://forms.google.com/…">
          <label class="cu-label">Event Banner (optional) <span style="font-size:.75rem;color:var(--text-muted)">JPG/PNG/GIF/WEBP · max ${MAX_IMAGE_MB}MB</span></label>
          <input class="cu-input" id="evImage" type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp">
          <button class="cu-btn" type="submit" id="evSubmitBtn" style="width:100%;margin-top:.75rem">Post Event</button>
        </form>
      </div>`);
    bindDPS('ev');
    prefillFromUser('ev', { fillContact: true });
  }

  async function submitEvent(e) {
    e.preventDefault();
    const titleVal     = document.getElementById('evTitle').value.trim();
    const descVal      = document.getElementById('evDesc').value.trim();
    const dateVal      = document.getElementById('evDate').value;
    const venueVal     = document.getElementById('evVenue').value.trim();
    const organizerVal = document.getElementById('evOrganizer').value.trim();
    if (!titleVal)     { showToast('Please enter an event title.', 'warning'); document.getElementById('evTitle')?.focus(); return; }
    if (!descVal)      { showToast('Please add a description for the event.', 'warning'); document.getElementById('evDesc')?.focus(); return; }
    if (!dateVal)      { showToast('Please select an event date.', 'warning'); document.getElementById('evDate')?.focus(); return; }
    if (!venueVal)     { showToast('Please enter the event venue.', 'warning'); document.getElementById('evVenue')?.focus(); return; }
    if (!organizerVal) { showToast('Please enter the organizer name.', 'warning'); document.getElementById('evOrganizer')?.focus(); return; }
    const img = document.getElementById('evImage')?.files?.[0];
    if (!validateFile(img, ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MAX_IMAGE_MB)) return;
    const btn = document.getElementById('evSubmitBtn');
    btn.disabled = true; btn.textContent = 'Posting…';
    try {
      const timeVal = document.getElementById('evTime').value;
      let timeStr = '';
      if (timeVal) {
        const [hh, mm] = timeVal.split(':').map(Number);
        const ampm = hh >= 12 ? 'PM' : 'AM';
        const h12  = hh % 12 || 12;
        timeStr = `${h12}:${String(mm).padStart(2, '0')} ${ampm}`;
      }
      const fd = new FormData();
      fd.append('title',             document.getElementById('evTitle').value.trim());
      fd.append('description',       document.getElementById('evDesc').value.trim());
      fd.append('category',          document.getElementById('evCat').value);
      fd.append('event_date',        document.getElementById('evDate').value);
      fd.append('event_time',        timeStr);
      fd.append('venue',             document.getElementById('evVenue').value.trim());
      fd.append('organizer',         document.getElementById('evOrganizer').value.trim());
      fd.append('contact',           document.getElementById('evContact').value.trim());
      fd.append('department',        document.getElementById('evDept').value);
      fd.append('program',           document.getElementById('evProg').value);
      fd.append('semester',          document.getElementById('evSem').value);
      fd.append('registration_link', document.getElementById('evRegLink').value.trim());
      if (img) fd.append('image', img);
      await Api.postForm('/api/events', fd);
      showToast('Your event has been posted successfully! Students can now discover it. 🎉', 'success');
      close();
      if (typeof EventsModule !== 'undefined') EventsModule.load();
    } catch (err) {
      showToast(err.message || 'Unable to post the event. Please check all required fields and try again.', 'error');
      btn.disabled = false; btn.textContent = 'Post Event';
    }
  }

  return { openMarketplace, openLostFound, openNotes, openEvent,
           submitMarketplace, submitLostFound, submitNotes, submitEvent,
           close, show };
})();
