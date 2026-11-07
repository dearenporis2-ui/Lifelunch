import { BADGES } from '../data/gameData.js';
import { icon } from './icons.js';

const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
const num = v => Math.max(0, Math.min(1e9, Number(v) || 0));

function snapshot(state, d) {
  return { n: state.name, l: d.level, t: d.tier, xp: state.xp, nw: Math.round(d.netWorth), st: state.streak, b: state.badges, ls: Object.keys(state.lessons).length };
}

function cardHtml(p, ctx) {
  const { esc, money } = ctx, name = esc(p.n || 'Player');
  const earned = BADGES.filter(b => p.b.includes(b.id));
  return `<article class="pcard" aria-label="Profile card">
    <div class="phead"><div class="avatar" aria-hidden="true">${esc((p.n || 'P').charAt(0).toUpperCase())}</div>
      <div><h2>${name}</h2><p>${esc(p.t)}, level ${p.l}</p></div></div>
    <div class="tiles profile-tiles"><div class="tile gold"><span>${icon('wallet',16)} Net worth</span><strong>${money(p.nw)}</strong></div>
      <div class="tile"><span>${icon('sparkles',16)} XP</span><strong>${p.xp}</strong></div>
      <div class="tile"><span>${icon('flame',16)} Streak</span><strong>${p.st}d</strong></div>
      <div class="tile"><span>${icon('cap',16)} Lessons</span><strong>${p.ls}</strong></div></div>
    ${earned.length ? `<div class="badges">${earned.map(b => `<div class="badge"><i>${b.icon}</i><div>${b.name}</div></div>`).join('')}</div>`
      : '<p class="empty">No badges yet.</p>'}
    <p style="color:var(--muted);font-size:.85rem">LifeLaunch, Tyler Nicholas Foundation</p></article>`;
}

export function renderProfile(root, ctx) {
  const { state, derive } = ctx;
  root.innerHTML = `<div class="page-shell"><header class="page-intro"><span class="page-mark profile-mark">${icon('user',26)}</span><div><span class="section-kicker">YOUR PROGRESS, YOURS</span><h1>Your profile</h1><p class="lede">Customize your name, celebrate your milestones, and share your progress.</p></div></header>
  <div class="profile-layout"><div class="stack profile-settings"><label class="field">Display name<input id="nm" maxlength="24" value="${ctx.esc(state.name)}"></label>
  <div id="card"></div>
  <div class="actions"><button class="btn primary" id="share">${icon('share',17)} Share profile</button><button class="btn ghost" id="replay">${icon('rotate',17)} Replay tutorial</button><button class="btn danger" id="reset">${icon('trash',17)} Reset progress</button></div></div>
  <section class="profile-badges"><div class="section-title-row"><div><span class="section-kicker">KEEP COLLECTING</span><h2>All badges</h2></div><span class="badge-count">${state.badges.length} / ${BADGES.length}</span></div><div class="badges">${BADGES.map(b => { const on = state.badges.includes(b.id);
    return `<div class="badge ${on ? '' : 'locked'}"><i>${b.icon}</i><div>${b.name}<small>${b.desc}</small></div></div>`; }).join('')}</div></section></div></div>`;
  const paint = () => { root.querySelector('#card').innerHTML = cardHtml(snapshot(state, derive(state)), ctx); };
  paint();
  root.querySelector('#nm').onchange = e => { ctx.update(s => { s.name = e.target.value.trim().slice(0, 24) || 'Player One'; }); paint(); };
  root.querySelector('#share').onclick = async () => {
    const url = `${location.origin}${location.pathname}#/p/${enc(snapshot(state, derive(state)))}`;
    try {
      if (navigator.share) await navigator.share({ title: 'My LifeLaunch profile', url });
      else { await navigator.clipboard.writeText(url); ctx.toast('Profile link copied', 'good'); }
    } catch (err) { if (err.name !== 'AbortError') window.prompt('Copy your profile link:', url); }
  };
  root.querySelector('#replay').onclick = () => ctx.tour();
  root.querySelector('#reset').onclick = () => {
    if (confirm('Erase all progress on this device? This cannot be undone.')) { localStorage.removeItem('lifelaunch.v1'); location.hash = '#/dashboard'; location.reload(); }
  };
}

export function renderPublic(root, ctx, payload) {
  let p;
  try {
    const r = dec(payload || '');
    p = { n: String(r.n || 'Player').slice(0, 24), l: num(r.l), t: String(r.t || 'Rookie').slice(0, 16), xp: num(r.xp), nw: num(r.nw), st: num(r.st), ls: num(r.ls),
      b: Array.isArray(r.b) ? r.b.filter(id => BADGES.some(b => b.id === id)) : [] };
  } catch { p = null; }
  root.innerHTML = p
    ? `<div class="stack">${cardHtml(p, ctx)}<a class="btn primary" style="max-width:460px" href="#/dashboard">Start your own LifeLaunch</a></div>`
    : `<div class="empty">This profile link is broken or incomplete.<br><br><a class="btn" href="#/dashboard">Go to LifeLaunch</a></div>`;
}
