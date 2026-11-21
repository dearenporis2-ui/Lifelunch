export const DEFAULT_AVATAR = { presentation: 'feminine', skin: 'warm', hairStyle: 'swoop', hairColor: 'espresso', expression: 'happy', outfitStyle: 'hoodie', outfitColor: 'lagoon' };

export const AVATAR_PARTS = {
  presentation: [{ id: 'feminine', label: 'Feminine' }, { id: 'masculine', label: 'Masculine' }],
  skin: [
    { id: 'light', label: 'Light', base: '#F5D1B5', shade: '#DFA982', blush: '#E99B89' },
    { id: 'warm', label: 'Warm', base: '#DDA47C', shade: '#B87855', blush: '#C86F62' },
    { id: 'golden', label: 'Golden', base: '#C9865C', shade: '#9D5C40', blush: '#AC584F' },
    { id: 'deep', label: 'Deep', base: '#985F49', shade: '#704334', blush: '#84463F' },
    { id: 'rich', label: 'Rich', base: '#704638', shade: '#513329', blush: '#75413B' }
  ],
  hairColor: [
    { id: 'espresso', label: 'Espresso', base: '#49302C', shade: '#2F2021', shine: '#785044' },
    { id: 'midnight', label: 'Midnight', base: '#303849', shade: '#202635', shine: '#59647C' },
    { id: 'copper', label: 'Copper', base: '#A95138', shade: '#76382F', shine: '#D17B51' },
    { id: 'plum', label: 'Plum', base: '#73517F', shade: '#4F3A61', shine: '#A982B2' },
    { id: 'honey', label: 'Honey', base: '#BD823C', shade: '#895A31', shine: '#E3B66A' }
  ],
  hairStyle: [
    { id: 'swoop', label: 'Soft swoop' }, { id: 'bob', label: 'Rounded bob' },
    { id: 'curls', label: 'Cloud curls' }, { id: 'crop', label: 'Short crop' },
    { id: 'waves', label: 'Long waves' }, { id: 'puff', label: 'High puff' },
    { id: 'sidepart', label: 'Classic side part', presentation: 'masculine' },
    { id: 'texture', label: 'Textured crop', presentation: 'masculine' },
    { id: 'fade', label: 'Short fade', presentation: 'masculine' },
    { id: 'buzz', label: 'Buzz cut', presentation: 'masculine' },
    { id: 'curlytop', label: 'Curly top fade', presentation: 'masculine' },
    { id: 'longflow', label: 'Shoulder-length flow', presentation: 'masculine' },
    { id: 'manbun', label: 'Man bun', presentation: 'masculine' }
  ],
  expression: [
    { id: 'happy', label: 'Happy' }, { id: 'confident', label: 'Confident' },
    { id: 'curious', label: 'Curious' }, { id: 'focused', label: 'Focused' }
  ],
  outfitStyle: [
    { id: 'hoodie', label: 'Hoodie' }, { id: 'varsity', label: 'Varsity jacket' },
    { id: 'overalls', label: 'Overalls' }, { id: 'sweater', label: 'Cozy sweater' },
    { id: 'suit', label: 'Suit' }
  ],
  outfitColor: [
    { id: 'lagoon', label: 'Lagoon', base: '#108D78', shade: '#096A62', light: '#42C2A4' },
    { id: 'coral', label: 'Coral', base: '#D96E66', shade: '#AA4F55', light: '#F29A83' },
    { id: 'violet', label: 'Violet', base: '#7465B7', shade: '#514990', light: '#A395DE' },
    { id: 'sunshine', label: 'Sunshine', base: '#D69A36', shade: '#A86D26', light: '#F3C75D' },
    { id: 'black', label: 'Black', base: '#292D36', shade: '#121720', light: '#9BA7B9' }
  ]
};

