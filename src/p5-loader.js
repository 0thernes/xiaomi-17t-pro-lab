let pending = null;

export function loadP5() {
  if (globalThis.p5) return Promise.resolve(globalThis.p5);
  if (!pending) {
    pending = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("../vendor/p5/p5.min.js", import.meta.url).href;
      script.async = true;
      script.onload = () => resolve(globalThis.p5);
      script.onerror = () => reject(new Error("p5.js did not load"));
      document.head.append(script);
    });
  }
  return pending;
}

/** Instance-mode sketch. The host element is cleared when disposed. */
export async function mountSketch(host, draw) {
  const p5 = await loadP5();
  let api = null;
  const sketch = (p) => {
    p.setup = () => {
      const width = Math.max(280, host.clientWidth || 320);
      p.createCanvas(width, 280);
      p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
      p.noLoop();
      api?.redraw?.();
    };
    p.draw = () => {
      if (api) draw(p, api.state);
    };
    p.windowResized = () => {
      const width = Math.max(280, host.clientWidth || 320);
      p.resizeCanvas(width, 280);
      p.redraw();
    };
  };
  const instance = new p5(sketch, host);
  api = {
    state: {},
    setState(next) {
      api.state = next;
      const paint = () => {
        try {
          instance.redraw();
        } catch {
          /* setup has not finished */
        }
      };
      if (instance._setupDone) paint();
      else requestAnimationFrame(paint);
    },
    redraw() {
      if (instance._setupDone) instance.redraw();
    },
  };
  return {
    setState: (next) => api.setState(next),
    dispose() {
      instance.remove();
    },
  };
}
