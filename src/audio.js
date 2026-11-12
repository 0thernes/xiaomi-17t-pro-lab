/**
 * Live score and UI blips. Muted until the listener presses the toggle.
 * Oscillators only — nothing is sampled from a recording.
 */

export function createAudio() {
  let context = null;
  let master = null;
  let muted = true;
  let timer = null;
  let step = 0;

  function ensure() {
    if (context) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    context = new Ctx();
    master = context.createGain();
    master.gain.value = 0;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 18;
    compressor.ratio.value = 3;
    master.connect(compressor).connect(context.destination);
    const droneA = tone(55, "sawtooth", 0.03);
    const droneB = tone(82.5, "sawtooth", 0.02);
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 420;
    droneA.connect(filter);
    droneB.connect(filter);
    filter.connect(master);
  }

  function tone(freq, type, gainValue) {
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = context.createGain();
    gain.gain.value = gainValue;
    osc.connect(gain);
    osc.start();
    return gain;
  }

  function schedule() {
    if (!context || muted) return;
    const time = context.currentTime + 0.05;
    const degree = [1, 5 / 4, 3 / 2, 2, 3 / 2, 5 / 4][step % 6];
    step += 1;
    const osc = context.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 196 * degree;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.07, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.38);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.42);
  }

  function blip(kind) {
    if (!context || muted) return;
    const time = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    if (kind === "ok") {
      osc.frequency.setValueAtTime(523, time);
      osc.frequency.setValueAtTime(784, time + 0.08);
    } else {
      osc.frequency.setValueAtTime(640, time);
      osc.frequency.exponentialRampToValueAtTime(320, time + 0.06);
    }
    osc.type = "sine";
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.05, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.14);
  }

  return {
    get muted() {
      return muted;
    },
    async toggle() {
      ensure();
      if (context.state === "suspended") await context.resume();
      muted = !muted;
      master.gain.setTargetAtTime(muted ? 0 : 0.9, context.currentTime, 0.03);
      if (!muted && !timer) timer = window.setInterval(schedule, 750);
      if (muted && timer) {
        clearInterval(timer);
        timer = null;
      }
      if (!muted) blip("ok");
      return muted;
    },
    blip,
  };
}
