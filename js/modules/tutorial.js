// Guided onboarding. The tour explains how to find lessons, practise, and track progress, then hands off to the first session.
// Phase "gift": shown after the first lesson is finished. The user plays the lesson themselves (see lessons.js).
const GIFT = { xp: 50, cash: 100 };
const TOUR = [
  { title: 'Welcome to LifeLaunch', body: 'This is your hands-on money learning space. This tour shows you where lessons, practice, and progress live, then you can try a short first session.', btn: 'Start the tour', route: '#/dashboard' },
  { sel: '.ring', title: 'Your level and progress', body: 'Lessons and practice earn experience points (XP). Your level ring shows how far you are from the next level.', route: '#/dashboard' },
  { sel: '.tiles', title: 'Your learning dashboard', body: 'Keep an eye on your daily streak, hearts, and lessons studied. The dashboard also points you to your next open lesson and daily challenge.', route: '#/dashboard' },
  { sel: 'a.tab[href="#/learn"]', title: 'Follow the learning path', body: 'Lessons are arranged in a path. Each lesson is split into short teaching and quiz sessions; finish the steps to unlock what comes next.', mobileBody: 'On your phone, tap the menu button at the top right, then choose Learn to follow your path.' },
  { sel: 'a.tab[href="#/lessons"]', title: 'Explore the lesson library', body: 'Open a subject to read and review its lessons. When you finish the material, take its quiz and revisit topics whenever you need.', mobileBody: 'Open the menu at the top right and choose Library to revisit lessons and quizzes.', route: '#/lessons' },
  { sel: 'a.tab[href="#/practice"]', title: 'Learn by practising', body: 'Practice includes hands-on money activities, a daily challenge, budgeting, and investing. A quick practice set can also earn back a heart.', mobileBody: 'Open the menu at the top right and choose Practice for activities, challenges, budgeting, and investing.', route: '#/practice', btn: 'Show practice' },
  { sel: '.hearts', title: 'Use hearts thoughtfully', body: 'In learning-path sessions, a wrong answer uses a heart and shows an explanation. Pause to learn from it. Hearts refill over time, and practice can help you earn one back.', route: '#/dashboard' },
  { sel: 'a.tab[href="#/profile"]', title: 'Make the profile yours', body: 'Your profile keeps your display name, badges, and shareable progress card. You can replay this tour from here too.', mobileBody: 'Open the menu at the top right and choose Profile to see your badges and progress.', route: '#/profile' },
  { sel: '[data-node="intro:0"]', pick: true, route: '#/learn', title: 'Try your first learning session', body: 'Choose the glowing first step, then Start. Read each short card, answer the questions, and check the explanations. You can leave and return to the path any time.', btn: 'Start my first lesson' }
];
const GIFT_STEPS = [{ gift: true, title: 'A starter gift', body: 'You finished your first lesson. This one is on us.' }];
const wait = ms => new Promise(r => setTimeout(r, ms));
const reduced = () => !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const mobile = () => !!window.matchMedia?.('(max-width: 720px)').matches;
async function waitFor(sel, ms = 3000) {
  for (const end = Date.now() + ms; Date.now() < end;) { if (document.querySelector(sel)) return true; await wait(50); }
  return false;
}
async function goRoute(s) {
  if (!s.route) return;
  if ((location.hash || '#/dashboard') !== s.route) location.hash = s.route;
  await waitFor(s.sel || (s.route === '#/dashboard' ? '.ring' : '#view h1'));
}

