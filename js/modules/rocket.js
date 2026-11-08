const ROCKET = `<svg class="rocket-art" viewBox="0 0 96 96" role="presentation" aria-hidden="true">
  <defs>
    <linearGradient id="rocket-body" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#F8FFFC"/><stop offset="1" stop-color="#BDEDDD"/></linearGradient>
    <linearGradient id="rocket-fin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#18C999"/><stop offset="1" stop-color="#087E72"/></linearGradient>
    <linearGradient id="rocket-coin" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFF5B2"/><stop offset=".48" stop-color="#F6C94F"/><stop offset="1" stop-color="#D88A22"/></linearGradient>
    <filter id="rocket-shadow" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="#073B36" flood-opacity=".24"/></filter>
  </defs>
  <g class="rocket-body" filter="url(#rocket-shadow)" transform="rotate(38 48 48)">
    <path d="M48 9c13 9 21 23 21 40L48 73 27 49c0-17 8-31 21-40Z" fill="url(#rocket-body)" stroke="#0D8B76" stroke-width="2.5"/>
    <path d="m29 44-13 9 3 18 18-9m30-18 13 9-3 18-18-9" fill="url(#rocket-fin)" stroke="#087E72" stroke-width="2" stroke-linejoin="round"/>
    <path d="M40 65h16l-3 9h-10l-3-9Z" fill="#087E72" stroke="#075E53" stroke-width="1.5"/>
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
  const trail = document.createElement('canvas'), smoke = trail.getContext('2d');
  trail.className = 'rocket-smoke-trail'; trail.setAttribute('aria-hidden', 'true'); document.body.append(trail);
  const motionSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const motionPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  motionSvg.setAttribute('aria-hidden', 'true'); motionSvg.classList.add('rocket-motion-guide'); motionSvg.append(motionPath); document.body.append(motionSvg);
  let lastRoute = routeName(), frame = 0, lastTime = 0, distance = 0, pathLength = 0, soundElapsed = 0;
  let width = innerWidth, height = innerHeight, dpr = Math.min(1.5, window.devicePixelRatio || 1);
  let points = [];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const isLesson = () => document.body.classList.contains('in-session') || document.body.classList.contains('lesson-active');
  const setCanvasSize = () => {
    width = innerWidth; height = innerHeight; dpr = Math.min(1.5, window.devicePixelRatio || 1);
    trail.width = Math.round(width * dpr); trail.height = Math.round(height * dpr); trail.style.width = `${width}px`; trail.style.height = `${height}px`;
    smoke.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const buildPath = () => {
    const s = width <= 420 ? 36 : width <= 720 ? 44 : 52;
    const hudBottom = document.querySelector('#hud')?.getBoundingClientRect().bottom || 0;
    const main = document.querySelector('main')?.getBoundingClientRect();
    const safeLeft = s / 2 + 12, safeRight = width - s / 2 - 12;
    const left = Math.max(safeLeft, Math.min(safeRight - 120, (main?.left ?? 0) - s * .5 - 8));
    const right = Math.min(safeRight, Math.max(left + 120, (main?.right ?? width) + s * .5 + 8));
    const top = Math.min(height - 180, Math.max(hudBottom + s * .54 + 6, 100));
    const bottom = Math.max(top + 120, height - s * .68 - (matchMedia('(max-width: 720px)').matches ? 14 : 22));
    const radius = Math.min(100, (right - left) * .24, (bottom - top) * .24);
    const d = `M${left + radius},${top} L${right - radius},${top} Q${right},${top} ${right},${top + radius} L${right},${bottom - radius} Q${right},${bottom} ${right - radius},${bottom} L${left + radius},${bottom} Q${left},${bottom} ${left},${bottom - radius} L${left},${top + radius} Q${left},${top} ${left + radius},${top} Z`;
    motionSvg.setAttribute('viewBox', `0 0 ${width} ${height}`); motionSvg.setAttribute('width', width); motionSvg.setAttribute('height', height);
    motionPath.setAttribute('d', d);
    const nextLength = motionPath.getTotalLength();
    if (pathLength > 0) distance = (distance / pathLength) * nextLength;
    pathLength = nextLength;
  };
  const drawSmoke = now => {
    smoke.clearRect(0, 0, width, height);
    if (points.length < 2) return;
    const latest = points[points.length - 1], dark = document.documentElement.dataset.theme === 'dark';
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], age = now - b.t, life = Math.max(0, 1 - age / 1350), towardHead = i / points.length;
      if (life <= 0) continue;
      smoke.beginPath(); smoke.moveTo(a.x, a.y); smoke.lineTo(b.x, b.y);
      smoke.lineCap = 'round'; smoke.lineJoin = 'round'; smoke.strokeStyle = dark ? 'rgba(180,200,197,.2)' : 'rgba(143,160,157,.2)';
      smoke.globalAlpha = life * (.12 + towardHead * .12); smoke.lineWidth = 3 + towardHead * 5; smoke.filter = 'blur(4px)'; smoke.stroke();
      smoke.filter = 'none'; smoke.globalAlpha = life * (.15 + towardHead * .12); smoke.lineWidth = 2 + towardHead * 2; smoke.stroke();
    }
    const tailX = latest.x - Math.cos(latest.angle) * 13, tailY = latest.y - Math.sin(latest.angle) * 13;
    smoke.globalAlpha = .12; smoke.fillStyle = dark ? '#C0D0CD' : '#9BAAA6'; smoke.filter = 'blur(4px)';
    smoke.beginPath(); smoke.arc(tailX, tailY, 5, 0, Math.PI * 2); smoke.fill(); smoke.filter = 'none'; smoke.globalAlpha = 1;
  };
  const animate = now => {
    frame = requestAnimationFrame(animate);
    if (!lastTime) lastTime = now;
    const dt = Math.min(.05, (now - lastTime) / 1000); lastTime = now;
    if (isLesson()) { rocket.classList.add('rocket-hidden'); points.length = 0; drawSmoke(now); return; }
    rocket.classList.remove('rocket-hidden');
    if (!pathLength) buildPath();
    const speed = width <= 540 ? 82 : 112;
    if (!reduced.matches) distance = (distance + dt * speed) % pathLength;
    const p = motionPath.getPointAtLength(distance), ahead = motionPath.getPointAtLength((distance + 3) % pathLength);
    const angle = Math.atan2(ahead.y - p.y, ahead.x - p.x);
    if (reduced.matches) points.length = 0;
    else { points.push({ x: p.x, y: p.y, t: now, angle }); while (points.length > 90 || points[0]?.t < now - 1400) points.shift(); }
    const spriteSize = width <= 420 ? 36 : width <= 720 ? 44 : 52;
    rocket.style.transform = `translate3d(${p.x - spriteSize / 2}px,${p.y - spriteSize / 2}px,0) rotate(${angle * 180 / Math.PI + 52}deg)`;
    drawSmoke(now);
    if (!reduced.matches) { soundElapsed += dt; if (soundElapsed >= 13) { soundElapsed = 0; audio.play('rocketFly'); } }
  };
  setCanvasSize(); buildPath();
  window.addEventListener('resize', () => { setCanvasSize(); points.length = 0; buildPath(); }, { passive: true });
  window.addEventListener('hashchange', () => {
    const next = routeName(); if (next !== lastRoute) { lastRoute = next; audio.play('rocketFly'); }
  });
  const observer = new MutationObserver(records => {
    if (records.some(record => record.target === document.body && record.attributeName === 'class') && isLesson()) {
      rocket.classList.add('rocket-hidden'); points.length = 0;
    }
  });
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  frame = requestAnimationFrame(animate);
}
