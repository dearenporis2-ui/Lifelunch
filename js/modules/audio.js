// SFX manager. Plays files from assets/audio/; if a file is missing or blocked, falls back to a short synthesized tone.
const BASE = 'assets/audio/';
const AUDIO_CACHE = 'lifelaunch-audio-v1'; // bump the version if shipped sound files change
export const SFX = {
  click: 'click.mp3', correct: 'correct.mp3', wrong: 'wrong.mp3', reward: 'reward.mp3',
  levelup: 'levelup.mp3', badge: 'badge.mp3', streak: 'streak.mp3',
  lessonStart: 'lesson-start.mp3', lessonComplete: 'lesson-complete.mp3',
  goal: 'goal.mp3', heart: 'heart.mp3', challenge: 'challenge.mp3',
  friendRequest: 'friend-request.mp3', friendAccepted: 'friend-accepted.mp3',
  friendChallenge: 'friend-challenge.mp3', rankUp: 'rank-up.mp3'
};
const TONES = {
  click: [520], correct: [660, 880], wrong: [220, 160], reward: [660, 880, 1100],
  levelup: [440, 660, 880, 1320], badge: [880, 1175], streak: [523, 659, 784],
  lessonStart: [392, 523], lessonComplete: [523, 659, 784], goal: [659, 784, 988],
  heart: [392, 587], challenge: [523, 659, 880], friendRequest: [587, 784],
  friendAccepted: [523, 659, 784], friendChallenge: [659, 784], rankUp: [523, 659, 784, 1047]
};

class AudioManager {
  constructor() {
    this.muted = localStorage.getItem('ll.muted') === '1';
    this.volume = 0.7; this.cache = {}; this.urls = {}; this.failed = new Set(); this.ctx = null;
  }
  async preload(onProgress = () => {}) {
    const entries = Object.entries(SFX), total = entries.length;
    let store = null;
    try { if ('caches' in window) store = await caches.open(AUDIO_CACHE); } catch { /* browser storage unavailable */ }
    let ready = 0;
    await Promise.all(entries.map(async ([name, file]) => {
      try {
        const url = new URL(BASE + file, document.baseURI).href;
        let response = store && await store.match(url);
        if (!response) {
          const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 12000);
          try { response = await fetch(url, { cache: 'reload', signal: controller.signal }); }
          finally { clearTimeout(timeout); }
          if (!response.ok) throw new Error(`Could not load ${file}`);
          if (store) { try { await store.put(url, response.clone()); } catch { /* quota or storage policy: keep the in-memory copy */ } }
        }
        const src = URL.createObjectURL(await response.blob()), a = new Audio();
        this.urls[name] = src; a.preload = 'auto'; a.src = src;
        await new Promise(resolve => {
          let settled = false;
          const finish = () => { if (settled) return; settled = true; clearTimeout(timer); resolve(); };
          const timer = setTimeout(finish, 2500);
          a.addEventListener('canplaythrough', finish, { once: true });
          a.addEventListener('error', () => { this.failed.add(name); finish(); }, { once: true });
          a.load();
        });
        if (a.error) this.failed.add(name);
        else this.cache[name] = a;
      } catch { this.failed.add(name); }
      onProgress(++ready, total, name);
    }));
  }
  setMuted(m) { this.muted = m; try { localStorage.setItem('ll.muted', m ? '1' : '0'); } catch {} }
  play(name) {
    if (this.muted) return;
    const a = this.cache[name];
    if (!a || this.failed.has(name)) return this.beep(name);
    a.volume = this.volume;
    try { a.currentTime = 0; } catch {}
    a.play().catch(() => this.beep(name));
  }
  beep(name) {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      (TONES[name] || [440]).forEach((f, i) => {
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime + i * 0.09;
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12 * this.volume, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
        o.connect(g).connect(this.ctx.destination); o.start(t); o.stop(t + 0.16);
      });
    } catch { /* audio unavailable: stay silent */ }
  }
}
export const audio = new AudioManager();
