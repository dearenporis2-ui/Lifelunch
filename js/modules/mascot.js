// Penny is LifeLaunch's friendly dollar-bill guide, drawn inline to keep the app asset-light.
const escapeHtml = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export function pennyTalk(text) {
  return String(text).split(/\s+/).map((word, index) => `<span style="animation-delay:${index * 42}ms">${escapeHtml(word)}</span>`).join(' ');
}

export function pennySvg(className = '') {
  return `<svg class="penny-svg ${className}" viewBox="0 0 160 130" aria-hidden="true" focusable="false">
    <ellipse cx="80" cy="119" rx="39" ry="6" fill="#244A40" opacity=".14"/>
    <path d="M49 94q-4 13-2 20m59-20q4 13 2 20" fill="none" stroke="#176D50" stroke-width="8" stroke-linecap="round"/>
    <path d="M42 113h12m49 0h12" fill="none" stroke="#105B46" stroke-width="7" stroke-linecap="round"/>
    <path class="penny-wave-arm" d="M24 59Q5 51 14 34" fill="none" stroke="#176D50" stroke-width="8" stroke-linecap="round"/>
    <path d="M136 63q18 8 12 23" fill="none" stroke="#176D50" stroke-width="8" stroke-linecap="round"/>
    <rect x="20" y="18" width="120" height="79" rx="15" fill="#9BD7A8" stroke="#176D50" stroke-width="4"/>
    <rect x="27" y="25" width="106" height="65" rx="10" fill="none" stroke="#5EAD79" stroke-width="2"/>
    <path d="M117 20h8q13 0 13 13v8l-21-21Z" fill="#D2EFD5" stroke="#176D50" stroke-width="2"/>
    <circle cx="42" cy="57" r="13" fill="#DDF1D8" stroke="#5EAD79" stroke-width="2"/>
    <circle cx="118" cy="57" r="13" fill="#DDF1D8" stroke="#5EAD79" stroke-width="2"/>
    <text x="42" y="62" text-anchor="middle" font-family="Georgia,serif" font-size="16" font-weight="700" fill="#28724D">$</text>
    <text x="118" y="62" text-anchor="middle" font-family="Georgia,serif" font-size="16" font-weight="700" fill="#28724D">$</text>
    <path d="M70 46q5-7 10 0m10 0q5-7 10 0" fill="none" stroke="#173D36" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="70" cy="54" r="2" fill="#173D36"/><circle cx="90" cy="54" r="2" fill="#173D36"/>
    <path d="M76 64q4 4 8 0" fill="none" stroke="#173D36" stroke-width="3" stroke-linecap="round"/>
    <circle cx="67" cy="62" r="3" fill="#F28D76" opacity=".72"/><circle cx="93" cy="62" r="3" fill="#F28D76" opacity=".72"/>
    <path d="M76 79q4-7 8 0 4-7 8 0" fill="none" stroke="#FFF8D8" stroke-width="2.5" stroke-linecap="round"/>
    <path d="m116 19 18 18" stroke="#176D50" stroke-width="1.5" opacity=".35"/>
  </svg>`;
}
