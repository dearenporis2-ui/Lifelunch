import { BADGES, TIERS, CURRENCY, levelOf } from './data/gameData.js';
import { loadIndex } from './modules/content.js';
import { audio } from './modules/audio.js';
import { renderLessons, renderQuizzes, renderDaily, studied } from './modules/lessons.js';
import { renderBudget } from './modules/economy.js';
import { renderProfile, renderPublic } from './modules/profile.js';
import { renderPractice, renderInvest } from './modules/sim.js';
import { renderLearn } from './modules/path.js';
import { heartsNow, GOAL_XP } from './modules/hearts.js';
import { startTutorial } from './modules/tutorial.js';
import { icon } from './modules/icons.js';

const KEY = 'lifelaunch.v1';
const fresh = () => ({ name: 'Player One', cash: 500, savings: 0, xp: 0, streak: 0, lastDay: null, lessons: {}, studied: {}, path: {}, hearts: 5, heartsAt: Date.now(), goal: null, badges: [], month: 1, draft: null, daily: null, dailyDone: 0, perfects: 0, testNoticeSeen: false, tutorialSeen: false, tutorialDone: false, bestScore: 0, history: [] });
const load = () => { try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return fresh(); } };
const state = load();

const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => CURRENCY + Math.round(n).toLocaleString();
const day = off => { const d = new Date(); d.setDate(d.getDate() + off); return d.toLocaleDateString('en-CA'); };

function toast(msg, kind = '') {
  const el = document.createElement('div'); el.className = 'toast ' + kind; el.textContent = msg;
  $('#toasts').append(el); setTimeout(() => el.remove(), 3200);
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast('Progress could not be saved in this browser', 'bad'); } }

function derive(s) {
  const level = levelOf(s.xp), base = (level - 1) ** 2 * 60, next = level ** 2 * 60;
  const tier = [...TIERS].reverse().find(t => level >= t.min).name;
  return { level, tier, pct: Math.round((s.xp - base) / (next - base) * 100), toNext: next - s.xp, netWorth: s.cash + s.savings };
}

function trackGoal(gain) { // daily XP goal, with a small cash bonus the first time it is reached each day
  const t = day(0);
  if (state.goal?.day !== t) state.goal = { day: t, xp: 0, done: false };
  state.goal.xp += gain;
  if (!state.goal.done && state.goal.xp >= GOAL_XP) { state.goal.done = true; state.cash += 20; toast('Daily goal reached! +20 cash', 'gold'); audio.play('goal'); }
}

function update(fn) {
  const before = levelOf(state.xp), xp0 = state.xp;
  fn(state);
  if (state.xp > xp0) trackGoal(state.xp - xp0);
  for (const b of BADGES) if (!state.badges.includes(b.id) && b.test(state)) {
    state.badges.push(b.id); toast(`Badge unlocked: ${b.name}`, 'gold'); audio.play('badge');
  }
  if (levelOf(state.xp) > before) { toast(`Level ${levelOf(state.xp)} reached`, 'gold'); audio.play('levelup'); }
  save(); renderHud();
}

