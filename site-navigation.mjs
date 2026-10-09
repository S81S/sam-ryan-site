// Shared behavior for the responsive shell; the inline toggle remains a fallback
// until this module has bound its replacement.
export function installSiteNavigation(doc = document, win = window) {
  const root = doc.documentElement;
  const ready = Symbol.for('carswithsam.siteNavigation');
  if (root[ready]) return;
  const toggle = doc.querySelector('.nav-toggle');
  const nav = doc.getElementById('primary-nav');
  if (!toggle || !nav || toggle.classList.contains('menu-toggle')) return;

  const moreMenus = [...nav.querySelectorAll('.nav-more')];
  const mobile = win.matchMedia('(max-width: 700px)');
  const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
  const setOpen = open => {
    toggle.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  };
  const closeMore = () => moreMenus.forEach(more => { more.open = false; });
  const closeAll = () => { closeMore(); setOpen(false); };

  toggle.addEventListener('click', () => {
    const open = !isOpen();
    if (!open) closeMore();
    setOpen(open);
  });
  toggle.removeAttribute('onclick');
  root[ready] = true;

  nav.addEventListener('click', event => {
    if (event.target.closest?.('a[href]')) closeAll();
  });
  doc.addEventListener('click', event => {
    if (!nav.contains(event.target) && !toggle.contains(event.target)) closeAll();
  });
  doc.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const expandedMore = moreMenus.find(more => more.open);
    if (expandedMore) {
      expandedMore.open = false;
      expandedMore.querySelector('summary')?.focus();
      event.preventDefault();
    } else if (mobile.matches && isOpen()) {
      closeAll();
      toggle.focus();
      event.preventDefault();
    }
  });

  // Folding, rotation, zoom, or resizing can hide the focused navigation item.
  // Keep focus on an equivalent visible control without moving page-content focus.
  const resetForWidth = () => {
    const active = doc.activeElement;
    const focusedMore = moreMenus.find(more => more.contains(active));
    closeAll();
    if (mobile.matches && nav.contains(active)) toggle.focus();
    else if (!mobile.matches && active === toggle) nav.querySelector('a[href]')?.focus();
    else if (!mobile.matches && focusedMore) focusedMore.querySelector('summary')?.focus();
  };
  if (mobile.addEventListener) mobile.addEventListener('change', resetForWidth);
  else mobile.addListener?.(resetForWidth);
  if (!mobile.matches) setOpen(false);
  else nav.classList.toggle('is-open', isOpen());

  // Includes safe-area padding and wrapped labels in the reserved page space.
  const dock = doc.querySelector('.sticky-mobile');
  const header = doc.querySelector('[data-site-header]');
  const measureLayout = () => {
    if (dock) {
      const height = dock.getBoundingClientRect().height;
      if (Number.isFinite(height)) root.style.setProperty('--cws-bottom-dock-height', `${Math.ceil(height)}px`);
    }
    if (header && win.getComputedStyle) {
      const position = win.getComputedStyle(header).position;
      const height = header.getBoundingClientRect().height;
      if (Number.isFinite(height)) root.style.setProperty('--cws-header-offset', `${['sticky', 'fixed'].includes(position) ? Math.ceil(height) + 16 : 16}px`);
    }
  };
  measureLayout();
  if (win.ResizeObserver) {
    const observer = new win.ResizeObserver(measureLayout);
    if (dock) observer.observe(dock);
    if (header) observer.observe(header);
  }
  win.addEventListener('resize', measureLayout, { passive: true });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => installSiteNavigation(), { once: true });
  } else installSiteNavigation();
}
