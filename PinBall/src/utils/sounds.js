class SoundManager {
  constructor() {
    this.audioContext = null;
    this.initialized = false;
    this.enabled = true;
  }

  init() {
    if (this.initialized) return;
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.initialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported');
      this.enabled = false;
    }
  }

  playTone(frequency, duration, type = 'sine', volume = 0.3, decay = true) {
    if (!this.enabled || !this.audioContext) return;

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      
      if (decay) {
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
      }

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
    }
  }

  playNoise(duration, volume = 0.2) {
    if (!this.enabled || !this.audioContext) return;

    try {
      const bufferSize = this.audioContext.sampleRate * duration;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      const filter = this.audioContext.createBiquadFilter();

      noise.buffer = buffer;
      filter.type = 'lowpass';
      filter.frequency.value = 1000;

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

      noise.start();
      noise.stop(this.audioContext.currentTime + duration);
    } catch (e) {
    }
  }

  flipperUp() {
    this.playTone(280, 0.08, 'square', 0.15);
  }

  flipperDown() {
    this.playTone(180, 0.06, 'square', 0.1);
  }

  bumperHit() {
    this.playTone(600, 0.1, 'square', 0.25);
    setTimeout(() => this.playTone(800, 0.08, 'sine', 0.2), 30);
  }

  slingshotHit() {
    this.playTone(400, 0.1, 'triangle', 0.2);
    setTimeout(() => this.playTone(500, 0.08, 'triangle', 0.15), 20);
  }

  targetHit() {
    this.playTone(520, 0.15, 'sine', 0.25);
    setTimeout(() => this.playTone(650, 0.1, 'sine', 0.2), 50);
    setTimeout(() => this.playTone(780, 0.08, 'sine', 0.15), 100);
  }

  rollover() {
    this.playTone(440, 0.1, 'sine', 0.15);
  }

  wallBounce() {
    this.playNoise(0.05, 0.08);
  }

  plungerCharge() {
    this.playTone(150, 0.1, 'sine', 0.05);
  }

  plungerRelease() {
    this.playTone(200, 0.15, 'sawtooth', 0.2);
    setTimeout(() => this.playTone(350, 0.1, 'sine', 0.15), 30);
  }

  drain() {
    this.playTone(200, 0.3, 'sine', 0.3);
    setTimeout(() => this.playTone(150, 0.3, 'sine', 0.25), 100);
    setTimeout(() => this.playTone(100, 0.4, 'sine', 0.2), 200);
  }

  gameOver() {
    const notes = [400, 350, 300, 250, 200];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.3, 'sine', 0.25 - i * 0.03), i * 150);
    });
  }

  scoreMultiplier() {
    this.playTone(600, 0.1, 'sine', 0.2);
    setTimeout(() => this.playTone(750, 0.1, 'sine', 0.2), 80);
    setTimeout(() => this.playTone(900, 0.15, 'sine', 0.25), 160);
  }

  allTargets() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playTone(freq, 0.2, 'sine', 0.25), i * 100);
    });
  }

  startGame() {
    this.playTone(400, 0.15, 'sine', 0.2);
    setTimeout(() => this.playTone(500, 0.15, 'sine', 0.2), 100);
    setTimeout(() => this.playTone(600, 0.2, 'sine', 0.25), 200);
  }

  launchReady() {
    this.playTone(300, 0.1, 'sine', 0.15);
    setTimeout(() => this.playTone(400, 0.1, 'sine', 0.15), 80);
  }
}

const soundManager = new SoundManager();
export default soundManager;
