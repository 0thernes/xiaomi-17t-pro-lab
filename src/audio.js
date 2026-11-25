/**
 * Scientific WebAudio synthesizer, plus a lazy CC0 percussion layer.
 * Muted until the user turns sound on. Oscillators stay the score.
 * The three hits are Versilian Studios Chamber Orchestra Community Edition
 * (CC0), fetched only after sound is enabled. See vendor/audio/vsco-ce/NOTICE.md.
 */

const SAMPLE_URLS = [
  new URL("../vendor/audio/vsco-ce/claves_pp1.wav", import.meta.url),
  new URL("../vendor/audio/vsco-ce/snare_pp2.wav", import.meta.url),
  new URL("../vendor/audio/vsco-ce/shake8.wav", import.meta.url),
];

const DEGREES = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];

export function createAudio() {
  let context = null;
  let master = null;
  let timer = null;
  let step = 0;
  const nodes = [];
  let samples = null;
  let sampleLoad = null;

  function ensure() {
    if (context) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    context = new Ctx();
    master = context.createGain();
    master.gain.value = 0;
    const comp = context.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 2.6;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2800;
    master.connect(filter).connect(comp).connect(context.destination);

    // Subtle harmonic bed (soft triangle/saw harmonic drone)
    const bed = context.createGain();
    bed.gain.value = 0.032;
    for (const [freq, type] of [
      [73.42, "sawtooth"],
      [110.0, "triangle"],
      [146.83, "sine"],
    ]) {
      const osc = context.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      const gain = context.createGain();
      gain.gain.value = 0.2;
      osc.connect(gain).connect(bed);
      osc.start();
      nodes.push(osc);
    }
    bed.connect(master);
  }

  function loadSamples() {
    if (sampleLoad) return sampleLoad;
    sampleLoad = (async () => {
      const decoded = [];
      for (const url of SAMPLE_URLS) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`sample ${response.status}`);
        decoded.push(await context.decodeAudioData(await response.arrayBuffer()));
      }
      samples = decoded;
    })().catch(() => {
      samples = [];
    });
    return sampleLoad;
  }

  function schedule() {
    if (!context || master.gain.value === 0) return;
    const time = context.currentTime + 0.03;
    const freq = 196 * DEGREES[step % DEGREES.length];
    step += 1;
    const osc = context.createOscillator();
    osc.type = step % 4 === 0 ? "triangle" : "sine";
    osc.frequency.value = freq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.038, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
    const tone = context.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(950, time);
    tone.frequency.exponentialRampToValueAtTime(2600, time + 0.08);
    osc.connect(tone).connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.46);
    if (samples && samples.length && step % 4 === 0) {
      const buffer = samples[((step / 4) % samples.length) | 0];
      const hit = context.createBufferSource();
      hit.buffer = buffer;
      const gain = context.createGain();
      gain.gain.value = 0.12;
      hit.connect(gain).connect(master);
      hit.start(time);
    }
  }

  function tone(freqStart, freqEnd, dur = 0.14, peak = 0.05, type = "sine") {
    if (!context || master.gain.value === 0) return;
    const time = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(40, freqStart), time);
    if (freqEnd && freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), time + dur * 0.75);
    }
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(peak, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function blip(kind) {
    if (kind === "ok") tone(523.25, 784, 0.14, 0.055, "sine");
    else if (kind === "detent") tone(880, 440, 0.045, 0.03, "triangle");
    else if (kind === "nav") tone(392, 523.25, 0.09, 0.032, "sine");
    else tone(660, 330, 0.12, 0.045, "sine");
  }

  /** Scientific telemetry sonification (only audible when user enables Sound). */
  function sonify(kind, value = 0.5) {
    if (!context || master.gain.value === 0) return;
    const v = Math.max(0, Math.min(1, Number(value) || 0));
    if (kind === "quantum") {
      // Harmonic chord proportional to quantum probability / Bloch projection
      const root = 261.63 * (1 + v);
      tone(root, root * 1.25, 0.24, 0.042, "sine");
      tone(root * 1.5, root * 2.0, 0.28, 0.028, "triangle");
    } else if (kind === "thermal") {
      // Warm pitch glide proportional to die temperature
      const f = 140 + v * 520;
      tone(f, f * 0.92, 0.16, 0.04, v > 0.8 ? "sawtooth" : "triangle");
    } else if (kind === "dopamine") {
      // Glitchling foraging reward chime
      tone(587.33, 880, 0.15, 0.04, "sine");
    } else if (kind === "probe") {
      // 3D raycast part lock detent
      tone(740, 987.77, 0.06, 0.024, "sine");
    }
  }

  return {
    get muted() {
      return !context || master.gain.value === 0;
    },
    async toggle() {
      ensure();
      if (context.state === "suspended") await context.resume();
      const turningOn = master.gain.value === 0;
      master.gain.setTargetAtTime(turningOn ? 0.9 : 0, context.currentTime, 0.04);
      if (turningOn && !timer) timer = window.setInterval(schedule, 460);
      if (!turningOn && timer) {
        clearInterval(timer);
        timer = null;
      }
      if (turningOn) {
        master.gain.value = 0.9;
        void loadSamples();
        blip("ok");
      }
      return !turningOn;
    },
    blip,
    sonify,
    credits:
      "Live WebAudio oscillators, with three CC0 percussion hits from Versilian Studios Chamber Orchestra Community Edition (sgossner/VSCO-2-CE) loaded only after sound is turned on. The samples are not the Xiaomi ringtone.",
  };
}
