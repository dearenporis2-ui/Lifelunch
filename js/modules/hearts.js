// Hearts and the daily goal. Hearts regenerate over time (one per 20 minutes), can be bought back with cash, or won back in Practice.
export const MAX_HEARTS = 5, REGEN_MS = 20 * 60 * 1000, REFILL_COST = 100, GOAL_XP = 30;

export function heartsNow(s, now = Date.now()) {
  if (s.hearts == null) { s.hearts = MAX_HEARTS; s.heartsAt = now; }
  if (s.hearts >= MAX_HEARTS) { s.hearts = MAX_HEARTS; s.heartsAt = now; return s.hearts; }
  const gain = Math.floor((now - s.heartsAt) / REGEN_MS);
  if (gain > 0) { s.hearts = Math.min(MAX_HEARTS, s.hearts + gain); s.heartsAt = s.hearts >= MAX_HEARTS ? now : s.heartsAt + gain * REGEN_MS; }
  return s.hearts;
}
export const msToNext = (s, now = Date.now()) => (heartsNow(s, now) >= MAX_HEARTS ? 0 : Math.max(0, REGEN_MS - (now - s.heartsAt)));
export function loseHeart(s, now = Date.now()) { heartsNow(s, now); s.hearts = Math.max(0, s.hearts - 1); }
export function addHeart(s, n = 1, now = Date.now()) { heartsNow(s, now); s.hearts = Math.min(MAX_HEARTS, s.hearts + n); if (s.hearts >= MAX_HEARTS) s.heartsAt = now; }
export const fmtWait = ms => { const m = Math.max(1, Math.ceil(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
