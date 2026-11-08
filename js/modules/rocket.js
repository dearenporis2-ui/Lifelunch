const ROCKET = `<svg class="rocket-art" viewBox="0 0 96 96" role="presentation" aria-hidden="true">
  <defs>
    <linearGradient id="rocket-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#F8FFFC"/><stop offset="1" stop-color="#BDEDDD"/></linearGradient>
    <linearGradient id="rocket-fin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#18C999"/><stop offset="1" stop-color="#087E72"/></linearGradient>
    <linearGradient id="rocket-coin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFF5B2"/><stop offset=".48" stop-color="#F6C94F"/><stop offset="1" stop-color="#D88A22"/></linearGradient>
    <linearGradient id="rocket-flame" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#FFF48A"/><stop offset=".5" stop-color="#FF9B45"/><stop offset="1" stop-color="#F15F55"/></linearGradient>
    <filter id="rocket-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#073B36" flood-opacity=".24"/></filter>
  </defs>
  <g class="rocket-flame"><path d="M47 69c-8 8-6 17 1 22 2-5 7-7 7-15 5 6 5 11 3 16 11-6 11-18 2-25l-13 2Z" fill="url(#rocket-flame)"/><path d="M51 76c-3 4-2 8 1 11 1-3 4-5 4-9 3 4 3 6 2 9 5-4 4-9-1-12l-6 1Z" fill="#FFF5B2"/></g>
  <g class="rocket-body" filter="url(#rocket-shadow)" transform="rotate(38 48 48)">
    <path d="M48 9c13 9 21 23 21 40L48 73 27 49c0-17 8-31 21-40Z" fill="url(#rocket-body)" stroke="#0D8B76" stroke-width="2.5"/>
    <path d="m29 44-13 9 3 18 18-9m30-18 13 9-3 18-18-9" fill="url(#rocket-fin)" stroke="#087E72" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="48" cy="43" r="13.5" fill="url(#rocket-coin)" stroke="#C17A1B" stroke-width="2.3"/>
    <circle cx="43.5" cy="41.5" r="1.7" fill="#563C27"/><circle cx="52.5" cy="41.5" r="1.7" fill="#563C27"/>
    <path d="M43 47c2.8 3.2 7.2 3.2 10 0" fill="none" stroke="#754826" stroke-width="1.8" stroke-linecap="round"/>
    <path d="m48 4 4 6h-8l4-6Z" fill="#F6C94F"/>
    <path d="M40 25c2.8-3.1 5.5-5.4 8-7 2.5 1.6 5.2 3.9 8 7" fill="none" stroke="#74CDB5" stroke-width="2" stroke-linecap="round"/>
  </g>
  <g class="rocket-sparkles" fill="#FFD66E"><path d="m78 19 2.4 6.2 6.6 2.2-6.6 2.4-2.4 6.2-2.2-6.2-6.6-2.4 6.6-2.2L78 19Z"/><circle cx="18" cy="39" r="2"/><path d="m23 73 1.5 3.5 3.5 1.5-3.5 1.5L23 83l-1.5-3.5L18 78l3.5-1.5L23 73Z"/></g>
</svg>`;

