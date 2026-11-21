import { icon } from './icons.js';
import { avatarSvg, normalizeAvatar, DEFAULT_AVATAR } from './avatar.js';

let stopWatching = null;

export function renderLeaderboard(root, ctx) {
  stopWatching?.();
  const signedIn = Boolean(ctx.cloud.state.user);
  const optedIn = Boolean(ctx.state.leaderboardOptIn);
  root.innerHTML = `<div class="page-shell leaderboard-page">
    <header class="page-intro"><span class="page-mark leaderboard-mark">${icon('trophy',26)}</span><div><span class="section-kicker">GROW TOGETHER</span><h1>Leaderboard</h1><p class="lede">See how the LifeLaunch community is learning and growing.</p></div></header>
    <section class="card leaderboard-card"><div class="leaderboard-heading"><div><span class="section-kicker">ALL-TIME XP</span><h2>Top learners</h2><p>Updates live as players make progress.</p></div><span class="leaderboard-live"><i></i> Live</span></div>
      <div class="leaderboard-optin" ${signedIn ? '' : 'hidden'}><label><input type="checkbox" data-leaderboard-optin ${optedIn ? 'checked' : ''}><span><strong>Show me on the leaderboard</strong><small>Your display name, avatar, XP and an opaque account ID are public. Your email stays private. You can opt out any time.</small></span></label><span class="leaderboard-optin-status" data-optin-status>${optedIn ? 'You’re visible' : 'You’re private'}</span></div>
      ${signedIn ? '' : `<div class="leaderboard-signin"><p>Sign in to join the leaderboard. Your progress is saved on this device until you connect an account.</p><a class="btn primary" href="#/profile">Go to your profile ${icon('arrow',17)}</a></div>`}
      <div class="leaderboard-list" data-leaderboard-list><div class="leaderboard-loading"><span class="leaderboard-spinner"></span><span>Loading the leaderboard…</span></div></div>
      <p class="leaderboard-note">Only players who choose to appear are listed. This is a friendly test leaderboard: XP follows saved account progress and is not cheat-proof yet.</p>
    </section></div>`;

  const list = root.querySelector('[data-leaderboard-list]');
  const paint = rows => {
    if (!root.isConnected) return;
    if (!rows.length) {
      list.innerHTML = `<div class="leaderboard-empty"><span>${icon('sparkles',22)}</span><strong>The board is ready for its first learners.</strong><small>Opt in above to be the first name on it.</small></div>`;
      return;
    }
    list.innerHTML = rows.map((player, index) => {
      const rank = index + 1;
      return `<article class="leaderboard-row ${rank <= 3 ? `leaderboard-rank-${rank}` : ''}">
        <span class="leaderboard-rank" aria-label="Rank ${rank}">${rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}</span>
        <span class="leaderboard-avatar" aria-hidden="true">${avatarSvg(normalizeAvatar(player.avatar || DEFAULT_AVATAR))}</span>
        <span class="leaderboard-player"><strong>${ctx.esc(player.name || 'Player')}</strong><small>Level ${Math.max(1, Number(player.level) || 1)}</small></span>
        <strong class="leaderboard-xp">${Math.max(0, Number(player.xp) || 0).toLocaleString()} <small>XP</small></strong>
      </article>`;
    }).join('');
  };

  if (!ctx.cloud.state.ready) {
    list.innerHTML = '<div class="leaderboard-empty"><strong>Connecting to the leaderboard…</strong></div>';
  } else {
    stopWatching = ctx.cloud.watchLeaderboard(paint, error => {
      console.error('Leaderboard listener failed:', error);
      if (root.isConnected) list.innerHTML = '<div class="leaderboard-empty"><strong>Leaderboard is temporarily unavailable.</strong><small>Check your connection and try again.</small></div>';
    });
  }

  const toggle = root.querySelector('[data-leaderboard-optin]');
  toggle?.addEventListener('change', () => {
    ctx.update(state => { state.leaderboardOptIn = toggle.checked; });
    root.querySelector('[data-optin-status]').textContent = toggle.checked ? 'You’re visible' : 'You’re private';
    ctx.toast(toggle.checked ? 'You joined the leaderboard' : 'You’re hidden from the leaderboard', 'good');
  });
}
