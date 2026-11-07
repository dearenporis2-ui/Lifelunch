// The Duolingo-style learning path: units, nodes, short sessions with hearts, and a celebration at the end.
import { loadIndex, loadLesson } from './content.js';
import { mountCalc } from './calc.js';
import { mountActivity, ACTIVITY_KINDS } from './activities.js';
import { fmt, shuffle, studied } from './lessons.js';
import { lessonCard, questionCard } from './lesson-ui.js';
import { heartsNow, loseHeart, addHeart, msToNext, fmtWait, MAX_HEARTS, REFILL_COST, GOAL_XP } from './hearts.js';
import { icon } from './icons.js';
import { pennySvg, pennyTalk } from './mascot.js';

const COLORS = ['#0F7B5F', '#A8741A', '#3E4C59', '#6B5EA8', '#C4452F'];
const OFFSETS = [0, 44, 68, 44, 0, -44, -68, -44];
const PRAISE = ['Nice!', 'Correct!', 'Great job!', 'Well done!', 'Spot on!'];
const ERR = '<div class="empty">Could not load content. Check your connection and refresh.</div>';
export const sessionCount = s => Math.max(1, Math.round(s / 4)); // about 4 teaching cards per session
const sessionsDone = (st, id, n) => (studied(st, id) ? n : Math.min(n, st.path?.[id] || 0));
const bump = root => { root.dataset.rid = String(+root.dataset.rid + 1000); };
const slice = (a, i, n) => a.slice(Math.floor(i * a.length / n), Math.floor((i + 1) * a.length / n));

/* ---------- the path ---------- */
export async function renderLearn(root, ctx) {
  const rid = root.dataset.rid, { state } = ctx;
  let idx; try { idx = await loadIndex(); } catch { root.innerHTML = ERR; return; }
  if (root.dataset.rid !== rid) return;
  heartsNow(state);
  const trackIcons = ['coins', 'wallet', 'bank', 'chart', 'shield'];
  let curSeen = false;
  root.innerHTML = `<div class="page-shell"><header class="page-intro"><span class="page-mark path-mark">${icon('route',26)}</span><div><span class="section-kicker">YOUR LEARNING JOURNEY</span><h1>Your path</h1><p class="lede">Short sessions that teach, then test you. Finish one to unlock the next.</p></div></header>` +
    idx.tracks.map((t, u) => {
      let gi = 0;
      const body = t.lessons.map(l => {
        const n = sessionCount(l.s), d = sessionsDone(state, l.id, n);
        const nodes = Array.from({ length: n }, (_, k) => {
          const isDone = k < d, isCur = !isDone && !curSeen; if (isCur) curSeen = true;
          const cls = isDone ? 'done' : isCur ? 'current' : 'locked';
          const x = OFFSETS[gi++ % OFFSETS.length], buddy = isCur ? `<span class="path-buddy ${x > 0 ? 'side-left' : 'side-right'}">${pennySvg('path-penny')}<span class="path-buddy-bubble"><strong>NEXT UP</strong><small class="penny-talk">${pennyTalk(l.title)}</small></span></span>` : '';
          return `<div class="node-wrap" style="--x:${x}px"><button class="node ${cls}" data-node="${l.id}:${k}" aria-label="${l.title}, part ${k + 1} of ${n}${isDone ? ', done' : isCur ? ', up next' : ', locked'}">${icon(isDone ? 'check' : isCur ? 'sparkles' : 'lock',isCur ? 25 : 22)}</button>${isCur ? '<span class="start-tip">Start</span>' : ''}${buddy}</div>`;
        }).join('');
        return `<div class="lesson-label">${l.title}</div><div class="nodes">${nodes}</div>`;
      }).join('');
      return `<section class="unit" style="--u:${COLORS[u % COLORS.length]}"><div class="unit-head"><span class="unit-icon">${icon(trackIcons[u % trackIcons.length],23)}</span><div class="unit-copy"><span class="section-kicker">PATH ${String(u + 1).padStart(2,'0')}</span><h2>${t.title}</h2><p>${t.blurb}</p></div></div>${body}</section>`;
    }).join('') + '</div>';
  root.onclick = e => {
    const b = e.target.closest('[data-node]'); if (!b) return;
    if (b.classList.contains('locked')) { ctx.toast('Finish the earlier steps to unlock this one.', 'bad'); ctx.audio.play('wrong'); return; }
    const [id, k] = b.dataset.node.split(':'); openSheet(root, ctx, idx, id, +k);
  };
}

