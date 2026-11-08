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
  rocket.className = 'menu-rocket'; rocket.setAttribute('aria-hidden', 'true'); rocket.innerHTML = ROCKET;
  document.body.append(rocket);
  let lastRoute = routeName(), frame = 0;

  const move = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (document.body.classList.contains('in-session')) { rocket.classList.add('rocket-hidden'); return; }
      rocket.classList.remove('rocket-hidden');
      const mobile = matchMedia('(max-width: 720px)').matches;
      const target = mobile
        ? document.querySelector('#view .dashboard-hero, #view .page-intro, #view .unit-head, #view h1')
        : document.querySelector('#hud .tab[aria-current="page"]');
      if (!target) return;
      const rect = target.getBoundingClientRect(), size = mobile ? 52 : 50;
      const left = mobile ? rect.right - size * .58 : rect.left + rect.width * .72 - size / 2;
      const top = mobile ? rect.top - size * .64 : rect.top - size * .83;
      rocket.style.left = `${Math.max(8, Math.min(innerWidth - size - 8, left))}px`;
      rocket.style.top = `${Math.max(8, Math.min(innerHeight - size - 12, top))}px`;
    });
  };
  const observer = new MutationObserver(move);
  ['view', 'hud'].forEach(id => { const root = document.getElementById(id); if (root) observer.observe(root, { childList: true, subtree: true }); });
  window.addEventListener('resize', move, { passive: true });
  window.addEventListener('scroll', move, { passive: true });
  window.addEventListener('hashchange', () => {
    const next = routeName();
    if (next !== lastRoute) {
      lastRoute = next; rocket.classList.remove('rocket-hidden'); rocket.classList.add('rocket-flying');
      audio.play('rocketFly'); setTimeout(() => rocket.classList.remove('rocket-flying'), 850);
    }
    move();
  });
  requestAnimationFrame(move);
}
