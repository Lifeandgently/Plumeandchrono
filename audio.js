/* =========================================================
   Plume & Chrono · audio.js
   Web Audio API only (no sound files). Exposes window.PCAudio:
     enabled, unlock(), ding(), tick(alt), alarm(), soft(), tone(freq, at, dur, type, peak)
   Rules: every call is wrapped so a blocked AudioContext, a silent device, a missing API or a
   rejected resume() can never throw into a timer or freeze the UI. The context is created lazily
   and unlocked only on a real user gesture (pointerdown / touchend / click / keydown).
   Loaded BEFORE app.js; if this file is missing the app still runs, silently.
   ========================================================= */
(function (root) {
  'use strict';
  const quiet = (fn, fallback) => { try { return fn(); } catch (e) { return fallback; } };
  const savedOn = () => quiet(() => { const v = root.localStorage.getItem('pc_audio'); return v === null ? true : JSON.parse(v) !== false; }, true);

  const Sound = {
    ctx: null,
    enabled: savedOn(),
    ensure() {
      return quiet(() => {
        if (!this.ctx) { const AC = root.AudioContext || root.webkitAudioContext; if (!AC) return null; this.ctx = new AC(); }
        return this.ctx;
      }, null);
    },
    unlock() {           // call from pointerdown / touchend / click / keydown
      if (!this.ensure()) return;
      quiet(() => {
        if (this.ctx.state !== 'running') { const p = this.ctx.resume(); if (p && typeof p.catch === 'function') p.catch(() => {}); }
      });
    },
    tone(freq, at, dur, type, peak) {
      quiet(() => {
        const c = this.ctx; if (!c) return;
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, at);
        g.gain.setValueAtTime(0.0001, at);
        g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
        o.connect(g); g.connect(c.destination);
        o.start(at); o.stop(at + dur + 0.02);
      });
    },
    _play(fn) { if (!this.enabled) return; quiet(() => { if (!this.ensure()) return; this.unlock(); fn(this.ctx.currentTime); }); },
    ding() { this._play((now) => { const t = now + 0.01;                         // start / manual finish
      this.tone(880, t, 1.3, 'sine', 0.22); this.tone(1760, t, 0.7, 'sine', 0.07); this.tone(2640, t, 0.35, 'sine', 0.03); }); },
    tick(alt) { this._play((now) => this.tone(alt ? 1500 : 1900, now + 0.005, 0.045, 'square', 0.035)); },   // last 20 s
    alarm() { this._play((now) => { const t = now + 0.01;                        // time is up (00:00)
      for (let i = 0; i < 3; i++) { this.tone(988, t + i * 0.32, 0.16, 'triangle', 0.25); this.tone(740, t + i * 0.32 + 0.16, 0.14, 'triangle', 0.2); } }); },
    soft() { this._play((now) => { const t = now + 0.005;                        // gentle transition (level change)
      this.tone(660, t, 0.14, 'sine', 0.08); this.tone(880, t + 0.1, 0.18, 'sine', 0.06); }); }
  };

  ['pointerdown', 'touchend', 'click', 'keydown'].forEach((ev) =>
    quiet(() => root.addEventListener(ev, () => { if (Sound.enabled) Sound.unlock(); }, { capture: true, passive: true })));

  root.PCAudio = Sound;
})(window);
