const GARDEN_STAGES = [
  { at: 0, name: 'A little patch of possibility', note: 'Every good money habit starts with one small step.' },
  { at: 3, name: 'The first green shoots', note: 'Your new ideas are taking root. Keep showing up.' },
  { at: 8, name: 'A growing money grove', note: 'Look how far your steady learning has grown.' },
  { at: 15, name: 'The thriving garden', note: 'Strong habits are starting to bloom all around you.' },
  { at: 23, name: 'The golden garden', note: 'You’re growing a bright future, one lesson at a time.' },
  { at: 30, name: 'Your flourishing future', note: 'A whole world of money confidence, grown by you.' }
];

const THEMES = [
  { id: 'meadow', name: 'Fresh meadow', unlock: () => true },
  { id: 'sunset', name: 'Peach sunset', unlock: (n) => n >= 5, hint: 'Finish 5 lessons' },
  { id: 'moonlit', name: 'Moonlit garden', unlock: (n, s) => s.streak >= 3, hint: 'Reach a 3-day streak' },
  { id: 'golden', name: 'Golden hour', unlock: (n, s) => (s.dailyVaults || 0) >= 5, hint: 'Open 5 mystery vaults' }
];
const DECOR = [
  { id: 'coin-tree', name: 'Coin tree', symbol: '◉' },
  { id: 'firefly-jar', name: 'Firefly jar', symbol: '✧' },
  { id: 'rainbow', name: 'Rainbow arch', symbol: '⌒' },
  { id: 'fountain', name: 'Little fountain', symbol: '♧' }
];

