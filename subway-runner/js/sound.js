/**
 * Subway Runner - Sound Manager
 * Handles all audio: synthesized SFX via Web Audio API and BGM file loading
 */

class SoundManager {
    constructor() {
        this.audioContext = null;
        this.isUnlocked = false;
        this.bgm = null;
        this.bgmLoaded = false;
        this.isMuted = false;

        // Pre-define sound parameters for synthesized effects
        this.soundDefs = {
            jump: { type: 'square', freq: 300, endFreq: 600, duration: 0.15, volume: 0.3 },
            land: { type: 'triangle', freq: 150, endFreq: 100, duration: 0.1, volume: 0.2 },
            slide: { type: 'sawtooth', freq: 80, endFreq: 60, duration: 0.2, volume: 0.15 },
            coin: { type: 'sine', freq: 800, endFreq: 1200, duration: 0.1, volume: 0.25 },
            collision: { type: 'square', freq: 200, endFreq: 50, duration: 0.3, volume: 0.4 },
            gameover: { type: 'sawtooth', freq: 400, endFreq: 100, duration: 0.5, volume: 0.35 },
            click: { type: 'sine', freq: 600, endFreq: 800, duration: 0.05, volume: 0.2 },
            highscore: { type: 'sine', freq: 500, endFreq: 1000, duration: 0.4, volume: 0.3, arpeggio: true }
        };
    }

    /**
     * Initialize audio context (must be called after user interaction)
     */
    init() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.loadBGM();
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    /**
     * Unlock audio context (call on first user interaction)
     */
    unlock() {
        if (this.isUnlocked) return;

        this.init();

        if (this.audioContext && this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.isUnlocked = true;
            });
        } else {
            this.isUnlocked = true;
        }
    }

    /**
     * Load background music
     */
    loadBGM() {
        this.bgm = new Audio(CONFIG.audio.bgmPath);
        this.bgm.loop = true;
        this.bgm.volume = CONFIG.audio.bgmVolume;

        this.bgm.addEventListener('canplaythrough', () => {
            this.bgmLoaded = true;
        });

        this.bgm.addEventListener('error', () => {
            // BGM file not found - silently fail
            console.log('BGM file not found, continuing without music');
            this.bgmLoaded = false;
        });

        // Attempt to load
        this.bgm.load();
    }

    /**
     * Play BGM
     */
    playBGM() {
        if (this.isMuted || !this.bgm || !this.bgmLoaded) return;

        this.bgm.currentTime = 0;
        this.bgm.play().catch(() => {
            // Autoplay blocked, will try again on next interaction
        });
    }

    /**
     * Pause BGM
     */
    pauseBGM() {
        if (this.bgm) {
            this.bgm.pause();
        }
    }

    /**
     * Resume BGM
     */
    resumeBGM() {
        if (this.isMuted || !this.bgm || !this.bgmLoaded) return;

        this.bgm.play().catch(() => {});
    }

    /**
     * Stop BGM
     */
    stopBGM() {
        if (this.bgm) {
            this.bgm.pause();
            this.bgm.currentTime = 0;
        }
    }

    /**
     * Play a synthesized sound effect
     * @param {string} name - Sound name (jump, land, slide, coin, collision, gameover, click, highscore)
     */
    play(name) {
        if (this.isMuted || !this.audioContext || !this.isUnlocked) return;

        const def = this.soundDefs[name];
        if (!def) return;

        try {
            if (def.arpeggio) {
                this.playArpeggio(def);
            } else {
                this.playSynthSound(def);
            }
        } catch (e) {
            console.warn('Error playing sound:', e);
        }
    }

    /**
     * Play a simple synthesized tone
     */
    playSynthSound(def) {
        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Create oscillator
        const osc = ctx.createOscillator();
        osc.type = def.type;
        osc.frequency.setValueAtTime(def.freq, now);
        osc.frequency.linearRampToValueAtTime(def.endFreq, now + def.duration);

        // Create gain for envelope
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(def.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + def.duration);

        // Connect and play
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + def.duration + 0.1);
    }

    /**
     * Play an arpeggio sound (for highscore)
     */
    playArpeggio(def) {
        const ctx = this.audioContext;
        const now = ctx.currentTime;
        const notes = [1, 1.25, 1.5, 2]; // Major chord ratios

        notes.forEach((ratio, i) => {
            const osc = ctx.createOscillator();
            osc.type = def.type;
            const noteFreq = def.freq * ratio;
            const noteTime = now + i * 0.1;

            osc.frequency.setValueAtTime(noteFreq, noteTime);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now);
            gain.gain.setValueAtTime(def.volume, noteTime);
            gain.gain.exponentialRampToValueAtTime(0.01, noteTime + 0.15);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(noteTime);
            osc.stop(noteTime + 0.2);
        });
    }

    /**
     * Toggle mute
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.isMuted) {
            this.pauseBGM();
        }
        return this.isMuted;
    }

    /**
     * Set mute state
     */
    setMute(muted) {
        this.isMuted = muted;
        if (this.isMuted) {
            this.pauseBGM();
        }
    }
}

// Create global sound manager instance
const soundManager = new SoundManager();
