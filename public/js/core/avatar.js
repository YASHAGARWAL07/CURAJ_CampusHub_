/* ── CU Hub Local Avatar Generator ─────────────────────────────
   Generates a canvas-based avatar data URL — no external requests
──────────────────────────────────────────────────────────────── */
const CUAvatar = {
  /* Palette of pleasant background colours */
  _palette: [
    ['#5b5fc7','#e8e7fc'], // primary indigo / light indigo
    ['#7c3aed','#ede9fe'], // violet
    ['#0ea5e9','#e0f2fe'], // sky
    ['#10b981','#d1fae5'], // emerald
    ['#f59e0b','#fef3c7'], // amber
    ['#ef4444','#fee2e2'], // red
    ['#ec4899','#fce7f3'], // pink
    ['#6366f1','#e0e7ff'], // indigo
  ],

  /* Pick a stable colour pair based on the name string */
  _colorFor(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return this._palette[Math.abs(h) % this._palette.length];
  },

  /* Extract up to 2 initials from a name */
  _initials(name) {
    if (!name) return 'G';
    return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  },

  /**
   * Draw a person silhouette icon (head + shoulders) for guest avatars.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} size  - Canvas size in px
   * @param {string} color - Fill colour for the icon
   */
  _drawPersonIcon(ctx, size, color) {
    const cx = size / 2;
    ctx.fillStyle = color;

    // Head circle — centred at ~38% from top
    const headR = size * 0.195;
    const headY = size * 0.365;
    ctx.beginPath();
    ctx.arc(cx, headY, headR, 0, Math.PI * 2);
    ctx.fill();

    // Shoulders / body — half-ellipse arc at bottom
    const bodyW = size * 0.58;
    const bodyH = size * 0.30;
    const bodyY = size * 0.76;
    ctx.beginPath();
    ctx.ellipse(cx, bodyY, bodyW / 2, bodyH / 2, 0, Math.PI, 0);  // upper half only
    ctx.fill();
  },

  /**
   * Generate a data URL avatar for the given name.
   * @param {string} name   - Person's name (used for initials + colour)
   * @param {number} size   - Canvas size in px (default 80)
   * @param {boolean} guest - Force the guest person-icon style
   */
  generate(name, size = 80, guest = false) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');

    const [bg, _fg] = guest ? ['#e8e7fc', '#5b5fc7'] : this._colorFor(name || 'G');
    const iconOrTextColor = guest ? '#5b5fc7' : '#ffffff';

    /* Background circle */
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = bg;
    ctx.fill();

    if (guest) {
      /* Person silhouette icon */
      this._drawPersonIcon(ctx, size, iconOrTextColor);
    } else {
      /* Initials text */
      const initials = this._initials(name);
      const fontSize = Math.round(size * (initials.length > 1 ? 0.38 : 0.44));
      ctx.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
      ctx.fillStyle = iconOrTextColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(initials, size / 2, size / 2 + 1);
    }

    return canvas.toDataURL('image/png');
  },

  /** Set src of an <img> element using a generated avatar */
  apply(imgEl, name, size = 80, guest = false) {
    if (!imgEl) return;
    imgEl.src = this.generate(name, size, guest);
  },

  /** Apply to all user avatar img elements at once */
  applyAll(name, isGuest = false) {
    this.apply(document.getElementById('profAva'),    name, 40,  isGuest);
    this.apply(document.getElementById('mobProfAva'), name, 36,  isGuest);
    this.apply(document.getElementById('dropCardAva'),name, 36,  isGuest);
  }
};

/** Call once on DOMContentLoaded to set guest avatars before session restores */
CUAvatar.initGuest = function() {
  this.apply(document.getElementById('profAva'),    'G', 40,  true);
  this.apply(document.getElementById('mobProfAva'), 'G', 36,  true);
};