export function renderMoneyGarden(completed = 0, total = 30, state = {}) {
  const max = Math.max(1, Number(total) || 30);
  const count = Math.min(max, Math.max(0, Number(completed) || 0));
  const milestones = GARDEN_STAGES.map(stage => ({ ...stage, at: Math.min(stage.at, max) }))
    .filter((stage, i, list) => list.findIndex(other => other.at === stage.at) === i);
  const stageIndex = milestones.reduce((found, stage, i) => count >= stage.at ? i : found, 0);
  const stage = milestones[stageIndex];
  const next = milestones[stageIndex + 1];
  const segment = next ? next.at - stage.at : 1;
  const progress = next ? Math.round(((count - stage.at) / segment) * 100) : 100;
  const planted = Math.max(1, Math.min(12, Math.ceil((count / max) * 12)));
  const themeId = THEMES.some(t => t.id === state.gardenTheme && t.unlock(count, state)) ? state.gardenTheme : 'meadow';
  const decorationId = DECOR.some(d => d.id === state.gardenDecoration && (state.gardenItems || []).includes(d.id)) ? state.gardenDecoration : '';
  const themes = THEMES.map(t => { const unlocked = t.unlock(count, state); return `<button type="button" class="garden-choice ${unlocked ? '' : 'is-locked'}" data-garden-theme="${t.id}" ${unlocked ? '' : 'disabled'} aria-pressed="${themeId === t.id}" title="${unlocked ? `Use ${t.name}` : t.hint}"><i class="theme-swatch swatch-${t.id}"></i><span>${t.name}</span>${unlocked ? '' : `<small>${t.hint}</small>`}</button>`; }).join('');
  const decorations = DECOR.map(d => { const unlocked = (state.gardenItems || []).includes(d.id); return `<button type="button" class="garden-choice garden-decor-choice ${unlocked ? '' : 'is-locked'}" data-garden-decoration="${d.id}" ${unlocked ? '' : 'disabled'} aria-pressed="${decorationId === d.id}" title="${unlocked ? `Place ${d.name}` : 'Find this in a mystery vault'}"><i class="decor-swatch">${d.symbol}</i><span>${d.name}</span>${unlocked ? '' : '<small>Vault reward</small>'}</button>`; }).join('');
  const blossoms = Array.from({ length: planted }, (_, i) => {
    const x = [61, 115, 171, 229, 280, 340, 397, 453, 509, 568, 621, 684][i];
    const y = [177, 157, 169, 142, 177, 154, 169, 137, 168, 151, 178, 141][i];
    const palette = ['pink', 'coral', 'cream', 'lavender', 'gold'][i % 5];
    const petals = Array.from({ length: i % 3 === 1 ? 7 : 9 }, (_, petal) => `<ellipse cx="0" cy="-6.6" rx="3.9" ry="7.2" transform="rotate(${petal * (i % 3 === 1 ? 360 / 7 : 40)})"/>`).join('');
    const scale = [1, 1.12, .88, 1.05, .94][i % 5];
    return `<g class="garden-flower" transform="translate(${x} ${y}) scale(${scale})"><path class="garden-stem" d="M0 29C1 22-1 14 0 7"/><path class="garden-leaf" d="M0 22C-10 14-17 19-13 26-8 29-3 27 0 22Z"/><path class="garden-leaf garden-leaf-right" d="M0 17C9 10 15 14 12 20 8 23 3 21 0 17Z"/><g class="garden-bloom garden-petal-${palette}" style="--delay:${(i % 5) * -0.38}s">${petals}<circle class="garden-flower-center" r="3.5"/><circle class="garden-flower-core" r="1.25"/></g></g>`;
  }).join('');
  const tree = (x, ground, scale, variant) => `<g class="garden-tree ${variant}" transform="translate(${x} ${ground}) scale(${scale})"><ellipse cx="0" cy="1" rx="23" ry="4" fill="#145F4B" opacity=".18"/><path class="garden-trunk" d="M0 0c2-11-2-22 1-34m0 13 10-9m-10 4-9-8"/><path class="garden-canopy" d="M0-76c-8-12-23-8-24 3-13-2-21 10-15 20-10 10-3 25 9 26 3 13 16 16 26 8 10 9 25 5 26-8 13-4 15-19 5-27 5-12-4-23-16-20-1-11-14-15-22-2Z"/><path class="garden-canopy-light" d="M-20-52c-3-10 4-16 12-13 4-12 18-14 24-4 11-3 18 7 13 16-9-6-15-4-20 2-8-6-19-6-29-1Z"/><circle cx="-11" cy="-43" r="2.3" fill="#FFE28A"/><circle cx="14" cy="-54" r="2.1" fill="#FFE28A"/><circle cx="10" cy="-29" r="2.5" fill="#FFE28A"/></g>`;
  const trees = count >= Math.min(8, max) ? tree(560, 151, .68, 'garden-tree-one') : '';
  const biggerTree = count >= Math.min(15, max) ? tree(645, 145, .84, 'garden-tree-two') : '';
  const ornament = decorationId === 'coin-tree' ? `<g class="garden-ornament"><path d="M128 202v-22" stroke="#A96745" stroke-width="5"/><circle cx="128" cy="174" r="14" fill="#7BCD8F"/><circle cx="128" cy="174" r="5" fill="#FFD65B"/></g>` : decorationId === 'firefly-jar' ? `<g class="garden-ornament"><path d="M468 186h23l-3 30h-17Z" fill="#C9E7D0" stroke="#4D9878" stroke-width="2"/><path d="M472 184h15" stroke="#4D9878" stroke-width="4" stroke-linecap="round"/><circle cx="478" cy="198" r="2" fill="#FFE78C"/><circle cx="485" cy="205" r="2" fill="#FFE78C"/></g>` : decorationId === 'rainbow' ? `<g class="garden-ornament" fill="none" stroke-linecap="round"><path d="M215 191a29 29 0 0 1 58 0" stroke="#F28E8A" stroke-width="7"/><path d="M222 191a22 22 0 0 1 44 0" stroke="#FFD66F" stroke-width="6"/><path d="M229 191a15 15 0 0 1 30 0" stroke="#72C99C" stroke-width="5"/></g>` : decorationId === 'fountain' ? `<g class="garden-ornament"><ellipse cx="466" cy="215" rx="22" ry="6" fill="#A8E4DE"/><path d="M466 213q-13-13 0-21 13 8 0 21Z" fill="#74CDD0"/><circle cx="466" cy="210" r="3" fill="#E8FFFF"/></g>` : '';
  return `<section class="money-garden" aria-labelledby="garden-title" data-garden-stage="${stageIndex}" data-theme-choice="${themeId}" data-decoration="${decorationId}">
    <div class="garden-copy">
      <span class="garden-eyebrow"><span class="garden-sun" aria-hidden="true">✦</span> YOUR MONEY GARDEN</span>
      <h2 id="garden-title">${stage.name}</h2>
      <p>${stage.note}</p>
      <div class="garden-meter"><div class="garden-meter-label"><span>${count} of ${max} lessons planted</span><strong>${next ? `${next.at - count} to next bloom` : 'Fully in bloom!'}</strong></div><div class="garden-track" role="progressbar" aria-label="Progress to next garden milestone" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100"><i style="width:${progress}%"></i></div></div>
      <a class="garden-cta" href="#/learn">${count ? 'Grow a little more' : 'Plant your first seed'} <span aria-hidden="true">↗</span></a>
      <span class="garden-footnote">Your progress grows with every lesson.</span>
    </div>
    <div class="garden-art" aria-hidden="true">
      <svg class="garden-landscape" viewBox="0 0 740 260" role="img" focusable="false">
        <defs><linearGradient id="gardenSky" x1="0" y1="0" x2="1" y2="1"><stop class="garden-sky-a" stop-color="#A4F0D0"/><stop class="garden-sky-b" offset="1" stop-color="#D9F8D8"/></linearGradient><linearGradient id="gardenHill" x1="0" y1="0" x2="0" y2="1"><stop class="garden-hill-a" stop-color="#47B886"/><stop class="garden-hill-b" offset="1" stop-color="#218C70"/></linearGradient><linearGradient id="gardenPath" x1="0" y1="0" x2="1" y2="1"><stop class="garden-path-a" stop-color="#F8D98F"/><stop class="garden-path-b" offset="1" stop-color="#E8B96E"/></linearGradient><linearGradient id="gardenLeaf" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#B4E99B"/><stop offset="1" stop-color="#46A978"/></linearGradient><linearGradient id="gardenTrunk" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#80563F"/><stop offset=".5" stop-color="#BB8052"/><stop offset="1" stop-color="#754B38"/></linearGradient><linearGradient id="gardenCanopy" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#79D39A"/><stop offset="1" stop-color="#238A63"/></linearGradient><linearGradient id="gardenCanopyLight" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#C0ED9C"/><stop offset="1" stop-color="#63BD7E"/></linearGradient><linearGradient id="gardenPetalPink" x1="0" y1="-1" x2="0" y2="1"><stop stop-color="#FFF1F5"/><stop offset=".6" stop-color="#F58FAE"/><stop offset="1" stop-color="#D95C87"/></linearGradient><linearGradient id="gardenPetalCoral" x1="0" y1="-1" x2="0" y2="1"><stop stop-color="#FFE9D7"/><stop offset=".58" stop-color="#F79C78"/><stop offset="1" stop-color="#DB654F"/></linearGradient><linearGradient id="gardenPetalCream" x1="0" y1="-1" x2="0" y2="1"><stop stop-color="#FFFDE4"/><stop offset=".65" stop-color="#F5D67B"/><stop offset="1" stop-color="#D8A83E"/></linearGradient><linearGradient id="gardenPetalLavender" x1="0" y1="-1" x2="0" y2="1"><stop stop-color="#FBF0FF"/><stop offset=".6" stop-color="#C7A4E8"/><stop offset="1" stop-color="#8D70C4"/></linearGradient><linearGradient id="gardenPetalGold" x1="0" y1="-1" x2="0" y2="1"><stop stop-color="#FFF8CC"/><stop offset=".6" stop-color="#F2BD4A"/><stop offset="1" stop-color="#D48A2B"/></linearGradient><radialGradient id="gardenFlowerCenter"><stop stop-color="#FFF4A8"/><stop offset=".6" stop-color="#F6BD45"/><stop offset="1" stop-color="#D98525"/></radialGradient></defs>
        <rect x="0" y="0" width="740" height="260" rx="22" fill="url(#gardenSky)"/>
        <circle class="garden-sky-sun" cx="610" cy="55" r="27" fill="#FFE08B"/><circle cx="610" cy="55" r="39" fill="#FFE08B" opacity=".22"/><g class="garden-night-stars"><circle cx="610" cy="55" r="19" fill="#F5F2C8"/><path d="m100 70 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z M518 62l2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="#FFF2B0"/></g>
        <path d="M0 145Q118 92 249 142T490 137T740 122V260H0Z" fill="#92D9AC"/><path d="M0 175Q120 123 268 168T522 155T740 162V260H0Z" fill="url(#gardenHill)"/><path d="M310 260q58-54 15-85t31-54q46 21 12 61t37 78Z" fill="url(#gardenPath)" opacity=".95"/>
        <path d="M0 211Q113 176 234 206t228-2q140-45 278 5v51H0Z" fill="#1E846D" opacity=".52"/>
        <g class="garden-cloud"><ellipse cx="146" cy="54" rx="31" ry="10" fill="#F4FFEA" opacity=".66"/><circle cx="132" cy="48" r="12" fill="#F4FFEA" opacity=".66"/><circle cx="151" cy="45" r="15" fill="#F4FFEA" opacity=".66"/></g>
        ${trees}${biggerTree}${blossoms}${ornament}
        <g class="garden-firefly"><circle cx="255" cy="91" r="3" fill="#FFF5AE"/><circle cx="255" cy="91" r="10" fill="#FFF5AE" opacity=".2"/></g><g class="garden-firefly garden-firefly-two"><circle cx="492" cy="102" r="3" fill="#FFF5AE"/><circle cx="492" cy="102" r="10" fill="#FFF5AE" opacity=".2"/></g>
        <g class="garden-coin"><circle cx="373" cy="196" r="17" fill="#FFD65B" stroke="#D89632" stroke-width="3"/><text x="373" y="202" text-anchor="middle" font-size="17" font-family="Georgia,serif" font-weight="700" fill="#A96E28">$</text></g>
      </svg>
      <span class="garden-art-caption"><span>✦</span> Every lesson leaves a little mark</span>
    </div>
    <div class="garden-customize"><div class="garden-customize-head"><span class="section-kicker">MAKE IT YOURS</span><small>Themes grow with lessons and streaks. Decorations come from mystery vaults.</small></div><div class="garden-choices" aria-label="Garden themes">${themes}</div><div class="garden-choices garden-decorations" aria-label="Garden decorations">${decorations}</div></div>
  </section>`;
}
