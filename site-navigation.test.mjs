import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./site-navigation.mjs', import.meta.url), 'utf8').replace('export function', 'function');

function page({ mobile = true, loading = false, legacy = false, observer = true, fallbackOpen = false } = {}) {
  const listeners = new Map();
  const element = (tag, parent = null, classes = []) => {
    const attrs = new Map(), events = new Map(), tokens = new Set(classes);
    const node = {
      tag, parent, children: [], open: false, events, attrs,
      classList: { contains: key => tokens.has(key), toggle(key, on) { if (on) tokens.add(key); else tokens.delete(key); } },
      setAttribute: (key, value) => attrs.set(key, String(value)),
      getAttribute: key => attrs.get(key) ?? null,
      removeAttribute: key => attrs.delete(key),
      addEventListener(type, callback) { if (!events.has(type)) events.set(type, []); events.get(type).push(callback); },
      contains(target) { for (let current = target; current; current = current.parent) if (current === this) return true; return false; },
      closest(selector) { for (let current = this; current; current = current.parent) if (selector === 'a[href]' && current.tag === 'a' && current.attrs.has('href')) return current; return null; },
      querySelectorAll(selector) {
        const result = [];
        const visit = node => node.children.forEach(child => {
          if (selector === '.nav-more' && child.classList.contains('nav-more') || selector === 'summary' && child.tag === 'summary' || selector === 'a[href]' && child.tag === 'a' && child.attrs.has('href')) result.push(child);
          visit(child);
        });
        visit(this); return result;
      },
      querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; },
      focus() { document.activeElement = this; }
    };
    parent?.children.push(node); return node;
  };
  const body = element('body');
  const toggle = element('button', body, legacy ? ['nav-toggle', 'menu-toggle'] : ['nav-toggle']);
  toggle.setAttribute('aria-expanded', String(fallbackOpen));
  toggle.setAttribute('onclick', 'fallback');
  const toggleIcon = element('span', toggle);
  const nav = element('nav', body); nav.classList.toggle('is-open', fallbackOpen);
  const firstLink = element('a', nav); firstLink.setAttribute('href', '/inventory');
  const more = element('details', nav, ['nav-more']);
  const summary = element('summary', more);
  const moreLink = element('a', more); moreLink.setAttribute('href', '/reviews');
  const linkIcon = element('span', moreLink);
  const content = element('input', body), dock = element('div', body), header = element('header', body);
  dock.height = mobile ? 58.4 : 0;
  dock.getBoundingClientRect = () => ({ height: dock.height });
  header.height = 128.4;
  header.position = mobile ? 'relative' : 'sticky';
  header.getBoundingClientRect = () => ({ height: header.height });
  const css = new Map();
  const document = {
    readyState: loading ? 'loading' : 'complete', activeElement: content,
    documentElement: { style: { setProperty: (key, value) => css.set(key, value) } },
    querySelector: selector => selector === '.nav-toggle' ? toggle : selector === '.sticky-mobile' ? dock : selector === '[data-site-header]' ? header : null,
    getElementById: id => id === 'primary-nav' ? nav : null,
    addEventListener(type, callback, options) { if (!listeners.has(type)) listeners.set(type, []); listeners.get(type).push({ callback, options }); }
  };
  const media = { matches: mobile, addEventListener(type, callback) { this.callback = callback; } };
  const window = {
    matchMedia: query => { assert.equal(query, '(max-width: 700px)'); return media; },
    getComputedStyle: node => ({ position: node.position }),
    addEventListener(type, callback) { this[type] = callback; },
    ResizeObserver: observer ? class { constructor(callback) { window.resizeDock = callback; } observe(node) { assert.ok(node === dock || node === header); } } : undefined
  };
  const context = vm.createContext({ document, window });
  const run = () => vm.runInContext(source, context);
  const emit = (type, event = {}) => {
    for (const entry of [...(listeners.get(type) ?? [])]) {
      entry.callback(event);
      if (entry.options?.once) listeners.set(type, listeners.get(type).filter(candidate => candidate !== entry));
    }
  };
  const click = target => {
    const event = { target };
    for (let node = target; node; node = node.parent) for (const callback of node.events.get('click') ?? []) callback(event);
    emit('click', event);
  };
  const escape = () => { let prevented = false; emit('keydown', { key: 'Escape', preventDefault() { prevented = true; } }); return prevented; };
  const resize = value => { media.matches = value; media.callback(); };
  run();
  return { document, window, css, toggle, toggleIcon, nav, more, summary, firstLink, moreLink, linkIcon, content, dock, header, click, escape, resize, emit, run };
}

