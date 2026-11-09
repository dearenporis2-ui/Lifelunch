import { loadIndex, loadLesson, parseYouTube } from './content.js';
import { mountCalc } from './calc.js';
import { mountActivity, ACTIVITY_KINDS } from './activities.js';
import { lessonCard, questionCard } from './lesson-ui.js';
import { icon } from './icons.js';
import { guardSessionFocus } from './focus-guard.js';

const ERR = '<div class="empty">Could not load content. Check your connection and refresh.</div>';
const STUDY_XP = 20;
export const shuffle = (a, rnd = Math.random) => a.map(v => [rnd(), v]).sort((x, y) => x[0] - y[0]).map(x => x[1]);
const today = () => new Date().toLocaleDateString('en-CA');
// Keep lesson completion and quiz attempts separate. Older saves used `lessons`
// for both; path progress identifies those legacy path records so they aren't
// mistaken for a quiz attempt.
export const quizResult = (s, id) => s.quizResults?.[id] || (!s.path?.[id] ? s.lessons?.[id] : null) || null;
export const studied = (s, id) => !!(s.studied?.[id] || s.quizResults?.[id] || s.lessons?.[id]);
const goto = (hash, fn, root, ctx) => { if ((location.hash || '#/dashboard') === hash) { root.dataset.rid = String(+root.dataset.rid + 1000); fn(root, ctx); } else location.hash = hash; };

