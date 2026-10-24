let audio = null;
let master = null;
let muted = false;
let music = false;
let whirr = null;
let timer = null;
let beat = 0;
let step = 0;
const random = (min, max) => min + Math.random() * (max - min);
const pitch = (midi) => 440 * Math.pow(2, (midi - 69) / 12);
function live() {
  return audio && audio.context.state === "running" ? audio : null;
}
function envelope(context, at, gain, length, attack) {
  const amp = context.createGain();
  amp.gain.value = 0.0001;
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(gain, at + attack);
  amp.gain.exponentialRampToValueAtTime(0.0001, at + length);
  return amp;
}
function note(bus, at, frequency, length, gain, type = "square", glide, attack = 0.004, wobble = 0) {
  const { context } = audio;
  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, at);
  if (glide) oscillator.frequency.exponentialRampToValueAtTime(glide, at + length);
  const amp = envelope(context, at, gain, length, attack);
  oscillator.connect(amp).connect(bus);
  oscillator.start(at);
  oscillator.stop(at + length + 0.05);
  if (wobble) {
    const lfo = context.createOscillator();
    const depth = context.createGain();
    lfo.frequency.value = 6;
    depth.gain.value = wobble;
    lfo.connect(depth).connect(oscillator.frequency);
    lfo.start(at);
    lfo.stop(at + length + 0.05);
  }
}
function hiss(bus, at, length, gain, frequency, type = "bandpass", to, attack = 0.004, q = 1) {
  const { context, noise } = audio;
  const source = context.createBufferSource();
  source.buffer = noise;
  const filter = context.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(frequency, at);
  if (to) filter.frequency.exponentialRampToValueAtTime(to, at + length);
  const amp = envelope(context, at, gain, length, attack);
  source.connect(filter).connect(amp).connect(bus);
  source.start(at, Math.random() * 1.5, length + 0.05);
}
function boing(bus, at) {
  const { context } = audio;
  for (const [type, gain] of [
    ["triangle", 0.14],
    ["square", 0.025],
  ]) {
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(190, at);
    oscillator.frequency.exponentialRampToValueAtTime(470, at + 0.07);
    oscillator.frequency.exponentialRampToValueAtTime(130, at + 0.62);
    const lfo = context.createOscillator();
    const depth = context.createGain();
    lfo.frequency.value = 17;
    depth.gain.value = 0;
    depth.gain.setValueAtTime(0, at);
    depth.gain.linearRampToValueAtTime(34, at + 0.12);
    depth.gain.linearRampToValueAtTime(6, at + 0.62);
    lfo.connect(depth).connect(oscillator.frequency);
    const amp = envelope(context, at, gain, 0.66, 0.006);
    oscillator.connect(amp).connect(bus);
    oscillator.start(at);
    lfo.start(at);
    oscillator.stop(at + 0.7);
    lfo.stop(at + 0.7);
  }
}
function startWhirr(at) {
  const { context, effects } = audio;
  stopWhirr(at);
  const oscillator = context.createOscillator();
  oscillator.type = "sawtooth";
  oscillator.frequency.value = 118;
  const lfo = context.createOscillator();
  lfo.frequency.value = 7;
  const depth = context.createGain();
  depth.gain.value = 16;
  lfo.connect(depth).connect(oscillator.frequency);
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 760;
  filter.Q.value = 3;
  const amp = context.createGain();
  amp.gain.value = 0.0001;
  amp.gain.setValueAtTime(0.0001, at);
  amp.gain.exponentialRampToValueAtTime(0.03, at + 0.25);
  oscillator.connect(filter).connect(amp).connect(effects);
  oscillator.start(at);
  lfo.start(at);
  whirr = { amp, nodes: [oscillator, lfo] };
}
function stopWhirr(at) {
  if (!whirr) return;
  whirr.amp.gain.cancelScheduledValues(at);
  whirr.amp.gain.setTargetAtTime(0.0001, at, 0.08);
  for (const node of whirr.nodes) node.stop(at + 0.5);
  whirr = null;
}
const chords = [
  [53, 57, 60, 64],
  [52, 55, 59, 62],
  [50, 53, 57, 60],
  [48, 52, 55, 59],
];
const arp = [0, 1, 2, 3, 2, 1, 2, 3];
const eighth = 60 / 82 / 2;
function schedule() {
  const sound = live();
  if (!sound || !music) return;
  const { context, band } = sound;
  if (beat < context.currentTime) beat = context.currentTime + 0.05;
  while (beat < context.currentTime + 0.25) {
    const chord = chords[Math.floor(step / 8) % chords.length];
    const position = step % 8;
    const at = beat + (position % 2 ? eighth * 0.16 : 0);
    note(band, at, pitch(chord[arp[position]] + 12), eighth * 0.9, 0.022, "square", undefined, 0.008);
    if (position === 0 || position === 4) note(band, at, pitch(chord[0] - 12), eighth * 3.2, 0.07, "triangle", undefined, 0.01);
    if (position === 6) note(band, at, pitch(chord[0]), eighth * 1.4, 0.04, "triangle", undefined, 0.01);
    if (position === 0 || position === 5) note(band, at, 120, 0.16, 0.12, "sine", 46, 0.002);
    if (position % 4 === 2) hiss(band, at, 0.04, 0.014, 7400, "highpass");
    if (position === 4) hiss(band, at, 0.11, 0.022, 1800, "bandpass", undefined, 0.002, 0.8);
    beat += eighth;
    step++;
  }
}
export const sound = {
  wake() {
    if (!audio) {
      const context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.9;
      const warm = context.createBiquadFilter();
      warm.type = "lowpass";
      warm.frequency.value = 5200;
      master.connect(warm).connect(context.destination);
      const effects = context.createGain();
      effects.connect(master);
      const band = context.createGain();
      band.gain.value = 0.7;
      const tape = context.createBiquadFilter();
      tape.type = "lowpass";
      tape.frequency.value = 2300;
      band.connect(tape).connect(master);
      const noise = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = noise.getChannelData(0);
      for (let index = 0; index < data.length; index++) data[index] = Math.random() * 2 - 1;
      audio = { context, effects, band, noise };
    }
    if (audio.context.state === "suspended") void audio.context.resume();
  },
  setMuted(value) {
    muted = value;
    if (audio && master) master.gain.setTargetAtTime(value ? 0 : 0.9, audio.context.currentTime, 0.04);
  },
  setMusic(value) {
    music = value;
    if (timer) clearInterval(timer);
    timer = null;
    if (value) {
      step = 0;
      beat = 0;
      timer = setInterval(schedule, 60);
    }
  },
  stop() {
    sound.setMusic(false);
    const ready = live();
    if (ready) stopWhirr(ready.context.currentTime);
  },
  cue(name) {
    const ready = live();
    if (!ready) return;
    const { context, effects } = ready;
    const at = context.currentTime + 0.03;
    switch (name) {
      case "key":
        note(effects, at, random(1500, 2300), 0.022, 0.024, "square");
        hiss(effects, at, 0.016, 0.014, 5200, "highpass");
        break;
      case "blip":
        note(effects, at, 660, 0.06, 0.05, "square", 990);
        note(effects, at + 0.07, 1320, 0.08, 0.035, "square");
        break;
      case "wake":
        [523, 784, 1047].forEach((frequency, index) => note(effects, at + index * 0.06, frequency, 0.08, 0.03, "square"));
        note(effects, at + 0.2, 1568, 0.16, 0.022, "square");
        break;
      case "boing":
        boing(effects, at);
        break;
      case "sigh":
        hiss(effects, at, 0.75, 0.05, 1200, "bandpass", 360, 0.16, 0.9);
        break;
      case "bell":
        note(effects, at, 1568, 0.32, 0.05, "square", undefined, 0.002);
        note(effects, at, 3136, 0.8, 0.03, "triangle", undefined, 0.002);
        note(effects, at + 0.14, 2093, 0.3, 0.045, "square", undefined, 0.002);
        note(effects, at + 0.14, 4186, 0.7, 0.02, "triangle", undefined, 0.002);
        break;
      case "fanfare":
        [523, 659, 784, 1047].forEach((frequency, index) => note(effects, at + index * 0.085, frequency, 0.11, 0.055, "square"));
        note(effects, at + 0.34, 1047, 0.55, 0.055, "square", undefined, 0.006, 9);
        note(effects, at + 0.34, 1319, 0.55, 0.035, "square", undefined, 0.006, 9);
        [262, 392, 523].forEach((frequency, index) => note(effects, at + index * 0.12, frequency, 0.16, 0.06, "triangle"));
        hiss(effects, at + 0.34, 0.3, 0.02, 6000, "highpass");
        break;
      case "yawn":
        note(effects, at, 560, 0.95, 0.045, "triangle", 260, 0.12, 14);
        break;
      case "snore":
        hiss(effects, at, 1.3, 0.13, 420, "lowpass", 300, 0.7, 2.5);
        note(effects, at + 0.1, 82, 1.2, 0.06, "triangle", 70, 0.6);
        note(effects, at + 1.6, 940, 0.45, 0.025, "sine", 620, 0.1);
        break;
      case "whirr":
        startWhirr(at);
        break;
      case "spin":
        note(effects, at, 300, 0.28, 0.03, "square", 1100, 0.01);
        hiss(effects, at, 0.3, 0.025, 1200, "bandpass", 5200, 0.05);
        break;
      case "quiet":
        stopWhirr(at);
        break;
    }
  },
};
