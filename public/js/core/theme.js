window.ThemeManager = (() => {
  function init() {
    const saved = localStorage.getItem('cuhub_theme') || 'light';
    apply(saved);
    document.getElementById('themeToggle')?.addEventListener('click', toggle);
  }
  function apply(t) {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('cuhub_theme', t);
    const icon = document.querySelector('#themeToggle .theme-icon');
    if (icon) icon.style.transform = t === 'dark' ? 'rotate(360deg)' : '';
    const lbl = document.querySelector('#themeToggle .theme-lbl');
    if (lbl) lbl.textContent = t === 'dark' ? 'Light Mode' : 'Dark Mode';
  }
  function toggle() { apply(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
  document.addEventListener('DOMContentLoaded', init);
  return { init, toggle };
})();