// Lesson text: blank line = new paragraph, "- " lines = bullets, "1. " lines = numbered steps, **bold** inline. Everything is escaped first.
const inline = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
export const fmt = t => String(t).split(/\n\n+/).map(b => {
  const ls = b.split('\n');
  if (ls.every(x => /^- /.test(x))) return `<ul>${ls.map(x => `<li>${inline(x.slice(2))}</li>`).join('')}</ul>`;
  if (ls.every(x => /^\d+\. /.test(x))) return `<ol>${ls.map(x => `<li>${inline(x.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
  return `<p>${inline(b)}</p>`;
}).join('');

async function fetchLesson(ctx, id) {
  try {
    const [idx, l] = await Promise.all([loadIndex(), loadLesson(id)]);
    const tr = idx.tracks.find(t => t.lessons.some(x => x.id === id));
    const next = tr?.lessons[tr.lessons.findIndex(x => x.id === id) + 1];
    if (next) loadLesson(next.id).catch(() => {}); // prefetch so the next lesson opens instantly
    return { l, next };
  } catch { ctx.toast('Could not load that lesson. Check your connection.', 'bad'); return null; }
}
const trackHead = (t, n, label) => `<div class="track-head"><div class="track-title"><span class="track-icon">${icon('book',19)}</span><div><h2>${t.title}</h2><p>${t.blurb}</p></div></div><span class="chip">${n} of ${t.lessons.length} ${label}</span></div>
  <div class="bar"><i style="width:${n / t.lessons.length * 100}%"></i></div>`;

/* ---------- Lessons tab: study material only ---------- */
export async function renderLessons(root, ctx) {
  const rid = root.dataset.rid, { state } = ctx;
  let idx; try { idx = await loadIndex(); } catch { root.innerHTML = ERR; return; }
  if (root.dataset.rid !== rid) return;
  root.innerHTML = `<div class="page-shell"><header class="page-intro"><span class="page-mark library-mark">${icon('book',26)}</span><div><span class="section-kicker">YOUR LEARNING LIBRARY</span><h1>Lessons</h1><p class="lede">${idx.total} lessons across ${idx.tracks.length} subjects. Start with any subject that interests you; finish its lessons in order to unlock what comes next. Quizzes unlock after each lesson.</p></div></header>` +
    idx.tracks.map(t => `<section class="track">${trackHead(t, t.lessons.filter(l => studied(state, l.id)).length, 'studied')}
      <div class="lessons">${t.lessons.map((l, i) => {
        const open = i === 0 || studied(state, t.lessons[i - 1].id);
        return `<button class="lrow" data-start="${l.id}" ${open ? '' : 'disabled'}><span class="lesson-row-icon">${icon(studied(state, l.id) ? 'bookCheck' : open ? 'play' : 'lock',19)}</span><span class="lesson-row-copy"><strong>${l.title}</strong><small>${l.blurb}</small></span>
        <span class="meta lesson-row-meta">${l.v ? `<span>${icon('play',14)} Video</span>` : ''}<span>${studied(state, l.id) ? `${icon('check',15)} Studied` : open ? 'Start' : `${icon('lock',14)} Locked`}</span></span></button>`;
      }).join('')}</div></section>`).join('') + '</div>';
  root.onclick = e => { const id = e.target.closest('[data-start]')?.dataset.start; if (id) openLesson(root, ctx, id); };
  if (ctx.pendingLesson) { const id = ctx.pendingLesson; ctx.pendingLesson = null; openLesson(root, ctx, id); }
}

async function openLesson(root, ctx, id) {
  const r = await fetchLesson(ctx, id); if (!r) return;
  const { l, next } = r, infos = l.cards.filter(c => c.type === 'info'), qn = l.cards.length - infos.length;
  const done = studied(ctx.state, id) || !infos.length, coach = id === 'intro' && !ctx.state.tutorialDone, vid = parseYouTube(l.video);
  root.onclick = null;
  root.innerHTML = `<div class="lesson-view"><div><button class="btn ghost" id="bk">Back to lessons</button></div>
    <h1>${l.title}</h1><p class="lede" style="margin:0">${l.blurb}</p>
    ${coach ? '<p class="coach">Read through the lesson. When you finish, you can take the quiz.</p>' : ''}
    ${vid ? `<div><div class="video" id="vid"><button class="video-play" aria-label="Play video: ${l.title}"><img src="https://i.ytimg.com/vi/${vid}/hqdefault.jpg" alt="" loading="lazy"><span class="play"></span></button></div>
      <p class="vlink"><a href="https://www.youtube.com/watch?v=${vid}" target="_blank" rel="noopener">Open on YouTube</a></p></div>` : ''}
    ${infos.length ? `<div class="card"><h2>The lesson</h2><p>${infos.length} short ${infos.length === 1 ? 'part' : 'parts'}${done ? ', finished' : `. Finish it to unlock the quiz and earn ${STUDY_XP} XP`}.</p>
      <button class="btn ${done ? 'ghost' : 'primary'}" id="learn">${done ? 'Review the lesson' : 'Start learning'}</button></div>` : ''}
    ${done ? `<div class="card"><h2>Quiz ready</h2><p>${qn} ${qn === 1 ? 'question' : 'questions'}. Earn up to ${l.xp} XP and ${ctx.money(l.cash)}.</p>
      <button class="btn primary" id="quiz">${quizResult(ctx.state, id) ? 'Retake the quiz' : 'Take the quiz'}</button></div>` : ''}</div>`;
  const $ = s => root.querySelector(s);
  $('#bk').onclick = () => goto('#/lessons', renderLessons, root, ctx);
  if ($('#learn')) $('#learn').onclick = () => learn(root, ctx, l, next);
  if ($('#quiz')) $('#quiz').onclick = () => quiz(root, ctx, l, next);
  const vp = $('.video-play');
  if (vp) vp.onclick = () => { $('#vid').innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&rel=0" title="${l.title}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`; };
}

function learn(root, ctx, l, next) {
  const cards = l.cards.filter(c => c.type === 'info');
  if (l.example && !l.cards.some(c => c.kind === 'example')) cards.splice(Math.min(1, cards.length), 0, { type: 'info', kind: 'example', title: 'Put it into practice', body: l.example });
  run(root, ctx, { title: l.title, cards, coach: l.id === 'intro' && !ctx.state.tutorialDone, lastLabel: 'Finish lesson',
    done: result => finishStudy(root, ctx, l, next, result) });
}

function finishStudy(root, ctx, l, next, { focusBreached = false } = {}) {
  if (focusBreached) {
    root.innerHTML = `<div class="lesson-view"><h1>Lesson not counted</h1><div class="card"><p>LifeLaunch was in the background during this session, so this attempt did not earn XP or unlock the quiz. Start again when you’re ready.</p></div><div class="actions"><button class="btn primary" id="retry">Try the lesson again</button><button class="btn ghost" id="bk">Back to lessons</button></div></div>`;
    root.querySelector('#retry').onclick = () => learn(root, ctx, l, next);
    root.querySelector('#bk').onclick = () => goto('#/lessons', renderLessons, root, ctx);
    return;
  }
  const first = !studied(ctx.state, l.id), qn = l.cards.filter(c => c.type === 'quiz').length;
  ctx.update(s => { (s.studied ||= {})[l.id] = true; if (first) s.xp += STUDY_XP; });
  if (first) ctx.audio.play('lessonComplete');
  root.innerHTML = `<div class="lesson-view"><h1>${l.title}</h1><div class="card key"><h2>Lesson complete</h2>
    <p>${first ? `You earned ${STUDY_XP} XP. ` : ''}The quiz has ${qn} ${qn === 1 ? 'question' : 'questions'}. Take it now while it is fresh, or come back to it from the Quizzes tab.</p></div>
    <div class="actions"><button class="btn primary" id="go">Take the quiz now</button><button class="btn ghost" id="bk">Back to lessons</button></div></div>`;
  root.querySelector('#go').onclick = () => quiz(root, ctx, l, next);
  root.querySelector('#bk').onclick = () => goto('#/lessons', renderLessons, root, ctx);
}

/* ---------- Quizzes tab: tests and the daily challenge ---------- */
export async function renderQuizzes(root, ctx) {
  const rid = root.dataset.rid, { state } = ctx;
  let idx; try { idx = await loadIndex(); } catch { root.innerHTML = ERR; return; }
  if (root.dataset.rid !== rid) return;
  const dailyDone = state.daily?.day === today();
  root.innerHTML = `<div class="page-shell"><header class="page-intro"><span class="page-mark quiz-mark">${icon('target',26)}</span><div><span class="section-kicker">CHECK WHAT STUCK</span><h1>Quizzes</h1><p class="lede">Test what you have learned. Each quiz unlocks when you finish its lesson.</p></div></header>
    <section class="card daily-quiz-card"><span class="panel-icon challenge-icon">${icon('trophy',21)}</span><div><h2>Daily challenge</h2><p>${dailyDone ? 'Done for today. A new set arrives tomorrow.' : 'Three quick questions for bonus XP and cash.'}</p></div>${dailyDone ? '' : `<a class="btn primary" href="#/daily">Start challenge ${icon('arrow',17)}</a>`}</section>` +
    idx.tracks.map(t => `<section class="track" style="margin-top:28px">${trackHead(t, t.lessons.filter(l => quizResult(state, l.id)).length, 'passed')}
      <div class="lessons">${t.lessons.map(l => {
        const d = quizResult(state, l.id), ok = studied(state, l.id);
        return `<button class="lrow" data-quiz="${l.id}" ${ok ? '' : 'disabled'}><span class="lesson-row-icon">${icon(ok ? 'target' : 'lock',19)}</span><span class="lesson-row-copy"><strong>${l.title}</strong><small>${l.n} questions${ok ? '' : '. Study the lesson first.'}</small></span>
        <span class="meta lesson-row-meta"><span>${d ? `${icon('trophy',14)} Best ${d.best}% · Retake` : ok ? `${icon('sparkles',14)} Unlocked · Not taken` : `${icon('lock',14)} Locked`}</span></span></button>`;
      }).join('')}</div></section>`).join('') + '</div>';
  root.onclick = async e => {
    const id = e.target.closest('[data-quiz]')?.dataset.quiz; if (!id) return;
    const r = await fetchLesson(ctx, id); if (r) quiz(root, ctx, r.l, r.next);
  };
}

function quiz(root, ctx, l, next) {
  run(root, ctx, { title: l.title, cards: l.cards.filter(c => c.type === 'quiz'), coach: l.id === 'intro' && !ctx.state.tutorialDone,
    done: s => finishQuiz(root, ctx, l, next, s) });
}

/* ---------- shared card runner ---------- */
function run(root, ctx, { title, cards, done, coach, lastLabel }) {
  let i = 0, right = 0, combo = 0, best = 0, tipI = coach, tipQ = coach;
  const total = cards.filter(c => c.type === 'quiz').length;
  const focusGuard = guardSessionFocus();
  document.body.classList.add('lesson-active');
  ctx.audio.pauseMusic();
  ctx.audio.play('lessonStart');
  root.onclick = null;
  const frame = (inner, tip = '', label = '') => { root.innerHTML = `<div class="lesson-view">
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${cards.length}" aria-valuenow="${i}"><i style="width:${i / cards.length * 100}%"></i></div>
    <h1>${title}</h1>${tip ? `<p class="coach">${tip}</p>` : ''}${label ? `<p class="part">${label}</p>` : ''}${inner}</div>`; };
  function step() {
    if (i >= cards.length) { const focusBreached = focusGuard.breached; focusGuard.dispose(); document.body.classList.remove('lesson-active'); ctx.audio.resumeAfterSession(); return done({ right, total, best, focusBreached }); }
    const c = cards[i];
    if (c.type === 'info') {
      const act = ACTIVITY_KINDS.includes(c.kind);
      frame(`${lessonCard(c, fmt(c.body), `${c.kind === 'calc' ? '<div class="calc" id="calc"></div>' : ''}${act ? '<div class="act" id="act"></div>' : ''}`)}<button class="btn primary" id="next" ${act ? 'disabled' : ''}>${lastLabel && i === cards.length - 1 ? lastLabel : 'Continue'}</button>`,
        tipI ? 'Tip: read the card, then tap Continue.' : '', cards.length > 1 ? `Part ${i + 1} of ${cards.length}` : '');
      tipI = false;
      if (c.kind === 'calc') mountCalc(root.querySelector('#calc'), c.calc, ctx.money);
      if (act) mountActivity(root.querySelector('#act'), c, ctx, () => { root.querySelector('#next').disabled = false; });
      root.querySelector('#next').onclick = () => { i++; step(); };
      return;
    }
    const order = c.options.length > 2 ? shuffle(c.options.map((_, n) => n)) : c.options.map((_, n) => n);
    frame(`${questionCard(c.q, order.map((n, pos) => `<button class="opt" data-silent data-n="${n}" data-letter="${String.fromCharCode(65 + pos)}">${c.options[n]}</button>`).join(''))}<div id="fb"></div>`,
      tipQ ? 'Pick an answer. You will see right away if it is right, and why.' : '', `Question ${i + 1} of ${cards.length}`);
    tipQ = false;
    root.querySelectorAll('.opt').forEach(b => b.onclick = () => {
      const ok = +b.dataset.n === c.answer;
      root.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (+x.dataset.n === c.answer) x.classList.add('right'); });
      if (ok) { right++; combo++; best = Math.max(best, combo); } else { b.classList.add('wrong'); combo = 0; }
      ctx.audio.play(ok ? 'correct' : 'wrong');
      root.querySelector('#fb').innerHTML = `<p class="why"><strong>${ok ? (combo >= 3 ? `Correct. Streak of ${combo}!` : 'Correct.') : 'Not quite.'}</strong> ${c.why}</p><button class="btn primary" id="next" style="margin-top:12px">Continue</button>`;
      root.querySelector('#next').focus();
      root.querySelector('#next').onclick = () => { i++; step(); };
    });
  }
  step();
}

function finishQuiz(root, ctx, l, next, { right, total, best, focusBreached = false }) {
  if (focusBreached) {
    root.innerHTML = `<div class="lesson-view"><h1>Quiz not counted</h1><div class="card"><p>LifeLaunch was in the background during this quiz, so the score and rewards were not saved. Try it again when you’re ready.</p></div><div class="actions"><button class="btn primary" id="again">Retry quiz</button><button class="btn ghost" id="back">Back to quizzes</button></div></div>`;
    root.querySelector('#again').onclick = () => quiz(root, ctx, l, next);
    root.querySelector('#back').onclick = () => goto('#/quizzes', renderQuizzes, root, ctx);
    return;
  }
  const coach = l.id === 'intro' && !ctx.state.tutorialDone;
  const pct = total ? Math.round(right / total * 100) : 100, first = !quizResult(ctx.state, l.id), scale = .5 + .5 * pct / 100;
  const bonus = (best >= 3 ? best * 3 : 0) + (pct === 100 ? 20 : 0);
  const xp = Math.round(l.xp * scale) + bonus, cash = Math.round(l.cash * scale);
  ctx.update(s => {
    (s.quizResults ||= {})[l.id] = { best: Math.max(pct, s.quizResults[l.id]?.best || 0), at: Date.now() };
    (s.studied ||= {})[l.id] = true;
    if (pct === 100) s.perfects = (s.perfects || 0) + 1;
    if (first) { s.xp += xp; s.cash += cash; }
  });
  ctx.audio.play('reward');
  root.innerHTML = `<div class="lesson-view"><h1>${l.title}</h1><div class="card"><h2>${pct}% correct</h2>
    <p>${first ? `You earned ${xp} XP and ${ctx.money(cash)}.${bonus ? ` That includes ${bonus} bonus XP for ${[best >= 3 ? `a streak of ${best}` : '', pct === 100 ? 'a perfect score' : ''].filter(Boolean).join(' and ')}.` : ''}` : 'Practice run: rewards are paid on your first completion.'}</p></div>${coach ? '<p class="coach">That is how every lesson works. One more thing is coming.</p>' : ''}
    <div class="actions">${next ? `<button class="btn primary" id="nx">Next lesson: ${next.title}</button>` : ''}<button class="btn ghost" id="back">Back to quizzes</button><button class="btn ghost" id="again">Try again</button></div></div>`;
  const $ = s => root.querySelector(s);
  if (next) $('#nx').onclick = () => { ctx.pendingLesson = next.id; goto('#/lessons', renderLessons, root, ctx); };
  $('#back').onclick = () => goto('#/quizzes', renderQuizzes, root, ctx);
  $('#again').onclick = () => quiz(root, ctx, l, next);
  if (coach) setTimeout(() => ctx.giftTour?.(), 1300);
}

/* ---------- Daily challenge ---------- */
export async function renderDaily(root, ctx) {
  const rid = root.dataset.rid, { state } = ctx, day = today();
  if (state.daily?.day === day) {
    root.innerHTML = `<div class="vault-page"><span class="vault-mark" aria-hidden="true">▣</span><span class="section-kicker">TODAY’S MYSTERY VAULT</span><h1>Already opened!</h1><p>You solved today’s money puzzle. A fresh vault arrives tomorrow.</p><div class="card vault-already"><span>YOUR STREAK</span><strong>${state.streak} ${state.streak === 1 ? 'day' : 'days'}</strong><small>${state.gardenItems?.length || 0} garden keepsakes collected</small></div><div class="actions"><a class="btn primary" href="#/dashboard">Visit your garden</a><a class="btn ghost" href="#/lessons">Keep learning</a></div></div>`;
    return;
  }
  let cards;
  try {
    const idx = await loadIndex(), all = idx.tracks.flatMap(t => t.lessons);
    const finished = all.filter(l => studied(state, l.id));
    let s = [...day].reduce((a, c) => (a * 31 + c.charCodeAt(0)) | 0, 7) >>> 0;
    const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32;
    const pick = shuffle(finished.length ? finished : idx.tracks.map(t => t.lessons[0]), rnd).slice(0, 3);
    const lessons = await Promise.all(pick.map(l => loadLesson(l.id)));
    cards = shuffle(lessons.flatMap(l => l.cards.filter(c => c.type === 'quiz')), rnd).slice(0, 3);
  } catch { if (root.dataset.rid === rid) root.innerHTML = ERR; return; }
  if (root.dataset.rid !== rid) return;
  run(root, ctx, { title: 'Mystery vault', cards, done: ({ right, total, focusBreached }) => {
    if (focusBreached) {
      root.innerHTML = `<div class="vault-page"><span class="vault-mark" aria-hidden="true">▣</span><span class="section-kicker">VAULT STILL LOCKED</span><h1>Try again to open it</h1><p>LifeLaunch was in the background during this puzzle, so no rewards were added. Your vault is still waiting today.</p><button type="button" class="btn primary" id="vault-retry">Retry today’s puzzle</button></div>`;
      root.querySelector('#vault-retry').onclick = () => renderDaily(root, ctx);
      return;
    }
    const xp = 30 + right * 5, cash = 20 + right * 10;
    const vaultRewards = [
      ['coin-tree', 'Coin tree'], ['firefly-jar', 'Firefly jar'], ['rainbow', 'Rainbow arch'], ['fountain', 'Little fountain']
    ];
    let reward;
    ctx.update(s => {
      s.daily = { day }; s.dailyDone = (s.dailyDone || 0) + 1; s.dailyVaults = (s.dailyVaults || 0) + 1;
      s.gardenItems ||= [];
      const next = vaultRewards.find(([id]) => !s.gardenItems.includes(id));
      reward = next || ['coin-tree', 'A garden sparkle'];
      if (next) s.gardenItems.push(next[0]); else s.xp += 10;
      s.xp += xp; s.cash += cash;
    });
    ctx.audio.play('challenge');
    root.innerHTML = `<div class="vault-page vault-opened"><div class="vault-burst" aria-hidden="true">${Array.from({ length: 12 }, (_, i) => `<i style="--dx:${Math.cos(i * Math.PI / 6) * 100}px;--dy:${Math.sin(i * Math.PI / 6) * -100}px;--spark:${i}"></i>`).join('')}</div><span class="vault-mark" aria-hidden="true">▣</span><span class="section-kicker">MYSTERY VAULT OPENED</span><h1>${reward[1]} unlocked!</h1><p>${right} of ${total} correct. You earned ${xp} XP and ${ctx.money(cash)}${reward[1] === 'A garden sparkle' ? ', plus 10 bonus XP for opening every collectible' : ` and a new garden decoration`}.</p><div class="vault-prize" aria-label="${reward[1]} garden decoration"><span>${reward[1] === 'Coin tree' ? '◉' : reward[1] === 'Firefly jar' ? '✧' : reward[1] === 'Rainbow arch' ? '⌒' : reward[1] === 'Little fountain' ? '♧' : '✦'}</span><strong>${reward[1]}</strong><small>Added to your Money Garden</small></div><div class="actions"><a class="btn primary" href="#/dashboard">Place it in your garden</a><a class="btn ghost" href="#/lessons">Keep learning</a></div></div>`;
  } });
}
