/**
 * sound.js - SoundManager using Web Audio API for synthesized SFX
 * No dependencies. All 16 sound effects synthesized.
 */

var SoundManager = (function() {
  var ctx = null;
  var enabled = true;
  var initialized = false;

  function init() {
    if (initialized) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
    }
  }

  function resume() {
    if (ctx && ctx.state === 'suspended') {
      ctx.resume();
    }
  }

  function ensureContext() {
    if (!ctx) init();
    if (!ctx) return false;
    resume();
    return true;
  }

  // Helper: play a tone
  function playTone(freq, duration, type, volume, startDelay) {
    if (!ensureContext() || !enabled) return;
    startDelay = startDelay || 0;
    volume = volume !== undefined ? volume : 0.15;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startDelay);
    osc.stop(ctx.currentTime + startDelay + duration);
  }

  // Helper: play noise burst
  function playNoise(duration, volume, startDelay) {
    if (!ensureContext() || !enabled) return;
    startDelay = startDelay || 0;
    volume = volume || 0.05;
    var bufferSize = ctx.sampleRate * duration;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    var source = ctx.createBufferSource();
    source.buffer = buffer;
    var gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime + startDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startDelay + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime + startDelay);
  }

  // === SFX Definitions ===

  function sfx_select() {
    // Short crisp click - bright high "ding"
    playTone(1200, 0.08, 'sine', 0.15);
    playTone(1800, 0.06, 'sine', 0.08, 0.02);
  }

  function sfx_swap() {
    // Light swoosh slide
    if (!ensureContext() || !enabled) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.12);
  }

  function sfx_invalid_swap() {
    // Low rejection buzz - two short buzzes
    playTone(150, 0.08, 'square', 0.08);
    playTone(120, 0.08, 'square', 0.08, 0.1);
  }

  function sfx_match_3() {
    // Rising three-note "ding ding ding"
    playTone(523, 0.1, 'sine', 0.12);      // C5
    playTone(659, 0.1, 'sine', 0.12, 0.08); // E5
    playTone(784, 0.12, 'sine', 0.12, 0.16); // G5
  }

  function sfx_match_4() {
    // Brighter four notes, higher pitch, sparkle tail
    playTone(659, 0.08, 'sine', 0.14);      // E5
    playTone(784, 0.08, 'sine', 0.14, 0.06); // G5
    playTone(988, 0.08, 'sine', 0.14, 0.12); // B5
    playTone(1175, 0.15, 'sine', 0.1, 0.18); // D6 - sparkle tail
  }

  function sfx_match_5() {
    // Gorgeous rising arpeggio with shimmer
    playTone(523, 0.06, 'sine', 0.12);       // C5
    playTone(659, 0.06, 'sine', 0.12, 0.05); // E5
    playTone(784, 0.06, 'sine', 0.12, 0.10); // G5
    playTone(1047, 0.06, 'sine', 0.12, 0.15);// C6
    playTone(1319, 0.2, 'sine', 0.1, 0.20);  // E6 - shimmer
    playTone(1568, 0.25, 'triangle', 0.06, 0.22); // G6 - overtone
  }

  function sfx_cascade(level) {
    // Each cascade goes up in pitch: C, D, E, F, G, A, B
    var notes = [523, 587, 659, 698, 784, 880, 988];
    level = Math.min(level || 0, notes.length - 1);
    playTone(notes[level], 0.15, 'sine', 0.12);
    playTone(notes[level] * 1.5, 0.1, 'triangle', 0.06, 0.05);
  }

  function sfx_combo() {
    // Bright chord + sparkle
    playTone(784, 0.15, 'sine', 0.1);       // G5
    playTone(988, 0.15, 'sine', 0.1);       // B5
    playTone(1175, 0.15, 'sine', 0.1);      // D6
    playTone(1568, 0.2, 'triangle', 0.06, 0.1); // sparkle
  }

  function sfx_special_create() {
    // Rising magic sound + sparkle bell
    if (!ensureContext() || !enabled) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1600, ctx.currentTime + 0.25);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    // Sparkle bell
    playTone(2000, 0.15, 'sine', 0.08, 0.2);
    playTone(2400, 0.1, 'sine', 0.05, 0.25);
  }

  function sfx_special_activate() {
    // Powerful energy burst
    if (!ensureContext() || !enabled) return;
    var osc = ctx.createOscillator();
    var gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1000, ctx.currentTime + 0.15);
    osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
    playNoise(0.15, 0.04);
  }

  function sfx_veggie_fall() {
    // Soft landing "doo"
    playTone(300, 0.06, 'sine', 0.06);
  }

  function sfx_star_earn() {
    // Victory bell rising arpeggio
    playTone(880, 0.1, 'sine', 0.12);
    playTone(1109, 0.1, 'sine', 0.12, 0.08);
    playTone(1319, 0.15, 'sine', 0.12, 0.16);
  }

  function sfx_level_complete() {
    // Celebratory ascending chord sequence + final bell
    playTone(523, 0.12, 'sine', 0.1);        // C5
    playTone(659, 0.12, 'sine', 0.1, 0.1);   // E5
    playTone(784, 0.12, 'sine', 0.1, 0.2);   // G5
    playTone(1047, 0.12, 'sine', 0.1, 0.3);  // C6
    // Chord
    playTone(1047, 0.3, 'sine', 0.08, 0.4);
    playTone(1319, 0.3, 'sine', 0.08, 0.4);
    playTone(1568, 0.3, 'sine', 0.08, 0.4);
    // Bell
    playTone(2093, 0.4, 'triangle', 0.05, 0.5);
  }

  function sfx_level_failed() {
    // Gentle descending tone, not harsh
    playTone(440, 0.2, 'sine', 0.08);
    playTone(349, 0.2, 'sine', 0.08, 0.15);
    playTone(262, 0.3, 'sine', 0.06, 0.3);
  }

  function sfx_button_click() {
    // Short cartoon button "pip"
    playTone(800, 0.05, 'sine', 0.1);
    playTone(1000, 0.04, 'sine', 0.06, 0.02);
  }

  function sfx_no_moves() {
    // Urgent two-beep warning
    playTone(600, 0.08, 'square', 0.08);
    playTone(600, 0.08, 'square', 0.08, 0.12);
  }

  // === Public API ===
  return {
    init: init,
    resume: resume,

    get enabled() { return enabled; },
    set enabled(val) { enabled = val; },

    toggle: function() {
      enabled = !enabled;
      return enabled;
    },

    play: function(sfxId, param) {
      if (!enabled) return;
      if (!ensureContext()) return;
      switch (sfxId) {
        case 'select':           sfx_select(); break;
        case 'swap':             sfx_swap(); break;
        case 'invalid_swap':     sfx_invalid_swap(); break;
        case 'match_3':          sfx_match_3(); break;
        case 'match_4':          sfx_match_4(); break;
        case 'match_5':          sfx_match_5(); break;
        case 'cascade':          sfx_cascade(param); break;
        case 'combo':            sfx_combo(); break;
        case 'special_create':   sfx_special_create(); break;
        case 'special_activate': sfx_special_activate(); break;
        case 'veggie_fall':      sfx_veggie_fall(); break;
        case 'star_earn':        sfx_star_earn(); break;
        case 'level_complete':   sfx_level_complete(); break;
        case 'level_failed':     sfx_level_failed(); break;
        case 'click':            sfx_button_click(); break;
        case 'warning':          sfx_no_moves(); break;
        default:
          console.warn('Unknown SFX:', sfxId);
      }
    }
  };
})();
