import { icon } from './icons.js';

const TYPES = {
  example: ['WORKED EXAMPLE', 'wallet'], key: ['REMEMBER THIS', 'sparkles'], calc: ['TRY A CALCULATOR', 'chart'],
  sort: ['SORT IT OUT', 'route'], decide: ['MAKE A CHOICE', 'target'], predict: ['MAKE A PREDICTION', 'lightbulb'], order: ['PUT IT IN ORDER', 'route']
};

function exampleMotion(c) {
  const text = `${c.title} ${c.body}`.toLowerCase();
  if (/compound growth|5% again|compounding/.test(text)) return `<div class="money-motion compound-motion" role="img" aria-label="Illustration: 100 grows to 105, then to 110.25 as returns also earn returns"><div class="motion-heading"><span>COMPOUND GROWTH</span><small>Illustration only</small></div><div class="growth-bars"><div class="growth-bar"><i style="--bar:42%"></i><b>$100</b><small>Start</small></div><div class="growth-bar"><i style="--bar:58%"></i><b>$105</b><small>After 1 year</small></div><div class="growth-bar"><i style="--bar:78%"></i><b>$110.25</b><small>After 2 years</small></div></div><p>Returns left invested can grow too. Actual results vary.</p></div>`;
  if (/payslip shows|gross pay.*deduction|take-home amount/.test(text)) return `<div class="money-motion paycheck-motion" role="img" aria-label="Paycheck split illustration: 2,500 gross pay minus 400 deductions leaves 2,100 take-home pay, then a sample plan assigns it to needs, wants, and savings"><div class="motion-heading"><span>FOLLOW THE PAYCHECK</span><small>Example amounts</small></div><div class="pay-flow"><div class="pay-chip gross"><small>Gross pay</small><b>$2,500</b></div><span class="pay-arrow" aria-hidden="true">→</span><div class="pay-split"><span class="deductions"><small>Tax + contributions</small><b>−$400</b></span><span class="takehome"><small>Take-home pay</small><b>$2,100</b></span></div></div><div class="pay-flow-bar"><i></i></div><div class="pay-allocation"><span>Give take-home pay a plan</span><div class="allocation-parts"><i class="alloc-needs"><b>Needs · 50%</b><small>$1,050</small></i><i class="alloc-wants"><b>Wants · 30%</b><small>$630</small></i><i class="alloc-savings"><b>Save · 20%</b><small>$420</small></i></div></div><p>One sample 50/30/20 plan. Adjust the split to fit your real life.</p></div>`;
  return '';
}

export function lessonCard(c, body, extra = '') {
  const [label, glyph] = TYPES[c.kind] || ['MONEY IDEA', 'lightbulb'];
  const example = c.kind === 'example';
  return `<article class="card lesson-card ${c.kind || 'idea'}">
    <div class="lesson-card-head"><span class="lesson-icon" aria-hidden="true">${icon(glyph,27)}</span><div><span class="lesson-kicker">${label}</span><h2>${c.title}</h2></div><span class="lesson-spark" aria-hidden="true">${icon('sparkles',18)}</span></div>
    ${example ? `<div class="lesson-example"><span>REAL LIFE</span>${body}</div>${exampleMotion({ ...c, body: String(c.body || '') })}` : `<div class="lesson-copy">${body}</div>`}${extra}</article>`;
}

export function questionCard(question, options) {
  return `<section class="question-card"><div class="question-head"><span class="question-icon" aria-hidden="true">${icon('target',21)}</span><span>QUICK CHALLENGE</span><i>Pick your answer</i></div><h2>${question}</h2><div class="opts">${options}</div></section>`;
}
