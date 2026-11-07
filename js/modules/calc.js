// Small interactive calculators used inside lessons. Add a new kind here, then use it from a lesson file with ["c", title, text, "kind"].
const F = (id, label, min, max, step, def, unit = '') => ({ id, label, min, max, step, def, unit });
export const CALCS = {
  net: { fields: [F('g', 'Gross monthly pay', 500, 8000, 50, 2500), F('t', 'Income tax rate', 0, 45, 1, 15, '%'), F('s', 'Pension or social contributions', 0, 20, 1, 6, '%')],
    out: (v, m) => { const tax = v.g * v.t / 100, soc = v.g * v.s / 100, net = v.g - tax - soc;
      return [['Income tax', m(tax)], ['Contributions', m(soc)], ['Net pay', m(net)], ['Share you keep', Math.round(net / v.g * 100) + '%']]; } },
  compound: { fields: [F('m', 'Saved each month', 20, 500, 10, 100), F('y', 'Years', 1, 40, 1, 10, 'yr'), F('r', 'Yearly interest', 0, 12, 0.5, 4, '%')],
    out: (v, m) => { const n = v.y * 12, r = v.r / 1200, bal = r ? v.m * ((1 + r) ** n - 1) / r : v.m * n;
      return [['You paid in', m(v.m * n)], ['Interest earned', m(bal - v.m * n)], ['Final balance', m(bal)]]; } },
  inflation: { fields: [F('a', 'Amount saved', 500, 20000, 500, 5000), F('y', 'Years', 1, 40, 1, 20, 'yr'), F('r', 'Yearly inflation', 0, 10, 0.5, 3, '%')],
    out: (v, m) => { const f = (1 + v.r / 100) ** v.y; return [['Prices multiply by', f.toFixed(2) + ' times'], ['What 100 buys today will cost', m(100 * f)], ['Your savings will buy what this buys today', m(v.a / f)]]; } },
  loan: { fields: [F('a', 'Amount borrowed', 200, 20000, 100, 2000), F('r', 'APR', 0, 40, 0.5, 15, '%'), F('n', 'Months to repay', 3, 60, 1, 12, 'mo')],
    out: (v, m) => { const r = v.r / 1200, pay = r ? v.a * r / (1 - (1 + r) ** -v.n) : v.a / v.n;
      return [['Monthly payment', m(pay)], ['Total repaid', m(pay * v.n)], ['Cost of borrowing', m(pay * v.n - v.a)]]; } }
};
const show = (f, x, money) => f.unit === '%' ? x + '%' : f.unit === 'yr' ? x + ' years' : f.unit === 'mo' ? x + ' months' : money(x);

export function mountCalc(el, kind, money) {
  const c = CALCS[kind]; if (!el || !c) return;
  const v = Object.fromEntries(c.fields.map(f => [f.id, f.def]));
  el.innerHTML = c.fields.map(f => `<div class="row"><label for="c-${f.id}">${f.label}</label><output id="o-${f.id}"></output>
    <input type="range" id="c-${f.id}" data-f="${f.id}" min="${f.min}" max="${f.max}" step="${f.step}" value="${f.def}"></div>`).join('') + '<div class="calc-out" aria-live="polite"></div>';
  const paint = () => {
    c.fields.forEach(f => { el.querySelector('#o-' + f.id).textContent = show(f, v[f.id], money); });
    el.querySelector('.calc-out').innerHTML = c.out(v, money).map(([k, x]) => `<div><span>${k}</span><strong>${x}</strong></div>`).join('');
  };
  el.oninput = e => { const id = e.target.dataset.f; if (id) { v[id] = +e.target.value; paint(); } };
  paint();
}