function openSheet(root, ctx, idx, id, k) {
  const meta = idx.tracks.flatMap(t => t.lessons).find(l => l.id === id), n = sessionCount(meta.s), st = ctx.state;
  const again = k < sessionsDone(st, id, n), free = id === 'intro' && !st.tutorialDone, hn = heartsNow(st);
  root.querySelector('.sheet-bg')?.remove();
  root.insertAdjacentHTML('beforeend', `<div class="sheet-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${meta.title}">
    <h2>${meta.title}</h2><p>Part ${k + 1} of ${n}. ${again ? 'You have finished this one. Replay it for a small XP bonus.' : `Earn up to ${Math.round(meta.xp / n)} XP.`}</p>
    ${hn > 0 || free ? `<button class="btn primary big" id="sgo">${again ? 'Practice again' : 'Start'}</button>` :
      `<p class="why"><strong>You are out of hearts.</strong> One comes back every 20 minutes. The next one arrives in ${fmtWait(msToNext(st))}.</p>
       <button class="btn primary big" id="refill" ${st.cash < REFILL_COST ? 'disabled' : ''}>Refill hearts for ${REFILL_COST} cash</button>
       <button class="btn big" id="qp">Practice to win a heart</button>`}
    ${meta.v ? '<button class="btn ghost" id="svid">Watch the video first</button>' : ''}<button class="btn ghost" id="sx">Not now</button></div></div>`);
  const $ = s => root.querySelector(s), close = () => root.querySelector('.sheet-bg')?.remove();
  $('.sheet-bg').onclick = e => { if (e.target.classList.contains('sheet-bg')) close(); };
  $('#sx').onclick = close;
  if ($('#sgo')) $('#sgo').onclick = () => { close(); startNode(root, ctx, idx, id, k); };
  if ($('#svid')) $('#svid').onclick = () => { ctx.pendingLesson = id; location.hash = '#/lessons'; };
  if ($('#refill')) $('#refill').onclick = () => { ctx.update(s => { s.cash -= REFILL_COST; addHeart(s, MAX_HEARTS); }); ctx.toast('Hearts refilled', 'good'); ctx.audio.play('heart'); openSheet(root, ctx, idx, id, k); };
  if ($('#qp')) $('#qp').onclick = () => { close(); startPractice(root, ctx, renderLearn); };
}

async function startNode(root, ctx, idx, id, k) {
  let lesson; try { lesson = await loadLesson(id); } catch { ctx.toast('Could not load that lesson. Check your connection.', 'bad'); return; }
  const n = sessionCount(idx.tracks.flatMap(t => t.lessons).find(l => l.id === id).s);
  const cards = [...slice(lesson.cards.filter(c => c.type === 'info'), k, n), ...slice(lesson.cards.filter(c => c.type === 'quiz'), k, n)];
  if (!cards.length) { ctx.toast('This session is empty.', 'bad'); return; }
  const coach = id === 'intro' && !ctx.state.tutorialDone;
  const example = lesson.example || lesson.cards.find(c => c.kind === 'example')?.body || '';
  runSession(root, ctx, { title: lesson.title, cards, example, coach, hearts: !coach, onFinish: r => finishNode(root, ctx, lesson, k, n, coach, r) });
}

