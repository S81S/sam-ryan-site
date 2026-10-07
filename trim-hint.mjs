// A visual walkthrough of the Compare Trims page, led by a ghost mouse arrow: choose a model, pick the trims,
// read the table, tap a feature name, tap a check.
//
// Three styles are offered for review with ?hint=1, ?hint=2 or ?hint=3 on /trim-guide:
//   1  Watch it work     the arrow uses the real page by itself (about 25 seconds), with a caption at each step
//   2  Step-by-step      the arrow points at each control and waits; the shopper taps Next (or does the step)
//   3  Looping demo      a small animated picture of the page at the top, with the three steps listed beside it
//
// Nothing here blocks the page. Style 1 stops the moment the shopper touches anything, and all three stand still
// for people who ask their device for reduced motion.
const NAMES = { 1: 'Watch it work', 2: 'Step-by-step', 3: 'Looping demo' };
const ARROW = '<svg viewBox="0 0 24 24" width="32" height="32" aria-hidden="true"><path d="M5 2.5v17l4.6-4.3 3 6.6 2.9-1.3-3-6.5h6.2z" fill="#fff" stroke="#0b1016" stroke-width="1.5" stroke-linejoin="round"/></svg>';
const FONT = 'system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
const CSS = `
.th-layer{position:absolute;left:0;top:0;width:100%;height:0;pointer-events:none;z-index:55}
.th-cursor{position:absolute;left:0;top:0;width:32px;height:32px;opacity:0;filter:drop-shadow(0 3px 6px #000a);transition:transform .78s cubic-bezier(.25,.8,.25,1),opacity .3s;will-change:transform}
.th-cursor svg{display:block;transform-origin:6px 3px;transition:transform .12s}
.th-cursor.th-press svg{transform:scale(.8)}
.th-ring{position:absolute;width:44px;height:44px;margin:-22px 0 0 -22px;border-radius:50%;border:3px solid #ffc447;opacity:0}
.th-ring.th-go{animation:th-ring .65s ease-out}
@keyframes th-ring{from{opacity:.95;transform:scale(.35)}to{opacity:0;transform:scale(1.9)}}
.th-spot{position:absolute;border-radius:12px;box-shadow:0 0 0 3px #ffc447,0 0 0 9px #ffc44733;opacity:0;transition:opacity .25s,left .35s,top .35s,width .35s,height .35s}
.th-spot.th-show{opacity:1}
.th-tip{position:absolute;box-sizing:border-box;width:max-content;max-width:min(280px,calc(100vw - 24px));padding:10px 13px;border-radius:12px;background:#fff;color:#10161d;font:600 14px/1.38 ${FONT};box-shadow:0 12px 34px #000b;opacity:0;transform:translateY(6px);transition:opacity .25s,transform .25s}
.th-tip.th-show{opacity:1;transform:none}
.th-tip:after{content:"";position:absolute;left:var(--th-caret,50%);width:12px;height:12px;margin-left:-6px;background:#fff;transform:rotate(45deg)}
.th-tip.th-above:after{bottom:-5px}.th-tip.th-below:after{top:-5px}
.th-tip b,.th-note b{color:#0c7a4d}
.th-note{margin:0 0 14px;padding:10px 13px;border-radius:10px;background:#fff;color:#10161d;font:600 14px/1.38 ${FONT}}
.th-start{display:inline-flex;align-items:center;gap:9px;min-height:44px;margin:4px 0 18px;padding:9px 16px;border-radius:999px;border:1px solid #ffc447;background:#3d3320;color:#ffe095;font:700 15px/1.2 ${FONT};cursor:pointer}
.th-start:before{content:"";flex:none;width:0;height:0;border-left:10px solid currentColor;border-top:7px solid transparent;border-bottom:7px solid transparent}
.th-card{position:fixed;z-index:65;left:50%;bottom:calc(var(--th-bottom,16px) + env(safe-area-inset-bottom,0px));transform:translateX(-50%);box-sizing:border-box;width:min(430px,calc(100vw - 20px));padding:12px 14px 13px;border-radius:16px;background:#fff;color:#10161d;box-shadow:0 14px 40px #000c;font:500 15px/1.4 ${FONT}}
.th-card-top{display:flex;align-items:center;justify-content:space-between;font-weight:800;font-size:12.5px;letter-spacing:.04em;text-transform:uppercase;color:#bd1424}
.th-card p{margin:4px 0 10px;font-weight:600;color:#10161d}
.th-card-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.th-card button{min-height:40px;padding:0 14px;border-radius:999px;border:1px solid #c9d2da;background:#fff;color:#10161d;font:700 14px/1 ${FONT};cursor:pointer}
.th-card button.th-primary{background:#bd1424;border-color:#bd1424;color:#fff}
.th-card button:disabled{opacity:.55;cursor:default}
.th-card button.th-x{min-height:32px;min-width:32px;padding:0;border:0;font-size:22px;line-height:1;color:#51606d}
.th-demo{margin:6px 0 20px;padding:14px;border:1px solid #2b3946;border-radius:16px;background:#111a23;color:#fff;font:500 14px/1.4 ${FONT}}
.th-demo-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;font-size:16px}
.th-demo-head button{min-height:36px;padding:0 12px;border-radius:999px;border:1px solid #3b4a58;background:none;color:#cbd4dc;font:700 13px/1 ${FONT};cursor:pointer}
.th-demo-body{display:grid;grid-template-columns:minmax(0,300px) 1fr;gap:18px;align-items:center}
.th-stage{position:relative;height:176px;padding:10px;border-radius:12px;background:#0a0e13;border:1px solid #232f3a;overflow:hidden}
.th-chips{display:flex;gap:6px}
.th-chips span{flex:1;padding:6px 0;border-radius:8px;border:1px solid #33414e;background:#17222c;text-align:center;font-weight:700;font-size:12px;transition:background .25s,border-color .25s,color .25s}
.th-chips span.on{background:#3d3320;border-color:#ffc447;color:#ffe095}
.th-mini{margin-top:9px;opacity:.16;transition:opacity .4s}
.th-stage.has-table .th-mini{opacity:1}
.th-mrow{display:grid;grid-template-columns:1.25fr 1fr 1fr;align-items:center;gap:6px;padding:5px 2px;border-top:1px solid #1e2a35;font-size:12px}
.th-mrow.th-mhead{border-top:0;color:#ffc447;font-weight:800}
.th-mrow span{color:#ffd980;font-weight:700}
.th-mrow span.hot{text-decoration:underline}
.th-mrow i{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:1px solid currentColor;font:800 13px/1 Arial,sans-serif;font-style:normal}
.th-mrow i.ok{background:#173e32;color:#83edbb}.th-mrow i.plus{background:#493a1a;color:#ffe095}.th-mrow i.no{background:#47232b;color:#f6a6b1}
.th-mrow i.hot{box-shadow:0 0 0 3px #83edbb66}
.th-pop,.th-found{position:absolute;left:10px;right:10px;bottom:10px;padding:9px 11px;border-radius:10px;background:#fff;color:#10161d;font-weight:700;font-size:12.5px;box-shadow:0 8px 24px #000a;opacity:0;transform:translateY(8px);transition:opacity .3s,transform .3s}
.th-pop.on,.th-found.on{opacity:1;transform:none}
.th-pop small{display:block;font-weight:500;color:#51606d}
.th-found{display:grid;grid-template-columns:44px 44px 1fr;gap:7px;align-items:center}
.th-found div{height:30px;border-radius:6px;background:linear-gradient(#cfd8e0 0 60%,#eef2f6 60%)}
.th-stage .th-cursor{width:26px;height:26px;transition:transform .7s cubic-bezier(.25,.8,.25,1),opacity .3s}
.th-stage .th-cursor svg{width:26px;height:26px}
.th-steps{margin:0;padding:0;list-style:none;counter-reset:th}
.th-steps li{counter-increment:th;display:flex;gap:10px;align-items:baseline;padding:6px 0;color:#93a3b1;font-size:15px;transition:color .25s}
.th-steps li:before{content:counter(th);flex:none;display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;border:1px solid currentColor;font-weight:800;font-size:13px}
.th-steps li.on{color:#fff;font-weight:700}
.th-steps li.on:before{background:#ffc447;border-color:#ffc447;color:#10161d}
.th-demo-open{display:inline-flex;align-items:center;min-height:40px;margin:0 0 14px;padding:0 4px;border:0;background:none;color:#ffb1b7;font:700 14px/1 ${FONT};text-decoration:underline;cursor:pointer}
.th-bar{position:fixed;z-index:70;left:50%;top:8px;transform:translateX(-50%);display:flex;align-items:center;gap:6px;max-width:calc(100vw - 12px);padding:6px 8px;border-radius:999px;background:#fffffff2;color:#10161d;box-shadow:0 8px 26px #0009;font:700 13px/1 ${FONT};white-space:nowrap}
.th-bar span{padding:0 4px}
.th-bar button{min-width:36px;min-height:36px;padding:0 10px;border:1px solid #c9d2da;border-radius:999px;background:#fff;color:#10161d;font:inherit;cursor:pointer}
.th-bar button[aria-pressed=true]{background:#bd1424;border-color:#bd1424;color:#fff}
@media(max-width:640px){.th-demo-body{grid-template-columns:1fr;gap:10px}.th-bar span.th-long{display:none}}
@media(prefers-reduced-motion:reduce){.th-cursor,.th-stage .th-cursor{transition:opacity .3s}.th-ring.th-go{animation:none}.th-tip,.th-spot,.th-pop,.th-found{transition:opacity .25s;transform:none}}
`;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const el = (tag, className, html) => { const node = document.createElement(tag); if (className) node.className = className; if (html != null) node.innerHTML = html; return node; };
const q = (selector, root = document) => root.querySelector(selector);

