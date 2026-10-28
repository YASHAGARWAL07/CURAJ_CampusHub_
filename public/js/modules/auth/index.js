/* ── CU Hub Auth UI ───────────────────────────────────────── */
const AuthUI = {
  open(tab = 'login') {
    document.getElementById('authOverlay')?.classList.add('active');
    this.switchTab(tab);
  },
  close() {
    document.getElementById('authOverlay')?.classList.remove('active');
  },
  switchTab(tab) {
    ['login','register'].forEach(t => {
      const cap = t.charAt(0).toUpperCase() + t.slice(1);
      document.getElementById(`authTab${cap}`)?.classList.toggle('active', t === tab);
      document.getElementById(`${t}Pane`)?.classList.toggle('active', t === tab);
    });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  AuthService.restoreSession();

  /* Init register dept → program → semester cascade */
  if (typeof CURAJ !== 'undefined') {
    CURAJ.CURAJSelect.bind({
      deptId: 'regDepartment',
      progId: 'regProgram',
      semId:  'regSemester'
    });
  }

  document.getElementById('authCloseBtn')?.addEventListener('click', () => AuthUI.close());
  document.getElementById('authOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'authOverlay') AuthUI.close();
  });
  document.getElementById('showRegisterLink')?.addEventListener('click', e => { e.preventDefault(); AuthUI.switchTab('register'); });
  document.getElementById('showLoginLink')?.addEventListener('click',    e => { e.preventDefault(); AuthUI.switchTab('login'); });

  // ── Login ──────────────────────────────────────────────
  document.getElementById('loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const phone = document.getElementById('loginPhone').value.replace(/\D/g,'').slice(0,10);
    const pass  = document.getElementById('loginPassword').value;
    if (!phone || phone.length !== 10) { showToast('Please enter a valid 10-digit mobile number.', 'warning'); return; }
    if (!pass) { showToast('Enter your password', 'warning'); return; }
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Logging in…';
    try {
      const data = await Api.post('/api/auth/login', { phone, password: pass });
      AuthService.setSession(data.user, data.session_id);
      AuthUI.close();
      showToast(`Welcome back, ${data.user.name.split(' ')[0]}! 👋`, 'success');
      if (typeof loadDashboardStats === 'function') loadDashboardStats();
      setTimeout(() => { if (typeof checkProfileCompletion === 'function') checkProfileCompletion(); }, 300);
    } catch (err) {
      showToast(err.message || 'Login failed. Please check your mobile number and password.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Login';
    }
  });

  // ── Register ───────────────────────────────────────────
  // Password strength indicator
  document.getElementById('regPassword')?.addEventListener('input', function() {
    const val = this.value;
    let bar = document.getElementById('pwStrengthBar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'pwStrengthBar';
      bar.style.cssText = 'height:4px;border-radius:4px;margin-top:6px;transition:width .3s,background .3s;width:0';
      this.parentElement.appendChild(bar);
      const hint = document.createElement('div');
      hint.id = 'pwStrengthHint';
      hint.style.cssText = 'font-size:.75rem;margin-top:3px;color:var(--text-muted)';
      this.parentElement.appendChild(hint);
    }
    const hint = document.getElementById('pwStrengthHint');
    const hasLetter = /[A-Za-z]/.test(val);
    const hasNumber = /\d/.test(val);
    const hasSpecial = /[^A-Za-z0-9]/.test(val);
    const len = val.length;
    let score = 0, label = '', color = '';
    if (len >= 8) score++;
    if (len >= 12) score++;
    if (hasLetter && hasNumber) score++;
    if (hasSpecial) score++;
    if (score <= 1)     { label = 'Weak';   color = '#ef4444'; }
    else if (score <= 2){ label = 'Fair';   color = '#f59e0b'; }
    else if (score <= 3){ label = 'Good';   color = '#3b82f6'; }
    else                { label = 'Strong'; color = '#10b981'; }
    bar.style.cssText = `height:4px;border-radius:4px;margin-top:6px;transition:width .3s,background .3s;width:${score*25}%;background:${color}`;
    hint.style.color = color;
    hint.textContent = val ? label + (len < 8 ? ' — min 8 chars, include a number' : '') : '';
  });

  document.getElementById('registerForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const enrollment = document.getElementById('regEnrollment').value.trim().toUpperCase();
    const phone      = document.getElementById('regPhone').value.replace(/\D/g,'').slice(0,10);
    const password   = document.getElementById('regPassword').value;

    // Client-side validation
    if (!/^[A-Z0-9\/\-\.]{5,30}$/.test(enrollment)) {
      showToast('Invalid enrollment number. Use the format from your ID card (e.g. 22CUCSE001).', 'warning'); return;
    }
    if (!phone || phone.length !== 10) {
      showToast('Please enter a valid 10-digit mobile number.', 'warning'); return;
    }
    if (!password || !/^(?=.*[A-Za-z])(?=.*\d).{8,128}$/.test(password)) {
      showToast('Password must be at least 8 characters and include both a letter and a number.', 'warning'); return;
    }

    const semVal = document.getElementById('regSemester').value;
    const body = {
      name:       document.getElementById('regName').value.trim(),
      enrollment,
      department: document.getElementById('regDepartment').value,
      program:    document.getElementById('regProgram').value,
      semester:   semVal,
      year:       semVal ? String(Math.ceil(parseInt(semVal, 10) / 2)) : '',
      phone,
      password,
    };
    if (!body.department) { showToast('Please select your department before continuing.', 'warning'); return; }
    if (!body.program)    { showToast('Please select your program before continuing.', 'warning'); return; }
    if (!body.semester)   { showToast('Please select your current semester before continuing.', 'warning'); return; }
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Creating account…';
    try {
      const data = await Api.post('/api/auth/register', body);
      AuthService.setSession(data.user, data.session_id);
      AuthUI.close();
      showToast(`Welcome to CU Hub, ${data.user.name.split(' ')[0]}! 🎉`, 'success');
      if (typeof loadDashboardStats === 'function') loadDashboardStats();
      setTimeout(() => { if (typeof checkProfileCompletion === 'function') checkProfileCompletion(); }, 300);
    } catch (err) {
      showToast(err.message || 'Registration failed. Please check your details and try again.', 'error');
    } finally {
      btn.disabled = false; btn.textContent = 'Create Account';
    }
  });

  // ── Forgot Password ────────────────────────────────────
  document.getElementById('showForgotLink')?.addEventListener('click', e => {
    e.preventDefault();
    // Hide tabs, show forgot pane
    document.getElementById('loginPane').style.display = 'none';
    document.getElementById('registerPane').style.display = 'none';
    document.getElementById('forgotPane').style.display = 'block';
    document.getElementById('forgotStep1').style.display = 'block';
    document.getElementById('forgotStep2').style.display = 'none';
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
  });

  function backToLogin() {
    document.getElementById('forgotPane').style.display = 'none';
    document.getElementById('loginPane').style.display = 'block';
    document.getElementById('authTabLogin')?.classList.add('active');
    document.getElementById('forgotEnrollment').value = '';
  }

  document.getElementById('backToLoginLink')?.addEventListener('click', e => { e.preventDefault(); backToLogin(); });
  document.getElementById('backToLoginLink2')?.addEventListener('click', e => { e.preventDefault(); backToLogin(); });

  document.getElementById('forgotForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const enrollment = document.getElementById('forgotEnrollment').value.trim().toUpperCase();
    if (!enrollment) { showToast('Please enter your enrollment number.', 'warning'); return; }
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const data = await Api.post('/api/auth/forgot-password', { enrollment });
      // Show step 2 — link sent
      document.getElementById('forgotStep1').style.display = 'none';
      document.getElementById('forgotStep2').style.display = 'block';
      document.getElementById('forgotSentMsg').textContent =
        `A password reset link has been sent to ${data.email}. Open your university email and click the link.`;
    } catch (err) {
      showToast(err.message || 'Could not send reset email. Please try again.', 'error');
      btn.disabled = false; btn.textContent = 'Send Reset Link';
    }
  });

  // ── Reset Password (when user arrives from email link) ─
  function showResetModal(token) {
    document.getElementById('resetToken').value = token;
    document.getElementById('resetPassModal').style.display = 'flex';
    document.getElementById('resetNewPass').focus();
  }

  window.showResetModal = showResetModal;

  document.getElementById('resetPassForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const token   = document.getElementById('resetToken').value;
    const newPass = document.getElementById('resetNewPass').value;
    const confirm = document.getElementById('resetConfirmPass').value;
    if (newPass !== confirm) { showToast('Passwords do not match.', 'warning'); return; }
    if (newPass.length < 8)  { showToast('Password must be at least 8 characters.', 'warning'); return; }
    const btn = e.target.querySelector('button[type=submit]');
    btn.disabled = true; btn.textContent = 'Resetting…';
    try {
      const data = await Api.post('/api/auth/reset-password', { token, new_password: newPass });
      // Auto-login
      AuthService.setSession(data.user, data.session_id);
      document.getElementById('resetPassModal').style.display = 'none';
      // Clear sensitive password fields
      document.getElementById('resetNewPass').value = '';
      document.getElementById('resetConfirmPass').value = '';
      document.getElementById('resetToken').value = '';
      showToast('Password reset successfully! Welcome back 🎉', 'success');
      if (typeof loadDashboardStats === 'function') loadDashboardStats();
    } catch (err) {
      showToast(err.message || 'Could not reset password. Link may have expired.', 'error');
      btn.disabled = false; btn.textContent = 'Reset Password';
    }
  });

  // ── Detect reset token in URL on page load ─────────────
  const _urlParams = new URLSearchParams(window.location.search);
  const _resetToken = _urlParams.get('token');
  if (_resetToken && /^[a-f0-9]{64}$/.test(_resetToken)) {
    // Clean URL immediately
    window.history.replaceState({}, document.title, '/');
    // Show reset modal after DOM is ready
    setTimeout(() => showResetModal(_resetToken), 300);
  }
});