test('One tap opens the menu once, preserves the fallback before loading, and initialization is idempotent', () => {
  const p = page({ loading: true, fallbackOpen: true });
  assert.equal(p.toggle.getAttribute('onclick'), 'fallback');
  p.emit('DOMContentLoaded');
  assert.equal(p.toggle.getAttribute('onclick'), null);
  assert.equal(p.toggle.getAttribute('aria-expanded'), 'true');
  p.run(); p.emit('DOMContentLoaded');
  p.click(p.toggleIcon);
  assert.equal(p.toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(p.nav.classList.contains('is-open'), false);
  p.click(p.toggle);
  assert.equal(p.toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(p.nav.classList.contains('is-open'), true);
});

test('Escape closes More first, then the mobile menu, and restores the appropriate focus', () => {
  const p = page(); p.click(p.toggle); p.more.open = true; p.moreLink.focus();
  assert.equal(p.escape(), true);
  assert.equal(p.more.open, false);
  assert.equal(p.document.activeElement, p.summary);
  assert.equal(p.toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(p.escape(), true);
  assert.equal(p.toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(p.document.activeElement, p.toggle);
  assert.equal(p.escape(), false);
});

test('Outside clicks close mobile and desktop disclosures without stealing focus', () => {
  for (const mobile of [true, false]) {
    const p = page({ mobile }); if (mobile) p.click(p.toggle);
    p.more.open = true; p.content.focus(); p.click(p.content);
    assert.equal(p.more.open, false);
    assert.equal(p.toggle.getAttribute('aria-expanded'), 'false');
    assert.equal(p.document.activeElement, p.content);
  }
});

test('Clicking a nested navigation link closes both disclosures', () => {
  const p = page(); p.click(p.toggle); p.more.open = true; p.click(p.linkIcon);
  assert.equal(p.more.open, false);
  assert.equal(p.toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(p.nav.classList.contains('is-open'), false);
});

test('Fold and unfold transitions keep navigation focus visible while clearing stale open state', () => {
  const p = page(); p.click(p.toggle); p.toggle.focus(); p.resize(false);
  assert.equal(p.document.activeElement, p.firstLink);
  assert.equal(p.toggle.getAttribute('aria-expanded'), 'false');
  p.more.open = true; p.moreLink.focus(); p.resize(true);
  assert.equal(p.document.activeElement, p.toggle);
  assert.equal(p.more.open, false);
  p.click(p.toggle); p.more.open = true; p.moreLink.focus(); p.resize(false);
  assert.equal(p.document.activeElement, p.summary);
  p.content.focus(); p.resize(true);
  assert.equal(p.document.activeElement, p.content);
});

test('Desktop Escape closes More without opening or focusing the hidden menu button', () => {
  const p = page({ mobile: false }); p.more.open = true; p.moreLink.focus(); p.escape();
  assert.equal(p.document.activeElement, p.summary);
  assert.equal(p.toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(p.escape(), false);
});

test('Page spacing tracks the actual dock height, including wrapping and hidden desktop state', () => {
  const p = page(); assert.equal(p.css.get('--cws-bottom-dock-height'), '59px');
  p.dock.height = 84; p.window.resizeDock();
  assert.equal(p.css.get('--cws-bottom-dock-height'), '84px');
  p.dock.height = 0; p.window.resize();
  assert.equal(p.css.get('--cws-bottom-dock-height'), '0px');
  const fallback = page({ observer: false }); fallback.dock.height = 73; fallback.window.resize();
  assert.equal(fallback.css.get('--cws-bottom-dock-height'), '73px');
});

test('Legacy menu-toggle is left to app.js without adding competing handlers', () => {
  const p = page({ legacy: true });
  assert.equal(p.toggle.getAttribute('onclick'), 'fallback');
  assert.equal(p.toggle.events.has('click'), false);
});

test('Anchor clearance tracks sticky header wrapping and resets for the scrolling phone header', () => {
  const p = page({ mobile: false });
  assert.equal(p.css.get('--cws-header-offset'), '145px');
  p.header.height = 197; p.window.resizeDock();
  assert.equal(p.css.get('--cws-header-offset'), '213px');
  p.header.position = 'relative'; p.window.resize();
  assert.equal(p.css.get('--cws-header-offset'), '16px');
  delete p.window.getComputedStyle; p.header.height = 300; p.window.resize();
  assert.equal(p.css.get('--cws-header-offset'), '16px', 'unavailable measurements retain the current CSS value');
});
