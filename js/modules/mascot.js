// Penny is LifeLaunch's friendly learning companion, drawn inline to keep the app asset-light.
export function pennySvg(className = '') {
  return `<svg class="penny-svg ${className}" viewBox="0 0 140 150" aria-hidden="true" focusable="false">
    <ellipse cx="70" cy="140" rx="34" ry="6" fill="#244A40" opacity=".13"/>
    <path class="penny-tail" d="M98 104c25 5 33-10 22-21-9-9-22-2-17 7" fill="none" stroke="#F4B942" stroke-width="13" stroke-linecap="round"/>
    <path d="M98 104c25 5 33-10 22-21-9-9-22-2-17 7" fill="none" stroke="#FFE28A" stroke-width="4" stroke-linecap="round"/>
    <path d="M47 104q-14 7-18 17m64-17q14 7 18 17" fill="none" stroke="#087D67" stroke-width="10" stroke-linecap="round"/>
    <path d="M54 111q-4 15-1 21m31-21q4 15 1 21" fill="none" stroke="#087D67" stroke-width="10" stroke-linecap="round"/>
    <path d="M47 128h12m20 0h12" fill="none" stroke="#075F54" stroke-width="8" stroke-linecap="round"/>
    <path d="M40 52 27 29q19-1 31 13m42 10 13-23q-19 0-31 13" fill="#087D67" stroke="#075F54" stroke-width="3" stroke-linejoin="round"/>
    <path d="M59 20q11-17 22 0-11 3-22 0Z" fill="#FFD15A" stroke="#D89926" stroke-width="2"/>
    <path d="M38 57c0-22 14-37 32-37s32 15 32 37c0 25-14 41-32 41S38 82 38 57Z" fill="#25B992" stroke="#087D67" stroke-width="4"/>
    <path d="M49 65q7-9 14 0m14 0q7-9 14 0" fill="none" stroke="#173D36" stroke-width="4" stroke-linecap="round"/>
    <circle cx="54" cy="72" r="4" fill="#F48E78" opacity=".72"/><circle cx="86" cy="72" r="4" fill="#F48E78" opacity=".72"/>
    <path d="M62 77q8 9 16 0" fill="none" stroke="#173D36" stroke-width="3.5" stroke-linecap="round"/>
    <circle cx="70" cy="108" r="12" fill="#FFD15A" stroke="#D89926" stroke-width="2.5"/>
    <path d="m70 101 2 5 5 2-5 2-2 5-2-5-5-2 5-2z" fill="#FFF8D8"/>
    <path class="penny-wave-arm" d="M40 89q-15-9-18 5" fill="none" stroke="#087D67" stroke-width="9" stroke-linecap="round"/>
  </svg>`;
}
