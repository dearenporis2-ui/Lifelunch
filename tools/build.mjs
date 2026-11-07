// Run after adding or editing lessons:  node tools/build.mjs
// Card types: ["i",title,body] info, ["e",title,body] worked example, ["c",title,body,kind] calculator, ["k",[points]] key takeaways,
//             ["s",title,prompt,[labels],[[item,labelIndex]],why] sort, ["d",title,setup,[[label,outcome,isGood]]] decision,
//             ["p",title,question,{min,max,step,def,pre,post},answer,why] predict, ["o",title,prompt,[steps in order]] order,
//             ["q",question,options,answerIndex,why] quiz, ["t",statement,true|false,why] true/false.
// Text: blank line = new paragraph, "- " = bullets, "1. " = numbered steps, **bold**.
// Optional per-lesson field:  "video": "https://youtu.be/XXXXXXXXXXX"  (any YouTube link or 11-character id)
// Validates every file in content/lessons and writes content/index.json (the only file the app loads up front).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'content');
const errors = [], lessons = {};
const ytId = v => { const ok = x => /^[\w-]{11}$/.test(x || '') ? x : null, s = String(v).trim(); if (ok(s)) return s; try { const u = new URL(s), h = u.hostname.replace(/^(www|m)\./, ''); if (h === 'youtu.be') return ok(u.pathname.slice(1)); if (h === 'youtube.com' || h === 'youtube-nocookie.com') return ok(u.searchParams.get('v') || u.pathname.split('/').filter(Boolean).pop()); } catch {} return null; };
for (const f of fs.readdirSync(path.join(dir, 'lessons')).filter(f => f.endsWith('.json'))) {
  const id = f.slice(0, -5), bad = m => errors.push(`${f}: ${m}`);
  let l; try { l = JSON.parse(fs.readFileSync(path.join(dir, 'lessons', f), 'utf8')); } catch (e) { bad('invalid JSON ' + e.message); continue; }
  if (l.id !== id) bad(`id "${l.id}" must match the file name`);
  for (const k of ['title', 'blurb']) if (!l[k]) bad('missing ' + k);
  for (const k of ['xp', 'cash']) if (!(l[k] > 0)) bad(`${k} must be a positive number`);
  if (l.video && !ytId(l.video)) bad('video is not a valid YouTube link');
  if (!Array.isArray(l.cards) || !l.cards.length) { bad('no cards'); continue; }
  let q = 0;
  l.cards.forEach((c, n) => {
    const at = `card ${n + 1}`;
    if (c[0] === 'i') { if (typeof c[1] !== 'string' || typeof c[2] !== 'string') bad(`${at}: info needs title and body`); }
    else if (c[0] === 'e') { if (typeof c[1] !== 'string' || typeof c[2] !== 'string') bad(`${at}: example needs title and body`); }
    else if (c[0] === 'k') { if (!Array.isArray(c[1]) || !c[1].length || c[1].some(x => typeof x !== 'string')) bad(`${at}: key takeaways need a list of strings`); }
    else if (c[0] === 'c') { if (typeof c[1] !== 'string' || typeof c[2] !== 'string' || !['net', 'compound', 'loan', 'inflation'].includes(c[3])) bad(`${at}: calculator needs title, text and kind net, compound, loan or inflation`); }
    else if (c[0] === 's') { if (typeof c[1] !== 'string' || typeof c[2] !== 'string' || !Array.isArray(c[3]) || c[3].length < 2 || c[3].length > 4 || !Array.isArray(c[4]) || !c[4].length || c[4].some(x => typeof x[0] !== 'string' || !Number.isInteger(x[1]) || x[1] < 0 || x[1] >= c[3].length) || typeof c[5] !== 'string') bad(`${at}: sort needs title, prompt, 2-4 labels, items as [text, labelIndex], and an explanation`); }
    else if (c[0] === 'd') { if (typeof c[1] !== 'string' || typeof c[2] !== 'string' || !Array.isArray(c[3]) || c[3].length < 2 || c[3].length > 4 || c[3].some(o => typeof o[0] !== 'string' || typeof o[1] !== 'string' || typeof o[2] !== 'boolean') || !c[3].some(o => o[2])) bad(`${at}: decision needs title, setup, 2-4 options as [label, outcome, isGood] and at least one good option`); }
    else if (c[0] === 'p') { const r = c[3] || {}; if (typeof c[1] !== 'string' || typeof c[2] !== 'string' || ['min', 'max', 'step', 'def'].some(k => typeof r[k] !== 'number') || typeof c[4] !== 'number' || c[4] < r.min || c[4] > r.max || typeof c[5] !== 'string') bad(`${at}: prediction needs title, question, range {min,max,step,def}, an answer inside the range, and an explanation`); }
    else if (c[0] === 'o') { if (typeof c[1] !== 'string' || typeof c[2] !== 'string' || !Array.isArray(c[3]) || c[3].length < 3 || c[3].length > 7 || c[3].some(x => typeof x !== 'string')) bad(`${at}: order needs title, prompt and 3-7 steps in the correct order`); }
    else if (c[0] === 'q') { q++; if (typeof c[1] !== 'string' || !Array.isArray(c[2]) || c[2].length < 2 || c[2].length > 5 || !Number.isInteger(c[3]) || c[3] < 0 || c[3] >= c[2].length || typeof c[4] !== 'string') bad(`${at}: quiz needs question, 2-5 options, a valid answer index and an explanation`); }
    else if (c[0] === 't') { q++; if (typeof c[1] !== 'string' || typeof c[2] !== 'boolean' || typeof c[3] !== 'string') bad(`${at}: true/false needs statement, true or false, and an explanation`); }
    else bad(`${at}: unknown type "${c[0]}"`);
  });
  if (!q) bad('needs at least one question');
  lessons[id] = { id, title: l.title, blurb: l.blurb, xp: l.xp, cash: l.cash, n: q, s: l.cards.length - q, v: l.video ? 1 : 0 };
}
const tracks = JSON.parse(fs.readFileSync(path.join(dir, 'tracks.json'), 'utf8')), used = new Set();
for (const t of tracks) for (const id of t.lessons) { if (!lessons[id]) errors.push(`tracks.json: "${t.id}" lists missing lesson "${id}"`); used.add(id); }
for (const id of Object.keys(lessons)) if (!used.has(id)) console.warn(`warning: "${id}" is not in any track, so it will not show up`);
if (errors.length) { console.error('Build failed:\n' + errors.map(e => '  ' + e).join('\n')); process.exit(1); }
const out = { total: used.size, tracks: tracks.map(t => ({ id: t.id, title: t.title, blurb: t.blurb, lessons: t.lessons.map(id => lessons[id]) })) };
fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(out));
console.log(`OK: ${out.total} lessons in ${tracks.length} tracks`);