/* ---------- the session ---------- */
export function runSession(root, ctx, o) {
  const queue = o.cards.map(c => ({ c, retry: false })), totalQ = o.cards.filter(c => c.type === 'quiz').length, useHearts = o.hearts !== false;
  let i = 0, firstRight = 0, combo = 0, best = 0, tipI = o.coach, tipQ = o.coach, scrollCueDismissed = false;
  document.body.classList.add('in-session'); root.onclick = root.oninput = root.onchange = null; ctx.audio.play('lessonStart');
  const exit = () => { document.body.classList.remove('in-session'); bump(root); (o.back || renderLearn)(root, ctx); };
  const shell = (body, foot) => {
    const c = queue[i]?.c || {}, stage = c.type === 'quiz' || c.kind === 'calc' || ACTIVITY_KINDS.includes(c.kind) ? 2 : c.kind === 'example' ? 1 : 0;
    const cheer = c.type === 'quiz' ? 'You have got this. Think it through and choose the answer that fits.' : c.kind === 'example' ? 'Here is the idea out in the wild. Spot the choice that makes the difference.' : 'One clear money idea at a time. You are building a skill you can use.';
    const stages = ['Get the idea', 'See it in real life', 'Try it yourself'];
    const examplePanel = c.kind === 'example'
      ? `<div class="rail-example-note"><span>LOOK CLOSER</span><h3>What makes this work?</h3><p>Notice the choice, the tradeoff, and what happens next. That is the useful part of the example.</p></div>`
      : `<div class="rail-example"><div class="rail-card-head"><span>REAL LIFE</span><b aria-hidden="true">↗</b></div><h3>See the idea in action</h3><div class="rail-example-copy">${o.example ? fmt(o.example) : '<p>Keep looking for this idea in everyday choices. Small decisions add up over time.</p>'}</div></div>`;
    const rail = `<aside class="lesson-rail" aria-label="Lesson side notes">
      <div class="rail-buddy"><div class="buddy-art" aria-hidden="true">${pennySvg('penny-session')}</div><div><span class="buddy-label">Penny says</span><p class="penny-talk">${pennyTalk(cheer)}</p></div></div>
      ${examplePanel}<div class="rail-flow"><span class="rail-flow-title">YOUR MINI MISSION</span><ol>${stages.map((label, j) => `<li class="${j < stage ? 'done' : j === stage ? 'current' : ''}"><i>${j < stage ? '✓' : j + 1}</i><span>${label}</span></li>`).join('')}</ol></div>
    </aside>`;
    root.innerHTML = `<div class="session"><div class="s-top"><button class="s-close" aria-label="Quit session">✕</button>
      <div class="s-progress"><div class="s-progress-label"><strong>${o.title}</strong><span>STEP ${i + 1} OF ${queue.length}</span></div>
      <div class="s-bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="${queue.length}" aria-valuenow="${i}"><i style="width:${i / queue.length * 100}%"></i></div></div>
      ${useHearts ? `<span class="s-hearts" aria-label="Hearts">♥ ${heartsNow(ctx.state)}</span>` : ''}</div>
      <div class="s-body"><div class="lesson-stage"><section class="lesson-main">${body}</section>${rail}</div></div><div class="s-foot" id="foot"><div class="session-scroll-cue" hidden>${icon('arrow',15,'scroll-cue-arrow')}<span>Scroll down for examples &amp; Penny’s tips</span></div>${foot}</div></div>`;
    const sBody = root.querySelector('.s-body'), sFoot = root.querySelector('#foot'), cue = root.querySelector('.session-scroll-cue');
    const showScrollCue = () => {
      if (scrollCueDismissed || !sBody || !cue) return;
      const shouldCue = window.matchMedia('(max-width: 720px)').matches;
      cue.hidden = !shouldCue; sFoot.classList.toggle('has-scroll-cue', shouldCue);
    };
    sBody.addEventListener('scroll', () => {
      if (sBody.scrollTop > 12 && !scrollCueDismissed) {
        scrollCueDismissed = true; cue.hidden = true; sFoot.classList.remove('has-scroll-cue');
      }
    }, { passive: true });
    requestAnimationFrame(() => requestAnimationFrame(showScrollCue));
    root.querySelector('.s-close').onclick = () => { if (confirm('Quit this session? You will lose your progress in it.')) exit(); };
  };
  const outOfHearts = () => {
    root.innerHTML = `<div class="session"><div class="s-body center"><h1>You are out of hearts</h1>
      <p class="lede" style="margin:0 auto">Your progress in this session is lost, but nothing you earned before is. One heart returns every 20 minutes (next in ${fmtWait(msToNext(ctx.state))}).</p>
      <div class="actions" style="justify-content:center"><button class="btn primary big" id="refill" ${ctx.state.cash < REFILL_COST ? 'disabled' : ''}>Refill hearts for ${REFILL_COST} cash</button><button class="btn big" id="qp">Practice to win a heart</button><button class="btn ghost" id="leave">Leave</button></div></div></div>`;
    root.querySelector('#leave').onclick = exit;
    root.querySelector('#refill').onclick = () => { ctx.update(s => { s.cash -= REFILL_COST; addHeart(s, MAX_HEARTS); }); ctx.toast('Hearts refilled', 'good'); ctx.audio.play('heart'); exit(); };
    root.querySelector('#qp').onclick = () => { document.body.classList.remove('in-session'); startPractice(root, ctx, o.back || renderLearn); };
  };

  function step() {
    if (i >= queue.length) return o.onFinish({ acc: totalQ ? firstRight / totalQ : 1, best, exit });
    const { c, retry } = queue[i], $ = s => root.querySelector(s);
    if (c.type === 'info') {
      const act = ACTIVITY_KINDS.includes(c.kind), tip = tipI && !act ? 'Tip: read the card, then tap Continue.' : '';
      if (tip) tipI = false;
      shell(`${tip ? `<p class="coach">${tip}</p>` : ''}${lessonCard(c, fmt(c.body), `${c.kind === 'calc' ? '<div class="calc" id="calc"></div>' : ''}${act ? '<div class="act" id="act"></div>' : ''}`)}`,
        `<button class="btn primary big" id="cont" ${act ? 'disabled' : ''}>Continue</button>`);
      if (c.kind === 'calc') mountCalc($('#calc'), c.calc, ctx.money);
      if (act) mountActivity($('#act'), c, ctx, () => { $('#cont').disabled = false; });
      $('#cont').onclick = () => { i++; step(); };
      return;
    }
    const order = c.options.length > 2 ? shuffle(c.options.map((_, n) => n)) : c.options.map((_, n) => n);
    const tip = tipQ ? 'Pick an answer, then tap Check. You will see right away if it is right, and why.' : ''; tipQ = false;
    const questionNo = queue.slice(0, i + 1).filter(x => x.c.type === 'quiz' && !x.retry).length;
    shell(`${tip ? `<p class="coach">${tip}</p>` : ''}${questionCard(c.q, order.map((n, pos) => `<button class="opt" data-silent data-n="${n}" data-letter="${String.fromCharCode(65 + pos)}">${c.options[n]}</button>`).join(''))}<p class="challenge-count">Challenge ${questionNo} of ${totalQ}</p>`,
      '<button class="btn primary big" id="chk" disabled>Check</button>');
    let pick = null; const opts = [...root.querySelectorAll('.opt')];
    opts.forEach(b => b.onclick = () => { pick = +b.dataset.n; opts.forEach(x => x.classList.toggle('sel', x === b)); $('#chk').disabled = false; ctx.audio.play('click'); });
    $('#chk').onclick = () => {
      const ok = pick === c.answer;
      opts.forEach(x => { x.disabled = true; x.classList.remove('sel'); if (+x.dataset.n === c.answer) x.classList.add('right'); });
      if (ok) { if (!retry) firstRight++; combo++; best = Math.max(best, combo); }
      else { combo = 0; opts.find(x => +x.dataset.n === pick).classList.add('wrong'); if (!retry) queue.push({ c, retry: true }); if (useHearts) ctx.update(s => loseHeart(s)); }
      ctx.audio.play(ok ? 'correct' : 'wrong');
      const foot = $('#foot'); foot.className = 's-foot ' + (ok ? 'ok' : 'bad');
      foot.innerHTML = `<div class="fb"><strong>${ok ? (combo >= 3 ? `Streak of ${combo}!` : PRAISE[i % PRAISE.length]) : 'Not quite'}</strong><p>${c.why}</p>${ok ? '' : `<p>Correct answer: <b>${c.options[c.answer]}</b></p>`}</div>
        <button class="btn big ${ok ? 'primary' : 'danger-solid'}" id="cont">Continue</button>`;
      if (useHearts && $('.s-hearts')) $('.s-hearts').textContent = `♥ ${heartsNow(ctx.state)}`;
      $('#cont').focus();
      $('#cont').onclick = () => { i++; if (!ok && useHearts && heartsNow(ctx.state) === 0) return outOfHearts(); step(); };
    };
  }
  step();
}

