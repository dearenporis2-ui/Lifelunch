// Practice hub and the investing game. Nothing here uses real money.
import { startPractice } from './path.js';
import { heartsNow, MAX_HEARTS } from './hearts.js';
import { icon } from './icons.js';

const YEARS = 8;
const ASSETS = [
  { id: 'sav', name: 'Savings account', note: 'Safe and slow. It rarely loses money.' },
  { id: 'bond', name: 'Bonds', note: 'Lending to governments or companies. Steady, with small swings.' },
  { id: 'idx', name: 'Index fund', note: 'A basket of hundreds of companies. Bumpy, but spread out.' },
  { id: 'stock', name: 'One company\'s shares', note: 'High risk and high reward. Can soar or crash.' }
];
const EVENTS = [
  { t: 'Boom year', d: 'The economy grows fast and optimism is everywhere.', r: { sav: 2, bond: 3, idx: 18, stock: 30 } },
  { t: 'Steady year', d: 'Nothing dramatic. Prices and profits tick along.', r: { sav: 2, bond: 4, idx: 8, stock: 10 } },
  { t: 'Recession', d: 'Companies struggle and markets fall sharply.', r: { sav: 2, bond: 6, idx: -20, stock: -35 } },
  { t: 'Interest rates jump', d: 'Borrowing gets costly and existing bonds lose value.', r: { sav: 3, bond: -4, idx: 3, stock: 2 } },
  { t: 'Tech surge', d: 'A hot sector rockets, and your company is riding it.', r: { sav: 2, bond: 3, idx: 12, stock: 45 } },
  { t: 'Company scandal', d: 'Your single company is caught in a scandal and its shares crash. The wider market barely notices.', r: { sav: 2, bond: 4, idx: 9, stock: -60 } },
  { t: 'Recovery', d: 'After a rough patch, markets rebound strongly.', r: { sav: 2, bond: 4, idx: 14, stock: 18 } },
  { t: 'Inflation spike', d: 'Prices jump and savers feel the squeeze.', r: { sav: 3, bond: -2, idx: 2, stock: -5 } }
];
const shuffle = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const pct = n => (n >= 0 ? '+' : '-') + Math.abs(n).toFixed(1) + '%';

export function renderPractice(root, ctx) {
  const { state } = ctx, inv = state.sims?.invest, hn = heartsNow(state);
  const dailyDone = state.daily?.day === new Date().toLocaleDateString('en-CA');
  root.innerHTML = `<div class="page-shell"><header class="page-intro"><span class="page-mark practice-mark">${icon('game',26)}</span><div><span class="section-kicker">LEARN BY DOING</span><h1>Practice zone</h1><p class="lede">Try things out, build confidence, and earn rewards. Mistakes here are just part of learning.</p></div></header><div class="grid activity-grid">
    <article class="card activity-card quick-card"><div class="activity-icon">${icon('sparkles',25)}</div><div class="activity-title"><h2>Quick practice</h2><span class="activity-tag">5 questions</span></div><p>Questions from what you have learned. ${hn < MAX_HEARTS ? 'Score 60% or more to win a heart back.' : 'Your hearts are full, but practice still earns a little XP.'}</p>
      <div class="meta"><span>${icon('heart',16)} ${hn} of ${MAX_HEARTS} hearts</span></div><button class="btn primary" id="qp">Start practice ${icon('arrow',17)}</button></article>
  <article class="card activity-card challenge-activity"><div class="activity-icon">${icon('trophy',25)}</div><div class="activity-title"><h2>Mystery vault</h2><span class="activity-tag">Daily</span></div><p>${dailyDone ? 'Vault opened. A new money puzzle arrives tomorrow.' : 'Solve three quick questions to reveal XP, cash, and a garden collectible.'}</p>${dailyDone ? `<div class="activity-complete">${icon('check',17)} Done for today</div>` : `<a class="btn primary" href="#/daily">Open today’s vault ${icon('arrow',17)}</a>`}</article>
    <article class="card activity-card budget-activity"><div class="activity-icon">${icon('wallet',25)}</div><div class="activity-title"><h2>Budget month</h2><span class="activity-tag">Simulator</span></div><p>Plan a pretend month with real surprises, then see how your choices score.</p>
      <div class="meta"><span>Month ${state.month}</span><span>Best score ${state.bestScore || 'none yet'}</span></div><a class="btn primary" href="#/budget">Build a budget ${icon('arrow',17)}</a></article>
    <article class="card activity-card invest-activity"><div class="activity-icon">${icon('chart',25)}</div><div class="activity-title"><h2>Invest years</h2><span class="activity-tag">8 rounds</span></div><p>Manage a portfolio through ${YEARS} market years. Spread your money, ride out the crashes, and see what the market teaches you.</p>
      <div class="meta"><span>${inv ? `${inv.plays} ${inv.plays === 1 ? 'game' : 'games'} played` : 'Not played yet'}</span>${inv ? `<span>Best ${ctx.money(inv.best)}</span>` : ''}</div><a class="btn primary" href="#/invest">Explore investing ${icon('arrow',17)}</a></article></div></div>`;
  root.onclick = e => { if (e.target.closest('#qp')) startPractice(root, ctx, renderPractice); };
}

