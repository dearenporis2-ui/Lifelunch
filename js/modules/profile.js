import { BADGES } from '../data/gameData.js';
import { icon } from './icons.js';
import { AVATAR_PARTS, DEFAULT_AVATAR, avatarSvg, normalizeAvatar } from './avatar.js';

const enc = o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const dec = s => JSON.parse(decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/')))));
const num = v => Math.max(0, Math.min(1e9, Number(v) || 0));

function snapshot(state, d) {
  return { n: state.name, a: normalizeAvatar(state.avatar), l: d.level, t: d.tier, xp: state.xp, nw: Math.round(d.netWorth), st: state.streak, b: state.badges, ls: Object.keys({ ...state.lessons, ...state.studied, ...state.quizResults }).length };
}

function optionButtons(part, selected, presentation) {
  const options = AVATAR_PARTS[part].filter(option => part !== 'hairStyle' || (option.presentation || 'feminine') === presentation);
  return options.map(option => {
    const textual = part === 'hairStyle' || part === 'outfitStyle' || part === 'expression';
    const visual = textual ? '' : `<i class="avatar-swatch ${part === 'hairColor' ? 'hair-swatch' : ''}" style="--avatar-swatch:${option.base}" aria-hidden="true"></i>`;
    return `<button type="button" class="avatar-option ${selected === option.id ? 'is-selected' : ''} ${textual ? 'avatar-option-text' : ''}" data-avatar-part="${part}" data-avatar-value="${option.id}" aria-label="${option.label}" aria-pressed="${selected === option.id}" title="${option.label}">${visual}${textual ? `<span>${option.label}</span>` : `<span class="sr-only">${option.label}</span>`}</button>`;
  }).join('');
}

function avatarStudioHtml(value, activeTab = 'outfit', savedLabel = 'Saved on this device') {
  const a = normalizeAvatar(value || DEFAULT_AVATAR);
  const tabs = [['skin','Skin'],['hair','Hair'],['face','Face'],['outfit','Outfit']];
  const panel = activeTab === 'skin'
    ? `<div class="avatar-panel-heading"><span>Skin tone</span><small>Choose a shade</small></div><div class="avatar-options swatch-options">${optionButtons('skin', a.skin)}</div>`
    : activeTab === 'hair'
      ? `<div class="avatar-panel-heading"><span>Hair</span><small>Pick a style and color</small></div><div class="avatar-style-grid">${optionButtons('hairStyle', a.hairStyle, a.presentation)}</div><div class="avatar-options swatch-options avatar-color-row">${optionButtons('hairColor', a.hairColor)}</div>`
      : activeTab === 'face'
        ? `<div class="avatar-panel-heading"><span>Expression</span><small>Choose a mood</small></div><div class="avatar-style-grid expression-grid">${optionButtons('expression', a.expression)}</div>`
        : `<div class="avatar-panel-heading"><span>Clothing</span><small>Choose a cut and color</small></div><div class="avatar-style-grid outfit-style-grid">${optionButtons('outfitStyle', a.outfitStyle)}</div><div class="avatar-options swatch-options avatar-color-row">${optionButtons('outfitColor', a.outfitColor)}</div>`;
  return `<div class="avatar-studio-top"><div><span class="section-kicker">YOUR LITTLE LOOK</span><h2>Make it yours</h2><p>Mix a few details and find a look that feels like you.</p></div><span class="avatar-saved">${icon(savedLabel === 'Saved on this device' ? 'device' : 'cloud',14)} ${savedLabel}</span></div>
    <div class="avatar-studio-body"><div class="avatar-preview-column"><div class="avatar-stage">${avatarSvg(a, 'avatar-art avatar-preview')}<span class="avatar-stage-glint" aria-hidden="true">✦</span></div><div class="avatar-presentation" role="group" aria-label="Character style">${AVATAR_PARTS.presentation.map(option => `<button type="button" data-avatar-presentation="${option.id}" aria-pressed="${a.presentation === option.id}">${option.label}</button>`).join('')}</div></div>
      <div class="avatar-customizer"><div class="avatar-tabs" role="tablist" aria-label="Avatar options">${tabs.map(([id,label]) => `<button type="button" class="avatar-tab" role="tab" id="avatar-tab-${id}" aria-selected="${activeTab === id}" aria-controls="avatar-panel" data-avatar-tab="${id}">${label}</button>`).join('')}</div>
        <section class="avatar-panel" id="avatar-panel" role="tabpanel" aria-labelledby="avatar-tab-${activeTab}">${panel}</section></div>
    </div>`;
}

function cardHtml(p, ctx) {
  const { esc, money } = ctx, name = esc(p.n || 'Player');
  const earned = BADGES.filter(b => p.b.includes(b.id));
  return `<article class="pcard" aria-label="Profile card">
    <div class="phead"><div class="avatar profile-avatar" aria-hidden="true">${avatarSvg(p.a || DEFAULT_AVATAR)}</div>
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
  const savedLabel = () => ctx.cloud.state.conflict ? 'Choose which save to keep' : ctx.cloud.state.user ? (ctx.cloud.state.status.startsWith('Syncing') ? 'Syncing your progress…' : 'Synced to your account') : 'Saved on this device';
  root.innerHTML = `<div class="page-shell"><header class="page-intro"><span class="page-mark profile-mark">${icon('user',26)}</span><div><span class="section-kicker">YOUR PROGRESS, YOURS</span><h1>Your profile</h1><p class="lede">Customize your name, celebrate your milestones, and share your progress.</p></div></header>
  <div class="profile-layout"><div class="stack profile-settings"><section class="avatar-studio" id="avatar-studio" aria-label="Avatar customization">${avatarStudioHtml(state.avatar, 'outfit', savedLabel())}</section><label class="field">Display name<input id="nm" maxlength="24" value="${ctx.esc(state.name)}"></label>
  <section class="account-panel" aria-labelledby="account-title"><div class="account-panel-heading"><span class="section-kicker">YOUR ACCOUNT</span><h2 id="account-title">Save across devices</h2><p>Keep your learning progress when you change devices.</p></div>
    <p class="account-status" data-account-status role="status">${ctx.esc(ctx.cloud.state.status)}</p>
    <div class="account-form-wrap"><button class="btn google-auth" type="button" data-google-sign-in><span aria-hidden="true">G</span> Continue with Google</button><div class="account-divider"><span>or use email</span></div>
    <form class="account-form" id="account-form"><label class="field">Email<input type="email" name="email" autocomplete="email" required maxlength="254"></label><label class="field">Password<input type="password" name="password" autocomplete="current-password" required minlength="6" maxlength="128"></label><div class="account-actions"><button class="btn primary" type="submit">Sign in</button><button class="btn ghost" type="button" data-create-account>Create account</button></div></form></div>
    <div class="account-signed-in" data-account-user hidden><p>Signed in as <strong data-account-email></strong></p><button class="btn ghost" type="button" data-sign-out>Sign out</button></div>
    <div class="account-conflict" data-account-conflict hidden><p>There’s progress on this device and in your account. Which save should we keep?</p><div class="account-actions"><button class="btn primary" type="button" data-use-cloud>Use account save</button><button class="btn ghost" type="button" data-use-device>Keep this device save</button></div></div>
  </section>
  <div id="card"></div>
  <div class="actions"><button class="btn primary" id="share">${icon('share',17)} Share profile</button><button class="btn ghost" id="replay">${icon('rotate',17)} Replay tutorial</button><button class="btn danger" id="reset">${icon('trash',17)} Reset progress</button></div></div>
  <section class="profile-badges"><div class="section-title-row"><div><span class="section-kicker">KEEP COLLECTING</span><h2>All badges</h2></div><span class="badge-count">${state.badges.length} / ${BADGES.length}</span></div><div class="badges">${BADGES.map(b => { const on = state.badges.includes(b.id);
    return `<div class="badge ${on ? '' : 'locked'}"><i>${b.icon}</i><div>${b.name}<small>${b.desc}</small></div></div>`; }).join('')}</div></section></div></div>`;
  const paint = () => { root.querySelector('#card').innerHTML = cardHtml(snapshot(state, derive(state)), ctx); };
  paint();
  const accountForm = root.querySelector('#account-form'), accountStatus = root.querySelector('[data-account-status]');
  const paintAccount = () => {
    const cloud = ctx.cloud.state, signedIn = Boolean(cloud.user), conflict = Boolean(cloud.conflict);
    accountStatus.textContent = cloud.status;
    accountForm.hidden = signedIn || conflict;
    accountForm.querySelectorAll('button').forEach(button => { button.disabled = cloud.connecting; });
    root.querySelector('[data-google-sign-in]').disabled = cloud.connecting || !cloud.ready;
    root.querySelector('.account-form-wrap').hidden = signedIn || conflict;
    root.querySelector('[data-account-user]').hidden = !signedIn || conflict;
    root.querySelector('[data-account-email]').textContent = cloud.user?.email || 'your account';
    root.querySelector('[data-account-conflict]').hidden = !conflict;
  };
  paintAccount();
  const submitAuth = async mode => {
    if (!ctx.cloud.state.ready || ctx.cloud.state.connecting) { ctx.toast('Connecting to account services…'); return; }
    const email = accountForm.elements.email.value.trim(), password = accountForm.elements.password.value;
    accountForm.querySelectorAll('button').forEach(button => { button.disabled = true; });
    accountStatus.textContent = mode === 'create' ? 'Creating your account…' : 'Signing in…';
    try {
      if (mode === 'create') await ctx.cloud.createAccount(email, password);
      else await ctx.cloud.signIn(email, password);
    } catch (error) {
      const messages = {
        'auth/email-already-in-use': 'That email already has an account. Try signing in.',
        'auth/invalid-credential': 'Email or password is incorrect.',
        'auth/invalid-email': 'Enter a valid email address.',
        'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
        'auth/operation-not-allowed': 'Email/password sign-in is not enabled in Firebase yet.',
        'auth/network-request-failed': 'Could not reach Firebase. Check your connection and try again.'
      };
      accountStatus.textContent = messages[error.code] || 'Could not sign in right now. Please try again.';
      accountForm.querySelectorAll('button').forEach(button => { button.disabled = false; });
    }
  };
  accountForm.onsubmit = e => { e.preventDefault(); submitAuth('sign-in'); };
  root.querySelector('[data-create-account]').onclick = () => { if (accountForm.reportValidity()) submitAuth('create'); };
  root.querySelector('[data-sign-out]').onclick = async () => { try { await ctx.cloud.signOut(); ctx.toast('Signed out. Your device save is still here.', 'good'); } catch { accountStatus.textContent = 'Could not sign out. Please try again.'; } };
  root.querySelector('[data-google-sign-in]').onclick = async e => {
    if (!ctx.cloud.state.ready || ctx.cloud.state.connecting) { ctx.toast('Connecting to account services…'); return; }
    e.currentTarget.disabled = true; accountStatus.textContent = 'Connecting to Google…';
    try { await ctx.cloud.signInWithGoogle(); }
    catch (error) {
      const messages = {
        'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
        'auth/popup-blocked': 'Your browser blocked the sign-in popup. Allow popups and try again.',
        'auth/unauthorized-domain': 'Add this website domain to Firebase Authentication’s authorized domains.',
        'auth/operation-not-allowed': 'Google sign-in is not enabled in Firebase yet.'
      };
      accountStatus.textContent = messages[error.code] || 'Google sign-in could not complete. Please try again.';
      e.currentTarget.disabled = false;
    }
  };
  root.querySelector('[data-use-cloud]').onclick = () => ctx.cloud.useCloud();
  root.querySelector('[data-use-device]').onclick = () => ctx.cloud.useDevice();
  const studio = root.querySelector('#avatar-studio');
  let activeTab = 'outfit';
  studio.onclick = e => {
    const presentation = e.target.closest('[data-avatar-presentation]');
    if (presentation) {
      const updated = normalizeAvatar({ ...state.avatar, presentation: presentation.dataset.avatarPresentation });
      ctx.update(s => { s.avatar = updated; });
      studio.innerHTML = avatarStudioHtml(state.avatar, activeTab, savedLabel()); paint(); return;
    }
    const tab = e.target.closest('[data-avatar-tab]');
    if (tab) { activeTab = tab.dataset.avatarTab; studio.innerHTML = avatarStudioHtml(state.avatar, activeTab, savedLabel()); return; }
    const button = e.target.closest('[data-avatar-part]'); if (!button) return;
    const { avatarPart, avatarValue } = button.dataset;
    const updated = normalizeAvatar({ ...state.avatar, [avatarPart]: avatarValue });
    ctx.update(s => { s.avatar = updated; });
    studio.innerHTML = avatarStudioHtml(state.avatar, activeTab, savedLabel()); paint();
  };
  root.querySelector('#nm').onchange = e => { ctx.update(s => { s.name = e.target.value.trim().slice(0, 24) || 'Player One'; }); paint(); };
  root.querySelector('#share').onclick = async () => {
    const url = `${location.origin}${location.pathname}#/p/${enc(snapshot(state, derive(state)))}`;
    try {
      if (navigator.share) await navigator.share({ title: 'My LifeLaunch profile', url });
      else { await navigator.clipboard.writeText(url); ctx.toast('Profile link copied', 'good'); }
    } catch (err) { if (err.name !== 'AbortError') window.prompt('Copy your profile link:', url); }
  };
  root.querySelector('#replay').onclick = () => ctx.tour();
  root.querySelector('#reset').onclick = async () => {
    const uid = ctx.cloud.state.user?.uid;
    const message = uid ? 'Erase all progress on this device and in your account? This cannot be undone.' : 'Erase all progress on this device? This cannot be undone.';
    if (!confirm(message)) return;
    if (uid) {
      try { await ctx.cloud.deleteProgress(uid); localStorage.removeItem(`lifelaunch.v1.synced.${uid}`); }
      catch { ctx.toast('Could not erase your cloud save. Your progress is still safe.', 'bad'); return; }
    }
    localStorage.removeItem('lifelaunch.v1'); location.hash = '#/dashboard'; location.reload();
  };
}

export function renderPublic(root, ctx, payload) {
  let p;
  try {
    const r = dec(payload || '');
    p = { n: String(r.n || 'Player').slice(0, 24), a: normalizeAvatar(r.a), l: num(r.l), t: String(r.t || 'Rookie').slice(0, 16), xp: num(r.xp), nw: num(r.nw), st: num(r.st), ls: num(r.ls),
      b: Array.isArray(r.b) ? r.b.filter(id => BADGES.some(b => b.id === id)) : [] };
  } catch { p = null; }
  root.innerHTML = p
    ? `<div class="stack">${cardHtml(p, ctx)}<a class="btn primary" style="max-width:460px" href="#/dashboard">Start your own LifeLaunch</a></div>`
    : `<div class="empty">This profile link is broken or incomplete.<br><br><a class="btn" href="#/dashboard">Go to LifeLaunch</a></div>`;
}
