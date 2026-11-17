// All sound is synthesised with WebAudio: no audio files, no network. The
// context is created on the first player gesture (browsers block sound before
// one), and M toggles mute. Each effect is a short oscillator or noise burst.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;

  function ensure() {
    if (context !== null) {
      if (context.state === 'suspended') context.resume();
      return context;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    context = new AudioContext();
    master = context.createGain();
    master.gain.value = 0.22;
    master.connect(context.destination);
    return context;
  }

  function tone(freq, endFreq, duration, type, when) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const start = ctx.currentTime + (when ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFreq), start + duration);
    gain.gain.setValueAtTime(0.9, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  function splashNoise(duration) {
    const ctx = ensure();
    if (ctx === null || muted) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1) data[index] = (Math.random() * 2 - 1) * (1 - index / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.8, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  return {
    unlock() { ensure(); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
    pickup() { tone(880, 1320, 0.12, 'sine'); tone(1320, 1760, 0.1, 'sine', 0.07); },
    fish() { tone(523, 784, 0.14, 'triangle'); tone(784, 1046, 0.14, 'triangle', 0.09); tone(1046, 1568, 0.18, 'sine', 0.18); },
    heart() { tone(660, 660, 0.12, 'sine'); tone(880, 880, 0.16, 'sine', 0.1); },
    splash() { splashNoise(0.35); tone(220, 70, 0.3, 'sawtooth'); },
    horn() { tone(196, 196, 0.35, 'sawtooth'); tone(294, 294, 0.35, 'sawtooth', 0.02); },
    siren() { tone(740, 740, 0.22, 'square'); tone(988, 988, 0.22, 'square', 0.24); },
    mission() { tone(523, 523, 0.12, 'triangle'); tone(659, 659, 0.12, 'triangle', 0.1); tone(784, 784, 0.2, 'triangle', 0.2); },
    click() { tone(700, 500, 0.06, 'square'); },
    win() {
      const notes = [523, 659, 784, 1046, 784, 1046, 1318];
      for (let index = 0; index < notes.length; index += 1) tone(notes[index], notes[index], 0.22, 'triangle', index * 0.13);
    },
  };
}
