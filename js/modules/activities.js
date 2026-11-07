// "Learn by doing" cards. Each one mounts into an element and calls done() once the learner has completed it.
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const ACTIVITY_KINDS = ['sort', 'decide', 'predict', 'order'];
export const mountActivity = (el, c, ctx, done) => ({ sort, decide, predict, order })[c.kind](el, c, ctx, done);

// Tap the right label for each item, one at a time.
function sort(el, c, ctx, done) {
  let i = 0, right = 0;
  const step = () => {
    if (i >= c.items.length) { el.innerHTML = `<p class="why"><strong>${right} of ${c.items.length} right.</strong> ${esc(c.why)}</p>`; return done(); }
    el.innerHTML = `<p class="act-item">${esc(c.items[i][0])}</p><div class="actions">${c.cats.map((k, n) => `<button class="btn" data-silent data-n="${n}">${esc(k)}</button>`).join('')}</div>
      <p class="part">Item ${i + 1} of ${c.items.length}</p><p id="fb" class="part"></p>`;
    el.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
      const want = c.items[i][1], ok = +b.dataset.n === want;
      el.querySelectorAll('[data-n]').forEach(x => { x.disabled = true; });
      b.classList.add(ok ? 'right' : 'wrong'); el.querySelector(`[data-n="${want}"]`).classList.add('right');
      if (ok) right++;
      ctx.audio.play(ok ? 'correct' : 'wrong');
      el.querySelector('#fb').textContent = ok ? 'Right.' : `Not quite. It belongs under: ${c.cats[want]}.`;
      setTimeout(() => { i++; step(); }, 900);
    });
  };
  step();
}

// A scenario with consequences. Every option shows what would happen.
function decide(el, c, ctx, done) {
  el.innerHTML = `<div class="opts">${c.options.map((o, n) => `<button class="opt" data-silent data-n="${n}">${esc(o[0])}</button>`).join('')}</div><div id="fb"></div>`;
  el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const o = c.options[+b.dataset.n];
    el.querySelectorAll('.opt').forEach(x => { x.disabled = true; if (c.options[+x.dataset.n][2]) x.classList.add('right'); });
    if (!o[2]) b.classList.add('wrong');
    ctx.audio.play(o[2] ? 'correct' : 'wrong');
    el.querySelector('#fb').innerHTML = `<p class="why"><strong>${o[2] ? 'Good call.' : 'Think again.'}</strong> ${esc(o[1])}</p>`;
    done();
  });
}

// Guess first, then see the real number. Surprise is what makes it stick.
function predict(el, c, ctx, done) {
  const r = c.range, f = v => `${r.pre || ''}${Number(v).toLocaleString()}${r.post || ''}`;
  el.innerHTML = `<div class="row"><label for="pg">Your guess</label><output id="po">${f(r.def)}</output><input type="range" id="pg" min="${r.min}" max="${r.max}" step="${r.step}" value="${r.def}"></div>
    <button class="btn primary" id="lock">Lock in my guess</button><div id="fb"></div>`;
  const g = el.querySelector('#pg'); g.oninput = () => { el.querySelector('#po').textContent = f(g.value); };
  el.querySelector('#lock').onclick = () => {
    const v = +g.value, close = Math.abs(v - c.answer) <= (r.max - r.min) * 0.1;
    g.disabled = true; el.querySelector('#lock').hidden = true; ctx.audio.play(close ? 'correct' : 'click');
    el.querySelector('#fb').innerHTML = `<p class="why"><strong>Actual: ${f(c.answer)}. You guessed ${f(v)}.</strong> ${close ? 'Very close. ' : 'Most people are surprised by this one. '}${esc(c.why)}</p>`;
    done();
  };
}

// Tap the steps in the right order.
function order(el, c, ctx, done) {
  const items = c.steps.map((t, n) => [t, n]).sort(() => Math.random() - .5); let at = 0;
  el.innerHTML = `<div class="opts">${items.map(([t, n]) => `<button class="opt" data-silent data-n="${n}">${esc(t)}</button>`).join('')}</div><p class="part" id="fb">Tap the steps in order. Start with number 1.</p>`;
  el.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    const n = +b.dataset.n, fb = el.querySelector('#fb');
    if (n === at) {
      b.classList.add('right'); b.disabled = true; b.textContent = `${++at}. ${b.textContent}`; ctx.audio.play('correct');
      if (at === c.steps.length) { fb.textContent = 'That is the order.'; done(); } else fb.textContent = `Good. Now number ${at + 1}.`;
    } else { b.classList.add('wrong'); setTimeout(() => b.classList.remove('wrong'), 500); ctx.audio.play('wrong'); fb.textContent = 'Not that one yet. Think about what has to happen first.'; }
  });
}
