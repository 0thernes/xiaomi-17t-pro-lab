/**
 * Launch score. Original synthesis: detuned saw strings, a pentatonic pulse,
 * and a filtered-noise breath. Muted until the listener turns it on.
 * No sampled recording is shipped. A CC0/CC-BY instrument file is included
 * only when the file and its credit can be matched exactly; none met that bar
 * in this build, so the score does not pretend to be a sample library.
 */

const DEGREES = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];

export function createAudio() {
  let context = null;
  let master = null;
  let timer = null;
  let step = 0;
  const nodes = [];

  function ensure() {
    if (context) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    context = new Ctx();
    master = context.createGain();
    master.gain.value = 0;
    const comp = context.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 2.4;
    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2400;
    master.connect(filter).connect(comp).connect(context.destination);
    const bed = context.createGain();
    bed.gain.value = 0.04;
    for (const [freq, type] of [
      [73.4, "sawtooth"],
      [110, "sawtooth"],
      [146.8, "triangle"],
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

  function schedule() {
    if (!context || master.gain.value === 0) return;
    const time = context.currentTime + 0.03;
    const freq = 196 * DEGREES[step % DEGREES.length];
    step += 1;
    const osc = context.createOscillator();
    osc.type = step % 4 === 0 ? "square" : "triangle";
    osc.frequency.value = freq;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.045, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.42);
    const tone = context.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.setValueAtTime(900, time);
    tone.frequency.exponentialRampToValueAtTime(2800, time + 0.08);
    osc.connect(tone).connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.46);
  }

  function blip(kind) {
    if (!context || master.gain.value === 0) return;
    const time = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    if (kind === "ok") {
      osc.frequency.setValueAtTime(523.25, time);
      osc.frequency.exponentialRampToValueAtTime(784, time + 0.08);
    } else {
      osc.frequency.setValueAtTime(660, time);
      osc.frequency.exponentialRampToValueAtTime(330, time + 0.07);
    }
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.exponentialRampToValueAtTime(0.05, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.14);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.16);
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
      if (turningOn && !timer) timer = window.setInterval(schedule, 420);
      if (!turningOn && timer) {
        clearInterval(timer);
        timer = null;
      }
      if (turningOn) {
        master.gain.value = 0.9;
        blip("ok");
      }
      return !turningOn;
    },
    blip,
    credits:
      "Original WebAudio score for this lab (saw, triangle, square, noise-free pentatonic pulse in G). No third-party sample file is bundled.",
  };
}