const ctx = { state, update, toast, esc, money, derive, audio };
let tourOn = false;
let streakCelebration = false;
ctx.tour = () => { if (tourOn) return; tourOn = true; startTutorial(ctx, { onHandoff: () => { tourOn = false; }, onClose: () => { tourOn = false; route(); } }); };
ctx.giftTour = () => { if (tourOn || state.tutorialDone) return; tourOn = true; startTutorial(ctx, { phase: 'gift', onClose: () => { tourOn = false; if (current() !== 'dashboard') location.hash = '#/dashboard'; else route(); } }); };
const ROUTES = {
  dashboard: { label: 'Home', fn: renderDashboard },
  learn: { label: 'Learn', fn: renderLearn },
  practice: { label: 'Practice', fn: renderPractice },
  lessons: { label: 'Library', fn: renderLessons },
  daily: { label: 'Daily', fn: renderDaily, hidden: true },
  budget: { label: 'Budget', fn: renderBudget, hidden: true },
  invest: { label: 'Invest', fn: renderInvest, hidden: true },
  profile: { label: 'Profile', fn: renderProfile }
};
const current = () => (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/')[0];

function renderHud() {
  const d = derive(state), cur = { daily: 'practice', budget: 'practice', invest: 'practice', quizzes: 'lessons' }[current()] || current();
  const navIcons = { dashboard: 'home', learn: 'route', practice: 'game', lessons: 'book', profile: 'user' };
  const menuItems = Object.entries(ROUTES).filter(([, r]) => !r.hidden);
  const mobileLink = (key, label, glyph, detail, tone) => `<a class="mobile-menu-item ${tone} ${key === cur ? 'is-current' : ''}" href="#/${key}" ${key === cur ? 'aria-current="page"' : ''}><span class="mobile-menu-icon">${icon(glyph,22)}</span><span class="mobile-menu-copy"><strong>${label}</strong><small>${detail}</small></span>${icon('arrow',17)}</a>`;
  $('#hud').innerHTML = `<a class="brand" href="#/dashboard"><span class="brand-mark">${icon('sparkles',19)}</span><span>LifeLaunch</span></a>
  <nav class="tabs" aria-label="Main">${menuItems.map(([k, r]) => `<a class="tab" href="#/${k}" ${k === cur ? 'aria-current="page"' : ''}>${icon(navIcons[k],18)}<span>${r.label}</span></a>`).join('')}</nav>
  <button class="nav-toggle" id="nav-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
  <div class="hud-stats"><span class="chip hearts" title="Hearts">♥ ${heartsNow(state)}</span><span class="chip cash">${money(state.cash)}</span><span class="chip xp hud-xp"><b>Lv ${d.level}</b>${state.xp} XP</span>
  <button class="icon" id="mute" title="${audio.muted ? 'Turn sound on' : 'Turn sound off'}" aria-label="${audio.muted ? 'Turn sound on' : 'Turn sound off'}" aria-pressed="${audio.muted}">${icon(audio.muted ? 'volumeX' : 'volume',18)}</button></div>
  <div class="mobile-menu" id="mobile-menu" hidden>
    <button class="mobile-menu-scrim" type="button" data-menu-close aria-label="Close navigation menu"></button>
    <section class="mobile-menu-panel" role="dialog" aria-modal="true" aria-label="LifeLaunch navigation">
      <div class="menu-grabber" aria-hidden="true"></div>
      <div class="mobile-menu-heading"><div><span class="section-kicker">YOUR NEXT MOVE</span><h2>Where to?</h2></div><span class="menu-level">${icon('sparkles',15)} LV ${d.level}</span></div>
      <nav class="mobile-menu-grid" aria-label="Main navigation">${mobileLink('dashboard','Home','home','Your launchpad','menu-home')}${mobileLink('learn','Learn','route','Pick up your path','menu-learn')}${mobileLink('practice','Practice','game','Play and build skills','menu-practice')}${mobileLink('lessons','Library','book','Browse all lessons','menu-library')}${mobileLink('profile','Profile','user','Your progress and badges','menu-profile')}</nav>
      <div class="mobile-quick-title"><span class="section-kicker">QUICK PLAYS</span><span>Little wins, right now</span></div>
      <div class="mobile-quick-links"><a href="#/daily" class="quick-link">${icon('trophy',18)} Daily challenge ${icon('arrow',15)}</a><a href="#/budget" class="quick-link">${icon('wallet',18)} Budget month ${icon('arrow',15)}</a><a href="#/invest" class="quick-link">${icon('chart',18)} Invest years ${icon('arrow',15)}</a></div>
      <div class="mobile-menu-footer"><span class="menu-spark">${icon('sparkles',16)}</span><span>Small steps. Big future energy.</span><span class="menu-xp">${state.xp} XP</span></div>
    </section>
  </div>`;
  // Keep the fixed sheet outside the sticky, backdrop-filtered header. A filtered
  // ancestor becomes the containing block for fixed descendants in modern browsers.
  document.body.append($('#mobile-menu'));
}

function closeMobileMenu(restoreFocus = false) {
  const menu = $('#mobile-menu'), toggle = $('#nav-toggle');
  if (!menu || menu.hidden) return;
  menu.classList.remove('is-open'); document.body.classList.remove('menu-open');
  toggle?.classList.remove('is-open'); toggle?.setAttribute('aria-expanded', 'false'); toggle?.setAttribute('aria-label', 'Open navigation menu');
  setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 320);
  if (restoreFocus) toggle?.focus();
}

