const Utils = {
  timeAgo(date) {
    if (!date) return '';
    const d = new Date(String(date).trim().replace(' ', 'T'));
    if (isNaN(d)) return '';
    const s = Math.floor((Date.now() - d.getTime()) / 1000);
    if (s < 5)    return 'just now';
    if (s < 60)   return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s/60)}m ago`;
    if (s < 86400) return `${Math.floor(s/3600)}h ago`;
    if (s < 604800) return `${Math.floor(s/86400)}d ago`;
    return new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short'});
  },
  formatDate(d) {
    if (!d) return '';
    const dt = new Date(String(d).trim().replace(' ', 'T'));
    return isNaN(dt) ? '' : dt.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
  },
  sanitize(str) {
    if (str == null) return '';
    const d = document.createElement('div');
    d.textContent = String(str);
    return d.innerHTML;
  },
  truncate(str, n=80) { return str?.length > n ? str.slice(0,n)+'…' : (str || ''); },
  formatPrice(p) {
    const n = Number(p);
    return (isNaN(n) || n === 0) ? 'Free' : `₹${n.toLocaleString('en-IN')}`;
  },
  // Safe URL for href attributes — only allows http/https, blocks javascript: etc.
  safeHref(url) {
    if (!url || typeof url !== 'string') return '#';
    const u = url.trim();
    if (!/^https?:\/\//i.test(u)) return '#';
    return u;
  },
};