export function startTrimHint({ variant = 1, preview = false, storageKey = 'cws-trim-walkthrough' } = {}) {
  const output = q('#table-output'), picker = q('#focus-trims'), intro = q('main .intro');
  if (!output || !picker || !intro) return;
  document.head.append(el('style', null, CSS));
  const layer = el('div', 'th-layer'); layer.setAttribute('aria-hidden', 'true'); document.body.append(layer);
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const tap = matchMedia('(hover: hover) and (pointer: fine)').matches ? 'Click' : 'Tap';
  const stored = () => { if (preview) return null; try { return localStorage.getItem(storageKey); } catch { return null; } };
  const store = value => { if (!preview) try { localStorage.setItem(storageKey, value); } catch {} };

  // ---- the page's own parts ----
  const trimButtons = () => [...picker.querySelectorAll('[data-trim]')];
  const pressed = () => trimButtons().filter(button => button.getAttribute('aria-pressed') === 'true');
  const firstCheck = () => q('[data-feature-row] a.bubble.standard', output);
  const rowOf = check => check?.closest('[data-feature-row]');
  // Two neighbouring trims from the middle of the range, where most shoppers are deciding.
  const twoTrims = () => { const all = trimButtons().map(button => button.dataset.trim), at = Math.max(0, Math.floor(all.length / 2) - 2); return all.slice(at, at + 2); };
  const trimButton = id => trimButtons().find(button => button.dataset.trim === id);

  // ---- shared moving parts ----
  const centre = node => { const r = node.getBoundingClientRect(); return { x: r.left + scrollX + r.width / 2, y: r.top + scrollY + r.height / 2, r }; };
  const settle = async () => { let last = -1, same = 0; for (let i = 0; i < 40; i++) { await sleep(50); if (Math.abs(scrollY - last) < 1) { if (++same >= 3) return; } else same = 0; last = scrollY; } };
  const bring = async (node, ratio = .42) => {
    const r = node.getBoundingClientRect(), top = Math.max(0, r.top + scrollY + r.height / 2 - innerHeight * ratio);
    if (Math.abs(top - scrollY) > 8) { scrollTo({ top, behavior: still ? 'auto' : 'smooth' }); await settle(); }
  };
  let cursor, ring, bubble, shown = false;
  const stage = () => { layer.replaceChildren(); cursor = el('div', 'th-cursor', ARROW); ring = el('div', 'th-ring'); layer.append(ring, cursor); bubble = null; shown = false; };
  const place = point => { cursor.style.transform = `translate(${point.x - 6}px,${point.y - 3}px)`; };
  const appear = point => { cursor.style.transition = 'none'; place(point); void cursor.offsetWidth; cursor.style.transition = ''; cursor.style.opacity = '.96'; shown = true; };
  const glide = async point => { place(point); await sleep(still ? 120 : 820); };
  const press = async point => {
    ring.style.left = point.x + 'px'; ring.style.top = point.y + 'px';
    cursor.classList.add('th-press'); ring.classList.remove('th-go'); void ring.offsetWidth; ring.classList.add('th-go');
    await sleep(170); cursor.classList.remove('th-press');
  };
  // A white speech bubble above the thing it is about (below it when there is no room), kept inside the screen.
  const say = (anchor, html, below = false) => {
    hush();
    const node = el('div', 'th-tip', html); layer.append(node);
    const { x, r } = centre(anchor), width = node.offsetWidth, height = node.offsetHeight;
    const left = Math.max(12, Math.min(x - width / 2, scrollX + document.documentElement.clientWidth - width - 12));
    const above = !below && r.top - height - 16 > 64;
    node.style.left = left + 'px';
    node.style.top = (above ? r.top + scrollY - height - 14 : r.bottom + scrollY + (below ? 14 : 42)) + 'px';
    node.style.setProperty('--th-caret', Math.max(16, Math.min(width - 16, x - left)) + 'px');
    node.classList.add(above ? 'th-above' : 'th-below');
    requestAnimationFrame(() => node.classList.add('th-show'));
    bubble = node;
  };
  const hush = () => { if (bubble) { const old = bubble; old.classList.remove('th-show'); setTimeout(() => old.remove(), 260); bubble = null; } };

  // =====================================================================================================
  // 1. Watch it work: the arrow uses the real page.
  // =====================================================================================================
  let run = 0, playing = false;
  const dialog = q('#feature-dialog');
  const stopWatching = byShopper => {
    if (!playing) return;
    run++; playing = false; layer.replaceChildren();
    q('.th-note', dialog || document)?.remove();
    if (!byShopper && dialog?.open) dialog.close();
  };
  async function watch() {
    stopWatching(false);
    const mine = ++run, alive = () => mine === run;
    playing = true; stage();

    // 1. the model
    const model = q('#table-model');
    await bring(model); if (!alive()) return;
    const start = centre(model);
    appear({ x: Math.min(start.x + 110, scrollX + document.documentElement.clientWidth - 44), y: start.y + 120 });
    await sleep(300); await glide(centre(model)); if (!alive()) return;
    await press(centre(model));
    say(model, '<b>1.</b> Choose the model.');
    await sleep(1700); if (!alive()) return;

    // 2. the trims: really pick two, unless the shopper already has
    await bring(q('.focus-choices', picker) || picker, .45); if (!alive()) return;
    let last = pressed()[1];
    if (pressed().length < 2) {
      for (const id of twoTrims()) {
        const button = trimButton(id);
        if (!button || button.getAttribute('aria-pressed') === 'true') continue;
        await glide(centre(button)); if (!alive()) return;
        await press(centre(button)); button.click();
        await sleep(420); if (!alive()) return;
        last = trimButton(id);
      }
    } else { await glide(centre(last)); if (!alive()) return; }
    if (last) say(last, `<b>2.</b> ${tap} the trims you’re deciding between.`);
    await sleep(1900); if (!alive()) return;

    // 3. the table
    const check = firstCheck(), row = rowOf(check);
    if (!check) { hush(); await sleep(300); stopWatching(false); return; }
    const value = q('.cell-value', check.closest('[data-status]')) || check;
    await bring(row, .46); if (!alive()) return;
    await glide(centre(value)); if (!alive()) return;
    say(row, '<b>3.</b> They line up side by side. <b>✓</b> means it comes standard.', true);
    await sleep(2400); if (!alive()) return;

    // 4. a feature name: open the real explanation for a moment
    const name = q('.feature-info', row);
    if (name && dialog) {
      const box = name.getBoundingClientRect(), spot = { x: box.left + scrollX + Math.min(70, box.width / 2), y: box.top + scrollY + 12 };
      await glide(spot); if (!alive()) return;
      say(name, `<b>4.</b> ${tap} a feature name…`);
      await sleep(950); if (!alive()) return;
      await press(spot); hush(); name.click();
      if (dialog.open) {
        dialog.prepend(el('p', 'th-note', '<b>4.</b> …to see what it means and where it comes from.'));
        await sleep(2500);
        q('.th-note', dialog)?.remove();
        if (!alive()) return;
        dialog.close();
      }
      await sleep(350); if (!alive()) return;
    }

    // 5. a check: show the tap, do not leave the page
    const again = firstCheck() || check;
    await glide(centre(again)); if (!alive()) return;
    await press(centre(again));
    say(again, `<b>5.</b> ${tap} a <b>✓</b> to see the ones in stock with that feature.`);
    await sleep(2900); if (!alive()) return;
    say(again, 'Your turn. Try it, or change the trims above.');
    await sleep(1900); if (!alive()) return;
    store('seen');
    hush(); cursor.style.opacity = '0';
    await sleep(350); if (alive()) { layer.replaceChildren(); playing = false; }
  }
  // Anything the shopper does themselves ends the show.
  for (const type of ['pointerdown', 'wheel', 'touchstart', 'keydown'])
    addEventListener(type, event => { if (playing && event.isTrusted && !event.target?.closest?.('.th-bar,.th-start')) stopWatching(true); }, { capture: true, passive: true });

  // =====================================================================================================
  // 2. Step-by-step: the arrow points, the shopper sets the pace.
  // =====================================================================================================
  let card = null, step = 0, beat = 0, spot = null;
  const steps = [
    { target: () => q('#table-model'), text: () => 'Choose the brand and model.' },
    { target: () => pressed().at(-1) || trimButton(twoTrims()[0]) || picker, text: () => `${tap} the trims you’re deciding between. Two is plenty to start.`, ready: () => pressed().length >= 2 },
    { target: () => { const check = firstCheck(); return check && (q('.cell-value', check.closest('[data-status]')) || check); }, text: () => 'They line up side by side. ✓ comes standard, + is an option, − isn’t offered.' },
    { target: () => q('.difference-toggle'), text: () => 'Long list? Show only the differences, or search for a feature.' },
    { target: () => q('.feature-info', rowOf(firstCheck()) || output), text: () => `${tap} a feature name to see what it means and where it comes from.` },
    { target: () => firstCheck(), text: () => `${tap} a ✓ to see the ones in stock with that feature.` },
  ];
  const closeGuide = () => { clearInterval(beat); card?.remove(); card = null; layer.replaceChildren(); spot = null; };
  async function showStep(moveView = true) {
    if (!card) return;
    if (step > 1 && !firstCheck()) step = 1; // the table went away; go back to choosing trims
    const current = steps[step], target = current.target();
    const ready = current.ready ? current.ready() : true;
    q('.th-count', card).textContent = `Step ${step + 1} of ${steps.length}`;
    q('p', card).textContent = current.text();
    q('[data-go=back]', card).disabled = step === 0;
    const next = q('[data-go=next]', card);
    next.textContent = !ready ? 'Pick 2 trims' : step === steps.length - 1 ? 'Done' : 'Next';
    next.disabled = !ready;
    q('[data-go=pick]', card).hidden = ready;
    if (!target) return;
    if (!cursor || !cursor.isConnected) { stage(); spot = el('div', 'th-spot'); layer.prepend(spot); }
    if (moveView) await bring(target, .36);
    const point = centre(target), box = point.r, pad = 6;
    Object.assign(spot.style, { left: box.left + scrollX - pad + 'px', top: box.top + scrollY - pad + 'px', width: box.width + pad * 2 + 'px', height: box.height + pad * 2 + 'px' });
    spot.classList.add('th-show');
    const aim = { x: box.left + scrollX + Math.min(box.width / 2, 80), y: box.top + scrollY + Math.min(box.height / 2, 22) };
    if (!shown) appear({ x: aim.x + 70, y: aim.y + 90 });
    await glide(aim);
    clearInterval(beat);
    const pulse = () => { if (card && cursor?.isConnected) press(aim); };
    pulse(); if (!still) beat = setInterval(pulse, 2200);
  }
  function guide() {
    stopWatching(false); closeGuide(); step = 0;
    card = el('div', 'th-card', '<div class="th-card-top"><span class="th-count"></span><button type="button" class="th-x" data-go="close" aria-label="Close the guide">×</button></div><p></p><div class="th-card-actions"><button type="button" data-go="back">Back</button><button type="button" data-go="pick" hidden>Pick two for me</button><button type="button" class="th-primary" data-go="next">Next</button></div>');
    card.setAttribute('role', 'region'); card.setAttribute('aria-label', 'How to use this page'); card.setAttribute('aria-live', 'polite');
    // Sit above the phone's bottom bar when there is one.
    const bar = q('.sticky-mobile'), lift = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect().height + 10 : 16;
    card.style.setProperty('--th-bottom', lift + 'px');
    card.addEventListener('click', event => {
      const go = event.target.closest('[data-go]')?.dataset.go;
      if (!go) return;
      if (go === 'close') { closeGuide(); store('seen'); return; }
      if (go === 'pick') { for (const id of twoTrims()) { const button = trimButton(id); if (button && button.getAttribute('aria-pressed') !== 'true') button.click(); } return; }
      if (go === 'back') step = Math.max(0, step - 1);
      else if (step === steps.length - 1) { closeGuide(); store('seen'); return; }
      else step++;
      showStep();
    });
    document.body.append(card);
    showStep();
  }
  // The shopper doing a step is as good as tapping Next; the picker and table are rebuilt on every change.
  let wasReady = false, refresh = 0;
  const onChange = () => { clearTimeout(refresh); refresh = setTimeout(() => {
    if (!card) return;
    const ready = pressed().length >= 2;
    if (step === 1 && ready && !wasReady) step = 2;
    wasReady = ready; showStep();
  }, 250); };

  // =====================================================================================================
  // 3. Looping demo: a small picture of the page that plays the three steps.
  // =====================================================================================================
  let demo = null, loop = 0;
  function miniDemo() {
    demo = el('section', 'th-demo', `<div class="th-demo-head"><strong>How this page works</strong><button type="button">Hide</button></div><div class="th-demo-body"><div class="th-stage" aria-hidden="true"><div class="th-chips"><span>Trim A</span><span>Trim B</span><span>Trim C</span></div><div class="th-mini"><div class="th-mrow th-mhead"><b></b><b>Trim A</b><b>Trim C</b></div><div class="th-mrow"><span data-name>Heated seats</span><i class="plus">+</i><i class="ok" data-ok>✓</i></div><div class="th-mrow"><span>Big screen</span><i class="ok">✓</i><i class="ok">✓</i></div><div class="th-mrow"><span>Sunroof</span><i class="no">−</i><i class="plus">+</i></div></div><div class="th-pop">What it means<small>Plus where the fact comes from.</small></div><div class="th-found"><div></div><div></div><span>In stock with it</span></div><div class="th-cursor">${ARROW}</div></div><ol class="th-steps"><li>Pick the trims you’re deciding between</li><li>${tap} a feature name to see what it means</li><li>${tap} a ✓ to see the ones in stock</li></ol></div>`);
    demo.setAttribute('aria-label', 'How this page works');
    const reopen = el('button', 'th-demo-open', 'How this page works ▸'); reopen.type = 'button'; reopen.hidden = true;
    intro.after(demo, reopen);
    const box = q('.th-stage', demo), mini = q('.th-cursor', demo), chips = [...demo.querySelectorAll('.th-chips span')], items = [...demo.querySelectorAll('.th-steps li')];
    const at = node => { const a = node.getBoundingClientRect(), b = box.getBoundingClientRect(); return { x: a.left - b.left + Math.min(a.width / 2, 34), y: a.top - b.top + a.height / 2 }; };
    const to = async node => { const p = at(node); mini.style.transform = `translate(${p.x - 5}px,${p.y - 2}px)`; await sleep(still ? 50 : 760); };
    const click = async () => { mini.classList.add('th-press'); await sleep(170); mini.classList.remove('th-press'); };
    const light = n => items.forEach((item, i) => item.classList.toggle('on', i === n));
    const reset = () => { box.classList.remove('has-table'); for (const node of demo.querySelectorAll('.on,.hot')) node.classList.remove('on', 'hot'); };
    const mine = ++loop, alive = () => mine === loop && demo?.isConnected && !demo.hidden;
    let visible = true, running = false;
    new IntersectionObserver(entries => { visible = entries.some(entry => entry.isIntersecting); }).observe(demo);
    const hide = hidden => { demo.hidden = hidden; reopen.hidden = !hidden; store(hidden ? 'hidden' : 'seen'); if (!hidden) play(); };
    q('.th-demo-head button', demo).addEventListener('click', () => hide(true));
    reopen.addEventListener('click', () => hide(false));
    async function play() {
      if (running) return;
      if (still) { reset(); chips[0].classList.add('on'); chips[2].classList.add('on'); box.classList.add('has-table'); items.forEach(item => item.classList.add('on')); return; }
      mini.style.opacity = '.96'; running = true;
      try { await cycle(); } finally { running = false; }
    }
    async function cycle() {
      while (alive()) {
        if (!visible) { await sleep(400); continue; }
        reset(); light(0); await sleep(500);
        await to(chips[0]); await click(); chips[0].classList.add('on');
        await to(chips[2]); await click(); chips[2].classList.add('on'); box.classList.add('has-table');
        await sleep(1500); if (!alive()) return;
        light(1); const name = q('[data-name]', demo);
        await to(name); await click(); name.classList.add('hot'); q('.th-pop', demo).classList.add('on');
        await sleep(2300); q('.th-pop', demo).classList.remove('on'); if (!alive()) return;
        light(2); const ok = q('[data-ok]', demo);
        await to(ok); await click(); ok.classList.add('hot'); q('.th-found', demo).classList.add('on');
        await sleep(2700); q('.th-found', demo).classList.remove('on');
        await sleep(600);
      }
    }
    if (stored() === 'hidden') hide(true); else play();
  }

  // ---- start ----
  new MutationObserver(onChange).observe(picker, { childList: true });
  new MutationObserver(onChange).observe(output, { childList: true });
  let width = innerWidth;
  addEventListener('resize', () => { if (innerWidth === width) return; width = innerWidth; stopWatching(false); if (card) showStep(false); });

  if (variant === 3) miniDemo();
  else {
    const start = el('button', 'th-start', variant === 1 ? 'Watch how this page works · 25 sec' : 'Show me how to use this page');
    start.type = 'button';
    start.addEventListener('click', () => (variant === 1 ? watch() : guide()));
    intro.after(start);
    // First visit: style 1 plays by itself once; style 2 waits to be asked. In a preview both start right away.
    if (preview || (variant === 1 && !stored())) setTimeout(() => (variant === 1 ? watch() : guide()), preview ? 900 : 1600);
  }

  if (preview) {
    const bar = el('div', 'th-bar', '<span class="th-long">Walkthrough preview</span>' + [1, 2, 3].map(n => `<button type="button" data-hint="${n}" title="${NAMES[n]}" aria-pressed="${n === variant}">${n}</button>`).join('') + '<button type="button" data-hint="replay">↻ Replay</button>');
    bar.addEventListener('click', event => {
      const button = event.target.closest('[data-hint]');
      if (!button) return;
      const next = button.dataset.hint === 'replay' ? variant : Number(button.dataset.hint);
      // Start each style from a clean page: same model, nothing picked.
      location.assign(location.pathname + '?' + new URLSearchParams({ model: q('#table-model')?.value || '', hint: next }));
    });
    document.body.append(bar);
  }
}
