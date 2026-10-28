/* ── CU Hub Profile Modal ──────────────────────────────────────
   Full view + edit with cascading Department → Program → Semester
──────────────────────────────────────────────────────────────── */
const ProfileModal = {

  open() {
    const user = AuthService.getUser();
    if (!user) { AuthUI.open('login'); return; }
    this._populateDeptDropdown();
    this._render(user);
    this._showMode('view');
    document.getElementById('profileModal').classList.add('active');
    document.body.style.overflow = 'hidden';
  },

  close() {
    document.getElementById('profileModal').classList.remove('active');
    document.body.style.overflow = '';
  },

  /* ── Dropdown population ─────────────────────────────────── */
  _populateDeptDropdown() {
    const deptSel = document.getElementById('pmEditDept');
    if (!deptSel) return;
    if (deptSel.options.length > 1) return; // already populated
    if (typeof CURAJ === 'undefined') return;
    CURAJ.getDepartments().forEach(d => {
      const o = document.createElement('option');
      o.value = o.textContent = d;
      deptSel.appendChild(o);
    });
  },

  _populateProgramDropdown(dept) {
    const progSel = document.getElementById('pmEditProgram');
    const semSel  = document.getElementById('pmEditSemester');
    if (!progSel) return;
    progSel.innerHTML = '<option value="">Select Program</option>';
    semSel && (semSel.innerHTML = '<option value="">Select Program first</option>');
    if (!dept) return;
    CURAJ.getPrograms(dept).forEach(p => {
      const o = document.createElement('option');
      o.value = o.textContent = p;
      progSel.appendChild(o);
    });
  },

  _populateSemesterDropdown(dept, prog) {
    const semSel = document.getElementById('pmEditSemester');
    if (!semSel) return;
    semSel.innerHTML = '<option value="">Select Semester</option>';
    if (!dept || !prog) return;
    CURAJ.getSemesters(dept, prog).forEach(s => {
      const o = document.createElement('option');
      o.value = String(s);
      o.textContent = `Semester ${s}`;
      semSel.appendChild(o);
    });
  },

  _bindCascade() {
    const deptSel = document.getElementById('pmEditDept');
    const progSel = document.getElementById('pmEditProgram');
    if (!deptSel || deptSel._cascadeBound) return;
    deptSel._cascadeBound = true;

    deptSel.addEventListener('change', () => {
      this._populateProgramDropdown(deptSel.value);
    });
    progSel && progSel.addEventListener('change', () => {
      progSel.style.border = '';  // clear highlight when user picks program
      this._populateSemesterDropdown(deptSel.value, progSel.value);
    });
  },

  /* ── Render both modes ───────────────────────────────────── */
  _render(user) {
    // Resolve avatar — fallback to generated initials avatar if URL is broken
    const avatarUrl = (user.avatar_url || '').trim();
    const ava = avatarUrl || CUAvatar.generate(user.name || 'U', 80);
    const generatedFallback = CUAvatar.generate(user.name || 'U', 80);

    /* View mode */
    const pmViewAvaEl = document.getElementById('pmViewAva');
    pmViewAvaEl.src = ava;
    pmViewAvaEl.onerror = () => { pmViewAvaEl.src = generatedFallback; pmViewAvaEl.onerror = null; };
    document.getElementById('pmViewName').textContent    = user.name || '—';
    document.getElementById('pmViewEnroll').textContent  = user.enrollment || '—';
    const bio = (user.bio || '').trim();
    const bioEl = document.getElementById('pmViewBio');
    bioEl.textContent   = bio;
    bioEl.style.display = bio ? '' : 'none';
    document.getElementById('pmViewDept').textContent    = user.department || '—';
    // Program: show real program name, blank out invalid/empty values
    const prog = (user.program || '').trim();
    const progInvalid = !prog || /^[-\u2013\u2014\s]+$/.test(prog) || prog.toLowerCase() === 'null' || prog.toLowerCase() === 'undefined' || /^\d+$/.test(prog);
    const progDisplay = progInvalid ? '—' : prog;
    const pmViewProgEl = document.getElementById('pmViewProgram');
    if (progInvalid) {
      pmViewProgEl.innerHTML = '<span style="color:var(--primary);cursor:pointer;font-size:.82rem;text-decoration:underline dotted" onclick="document.getElementById(&quot;pmEditBtn&quot;).click()" title="Click Edit Profile to set your program">Not set &#8211; tap to fix ✏️</span>';
    } else {
      pmViewProgEl.textContent = progDisplay;
    }

    // Year / Semester: derive year from semester if year field is missing
    let yearNum = user.year ? parseInt(user.year, 10) : 0;
    const semNum = user.semester ? parseInt(user.semester, 10) : 0;
    if ((!yearNum || isNaN(yearNum)) && semNum) yearNum = Math.ceil(semNum / 2);
    const yr  = (yearNum && !isNaN(yearNum) && yearNum > 0) ? `Year ${yearNum}` : '';
    const sem = (semNum && !isNaN(semNum) && semNum > 0) ? `Sem ${semNum}` : '';
    document.getElementById('pmViewYear').textContent = [yr, sem].filter(Boolean).join(' · ') || '—';
    document.getElementById('pmViewPhone').textContent = user.phone || user.contact || '—';
    if (user.created_at) {
      const d = new Date(user.created_at);
      document.getElementById('pmViewJoined').textContent =
        d.toLocaleDateString('en-IN', { year:'numeric', month:'short', day:'numeric' });
    }

    /* Edit mode pre-fill */
    const pmEditAvaEl = document.getElementById('pmEditAva');
    pmEditAvaEl.src = ava;
    pmEditAvaEl.onerror = () => { pmEditAvaEl.src = generatedFallback; pmEditAvaEl.onerror = null; };
    document.getElementById('pmEditName').value  = user.name || '';
    document.getElementById('pmEditBio').value   = user.bio  || '';
    document.getElementById('pmEditPhone').value = user.phone || user.contact || '';
    document.getElementById('pmEditEnroll').value = user.enrollment || '';
    this._updateBioCount();

    /* Set cascading dropdowns to saved values */
    const dept = user.department || '';
    const rawProg = user.program ? user.program.trim() : '';
    const editProg = (rawProg && rawProg !== '--' && !/^\d+$/.test(rawProg)) ? rawProg : '';
    const sem2 = user.semester   || '';
    const deptSel = document.getElementById('pmEditDept');
    if (deptSel) {
      deptSel.value = dept;
      if (dept) {
        this._populateProgramDropdown(dept);
        const progSel = document.getElementById('pmEditProgram');
        if (progSel) {
          if (editProg && progSel.querySelector(`option[value="${editProg.replace(/"/g,'&quot;')}"]`)) {
            // Saved program exists in options - select it
            progSel.value = editProg;
            this._populateSemesterDropdown(dept, editProg);
            const semSel = document.getElementById('pmEditSemester');
            if (semSel) semSel.value = String(sem2);
          } else if (!editProg && progSel.options.length > 1) {
            // No saved program but dept has programs - auto-select first and highlight
            progSel.selectedIndex = 1;
            progSel.style.border = '2px solid var(--primary)';
            progSel.title = 'Please confirm your program';
            const autoSelProg = progSel.value;
            if (autoSelProg) {
              this._populateSemesterDropdown(dept, autoSelProg);
              const semSel = document.getElementById('pmEditSemester');
              if (semSel && sem2) semSel.value = String(sem2);
            }
          }
        }
      }
    }
  },

  _showMode(mode) {
    document.getElementById('pmodeView').style.display       = mode === 'view'       ? '' : 'none';
    document.getElementById('pmodeEdit').style.display       = mode === 'edit'       ? '' : 'none';
    document.getElementById('pmodeChangePass').style.display = mode === 'changepass' ? '' : 'none';
    if (mode === 'edit') {
      this._bindCascade();
      setTimeout(() => document.getElementById('pmEditName')?.focus(), 60);
    }
    if (mode === 'changepass') {
      ['pmCurrentPass','pmNewPass','pmConfirmPass'].forEach(id => {
        const el = document.getElementById(id); if (el) el.value = '';
      });
      document.getElementById('pmPassStrengthBar').style.width = '0';
      document.getElementById('pmPassStrengthHint').textContent = '';
      setTimeout(() => document.getElementById('pmCurrentPass')?.focus(), 60);
    }
  },

  _updateBioCount() {
    const bio = document.getElementById('pmEditBio');
    const cnt = document.getElementById('pmBioCount');
    if (bio && cnt) cnt.textContent = bio.value.length;
  },

  /* ── Save ────────────────────────────────────────────────── */
  async _saveProfile() {
    const btn = document.getElementById('pmSaveBtn');
    const nameEl = document.getElementById('pmEditName');
    const name   = nameEl.value.trim();
    const bio    = document.getElementById('pmEditBio').value.trim();
    const phone  = document.getElementById('pmEditPhone').value.trim();
    const dept   = document.getElementById('pmEditDept').value;
    const prog   = document.getElementById('pmEditProgram').value;
    const sem    = document.getElementById('pmEditSemester').value;

    /* Validate */
    if (!name) {
      nameEl.classList.add('error');
      nameEl.focus();
      showToast('Please enter your full name.', 'warning');
      return;
    }
    if (phone && !/^\d{10}$/.test(phone)) {
      document.getElementById('pmEditPhone').classList.add('error');
      document.getElementById('pmEditPhone').focus();
      showToast('Please enter a valid 10-digit mobile number.', 'warning');
      return;
    }

    const origHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px;animation:spin .7s linear infinite"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Saving…';

    try {
      const data = await Api.patch('/api/auth/profile', {
        name, bio, phone, program: prog, semester: sem,
        department: dept   /* send dept so server can update it too */
      });
      AuthService.setSession(data.user, AuthService.getToken());
      this._render(data.user);
      this._showMode('view');
      showToast('Your profile has been updated successfully. ✅', 'success');
    } catch (err) {
      showToast(err.message || 'Unable to update your profile. Please try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHtml;
    }
  },

  /* ── Avatar upload ───────────────────────────────────────── */
  async _uploadAvatar(file) {
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) { showToast('Photo must be smaller than 3 MB. Please choose a smaller image.', 'warning'); return; }
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const data = await Api.upload('/api/auth/avatar', fd);
      const user = AuthService.getUser();
      if (user) { user.avatar_url = data.avatar_url; AuthService.setSession(user, AuthService.getToken()); }
      const url = data.avatar_url;
      ['pmEditAva','pmViewAva','profAva'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.src = url;
      });
      const mob = document.getElementById('mobProfAva');
      if (mob) mob.src = url;
      showToast('Your profile photo has been updated successfully. 🖼️', 'success');
    } catch (err) {
      showToast(err.message || 'Unable to upload your photo. Please try again.', 'error');
    }
  }
};