async function renderDashboard(root) {
  const rid = root.dataset.rid; let idx = null;
  try { idx = await loadIndex(); } catch { /* shown as a message below */ }
  if (root.dataset.rid !== rid) return;
  const celebrateStreak = streakCelebration;
  streakCelebration = false;
  const d = derive(state), C = 326.7, doneN = Object.keys(state.lessons).length;
  const all = idx ? idx.tracks.flatMap(t => t.lessons.map((l, i) => ({ ...l, open: i === 0 || studied(state, t.lessons[i - 1].id) }))) : [];
  const next = all.find(l => !studied(state, l.id) && l.open);
  const earned = BADGES.filter(b => state.badges.includes(b.id)), dailyDone = state.daily?.day === day(0);
  const gl = state.goal?.day === day(0) ? state.goal : { xp: 0, done: false };
  const lessonPct = idx?.total ? Math.round(doneN / idx.total * 100) : 0;
  root.innerHTML = `<div class="stack dashboard">
  <section class="hero dashboard-hero"><div class="hero-copy"><span class="hero-eyebrow"><i aria-hidden="true">✦</i> YOUR MONEY JOURNEY</span><h1>Welcome back, ${esc(state.name)} <span class="hero-wave" aria-hidden="true">✦</span></h1><p class="lede">Every small lesson is a step toward a more confident future.</p><a class="btn hero-cta" href="#/learn">Continue learning <span aria-hidden="true">→</span></a></div>
    <div class="hero-progress"><div class="ring"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="ring-track" cx="60" cy="60" r="52"/>
    <circle class="ring-fill" id="rf" cx="60" cy="60" r="52" style="stroke-dasharray:${C};stroke-dashoffset:${C}"/></svg>
    <div class="ring-core"><strong>${d.level}</strong><span>${d.tier}</span></div></div><div class="hero-progress-copy"><span>LEVEL ${d.level}</span><strong>${d.toNext} XP to level ${d.level + 1}</strong><div class="bar"><i style="width:${d.pct}%"></i></div></div></div>
    <div class="hero-orbit hero-orbit-one" aria-hidden="true">✦</div><div class="hero-orbit hero-orbit-two" aria-hidden="true">●</div></section>
  <div class="tiles dashboard-tiles"><div class="tile gold"><span><i class="tile-icon">${icon('wallet',19)}</i> CASH WALLET</span><strong>${money(state.cash)}</strong><small>Your learning wallet</small></div>
    <div class="tile violet"><span><i class="tile-icon">${icon('chart',19)}</i> NET WORTH</span><strong>${money(d.netWorth)}</strong><small>Cash + savings</small></div>
    <div class="tile coral streak-card ${celebrateStreak ? 'streak-ignite' : ''}"><span><i class="tile-icon">${icon('flame',19)}</i> DAILY STREAK</span><strong>${state.streak} ${state.streak === 1 ? 'day' : 'days'}</strong><small>${celebrateStreak ? (state.streak > 1 ? 'Streak kept alive today!' : 'Your new streak starts today!') : 'Keep your rhythm going'}</small></div>
    <div class="tile mint"><span><i class="tile-icon">${icon('cap',19)}</i> LESSONS FINISHED</span><strong>${all.filter(l => studied(state, l.id)).length}<em> / ${idx ? idx.total : '–'}</em></strong><small>${lessonPct}% of your path explored</small></div></div>
  <div class="grid dashboard-panels">
  <section class="card daily-goal-card"><div class="panel-heading"><span class="panel-icon goal-icon">${icon('target',21)}</span><h2>Daily goal</h2><span class="reward-pill">+${GOAL_XP} XP</span></div><p>${gl.done ? 'Goal reached. Nice work!' : 'A little progress today goes a long way.'}</p><div class="bar goal-bar" role="progressbar" aria-label="Daily XP goal" aria-valuenow="${Math.min(gl.xp, GOAL_XP)}" aria-valuemin="0" aria-valuemax="${GOAL_XP}"><i style="width:${Math.min(100, gl.xp / GOAL_XP * 100)}%"></i></div><small class="goal-caption">${gl.xp} of ${GOAL_XP} XP ${gl.done ? 'earned today — you did it!' : 'earned today'}</small><div class="goal-status ${gl.done ? 'complete' : ''}"><span>${icon(gl.done ? 'check' : 'sparkles',16)}</span>${gl.done ? 'You showed up for yourself today.' : 'Complete a lesson or practice to reach your goal.'}</div></section>
  <section class="card next-card"><div class="panel-heading"><span class="panel-icon next-icon">${icon('route',20)}</span><span class="section-kicker">YOUR NEXT STEP</span><span class="time-pill">5 min</span></div>${next
    ? `<h2>${next.title}</h2><p>${next.blurb}</p><a class="btn primary next-cta" href="#/learn">Continue your path ${icon('arrow',18)}</a>`
    : idx ? `<h2>Ready for your next milestone?</h2><p>All lessons cleared. Close more budget months to keep growing your net worth.</p><a class="btn primary next-cta" href="#/budget">Plan month ${state.month} ${icon('arrow',18)}</a>`
    : '<p>Lessons could not load. Check your connection and refresh.</p>'}</section>
  <section class="card challenge-card"><div class="panel-heading"><span class="panel-icon challenge-icon">${icon('trophy',20)}</span><h2>Daily challenge</h2><span class="bonus-pill">BONUS XP</span></div><strong class="challenge-title">${dailyDone ? 'Challenge complete!' : 'Ready for a quick win?'}</strong><p>${dailyDone ? 'Brilliant work. Come back tomorrow for a fresh challenge.' : 'Three quick questions to sharpen your money skills.'}</p>${dailyDone ? `<div class="challenge-done">${icon('check',16)} Completed today</div>` : `<a class="btn challenge-cta" href="#/daily">Take the challenge ${icon('arrow',18)}</a>`}</section></div>
  <section class="dashboard-badges"><div class="section-title-row"><div><span class="section-kicker">MILESTONES</span><h2>Your badges</h2></div><a href="#/profile" class="text-link">View profile →</a></div>${earned.length
    ? `<div class="badges">${earned.map(b => `<div class="badge"><i>${b.icon}</i><div>${b.name}<small>${b.desc}</small></div></div>`).join('')}</div>`
    : '<p class="empty">No badges yet. Finish a lesson to earn your first.</p>'}</section></div>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { const f = $('#rf'); if (f) f.style.strokeDashoffset = C * (1 - d.pct / 100); }));
}

function showTestNotice() {
  if (state.testNoticeSeen || current() === 'p' || document.querySelector('.preview-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'preview-overlay';
  overlay.innerHTML = `<section class="preview-card" role="dialog" aria-modal="true" aria-labelledby="preview-title" aria-describedby="preview-summary">
    <div class="preview-mark" aria-hidden="true">${icon('sparkles',25)}</div>
    <span class="preview-badge">EARLY ACCESS <i></i> TEST BUILD</span>
    <h1 id="preview-title">You’re trying LifeLaunch early!</h1>
    <p id="preview-summary" class="preview-summary">This is a test version of the platform. A few important things to know before you jump in:</p>
    <ul class="preview-facts">
      <li><span class="preview-fact-icon">${icon('device',18)}</span><span><strong>Your progress stays here</strong><small>It’s saved in this browser on this device. It won’t sync to another device, and clearing browser data may erase it.</small></span></li>
      <li><span class="preview-fact-icon">${icon('user',18)}</span><span><strong>No accounts or database yet</strong><small>Account linking and cloud saves aren’t connected in this test build.</small></span></li>
      <li><span class="preview-fact-icon">${icon('shield',18)}</span><span><strong>Use pretend details</strong><small>LifeLaunch is a learning prototype. Don’t enter sensitive personal or financial information.</small></span></li>
    </ul>
    <button class="btn primary preview-continue" type="button">Got it — show me around ${icon('arrow',18)}</button>
    <p class="preview-footnote">Thanks for helping us test LifeLaunch. Things may change as we build.</p>
  </section>`;
  document.body.append(overlay);
  const button = overlay.querySelector('.preview-continue'), hud = $('#hud'), view = $('#view');
  hud?.setAttribute('inert', ''); view?.setAttribute('inert', ''); document.body.classList.add('preview-open');
  const acknowledge = () => {
    document.removeEventListener('keydown', onKey);
    overlay.classList.remove('is-visible');
    state.testNoticeSeen = true; save();
    setTimeout(() => {
      overlay.remove(); hud?.removeAttribute('inert'); view?.removeAttribute('inert'); document.body.classList.remove('preview-open');
      if (!state.tutorialSeen) ctx.tour();
    }, 220);
  };
  const onKey = e => {
    if (e.key === 'Escape') e.preventDefault();
    if (e.key === 'Tab') { e.preventDefault(); button.focus(); }
  };
  button.addEventListener('click', acknowledge, { once: true });
  document.addEventListener('keydown', onKey);
  requestAnimationFrame(() => { overlay.classList.add('is-visible'); button.focus(); });
}

let rc = 0;
function route() {
  const root = $('#view'), h = location.hash.replace(/^#\/?/, '') || 'dashboard', name = h.split('/')[0];
  document.body.classList.toggle('public', name === 'p');
  document.body.classList.remove('menu-open');
  document.body.classList.remove('in-session');
  root.onclick = root.oninput = root.onchange = null;
  root.dataset.rid = String(++rc);
  root.innerHTML = '<p class="lede">Loading…</p>';
  const fail = err => { console.error(err); root.innerHTML = '<div class="empty">Something went wrong loading this page.<br><br><button class="btn" onclick="location.reload()">Reload</button></div>'; };
  try {
    if (name === 'p') renderPublic(root, ctx, h.slice(2));
    else { renderHud(); Promise.resolve((ROUTES[name] || ROUTES.dashboard).fn(root, ctx)).catch(fail); }
  } catch (err) { fail(err); }
  window.scrollTo(0, 0);
  if (name !== 'p') {
    if (!state.testNoticeSeen) setTimeout(showTestNotice, 650);
    else if (!state.tutorialSeen) setTimeout(ctx.tour, 900);
  }
}

document.addEventListener('click', e => {
  const toggle = e.target.closest('#nav-toggle');
  if (toggle) {
    const menu = $('#mobile-menu'), opening = menu?.hidden;
    if (!menu) return;
    if (opening) {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      document.body.classList.add('menu-open');
      toggle.classList.add('is-open'); toggle.setAttribute('aria-expanded', 'true');
      toggle.setAttribute('aria-label', 'Close navigation menu');
      setTimeout(() => menu.querySelector('a')?.focus(), 90);
      audio.play('click');
    } else closeMobileMenu();
    return;
  }
  if (e.target.closest('[data-menu-close]')) { closeMobileMenu(true); return; }
  const mobileItem = e.target.closest('.mobile-menu-item,.quick-link');
  if (mobileItem) {
    const sameRoute = mobileItem.getAttribute('href') === (location.hash || '#/dashboard');
    closeMobileMenu();
    if (sameRoute) route();
    audio.play('click');
    return;
  }
  if (e.target.closest('#mute')) { audio.setMuted(!audio.muted); renderHud(); return; }
  const tab = e.target.closest('a.tab'); // tapping the tab you are already on resets that page (e.g. leave a quiz)
  if (tab && tab.getAttribute('href') === (location.hash || '#/dashboard') && !document.querySelector('.tour')) route();
  if (e.target.closest('.tab,.btn,.icon') && !e.target.closest('[data-silent]')) audio.play('click');
});
document.addEventListener('keydown', e => {
  const menu = $('#mobile-menu');
  if (!menu || menu.hidden) return;
  if (e.key === 'Escape') { e.preventDefault(); closeMobileMenu(true); return; }
  if (e.key === 'Tab') {
    const items = [...menu.querySelectorAll('a[href],button:not([disabled])')];
    if (!items.length) return;
    const first = items[0], last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});
window.addEventListener('hashchange', route);

// daily streak check-in
function checkIn() {
  const t = day(0); if (state.lastDay === t) return;
  state.streak = state.lastDay === day(-1) ? state.streak + 1 : 1; state.lastDay = t;
  streakCelebration = true;
  setTimeout(() => { update(s => { s.xp += 10; }); toast(`Day ${state.streak} streak. +10 XP`, 'good'); audio.play('streak'); }, 600);
}

const boot = $('#boot-screen'), bootBar = $('#boot-progress'), bootTrack = $('.boot-track'), bootCount = $('#boot-count'), bootPercent = $('#boot-percent'), bootMessage = $('#boot-message');
await audio.preload((done, total) => {
  const pct = Math.round(done / total * 100);
  bootBar.style.width = `${pct}%`; bootTrack.setAttribute('aria-valuenow', pct); bootPercent.textContent = `${pct}%`;
  bootCount.textContent = `Sound ${done} of ${total}`;
  if (done === total) bootMessage.textContent = audio.failed.size ? 'A few sounds will use the built-in tones.' : 'Your sound library is ready!';
});
checkIn();
route();
setInterval(() => { if (!document.body.classList.contains('in-session') && heartsNow(state) < 5) renderHud(); }, 60000);
setTimeout(() => { boot.classList.add('boot-exit'); setTimeout(() => boot.remove(), 700); }, 260);