function endScreen(root, { head, sub = '', stats, note = '', exit }) {
  root.innerHTML = `<div class="session"><div class="confetti" aria-hidden="true">${Array.from({ length: 28 }, (_, n) => `<i style="left:${(n * 37) % 100}%;background:${COLORS[n % 5]};animation-delay:${(n % 7) * 0.08}s"></i>`).join('')}</div>
    <div class="s-body center"><h1>${head}</h1>${sub ? `<p class="lede" style="margin:0 auto">${sub}</p>` : ''}<div class="stats">${stats.map(([k, v]) => `<div class="stat"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>${note}</div>
    <div class="s-foot"><button class="btn primary big" id="cont">Continue</button></div></div>`;
  root.querySelector('#cont').onclick = exit; root.querySelector('#cont').focus();
}

function finishNode(root, ctx, lesson, k, n, coach, { acc, best, exit }) {
  const st = ctx.state, pct = Math.round(acc * 100), totalQ = lesson.cards.filter(c => c.type === 'quiz').length;
  const first = !(studied(st, lesson.id) || (st.path?.[lesson.id] || 0) > k), complete = k + 1 >= n;
  const bonus = (acc === 1 && totalQ ? 10 : 0) + (best >= 3 ? best * 2 : 0);
  const xp = first ? Math.round(lesson.xp / n * (.5 + .5 * acc)) + bonus : 10, cash = first ? Math.round(lesson.cash / n * (.5 + .5 * acc)) : 0;
  ctx.update(s => {
    (s.path ||= {})[lesson.id] = Math.max(s.path[lesson.id] || 0, k + 1);
    if (complete) { (s.studied ||= {})[lesson.id] = true; s.lessons[lesson.id] = { best: Math.max(pct, s.lessons[lesson.id]?.best || 0), at: Date.now() }; }
    if (acc === 1 && totalQ) s.perfects = (s.perfects || 0) + 1;
    s.xp += xp; s.cash += cash;
  });
  ctx.audio.play('reward');
  const g = st.goal, goalLine = g?.done ? 'Daily goal reached.' : g ? `${g.xp} of ${GOAL_XP} XP toward today's goal.` : '';
  endScreen(root, { head: complete ? `${lesson.title} complete!` : 'Session complete!', sub: first ? '' : 'Practice run: replays give a small XP bonus.',
    stats: [['XP earned', `+${xp}`], ['Accuracy', `${pct}%`], ['Best streak', best]], note: `<p class="coach" style="text-align:left">${goalLine}${cash ? ` You also earned ${ctx.money(cash)}.` : ''}</p>`, exit });
  if (coach && complete) setTimeout(() => ctx.giftTour?.(), 1300);
}