export function normalizeAvatar(input = {}) {
  const presentation = AVATAR_PARTS.presentation.some(option => option.id === input?.presentation)
    ? input.presentation : DEFAULT_AVATAR.presentation;
  const clean = {};
  for (const part of Object.keys(DEFAULT_AVATAR)) {
    const value = part === 'outfitColor' ? input?.outfitColor || input?.outfit : input?.[part];
    const allowed = AVATAR_PARTS[part].some(option => option.id === value && (part !== 'hairStyle' || (option.presentation || 'feminine') === presentation));
    clean[part] = allowed ? value : (part === 'presentation' ? presentation : part === 'hairStyle' && presentation === 'masculine' ? 'sidepart' : DEFAULT_AVATAR[part]);
  }
  return clean;
}

const pick = (part, id) => AVATAR_PARTS[part].find(option => option.id === id);

export function avatarSvg(input = {}, className = 'avatar-art') {
  const a = normalizeAvatar(input), skin = pick('skin', a.skin), hair = pick('hairColor', a.hairColor), outfit = pick('outfitColor', a.outfitColor);
  const uid = `ll-avatar-${Object.values(a).join('-')}`;
  const outfitArt = {
    hoodie: `<path d="M39 220c4-35 19-54 48-62h26c29 8 44 27 48 62Z" fill="url(#${uid}-cloth)" stroke="${outfit.shade}" stroke-width="2.5"/><path d="M77 161q3-18 23-22 20 4 23 22l-13-5-10 9-10-9Z" fill="${outfit.shade}"/><path d="M75 197q25-12 50 0l-4 15H79Z" fill="${outfit.shade}" opacity=".48"/><path d="m91 166 3 26m15-26-3 26" stroke="${outfit.light}" stroke-width="2.5" stroke-linecap="round"/>`,
    varsity: `<path d="M39 220c4-35 19-54 48-62h26c29 8 44 27 48 62Z" fill="url(#${uid}-cloth)" stroke="${outfit.shade}" stroke-width="2.5"/><path d="M57 172q-14 15-18 48h25l13-53Zm86-5 14 7q13 16 18 46h-25l-13-53Z" fill="${outfit.shade}" opacity=".9"/><path d="M88 158h24l8 62H80Z" fill="${outfit.base}"/><path d="m89 158 11 13 11-13m-12 13v48" fill="none" stroke="${outfit.light}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="105" cy="185" r="1.7" fill="${outfit.light}"/><circle cx="105" cy="199" r="1.7" fill="${outfit.light}"/><path d="M44 207h28m83 0h-28" stroke="${outfit.light}" stroke-width="4" opacity=".9"/>`,
    overalls: `<path d="M39 220c4-35 19-54 48-62h26c29 8 44 27 48 62Z" fill="${skin.base}" stroke="${skin.shade}" stroke-width="2.5"/><path d="M68 166q32-15 64 0l9 54H59Z" fill="url(#${uid}-cloth)" stroke="${outfit.shade}" stroke-width="2.5" stroke-linejoin="round"/><path d="M71 163h13l8 16-13 4Zm45 0h13l-8 20-13-4Z" fill="${outfit.light}" stroke="${outfit.shade}" stroke-width="2" stroke-linejoin="round"/><path d="M82 183h36v28H82Z" fill="${outfit.shade}" opacity=".34"/><path d="M87 187h26m-26 6h26" stroke="${outfit.light}" stroke-width="1.6" opacity=".8"/><circle cx="81" cy="178" r="2.2" fill="#F5D57B" stroke="${outfit.shade}" stroke-width=".8"/><circle cx="119" cy="178" r="2.2" fill="#F5D57B" stroke="${outfit.shade}" stroke-width=".8"/>`,
    sweater: `<path d="M39 220c4-35 19-54 48-62h26c29 8 44 27 48 62Z" fill="url(#${uid}-cloth)" stroke="${outfit.shade}" stroke-width="2.5"/><path d="M83 158q17 15 34 0l-4 14q-13 12-26 0Z" fill="${outfit.shade}"/><path d="M52 211h20m56 0h20" stroke="${outfit.light}" stroke-width="4" stroke-linecap="round"/><path d="M81 185h6m8 0h6m8 0h6m-34 9h6m8 0h6m8 0h6m-26 9h6m8 0h6" stroke="${outfit.light}" stroke-width="2" stroke-linecap="round" opacity=".62"/>`,
    suit: `<path d="M39 220c4-35 19-54 48-62h26c29 8 44 27 48 62Z" fill="url(#${uid}-cloth)" stroke="${outfit.shade}" stroke-width="2.5"/><path d="M85 157h30l15 63H70Z" fill="#F6F0E6" stroke="${outfit.shade}" stroke-width="1.8" stroke-linejoin="round"/><path d="m84 157 16 18-11 17-17-28Zm32 0-16 18 11 17 17-28Z" fill="${outfit.base}" stroke="${outfit.shade}" stroke-width="1.6" stroke-linejoin="round"/><path d="m96 176 8 0 5 31-9 11-9-11Z" fill="${outfit.light}" stroke="${outfit.shade}" stroke-width="1.4" stroke-linejoin="round"/><path d="M121 180h10l-2 8h-9Z" fill="${outfit.light}"/><circle cx="116" cy="199" r="1.5" fill="${outfit.light}"/>`
  }[a.outfitStyle];
  const backHair = {
    swoop: '<path d="M51 101C43 65 54 33 83 25c32-10 69 7 72 47 2 22-6 53-18 71l-17-7H78l-16 9c-12-13-17-28-11-44Z"/>',
    bob: '<path d="M50 101C41 63 56 32 84 25c34-9 68 11 70 48 2 24-1 48-15 69l-18-5H78l-16 8c-15-12-18-27-12-44Z"/>',
    curls: '<path d="M49 99C39 62 58 31 84 24c34-10 69 11 73 47 2 25-4 49-17 69l-17-6H77l-15 9c-13-12-18-28-13-44Z"/>',
    crop: '<path d="M53 93C48 57 64 31 91 26c30-6 56 14 60 46l-10 22-17-8H76l-16 9Z"/>',
    waves: '<path d="M50 101C42 62 57 30 86 24c34-8 67 12 70 49 2 19-3 34-12 47 10 14 5 27-7 35l-14-15H77l-13 15c-14-8-19-21-9-35-9-6-11-10-5-19Z"/>',
    puff: '<path d="M52 99C44 65 57 36 82 28c29-9 61 7 68 38 4 18 0 37-8 53l-18-6H75l-15 9Z"/>',
    sidepart: '<path d="M54 91C49 63 63 39 87 31c27-9 53 4 59 29 3 12 0 24-6 34l-12-8c4-13 0-25-10-32-14 4-27 9-39 19-9 7-17 13-25 18Z"/>',
    texture: '<path d="M54 89C52 64 66 42 89 34c24-8 47 4 54 26 4 12 1 23-4 33l-12-7c2-13-2-24-12-30-13 4-26 9-38 17-8 5-15 10-23 16Z"/>',
    fade: '<path d="M53 91C50 66 65 43 89 34c23-8 46 2 55 23 6 14 3 27-4 38l-13-8c5-13 2-25-8-32-15 5-29 10-41 19-10 7-17 13-25 17Z"/>',
    buzz: '<path d="M58 83C55 59 70 40 92 34c22-6 42 6 47 26 3 10 1 20-3 29l-12-7c2-11-2-21-10-26-13 4-24 8-36 15-8 4-14 8-20 12Z"/>',
    curlytop: '<path d="M54 91C51 67 65 44 89 35c24-9 48 3 56 25 4 12 1 24-5 35l-13-8c4-13 0-25-10-32-15 5-29 10-41 19-9 7-16 12-22 17Z"/>',
    longflow: '<path d="M50 98C42 67 54 35 82 25c30-11 63 6 69 38 6 32-2 67-17 92Q128 161 119 151c12-21 16-46 13-71-2-22-15-36-32-37-18-1-34 13-39 34-5 22 1 48 14 68Q70 153 63 154C49 137 44 116 50 98Z"/>',
    manbun: '<circle cx="132" cy="33" r="17"/><path d="M52 101C45 65 59 34 87 26c29-9 58 6 64 36 4 18-1 40-10 57l-14-10-9-27H78l-13 28-13 8Z"/>'
  }[a.hairStyle];
  const frontHair = {
    swoop: '<path d="M55 77c-1-34 19-51 47-51 25 0 42 15 44 39-12-10-25-14-39-12-12 2-20 7-29 16-6 6-13 9-23 8Z"/><path d="M57 72c-2 22 2 43 9 57-12-8-18-20-17-34 0-9 3-17 8-23Zm87-8c6 12 7 28 3 42-2 8-7 16-13 21 5-18 5-41 1-54Z"/>',
    bob: '<path d="M53 77c1-34 20-51 48-51 26 0 43 17 45 43-9-9-20-14-33-15-16-1-27 5-37 17-7 7-14 10-23 6Z"/><path d="M52 74c-4 30 0 52 13 66-14-5-23-18-23-34 0-14 3-24 10-32Zm96-7c9 13 10 34 6 49-2 10-7 18-15 24 8-21 7-51 2-73Z"/>',
    curls: '<circle cx="59" cy="59" r="15"/><circle cx="75" cy="39" r="16"/><circle cx="96" cy="31" r="16"/><circle cx="118" cy="34" r="16"/><circle cx="138" cy="49" r="16"/><circle cx="148" cy="68" r="14"/><circle cx="53" cy="81" r="13"/><path d="M64 63c11 1 18-8 27-14 15-10 31-8 49 2-8 0-14 6-18 13-9-7-20-8-30-3-10 5-18 12-30 10Z"/>',
    crop: '<path d="M54 75c0-31 17-48 44-49 25-1 43 13 48 38-12-9-23-11-36-8-12 3-21 10-30 19-7 6-16 7-26 0Z"/><path d="M54 67c-3 10-3 20 0 29-8-5-12-13-11-22 1-7 4-12 11-17Z"/>',
    waves: '<path d="M53 75c0-31 18-49 47-49 27 0 45 17 47 44-12-8-25-11-38-7-13 4-20 11-29 17-9 7-18 4-27-5Z"/><path d="M57 76c-5 24 0 45 12 59-14-4-22-17-22-32 0-12 3-21 10-29Zm88-8c8 12 10 32 7 48-2 10-8 18-16 23 7-20 7-48 2-71Z"/>',
    puff: '<circle cx="73" cy="39" r="15"/><circle cx="91" cy="29" r="17"/><circle cx="111" cy="29" r="17"/><circle cx="130" cy="39" r="15"/><path d="M56 77c1-30 17-49 44-50 25-1 42 14 46 39-12-9-23-11-36-8-12 3-21 10-30 19-7 6-16 7-24 0Z"/><circle cx="151" cy="61" r="8"/>',
    sidepart: '<path d="M57 76C56 49 74 30 101 29c25 0 41 14 44 37-11-6-23-7-35-4-17 5-28 15-41 20-5 1-9-1-12-6Z"/>',
    texture: '<path d="M56 77C55 51 73 31 101 30c26 0 43 15 45 40-7-4-13-6-19-5l-6-8-7 9-7-8-7 9-8-6-7 10-8-5-7 9c-8 4-15 7-24 2Z"/>',
    fade: '<path d="M56 77C56 49 74 30 101 29c25 0 41 14 44 37-9-5-19-5-29-1-16 6-27 14-40 19-8 3-15 0-20-7Z"/>',
    buzz: '<path d="M60 75C60 51 76 34 101 33c23 0 38 13 41 33-10-5-19-5-29-2-14 4-24 11-36 16-7 2-13 0-17-5Z"/>',
    curlytop: '<circle cx="73" cy="41" r="9"/><circle cx="87" cy="33" r="11"/><circle cx="102" cy="30" r="12"/><circle cx="118" cy="33" r="11"/><circle cx="132" cy="42" r="9"/><path d="M57 76C57 51 75 32 101 31c24 0 40 14 43 34-9-5-18-5-28-1-15 5-25 12-38 17-8 3-15 0-21-5Z"/>',
    longflow: '<path d="M56 75C55 48 74 29 100 29c27 0 44 18 45 45-10-12-22-18-34-18-4 0-8 1-11 4-4-3-9-4-14-4-12 0-22 7-30 19Z"/>',
    manbun: '<path d="M58 76C58 49 76 30 102 30c25 0 41 15 42 39-12-6-22-7-34-3-16 5-28 15-41 19-5 1-9-2-11-9Z"/><path d="M57 76c-4 19-2 39 6 55-10-8-15-19-14-33 0-10 3-17 8-22Z"/>'
  }[a.hairStyle];
  const face = {
    happy: {
      brows: 'M75 83c5-4 11-5 17-2m17 0c6-3 12-2 17 2',
      eyes: '<g fill="#FFFDF7"><ellipse cx="83" cy="94" rx="7.4" ry="8.4"/><ellipse cx="117" cy="94" rx="7.4" ry="8.4"/></g><g fill="#3B3434"><ellipse cx="84" cy="96" rx="3.8" ry="5.3"/><ellipse cx="116" cy="96" rx="3.8" ry="5.3"/></g><g fill="#FFF"><circle cx="85.5" cy="94" r="1.4"/><circle cx="117.5" cy="94" r="1.4"/></g>',
      mouth: '<path d="M89 121c6 7 16 7 22 0" fill="none" stroke="#A64F53" stroke-width="2.6" stroke-linecap="round"/><path d="M93 124c3 2 9 2 13 0" fill="none" stroke="#F08079" stroke-width="1.4" stroke-linecap="round"/>'
    },
    confident: {
      brows: 'M75 83c5-3 11-3 17 0m17 0c6-3 12-3 17 0',
      eyes: '<path d="M76 95q7-9 15 0m18 0q8-9 15 0" fill="none" stroke="#FFFDF7" stroke-width="5" stroke-linecap="round"/><ellipse cx="84" cy="96" rx="3" ry="4" fill="#3B3434"/><ellipse cx="116" cy="96" rx="3" ry="4" fill="#3B3434"/>',
      mouth: '<path d="M90 121q11 9 22-1" fill="none" stroke="#A64F53" stroke-width="2.8" stroke-linecap="round"/>'
    },
    curious: {
      brows: 'M75 80q8-7 17-2m17 1q7-5 14 0',
      eyes: '<g fill="#FFFDF7"><ellipse cx="83" cy="94" rx="8" ry="9"/><ellipse cx="117" cy="94" rx="8" ry="9"/></g><g fill="#3B3434"><ellipse cx="84" cy="96" rx="3.8" ry="5.3"/><ellipse cx="116" cy="96" rx="3.8" ry="5.3"/></g><g fill="#FFF"><circle cx="85.5" cy="94" r="1.4"/><circle cx="117.5" cy="94" r="1.4"/></g>',
      mouth: '<ellipse cx="100" cy="122" rx="4.4" ry="5.3" fill="#A64F53"/><ellipse cx="100" cy="120.5" rx="2" ry="1.3" fill="#F08079"/>'
    },
    focused: {
      brows: 'M75 82l17 3m16-3 17-3',
      eyes: '<path d="M76 95q7-6 15 0m18 0q8-6 15 0" fill="none" stroke="#FFFDF7" stroke-width="5" stroke-linecap="round"/><ellipse cx="84" cy="96" rx="3" ry="3.5" fill="#3B3434"/><ellipse cx="116" cy="96" rx="3" ry="3.5" fill="#3B3434"/>',
      mouth: '<path d="M92 123h16" fill="none" stroke="#A64F53" stroke-width="2.8" stroke-linecap="round"/>'
    }
  }[a.expression];
  const faceShape = a.presentation === 'masculine'
    ? 'M62 76C62 52 77 38 100 38s38 14 38 38v26c0 17-6 30-16 38-6 5-14 8-22 8s-16-3-22-8c-10-8-16-21-16-38Z'
    : 'M63 77c0-25 16-39 37-39s37 14 37 39v27c0 27-17 44-37 44s-37-17-37-44Z';
  const noseArt = a.presentation === 'masculine'
    ? `<path d="M93 110q7 7 14 0" fill="none" stroke="${skin.shade}" stroke-width="2.4" stroke-linecap="round"/>`
    : `<path d="M95 111q5 4 10 0" fill="none" stroke="${skin.shade}" stroke-width="1.8" stroke-linecap="round"/>`;
  const mouthArt = a.presentation === 'masculine' && a.expression === 'happy'
    ? '<path d="M89 121q11 7 22 0" fill="none" stroke="#75423C" stroke-width="2.8" stroke-linecap="round"/>'
    : face.mouth.replaceAll('{skin}', skin.shade);
  const hairShine = a.presentation === 'masculine'
    ? (a.hairStyle === 'longflow' || a.hairStyle === 'manbun' ? 'M72 51c9-13 21-18 34-18' : 'M76 47c9-9 20-13 32-13')
    : 'M70 53c9-14 23-20 37-19';
  const hairFlowDetails = a.hairStyle === 'longflow'
    ? `<path d="M54 103c-1 17 2 32 9 45m83-45c1 17-2 32-9 45" fill="none" stroke="${hair.shine}" stroke-width="2" stroke-linecap="round" opacity=".62"/>`
    : '';
  return `<svg class="${className}" viewBox="0 0 200 220" role="img" aria-label="Custom LifeLaunch avatar" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="${uid}-bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#D8FFF0"/><stop offset="1" stop-color="#A7DFCE"/></linearGradient><linearGradient id="${uid}-cloth" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${outfit.light}"/><stop offset="1" stop-color="${outfit.base}"/></linearGradient></defs>
    <circle cx="100" cy="108" r="96" fill="url(#${uid}-bg)"/><circle cx="100" cy="108" r="83" fill="#F5FFF6" opacity=".28"/>
    <path d="m42 56 2.7 6.3L51 65l-6.3 2.7L42 74l-2.7-6.3L33 65l6.3-2.7Z" fill="#FFF3B3"/><path d="m157 104 2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2Z" fill="#FFF3B3" opacity=".8"/>
    <ellipse cx="101" cy="211" rx="54" ry="8" fill="#2D7665" opacity=".13"/>
    <g class="avatar-character">
    <g fill="${hair.base}" stroke="${hair.shade}" stroke-width="2.2" stroke-linejoin="round">${backHair}</g>
    ${outfitArt}
    <path d="m87 157 13 18 13-18-3-18H90Z" fill="${skin.base}"/><path d="M90 141h20l-2 17-8 8-9-8Z" fill="${skin.shade}" opacity=".22"/>
    <path d="${faceShape}" fill="${skin.base}" stroke="${skin.shade}" stroke-width="2.1"/>
    <ellipse cx="75" cy="107" rx="7" ry="3.5" fill="${skin.blush}" opacity="${a.presentation === 'masculine' ? '.06' : '.28'}"/><ellipse cx="125" cy="107" rx="7" ry="3.5" fill="${skin.blush}" opacity="${a.presentation === 'masculine' ? '.06' : '.28'}"/>
    <path d="${face.brows}" fill="none" stroke="${hair.shade}" stroke-width="${a.presentation === 'masculine' ? 3.8 : 2.8}" stroke-linecap="round"/>
    <g class="avatar-eyes">${face.eyes}</g>
    ${noseArt}${mouthArt}
    <g fill="${hair.base}" stroke="${hair.shade}" stroke-width="2.2" stroke-linejoin="round">${frontHair}</g><path d="${hairShine}" fill="none" stroke="${hair.shine}" stroke-width="3" stroke-linecap="round" opacity=".75"/>${hairFlowDetails}
    <path d="M100 177v16m-8-7 8 7 8-7" fill="none" stroke="${outfit.light}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/>
    </g>
  </svg>`;
}