export async function startTutorial(ctx, { phase = 'tour', onClose = () => {}, onHandoff = () => {} } = {}) {
  const steps = phase === 'gift' ? GIFT_STEPS : TOUR;
  await goRoute(steps[0]);
  let i = 0, closing = false, busy = false;
  const el = document.createElement('div');
  el.className = 'tour free';
  el.innerHTML = `<div class="tour-spot"></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-labelledby="tt"><div class="tour-body">
      <div class="dots"></div><h2 id="tt"></h2><p id="tb"></p>
      <div class="tour-gift" hidden><span><b data-n="${GIFT.xp}">0</b> XP</span><span><b data-n="${GIFT.cash}" data-cash>0</b> cash</span></div>
      <div class="actions"><button class="btn ghost" data-skip data-silent>Skip</button><button class="btn primary" id="tn">Next</button></div></div></div>`;
  document.body.append(el);
  const $ = s => el.querySelector(s), card = $('.tour-card'), body = $('.tour-body'), spot = $('.tour-spot'), next = $('#tn');

  const countUp = () => {
    const items = [...el.querySelectorAll('[data-n]')];
    const show = (b, e) => { const v = Math.round(b.dataset.n * e); b.textContent = b.hasAttribute('data-cash') ? ctx.money(v) : v; };
    if (reduced()) return items.forEach(b => show(b, 1));
    const t0 = performance.now();
    const tick = t => { const p = Math.min(1, (t - t0) / 900); items.forEach(b => show(b, 1 - (1 - p) ** 3)); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const paint = () => {
    const s = steps[i], claimed = ctx.state.tutorialDone;
    $('.dots').hidden = steps.length === 1;
    $('.dots').innerHTML = steps.map((_, n) => `<i class="${n === i ? 'on' : ''}"></i>`).join('');
    $('#tt').textContent = s.gift && claimed ? 'You are all set' : s.title;
    $('#tb').textContent = s.gift && claimed ? 'You can replay this tour any time from your profile.' : mobile() && s.mobileBody ? s.mobileBody : s.body;
    $('.tour-gift').hidden = !(s.gift && !claimed);
    next.hidden = !!s.pick;
    next.textContent = s.gift ? (claimed ? 'Done' : 'Claim gift') : s.btn || 'Next';
    $('[data-skip]').hidden = !!s.gift;
    if (s.gift && !claimed) countUp();
  };
  const place = () => {
    const s = steps[i], vw = window.innerWidth, vh = window.innerHeight, pad = 8;
    let t = s.sel && document.querySelector(s.sel);
    if (t) { const r = t.getBoundingClientRect(); if (!r.width || !r.height) t = null; }
    if (!t && mobile() && s.sel?.startsWith('a.tab[')) t = document.querySelector('#nav-toggle');
    const cw = Math.min(340, vw - 32); card.style.width = cw + 'px';
    const ch = card.offsetHeight; let top = (vh - ch) / 2, left = (vw - cw) / 2;
    el.classList.toggle('free', !t);
    if (t) {
      const r = t.getBoundingClientRect();
      Object.assign(spot.style, { top: r.top - pad + 'px', left: r.left - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px', borderRadius: '12px' });
      top = r.top + r.height / 2 < vh / 2 ? r.bottom + pad + 14 : r.top - pad - 14 - ch;
      top = Math.max(16, Math.min(vh - ch - 16, top)); left = Math.max(16, Math.min(vw - cw - 16, r.left + r.width / 2 - cw / 2));
    } else Object.assign(spot.style, { top: vh / 2 + 'px', left: vw / 2 + 'px', width: '0px', height: '0px', borderRadius: '0px' });
    card.style.top = top + 'px'; card.style.left = left + 'px';
  };
  const close = silent => {
    if (closing) return; closing = true;
    document.removeEventListener('keydown', onKey); window.removeEventListener('resize', place); window.removeEventListener('scroll', place);
    el.classList.remove('show'); setTimeout(() => { el.remove(); (silent === true ? onHandoff : onClose)(); }, reduced() ? 0 : 380);
  };
  const skip = () => { ctx.update(s => { s.tutorialSeen = true; }); close(); };
  const arm = s => { // pick step: the overlay lets clicks through; the user's own tap hands over to the real lesson
    el.classList.toggle('thru', !!s.pick);
    if (!s.pick) return;
    document.querySelector(s.sel)?.addEventListener('click', () => { ctx.update(x => { x.tutorialSeen = true; }); close(true); }, { once: true });
  };
  const go = async n => {
    if (busy) return; busy = true;
    body.classList.add('out'); await wait(reduced() ? 0 : 160);
    await goRoute(steps[n]);
    i = n; if (steps[n].pick) document.querySelector(steps[n].sel)?.scrollIntoView({ block: 'center' });
    paint(); place(); arm(steps[n]); body.classList.remove('out'); busy = false;
  };
  function onKey(e) {
    if (e.key === 'Escape') return skip();
    if (e.key === 'Tab' && !el.classList.contains('thru')) {
      const f = [...el.querySelectorAll('button:not([hidden])')], at = f.indexOf(document.activeElement);
      e.preventDefault(); f[(at + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
    }
  }
  next.onclick = () => {
    if (closing) return;
    if (i < steps.length - 1) return go(i + 1);
    if (!ctx.state.tutorialDone) {
      ctx.update(s => { s.tutorialSeen = true; s.tutorialDone = true; s.xp += GIFT.xp; s.cash += GIFT.cash; });
      ctx.audio.play('reward');
    }
    close();
  };
  $('[data-skip]').onclick = skip;
  document.addEventListener('keydown', onKey); window.addEventListener('resize', place); window.addEventListener('scroll', place, { passive: true });
  paint(); place(); arm(steps[0]);
  requestAnimationFrame(() => { el.classList.add('show'); next.focus(); });
}