/* ---------- Quick practice: five questions, win a heart back ---------- */
export async function startPractice(root, ctx, back) {
  let idx, lessons;
  try {
    idx = await loadIndex();
    const known = idx.tracks.flatMap(t => t.lessons).filter(l => studied(ctx.state, l.id) || (ctx.state.path?.[l.id] || 0) > 0);
    if (!known.length) { ctx.toast('Finish a session first, then practise what you learned.', 'bad'); return; }
    lessons = await Promise.all(shuffle(known).slice(0, 3).map(l => loadLesson(l.id)));
  } catch { ctx.toast('Could not load practice. Check your connection.', 'bad'); return; }
  const cards = shuffle(lessons.flatMap(l => l.cards.filter(c => c.type === 'quiz'))).slice(0, 5);
  runSession(root, ctx, { title: 'Practice', cards, hearts: false, back, onFinish: ({ acc, best, exit }) => {
    const pct = Math.round(acc * 100), win = pct >= 60 && heartsNow(ctx.state) < MAX_HEARTS;
    ctx.update(s => { s.xp += 10; if (win) addHeart(s); });
    ctx.audio.play('reward');
    endScreen(root, { head: 'Practice complete!', sub: win ? 'You won a heart back.' : pct < 60 ? 'Score 60% or more to win a heart back. Try again any time.' : '', stats: [['XP earned', '+10'], ['Accuracy', `${pct}%`], ['Hearts', `♥ ${heartsNow(ctx.state)}`]], exit });
  } });
}
