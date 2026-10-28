/* ── Notes & PYQs Module ────────────────────────────────────
   Full search: dept · program · semester · subject · (PYQ: exam type · year)
─────────────────────────────────────────────────────────── */
const NotesModule = (() => {
  let all = [], currentTab = 'notes';
  let currentFilter = { search: '', dept: '', program: '', sem: '', subject: '', examType: '', year: '' };
  const _map = {};

  function clean(val, fallback) {
    if (!val || val === '--' || String(val).trim() === '' || String(val) === 'null' || String(val) === 'undefined') return fallback || '';
    return val;
  }

  async function load(tab = 'notes') {
    currentTab = tab;
    currentFilter = { search: '', dept: '', program: '', sem: '', subject: '', examType: '', year: '' };
    const grid = document.getElementById('notesGrid');
    if (!grid) return;
    document.querySelectorAll('.notes-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
    _resetFilterUI();
    grid.innerHTML = '<div style="padding:2rem;color:var(--text-muted);text-align:center">Loading…</div>';
    try {
      const data = await Api.get(`/api/notes?type=${tab}`);
      all = Array.isArray(data) ? data : (data.items || []);
    } catch { all = []; }
    _buildFilterPanel();
    render(_applyFilters(), grid);
  }

  function _resetFilterUI() {
    const fb = document.getElementById('notesFilterBar');
    if (fb) { fb.innerHTML = ''; fb.style.display = 'none'; }
    const panel = document.getElementById('notesSearchPanel');
    if (panel) { panel.innerHTML = ''; panel.style.display = 'none'; }
  }


  /* ── Build the rich search/filter panel from CURAJ master data ── */
  function _buildFilterPanel() {
    const fb = document.getElementById('notesFilterBar');
    if (!fb || typeof CURAJ === 'undefined') return;

    const isPYQ = currentTab === 'pyq';

    // Departments always from CURAJ master data — full list, not just uploaded ones
    const allDepts = (typeof CURAJ !== 'undefined') ? CURAJ.getDepartments() : [];
    const examTypes = (typeof CURAJ !== 'undefined') ? CURAJ.EXAM_TYPES : ['CIA_I','CIA_II','END_SEM'];
    const years     = (typeof CURAJ !== 'undefined') ? [...CURAJ.YEARS].reverse() : [];

    fb.style.display = 'block';
    fb.innerHTML = `
      <div class="nsp-wrap">

        <!-- Row 1: search box -->
        <div class="nsp-search-row">
          <div class="nsp-search-box">
            <svg class="nsp-search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input id="nspSearch" class="nsp-search-input" type="text" placeholder="Search title, subject, description…"
              oninput="NotesModule.applyFilter('search',this.value)" value="${Utils.sanitize(currentFilter.search)}" autocomplete="off">
            <button id="nspSearchClear" class="nsp-search-clear" style="display:${currentFilter.search ? 'flex' : 'none'}"
              onclick="document.getElementById('nspSearch').value='';NotesModule.applyFilter('search','')">✕</button>
          </div>
          <button class="nsp-toggle-btn" id="nspToggleBtn" onclick="NotesModule.toggleAdvanced()" title="Advanced filters" aria-expanded="false">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" style="width:15px;height:15px;flex-shrink:0"><path d="M4 6h16M7 12h10M10 18h4"/></svg>
            <span class="nsp-toggle-lbl">Filters</span>
            <span id="nspActiveCount" class="nsp-active-count" style="display:none">0</span>
          </button>
        </div>

        <!-- Row 2: advanced filters (collapsible) -->
        <div class="nsp-advanced" id="nspAdvanced" style="display:none">
          <div class="nsp-selects-grid">

            <div class="nsp-field">
              <label class="nsp-label">🏫 Department</label>
              <select class="nsp-select" id="nspDept" onchange="NotesModule.applyFilter('dept',this.value)">
                <option value="">All Departments</option>
                ${allDepts.map(d => `<option value="${Utils.sanitize(d)}" ${currentFilter.dept===d?'selected':''}>${Utils.sanitize(d)}</option>`).join('')}
              </select>
            </div>

            <div class="nsp-field">
              <label class="nsp-label">📖 Program / Course</label>
              <select class="nsp-select" id="nspProgram" onchange="NotesModule.applyFilter('program',this.value)">
                <option value="">All Programs</option>
                ${_getProgOptions(currentFilter.dept)}
              </select>
            </div>

            <div class="nsp-field">
              <label class="nsp-label">📅 Semester</label>
              <select class="nsp-select" id="nspSem" onchange="NotesModule.applyFilter('sem',this.value)">
                <option value="">All Semesters</option>
                ${_getSemOptions(currentFilter.dept, currentFilter.program)}
              </select>
            </div>

            <div class="nsp-field">
              <label class="nsp-label">📝 Subject</label>
              <select class="nsp-select" id="nspSubject" onchange="NotesModule.applyFilter('subject',this.value)">
                <option value="">All Subjects</option>
                ${_getSubjectOptions(currentFilter.dept, currentFilter.program, currentFilter.sem)}
              </select>
            </div>

            ${isPYQ ? `
            <div class="nsp-field">
              <label class="nsp-label">📋 Exam Type</label>
              <select class="nsp-select" id="nspExamType" onchange="NotesModule.applyFilter('examType',this.value)">
                <option value="">All Exam Types</option>
                ${examTypes.map(e => `<option value="${Utils.sanitize(e)}" ${currentFilter.examType===e?'selected':''}>${Utils.sanitize(e.replace(/_/g,' '))}</option>`).join('')}
              </select>
            </div>

            <div class="nsp-field">
              <label class="nsp-label">📆 Year</label>
              <select class="nsp-select" id="nspYear" onchange="NotesModule.applyFilter('year',this.value)">
                <option value="">All Years</option>
                ${years.map(y => `<option value="${y}" ${String(currentFilter.year)===String(y)?'selected':''}>${y}</option>`).join('')}
              </select>
            </div>` : ''}

          </div>

          <div class="nsp-actions-row">
            <span id="nspResultCount" class="nsp-result-count"></span>
            <button class="nsp-clear-all" onclick="NotesModule.clearFilters()">✕ Clear all filters</button>
          </div>
        </div>

      </div>`;

    _updateActiveCount();
  }

  /* ── Option generators using CURAJ master data ───────────── */
  function _getProgOptions(dept) {
    if (!dept || typeof CURAJ === 'undefined') return '';
    return CURAJ.getPrograms(dept)
      .map(p => `<option value="${Utils.sanitize(p)}" ${currentFilter.program===p?'selected':''}>${Utils.sanitize(p)}</option>`)
      .join('');
  }

  function _getSemOptions(dept, prog) {
    if (!dept || !prog || typeof CURAJ === 'undefined') {
      // No dept/prog selected: show all semesters 1–10
      return Array.from({length:10}, (_,i) => i+1)
        .map(s => `<option value="${s}" ${String(currentFilter.sem)===String(s)?'selected':''}>Semester ${s}</option>`)
        .join('');
    }
    return CURAJ.getSemesters(dept, prog)
      .map(s => `<option value="${s}" ${String(currentFilter.sem)===String(s)?'selected':''}>Semester ${s}</option>`)
      .join('');
  }

  function _getSubjectOptions(dept, prog, sem) {
    if (!dept || !prog || !sem || typeof CURAJ === 'undefined') return '';
    return CURAJ.getSubjects(dept, prog, sem)
      .map(s => `<option value="${Utils.sanitize(s)}" ${currentFilter.subject===s?'selected':''}>${Utils.sanitize(s)}</option>`)
      .join('');
  }

  /* ── Cascade: re-populate program dropdown from CURAJ ────── */
  function _cascadePrograms() {
    const progSel = document.getElementById('nspProgram');
    if (!progSel) return;

    const progs = (currentFilter.dept && typeof CURAJ !== 'undefined')
      ? CURAJ.getPrograms(currentFilter.dept) : [];

    // If previously selected program no longer valid, clear it
    if (currentFilter.program && !progs.includes(currentFilter.program)) {
      currentFilter.program = '';
      currentFilter.sem     = '';
      currentFilter.subject = '';
    }

    progSel.innerHTML = `<option value="">All Programs</option>` +
      progs.map(p => `<option value="${Utils.sanitize(p)}" ${currentFilter.program===p?'selected':''}>${Utils.sanitize(p)}</option>`).join('');

    _cascadeSemesters();
  }

  /* ── Cascade: re-populate semester dropdown from CURAJ ───── */
  function _cascadeSemesters() {
    const semSel = document.getElementById('nspSem');
    if (!semSel) return;

    let semOptions = '';
    if (currentFilter.dept && currentFilter.program && typeof CURAJ !== 'undefined') {
      const sems = CURAJ.getSemesters(currentFilter.dept, currentFilter.program);
      if (currentFilter.sem && !sems.map(String).includes(String(currentFilter.sem))) {
        currentFilter.sem     = '';
        currentFilter.subject = '';
      }
      semOptions = sems.map(s =>
        `<option value="${s}" ${String(currentFilter.sem)===String(s)?'selected':''}>Semester ${s}</option>`
      ).join('');
    } else {
      // Show generic 1–10 when no dept+prog selected
      semOptions = Array.from({length:10}, (_,i) => i+1).map(s =>
        `<option value="${s}" ${String(currentFilter.sem)===String(s)?'selected':''}>Semester ${s}</option>`
      ).join('');
    }

    semSel.innerHTML = `<option value="">All Semesters</option>` + semOptions;
    _cascadeSubjects();
  }

  /* ── Cascade: re-populate subject dropdown from CURAJ ────── */
  function _cascadeSubjects() {
    const subjSel = document.getElementById('nspSubject');
    if (!subjSel) return;

    const subjects = (currentFilter.dept && currentFilter.program && currentFilter.sem && typeof CURAJ !== 'undefined')
      ? CURAJ.getSubjects(currentFilter.dept, currentFilter.program, currentFilter.sem)
      : [];

    if (currentFilter.subject && !subjects.includes(currentFilter.subject)) {
      currentFilter.subject = '';
    }

    subjSel.innerHTML = `<option value="">All Subjects</option>` +
      subjects.map(s => `<option value="${Utils.sanitize(s)}" ${currentFilter.subject===s?'selected':''}>${Utils.sanitize(s)}</option>`).join('');

    // Re-render with current filters
    const grid = document.getElementById('notesGrid');
    if (grid) render(_applyFilters(), grid);
  }

  /* ── Count active filters and show badge ─────────────────── */
  function _updateActiveCount() {
    const active = ['dept','program','sem','subject','examType','year'].filter(k => currentFilter[k]).length;
    const badge  = document.getElementById('nspActiveCount');
    const btn    = document.getElementById('nspToggleBtn');
    if (badge) {
      badge.textContent = active;
      badge.style.display = active > 0 ? 'inline-flex' : 'none';
    }
    if (btn) btn.classList.toggle('nsp-toggle-active', active > 0);
    // Update result count label
    const countEl = document.getElementById('nspResultCount');
    if (countEl) {
      const n = _applyFilters().length;
      countEl.textContent = `${n} result${n !== 1 ? 's' : ''}`;
    }
    // Show/hide search clear button
    const sc = document.getElementById('nspSearchClear');
    if (sc) sc.style.display = currentFilter.search ? 'flex' : 'none';
  }

  /* ── Apply all active filters ────────────────────────────── */
  function _applyFilters() {
    return all.filter(i => {
      if (currentFilter.dept     && clean(i.department)  !== currentFilter.dept)     return false;
      if (currentFilter.program  && clean(i.program)     !== currentFilter.program)  return false;
      if (currentFilter.sem      && String(i.semester)   !== String(currentFilter.sem)) return false;
      if (currentFilter.subject  && clean(i.subject)     !== currentFilter.subject)  return false;
      if (currentFilter.examType && clean(i.exam_type)   !== currentFilter.examType) return false;
      if (currentFilter.year     && String(i.year)       !== String(currentFilter.year)) return false;
      if (currentFilter.search) {
        const q = currentFilter.search.toLowerCase();
        if (![i.title, i.subject, i.department, i.program, i.description, i.uploader_name]
              .some(v => (v || '').toLowerCase().includes(q))) return false;
      }
      return true;
    });
  }

  /* ── Public: set a filter value and re-render ────────────── */
  function applyFilter(type, value) {
    currentFilter[type] = value;
    if (type === 'dept') {
      // Reset all dependent filters when dept changes
      currentFilter.program = '';
      currentFilter.sem     = '';
      currentFilter.subject = '';
      const ps = document.getElementById('nspProgram');  if (ps) ps.value = '';
      const ss = document.getElementById('nspSem');      if (ss) ss.value = '';
      const xs = document.getElementById('nspSubject');  if (xs) xs.value = '';
      _cascadePrograms();  // cascades → semesters → subjects → render
      return;
    }
    if (type === 'program') {
      currentFilter.sem     = '';
      currentFilter.subject = '';
      const ss = document.getElementById('nspSem');      if (ss) ss.value = '';
      const xs = document.getElementById('nspSubject');  if (xs) xs.value = '';
      _cascadeSemesters();  // cascades → subjects → render
      return;
    }
    if (type === 'sem') {
      currentFilter.subject = '';
      const xs = document.getElementById('nspSubject');  if (xs) xs.value = '';
      _cascadeSubjects();   // repopulates subjects → render
      return;
    }
    // For subject, examType, year, search — just re-render
    _updateActiveCount();
    const grid = document.getElementById('notesGrid');
    if (grid) render(_applyFilters(), grid);
  }

  /* ── Public: toggle advanced panel open/closed ───────────── */
  function toggleAdvanced() {
    const panel = document.getElementById('nspAdvanced');
    if (!panel) return;
    const open = panel.style.display === 'none' || panel.style.display === '';
    panel.style.display = open ? 'block' : 'none';
    const btn = document.getElementById('nspToggleBtn');
    if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /* ── Public: clear every filter ─────────────────────────── */
  function clearFilters() {
    currentFilter = { search: '', dept: '', program: '', sem: '', subject: '', examType: '', year: '' };
    ['nspSearch','nspDept','nspProgram','nspSem','nspSubject','nspExamType','nspYear']
      .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
    // Rebuild all cascaded dropdowns from scratch via CURAJ data, then render
    _cascadePrograms();
  }

  /* ── Render cards ────────────────────────────────────────── */
  function render(items, grid) {
    _updateActiveCount();
    if (!items.length) {
      const hasFilter = Object.values(currentFilter).some(Boolean);
      grid.innerHTML = `<div class="empty-state">
        <div class="empty-icon">📚</div>
        <p>${hasFilter
          ? 'No results match your filters. <button class="link-btn" onclick="NotesModule.clearFilters()">Clear filters</button>'
          : `No ${currentTab === 'pyq' ? 'PYQ papers' : 'notes'} uploaded yet. Be the first to share!`}
        </p>
      </div>`;
      return;
    }
    items.forEach(i => { _map[i.id] = i; });

    grid.innerHTML = items.map(i => {
      const hasLink    = i.drive_link && i.drive_link.replace(/\/+$/, '') !== 'https://drive.google.com' && i.drive_link.trim() !== '';
      const hasFile    = !!(i.download_url || i.file_url);
      const fileHref   = i.download_url || `/api/notes/${i.id}/file`;
      const noteEmoji  = i.type === 'pyq' ? '📋' : '📝';
      const saved      = isBookmarked(i.id, 'notes');
      const bmTitle    = JSON.stringify((i.title || '').trim()).replace(/"/g, '&quot;');
      const bmEmoji    = JSON.stringify(noteEmoji).replace(/"/g, '&quot;');
      const dept       = clean(i.department);
      const deptShort  = dept ? dept.split(' ')[0] : '';
      const subject    = clean(i.subject);
      const semLabel   = i.semester ? `Sem ${i.semester}` : '';
      const uploader   = clean(i.uploader_name, 'Student');
      const desc       = clean(i.description);
      const dlBtn = hasLink
        ? `<a href="${Utils.safeHref(i.drive_link)}" target="_blank" rel="noopener noreferrer"
             onclick="event.stopPropagation();NotesModule.trackDownload(${i.id})"
             class="btn btn-primary btn-sm" title="Open Google Drive link">📂 Drive Link</a>`
        : hasFile
          ? `<a href="${fileHref}" download
               onclick="event.stopPropagation();NotesModule.trackDownload(${i.id})"
               class="btn btn-primary btn-sm" title="Download file">⬇ Download</a>`
          : `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();NotesModule._openModal(${i.id})">View Details</button>`;
      return `
        <article class="card" data-module="notes" data-id="${i.id}">
          <div class="card-img-placeholder" style="height:80px;font-size:2rem">${noteEmoji}</div>
          <button class="bookmark-btn ${saved ? 'bookmarked' : ''}" title="${saved ? 'Remove bookmark' : 'Bookmark'}"
            onclick="event.stopPropagation();toggleBookmark(${i.id},'notes',${bmTitle},${bmEmoji},this)">🔖</button>
          <div class="card-body">
            <div class="card-meta">
              ${deptShort ? `<span class="badge badge-dept">${Utils.sanitize(deptShort)}</span>` : ''}
              ${subject   ? `<span class="badge badge-exam">${Utils.sanitize(subject)}</span>`   : ''}
              ${semLabel  ? `<span class="badge">${semLabel}</span>`                             : ''}
              ${i.type==='pyq' && i.exam_type ? `<span class="badge">${Utils.sanitize(i.exam_type.replace(/_/g,' '))}</span>` : ''}
              ${i.type==='pyq' && i.year      ? `<span class="badge">${i.year}</span>`                                        : ''}
            </div>
            <div class="card-title">${Utils.sanitize(i.title)}</div>
            ${desc ? `<div class="card-desc">${Utils.sanitize(desc)}</div>` : ''}
            <div class="card-footer">
              <span class="text-muted">⬇ ${i.downloads||0} · ${Utils.sanitize(uploader)}</span>
              <div class="card-actions">${dlBtn}</div>
            </div>
          </div>
        </article>`;
    }).join('');

    grid.onclick = (e) => {
      const card = e.target.closest('[data-module="notes"]');
      if (!card) return;
      if (e.target.closest('button,a')) return;
      const item = _map[card.dataset.id];
      if (item) DetailModal.openNote(item);
    };
  }

  function _openModal(id) {
    const item = _map[id];
    if (item) DetailModal.openNote(item);
  }

  async function trackDownload(id) {
    try { await Api.post(`/api/notes/${id}/download`, {}); } catch {}
  }

  return { load, trackDownload, _openModal, applyFilter, clearFilters, toggleAdvanced, _cascadePrograms };
})();