const routeName = () => (location.hash.replace(/^#\/?/, '') || 'dashboard').split('/')[0];

export function mountRocket(audio) {
  const rocket = document.createElement('div');
  rocket.className = 'menu-rocket rocket-hidden'; rocket.setAttribute('aria-hidden', 'true'); rocket.innerHTML = ROCKET;
  document.body.append(rocket);
  let lastRoute = routeName(), timer = 0, raf = 0, resizeTimer = 0, positioned = false;
  const size = () => matchMedia('(max-width: 420px)').matches ? 43 : matchMedia('(max-width: 720px)').matches ? 48 : 56;
  const visible = el => { const r = el.getBoundingClientRect(); return r.width > 20 && r.height > 12 && r.bottom > 74 && r.top < innerHeight - 12 && r.right > 0 && r.left < innerWidth; };
  const surfaces = () => [...document.querySelectorAll('#view .dashboard-hero,#view .dashboard-tiles .tile,#view .dashboard-panels>.card,#view .page-intro,#view .unit-head,#view .lesson-label,#view .node-wrap,#view .card,#view .tile')].filter(visible);
  const waypoints = () => {
    const s = size(), gap = 8, hudBottom = document.querySelector('#hud')?.getBoundingClientRect().bottom || 0;
    const cards = surfaces(), points = [];
    for (const el of cards) {
      const r = el.getBoundingClientRect();
      points.push(
        { x: r.right + gap, y: r.top + Math.min(36, r.height * .22) },
        { x: r.left - s - gap, y: r.top + Math.min(58, r.height * .38) },
        { x: r.right - s - Math.min(14, r.width * .08), y: r.top - s - gap },
        { x: r.left + Math.min(18, r.width * .08), y: r.bottom + gap }
      );
    }
    points.push(
      { x: 12, y: hudBottom + 18 }, { x: innerWidth - s - 12, y: hudBottom + 18 },
      { x: 12, y: innerHeight - s - 18 }, { x: innerWidth - s - 12, y: innerHeight - s - 18 }
    );
    return points.filter(p => p.x >= 6 && p.y >= Math.max(6, hudBottom + 3) && p.x + s <= innerWidth - 6 && p.y + s <= innerHeight - 6)
      .filter(p => !cards.some(el => { const r = el.getBoundingClientRect(); return p.x < r.right + 5 && p.x + s > r.left - 5 && p.y < r.bottom + 5 && p.y + s > r.top - 5; }));
  };
  const fly = ({ sound = true } = {}) => {
    cancelAnimationFrame(raf); clearTimeout(timer);
    raf = requestAnimationFrame(() => {
      if (document.body.classList.contains('in-session') || document.body.classList.contains('lesson-active')) { rocket.classList.add('rocket-hidden'); return; }
      const points = waypoints();
      if (!points.length) points.push({ x: innerWidth - size() - 10, y: Math.min(innerHeight - size() - 10, Math.max(88, (document.querySelector('#hud')?.getBoundingClientRect().bottom || 0) + 12)) });
      rocket.classList.remove('rocket-hidden');
      const currentX = parseFloat(rocket.style.left) || -100, currentY = parseFloat(rocket.style.top) || -100;
      const spaced = points.filter(p => Math.hypot(p.x - currentX, p.y - currentY) > Math.max(95, size() * 1.8));
      const candidates = spaced.length ? spaced : points, cards = surfaces();
      const clearPath = p => {
        if (!positioned) return true;
        for (let t = .15; t < 1; t += .15) {
          const x = currentX + (p.x - currentX) * t, y = currentY + (p.y - currentY) * t;
          if (cards.some(el => { const r = el.getBoundingClientRect(); return x < r.right + 4 && x + size() > r.left - 4 && y < r.bottom + 4 && y + size() > r.top - 4; })) return false;
        }
        return true;
      };
      const clearCandidates = candidates.filter(clearPath);
      const choices = clearCandidates.length ? clearCandidates : [...candidates].sort((a,b) => Math.hypot(a.x-currentX,a.y-currentY)-Math.hypot(b.x-currentX,b.y-currentY)).slice(0,Math.min(3,candidates.length));
      const point = choices[Math.floor(Math.random() * choices.length)], heading = Math.atan2(point.y - currentY, point.x - currentX) * 180 / Math.PI + 52;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      rocket.style.setProperty('--rocket-heading', `${heading}deg`);
      if (positioned && !reduced) rocket.classList.add('rocket-flying');
      else rocket.classList.remove('rocket-flying');
      rocket.style.left = `${point.x}px`; rocket.style.top = `${point.y}px`; positioned = true;
      if (sound && !reduced) audio.play('rocketFly');
      if (reduced) rocket.classList.remove('rocket-flying');
      timer = setTimeout(() => {
        rocket.classList.remove('rocket-flying');
        if (!reduced && !document.body.classList.contains('in-session') && !document.body.classList.contains('lesson-active')) timer = setTimeout(() => fly({ sound: true }), 5000 + Math.random() * 3000);
      }, reduced ? 0 : 1550);
    });
  };
  const observer = new MutationObserver(records => {
    if (records.some(r => r.target === document.body && r.attributeName === 'class') && (document.body.classList.contains('in-session') || document.body.classList.contains('lesson-active'))) {
      clearTimeout(timer); rocket.classList.add('rocket-hidden'); return;
    }
    clearTimeout(resizeTimer); resizeTimer = setTimeout(() => fly({ sound: false }), 140);
  });
  ['view', 'hud'].forEach(id => { const root = document.getElementById(id); if (root) observer.observe(root, { childList: true, subtree: true }); });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => fly({ sound: false }), 160); }, { passive: true });
  window.addEventListener('scroll', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(() => fly({ sound: false }), 220); }, { passive: true });
  window.addEventListener('hashchange', () => {
    const next = routeName(); if (next === lastRoute) return;
    lastRoute = next; fly({ sound: true });
  });
  fly({ sound: false });
}