/* ── Event bindings ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {

  /* Open from dropdown */
  document.getElementById('viewProfileBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    document.getElementById('profileDropdown')?.classList.remove('open');
    document.getElementById('profileBtn')?.setAttribute('aria-expanded','false');
    ProfileModal.open();
  });

  /* Open from mobile avatar btn */
  document.getElementById('mobProfileBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (AuthService.isLoggedIn()) ProfileModal.open();
    else AuthUI.open('login');
  });

  /* Close */
  document.getElementById('profileModalClose')?.addEventListener('click', () => ProfileModal.close());
  document.getElementById('profileModal')?.addEventListener('click', e => {
    if (e.target.id === 'profileModal') ProfileModal.close();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('profileModal')?.classList.contains('active'))
      ProfileModal.close();
  });

  /* Edit / Cancel / Save */
  document.getElementById('pmEditBtn')?.addEventListener('click',   () => ProfileModal._showMode('edit'));
  document.getElementById('pmCancelBtn')?.addEventListener('click', () => ProfileModal._showMode('view'));
  document.getElementById('pmSaveBtn')?.addEventListener('click',   () => ProfileModal._saveProfile());

  /* Change Password */
  document.getElementById('pmChangePassBtn')?.addEventListener('click', () => ProfileModal._showMode('changepass'));
  document.getElementById('pmCancelPassBtn')?.addEventListener('click', () => ProfileModal._showMode('view'));

  document.getElementById('pmNewPass')?.addEventListener('input', function() {
    const val = this.value;
    const bar  = document.getElementById('pmPassStrengthBar');
    const hint = document.getElementById('pmPassStrengthHint');
    if (!bar || !hint) return;
    const score = [val.length >= 8, val.length >= 12, /[A-Za-z]/.test(val) && /\d/.test(val), /[^A-Za-z0-9]/.test(val)].filter(Boolean).length;
    const [label, color] = score <= 1 ? ['Weak','#ef4444'] : score <= 2 ? ['Fair','#f59e0b'] : score <= 3 ? ['Good','#3b82f6'] : ['Strong','#10b981'];
    bar.style.cssText  = `height:4px;border-radius:4px;margin-top:6px;transition:width .3s,background .3s;width:${score*25}%;background:${color}`;
    hint.style.color   = color;
    hint.textContent   = val ? label + (val.length < 8 ? ' — min 8 chars, include a number' : '') : '';
  });

  document.getElementById('pmSavePassBtn')?.addEventListener('click', async () => {
    const current = document.getElementById('pmCurrentPass').value;
    const newPass = document.getElementById('pmNewPass').value;
    const confirm = document.getElementById('pmConfirmPass').value;

    if (!current)  { showToast('Please enter your current password to continue.', 'warning'); return; }
    if (!newPass || !/^(?=.*[A-Za-z])(?=.*\d).{8,128}$/.test(newPass)) {
      showToast('New password must be at least 8 characters and include both letters and numbers.', 'warning'); return;
    }
    if (newPass !== confirm) { showToast('The passwords you entered do not match. Please re-enter them.', 'warning'); return; }

    const btn = document.getElementById('pmSavePassBtn');
    btn.disabled = true; btn.textContent = 'Updating…';
    try {
      const data = await Api.post('/api/auth/change-password', { current_password: current, new_password: newPass });
      // Re-store the new session token
      if (data.session_id) {
        localStorage.setItem('cuhub_token', data.session_id);
      }
      showToast('Password changed successfully. All other devices have been signed out. 🔒', 'success');
      ProfileModal._showMode('view');
    } catch (err) {
      showToast(err.message || 'Unable to change your password. Please check your current password and try again.', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg> Update Password';
    }
  });

  /* Bio char counter */
  document.getElementById('pmEditBio')?.addEventListener('input', () => ProfileModal._updateBioCount());

  /* Clear error class on input */
  ['pmEditName','pmEditPhone'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', e => e.target.classList.remove('error'));
  });

  /* Avatar upload */
  document.getElementById('pmAvaInput')?.addEventListener('change', e => {
    const file = e.target.files?.[0];
    if (!file) return;
    document.getElementById('pmEditAva').src = URL.createObjectURL(file);
    ProfileModal._uploadAvatar(file);
  });
});
