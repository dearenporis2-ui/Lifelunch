// Loads content on demand: a small index up front, each lesson only when opened.
const BASE = 'content/', cache = {};
const memo = (k, fn) => cache[k] ??= fn().catch(e => { delete cache[k]; throw e; });
const getJson = u => fetch(u).then(r => { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json(); });
const norm = c => c[0] === 'i' ? { type: 'info', title: c[1], body: c[2] }
  : c[0] === 'e' ? { type: 'info', kind: 'example', title: c[1], body: c[2] }
  : c[0] === 'k' ? { type: 'info', kind: 'key', title: 'Key takeaways', body: c[1].map(x => '- ' + x).join('\n') }
  : c[0] === 'c' ? { type: 'info', kind: 'calc', title: c[1], body: c[2], calc: c[3] }
  : c[0] === 's' ? { type: 'info', kind: 'sort', title: c[1], body: c[2], cats: c[3], items: c[4], why: c[5] }
  : c[0] === 'd' ? { type: 'info', kind: 'decide', title: c[1], body: c[2], options: c[3] }
  : c[0] === 'p' ? { type: 'info', kind: 'predict', title: c[1], body: c[2], range: c[3], answer: c[4], why: c[5] }
  : c[0] === 'o' ? { type: 'info', kind: 'order', title: c[1], body: c[2], steps: c[3] }
  : c[0] === 'q' ? { type: 'quiz', q: c[1], options: c[2], answer: c[3], why: c[4] }
  : { type: 'quiz', q: 'True or false: ' + c[1], options: ['True', 'False'], answer: c[2] ? 0 : 1, why: c[3] };
export const loadIndex = () => memo('index', () => getJson(BASE + 'index.json'));
export const loadLesson = id => memo('l:' + id, () => getJson(`${BASE}lessons/${id}.json`).then(l => ({ ...l, cards: l.cards.map(norm) })));

// Accepts a YouTube link (watch, youtu.be, embed, shorts) or a bare 11-character id. Returns the id or null.
export const parseYouTube = v => {
  if (!v) return null;
  const s = String(v).trim(), ok = x => /^[\w-]{11}$/.test(x || '') ? x : null;
  if (ok(s)) return s;
  try {
    const u = new URL(s), h = u.hostname.replace(/^(www|m)\./, '');
    if (h === 'youtu.be') return ok(u.pathname.slice(1));
    if (h === 'youtube.com' || h === 'youtube-nocookie.com') return ok(u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop());
  } catch { /* not a URL */ }
  return null;
};
