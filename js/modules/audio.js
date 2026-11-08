// SFX manager. Plays files from assets/audio/; if a file is missing or blocked, falls back to a short synthesized tone.
const BASE = 'assets/audio/';
const AUDIO_CACHE = 'lifelaunch-audio-v1'; // bump the version if shipped sound files change
const MUSIC_CACHE = 'lifelaunch-music-v1';
export const MUSIC_TRACKS = [
  { id: 'track-1', name: 'Soundtrack 1', file: 'menu-music.mp3' },
  { id: 'track-2', name: 'Soundtrack 2', file: 'menu-music-2.mp3' },
  { id: 'track-3', name: 'Soundtrack 3', file: 'menu-music-3.mp3' }
];
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
    this.musicEnabled = localStorage.getItem('ll.music') === '1';
    this.musicVolume = Math.min(.35, Math.max(0, Number(localStorage.getItem('ll.musicVolume') ?? 0.18)));
    const savedTrack = localStorage.getItem('ll.musicTrack');
    this.musicTrackId = MUSIC_TRACKS.some(track => track.id === savedTrack) ? savedTrack : MUSIC_TRACKS[0].id;
    this.loadedMusicTracks = new Set(); this.musicUrls = new Map(); this.musicLoads = new Map();
    this.musicSuspended = false;
    this.music = new Audio(); this.music.preload = 'none'; this.music.loop = true; this.music.volume = this.musicVolume;
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
  async setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    try { localStorage.setItem('ll.music', enabled ? '1' : '0'); } catch {}
    if (enabled) {
      this.musicSuspended = false;
      const ok = await this.resumeMusic();
      if (!ok) { this.musicEnabled = false; try { localStorage.setItem('ll.music', '0'); } catch {} }
      return ok;
    }
    this.music.pause(); return true;
  }
  async selectMusicTrack(id) {
    if (!MUSIC_TRACKS.some(track => track.id === id)) return false;
    this.musicTrackId = id;
    try { localStorage.setItem('ll.musicTrack', id); } catch {}
    this.music.pause(); this.music.removeAttribute('src'); this.music.load();
    this.musicEnabled = true; this.musicSuspended = false;
    try { localStorage.setItem('ll.music', '1'); } catch {}
    const ok = await this.resumeMusic();
    if (!ok) { this.musicEnabled = false; try { localStorage.setItem('ll.music', '0'); } catch {} }
    return ok;
  }
  async loadMusicTrack(id) {
    if (this.musicUrls.has(id)) return this.musicUrls.get(id);
    if (this.musicLoads.has(id)) return this.musicLoads.get(id);
    const track = MUSIC_TRACKS.find(item => item.id === id);
    if (!track) throw new Error('Unknown music track');
    const load = (async () => {
      const url = new URL(BASE + track.file, document.baseURI).href;
      let store = null, response = null;
      try { if ('caches' in window) store = await caches.open(MUSIC_CACHE); } catch { /* use browser fetch cache */ }
      if (store) { try { response = await store.match(url); } catch { /* fetch below */ } }
      if (!response) {
        const controller = new AbortController(), timeout = setTimeout(() => controller.abort(), 20000);
        try { response = await fetch(url, { signal: controller.signal }); }
        finally { clearTimeout(timeout); }
        if (!response.ok) throw new Error(`Could not load ${track.file}`);
        if (store) { try { await store.put(url, response.clone()); } catch { /* cache storage is optional */ } }
      }
      const objectUrl = URL.createObjectURL(await response.blob());
      this.musicUrls.set(id, objectUrl); this.loadedMusicTracks.add(id);
      return objectUrl;
    })();
    this.musicLoads.set(id, load);
    try { return await load; }
    catch (error) { this.musicLoads.delete(id); throw error; }
  }
  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(.35, Number(volume)));
    this.music.volume = this.musicVolume;
    try { localStorage.setItem('ll.musicVolume', String(this.musicVolume)); } catch {}
  }
  pauseMusic() { this.musicSuspended = true; this.music.pause(); }
  resumeAfterSession() { this.musicSuspended = false; this.resumeMusic(); }
  async resumeMusic() {
    if (!this.musicEnabled || this.musicSuspended) return false;
    const trackId = this.musicTrackId;
    if (this.music.dataset.trackId !== trackId || !this.music.src) {
      let src;
      try { src = await this.loadMusicTrack(trackId); } catch { return false; }
      if (trackId !== this.musicTrackId || !this.musicEnabled || this.musicSuspended) return false;
      this.music.pause(); this.music.src = src; this.music.dataset.trackId = trackId; this.music.load();
    }
    if (this.music.paused) {
      try { await this.music.play(); }
      catch { return this.loadedMusicTracks.has(trackId); } // a later direct tap retries browsers that initially block play()
    }
    return true;
  }
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