export function renderInvest(root, ctx) {
  const seq = shuffle(EVENTS).slice(0, YEARS), $ = s => root.querySelector(s);
  const g = { y: 0, v: 1000, a: { sav: 25, bond: 25, idx: 25, stock: 25 }, b: { sav: 1000, idx: 1000, stock: 1000 }, hist: [] };
  const total = () => Object.values(g.a).reduce((s, x) => s + x, 0);
  root.onclick = root.oninput = null;

  const intro = () => {
    root.innerHTML = `<div class="lesson-view"><header class="page-intro compact-intro"><span class="page-mark invest-mark">${icon('chart',25)}</span><div><span class="section-kicker">INVESTING SIMULATOR</span><h1>Invest years</h1></div></header>
      <p class="lede" style="margin:0">You start with ${ctx.money(1000)}. Each year you split it between four choices. Then the year happens and you find out what the market did. You cannot see the future, just like real investors.</p>
      <div class="card simulator-card"><h2>${icon('coins',20)} Your four choices</h2><ul>${ASSETS.map(a => `<li><strong>${a.name}:</strong> ${a.note}</li>`).join('')}</ul></div>
      <button class="btn primary" id="go">Start year 1</button></div>`;
    $('#go').onclick = plan;
  };
  function plan() {
    root.innerHTML = `<div class="lesson-view"><div class="bar"><i style="width:${g.y / YEARS * 100}%"></i></div><h1>Year ${g.y + 1} of ${YEARS}</h1>
      <p class="part">Portfolio value: ${ctx.money(g.v)}</p>
      <div class="card">${ASSETS.map(a => `<div class="row"><label for="s-${a.id}">${a.name}</label><output id="o-${a.id}"></output>
        <input type="range" id="s-${a.id}" data-id="${a.id}" min="0" max="100" step="5" value="${g.a[a.id]}"></div>`).join('')}<p id="tot" class="part"></p></div>
      <div class="actions"><button class="btn ghost" id="even">Split evenly</button><button class="btn primary" id="run">Run the year</button></div></div>`;
    const paint = () => {
      ASSETS.forEach(a => { $('#o-' + a.id).textContent = g.a[a.id] + '%'; });
      const t = total(); $('#tot').textContent = t === 100 ? 'Fully invested.' : t < 100 ? `${100 - t}% still uninvested` : `${t - 100}% over, reduce something`;
      $('#run').disabled = t !== 100;
    };
    root.oninput = e => { const id = e.target.dataset?.id; if (id) { g.a[id] = +e.target.value; paint(); } };
    $('#even').onclick = () => { ASSETS.forEach(a => { g.a[a.id] = 25; $('#s-' + a.id).value = 25; }); paint(); };
    $('#run').onclick = run; paint();
  }
  function run() {
    const ev = seq[g.y], before = g.v;
    g.v = ASSETS.reduce((s, a) => s + before * g.a[a.id] / 100 * (1 + ev.r[a.id] / 100), 0);
    ['sav', 'idx', 'stock'].forEach(k => { g.b[k] *= 1 + ev.r[k] / 100; });
    const ret = (g.v / before - 1) * 100;
    g.hist.push({ a: { ...g.a }, ev, ret }); g.y++; root.oninput = null;
    root.innerHTML = `<div class="lesson-view"><h1>${ev.t}</h1><p class="lede" style="margin:0">${ev.d}</p><div class="card">
      ${ASSETS.map(a => `<div class="sim-row"><span>${a.name}</span><span class="${ev.r[a.id] < 0 ? 'neg' : 'pos'}">${pct(ev.r[a.id])}</span></div>`).join('')}
      <div class="sim-row"><strong>Your portfolio</strong><strong class="${ret < 0 ? 'neg' : 'pos'}">${pct(ret)}</strong></div><p>Now worth ${ctx.money(g.v)}.</p></div>
      <button class="btn primary" id="nx">${g.y < YEARS ? `On to year ${g.y + 1}` : 'See my results'}</button></div>`;
    ctx.audio.play(ret >= 0 ? 'correct' : 'wrong');
    $('#nx').onclick = () => (g.y < YEARS ? plan() : finish());
  }
  function finish() {
    const conc = g.hist.some(h => Math.max(...Object.values(h.a)) > 70);
    const panic = g.hist.some((h, i) => i > 0 && g.hist[i - 1].ev.r.idx < 0 && g.hist[i - 1].a.idx - h.a.idx >= 30);
    const beatSav = g.v > g.b.sav, score = 40 + (conc ? 0 : 30) + (beatSav ? 20 : 0) + (panic ? 0 : 10);
    const plays = ctx.state.sims?.invest?.plays || 0, xp = plays < 3 ? 40 + score : 20, cash = plays < 3 ? 100 + score : 40;
    ctx.update(s => { const p = ((s.sims ||= {}).invest ||= { plays: 0, best: 0 }); p.plays++; p.best = Math.max(p.best, Math.round(g.v)); s.xp += xp; s.cash += cash; });
    ctx.audio.play('reward');
    const tips = [
      conc ? 'At least once you put over 70% into a single choice. That is how one bad year can wreck a portfolio.' : 'You kept your money spread out. That is your best protection against one bad year.',
      panic ? 'After a market drop you sold a big part of your index fund. Selling after a fall locks in the loss, while patient investors recover.' : 'You stayed calm after the drops, which is harder than it sounds.',
      beatSav ? 'You beat the safe savings account.' : 'The safe savings account beat you this time. Higher risk does not guarantee higher returns, especially over just a few years.'];
    root.innerHTML = `<div class="lesson-view"><h1>Your results</h1><div class="card"><h2>Final value: ${ctx.money(g.v)}</h2>
      <div class="sim-row"><span>All in savings</span><span>${ctx.money(g.b.sav)}</span></div>
      <div class="sim-row"><span>All in the index fund</span><span>${ctx.money(g.b.idx)}</span></div>
      <div class="sim-row"><span>All in one company</span><span>${ctx.money(g.b.stock)}</span></div>
      <p>Score ${score} of 100. You earned ${xp} XP and ${ctx.money(cash)}.</p></div>
      <div class="card key"><h2>What your choices show</h2><ul>${tips.map(t => `<li>${t}</li>`).join('')}</ul></div>
      <div class="actions"><button class="btn primary" id="again">Play again</button><a class="btn ghost" href="#/practice">Back to practice</a></div></div>`;
    $('#again').onclick = () => renderInvest(root, ctx);
  }
  intro();
}
