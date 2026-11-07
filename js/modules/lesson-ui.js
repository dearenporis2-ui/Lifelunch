import { icon } from './icons.js';

const TYPES = {
  example: ['WORKED EXAMPLE', 'wallet'], key: ['REMEMBER THIS', 'sparkles'], calc: ['TRY A CALCULATOR', 'chart'],
  sort: ['SORT IT OUT', 'route'], decide: ['MAKE A CHOICE', 'target'], predict: ['MAKE A PREDICTION', 'lightbulb'], order: ['PUT IT IN ORDER', 'route']
};

export function lessonCard(c, body, extra = '') {
  const [label, glyph] = TYPES[c.kind] || ['MONEY IDEA', 'lightbulb'];
  const example = c.kind === 'example';
  return `<article class="card lesson-card ${c.kind || 'idea'}">
    <div class="lesson-card-head"><span class="lesson-icon" aria-hidden="true">${icon(glyph,27)}</span><div><span class="lesson-kicker">${label}</span><h2>${c.title}</h2></div><span class="lesson-spark" aria-hidden="true">${icon('sparkles',18)}</span></div>
    ${example ? `<div class="lesson-example"><span>REAL LIFE</span>${body}</div>` : `<div class="lesson-copy">${body}</div>`}${extra}</article>`;
}

export function questionCard(question, options) {
  return `<section class="question-card"><div class="question-head"><span class="question-icon" aria-hidden="true">${icon('target',21)}</span><span>QUICK CHALLENGE</span><i>Pick your answer</i></div><h2>${question}</h2><div class="opts">${options}</div></section>`;
}
