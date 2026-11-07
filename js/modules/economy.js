import { BUDGET } from '../data/gameData.js';
import { icon } from './icons.js';

const GROUP = { needs: 'Needs', wants: 'Wants', savings: 'Savings' };
const COLOR = { needs: 'var(--violet)', wants: 'var(--cash)', savings: 'var(--good)' };
const GROUP_ICON = { needs: 'shield', wants: 'sparkles', savings: 'wallet' };

export function renderBudget(root, ctx) {
  const { state, money } = ctx, { income, categories: cats, events } = BUDGET;
  const ev = events[(state.month - 1) % events.length], avail = income - ev.cost;
  if (!state.draft || state.draft.month !== state.month)
    state.draft = { month: state.month, alloc: Object.fromEntries(cats.map(c => [c.id, c.min])) };
  const a = state.draft.alloc;
  const sum = g => cats.filter(c => !g || c.group === g).reduce((t, c) => t + (+a[c.id] || 0), 0);

  root.innerHTML = `<div class="page-shell"><header class="page-intro"><span class="page-mark budget-mark">${icon('wallet',26)}</span><div><span class="section-kicker">BUDGETING SIMULATOR · MONTH ${state.month}</span><h1>Budget sandbox</h1>
  <p class="lede">Take-home pay is ${money(income)}. Assign every bit of it, then close the month.</p></div></header>
  <div class="stack">
    <div class="event budget-event"><span class="event-icon">${icon('sparkles',20)}</span><div><strong>Surprise this month: ${ev.t}.</strong><p>It costs ${money(ev.cost)}, so you have ${money(avail)} left to plan.</p></div></div>
    <div class="rem" id="remBox"><div><span id="remNote"></span><br><strong id="rem"></strong></div>
      <div class="actions"><button class="btn ghost" id="suggest">Suggest a plan</button><button class="btn primary" id="close">Close month</button></div></div>
    <div class="split" aria-hidden="true">${Object.keys(GROUP).map(g => `<i id="s-${g}" style="background:${COLOR[g]}"></i>`).join('')}</div>
    ${Object.keys(GROUP).map(g => `<section class="card budget-group"><h2><span class="budget-group-icon">${icon(GROUP_ICON[g],20)}</span>${GROUP[g]}</h2>${cats.filter(c => c.group === g).map(c => `
      <div class="row"><label for="i-${c.id}">${c.label}</label><output id="v-${c.id}"></output>
      <input type="range" id="i-${c.id}" data-id="${c.id}" min="${c.min}" max="${avail}" step="10" value="${a[c.id]}"></div>`).join('')}</section>`).join('')}
  </div></div>`;

  const $ = s => root.querySelector(s);
  const paint = () => {
    const rem = avail - sum();
    $('#rem').textContent = money(Math.abs(rem));
    $('#remBox').dataset.state = rem === 0 ? 'ok' : rem < 0 ? 'over' : 'left';
    $('#remNote').textContent = rem === 0 ? 'Fully assigned' : rem > 0 ? 'Still unassigned' : 'Over budget by';
    cats.forEach(c => { $('#v-' + c.id).textContent = `${money(a[c.id])} (${Math.round(a[c.id] / income * 100)}%)`; });
    Object.keys(GROUP).forEach(g => { $('#s-' + g).style.width = Math.min(100, sum(g) / income * 100) + '%'; });
  };
  paint();

  root.oninput = e => { const id = e.target.dataset?.id; if (id) { a[id] = +e.target.value; paint(); } };
  root.onchange = e => { if (e.target.dataset?.id) ctx.update(() => {}); };
  $('#suggest').onclick = () => {
    cats.forEach(c => { a[c.id] = Math.min(avail, BUDGET.suggest[c.id] ?? 0); });
    a.goals = Math.max(0, avail - sum());
    ctx.update(() => {}); renderBudget(root, ctx);
  };
  $('#close').onclick = () => {
    const rem = avail - sum();
    if (rem !== 0) { ctx.toast(rem > 0 ? 'Assign the remaining amount first' : 'You are over budget', 'bad'); ctx.audio.play('wrong'); return; }
    const n = sum('needs') / income, w = sum('wants') / income, s = sum('savings') / income;
    const score = (n <= .55 ? 35 : 15) + (w <= .3 ? 25 : w <= .4 ? 12 : 0) + (s >= .2 ? 40 : s >= .1 ? 22 : 5);
    const tips = [];
    if (n > .55) tips.push('Needs took more than 55% of income. Look at rent and transport first.');
    if (w > .3) tips.push('Wants went above 30%. Trim eating out or subscriptions.');
    if (s < .2) tips.push('Aim to save at least 20% of income.');
    if (!tips.length) tips.push('Textbook balance. Keep this up.');
    const month = state.month, saved = sum('savings');
    ctx.update(st => {
      st.savings += saved; st.cash += score * 2; st.xp += 40 + score; st.bestScore = Math.max(st.bestScore, score);
      st.history = [...st.history, { m: month, score }].slice(-12); st.month++; st.draft = null;
    });
    ctx.audio.play(score >= 60 ? 'reward' : 'wrong');
    root.oninput = root.onchange = null;
    root.innerHTML = `<div class="lesson-view"><h1>Month ${month} closed</h1><div class="card">
      <h2>Score ${score} of 100</h2><p>Saved ${money(saved)}. Rewards: ${money(score * 2)} and ${40 + score} XP.</p>
      ${tips.map(t => `<p class="why">${t}</p>`).join('')}</div>
      <button class="btn primary" id="nm">Plan month ${month + 1}</button></div>`;
    root.querySelector('#nm').onclick = () => renderBudget(root, ctx);
  };
}
