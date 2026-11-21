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

/**
 * Instance-mode p5.js sketch with HiDPI crispness, ResizeObserver reflow,
 * optional continuous animation (`loop: true`), and pointer support.
 */
export async function mountSketch(host, draw, options = {}) {
  const p5 = await loadP5();
  const height = options.height || 280;
  const loop = Boolean(options.loop);
  let api = null;
  let observer = null;

  const sketch = (p) => {
    p.setup = () => {
      const width = Math.max(260, Math.floor(host.clientWidth || 360));
      p.createCanvas(width, height);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      if (!loop) p.noLoop();
      else p.frameRate(options.fps || 60);
      api?.redraw?.();
    };
    p.draw = () => {
      if (api) draw(p, api.state);
    };
    if (options.mousePressed) {
      p.mousePressed = () => options.mousePressed(p, api?.state);
    }
    if (options.mouseDragged) {
      p.mouseDragged = () => options.mouseDragged(p, api?.state);
    }
    p.windowResized = () => {
      const width = Math.max(260, Math.floor(host.clientWidth || 360));
      if (width !== p.width) {
        p.resizeCanvas(width, height);
        if (!loop) p.redraw();
      }
    };
  };

  const instance = new p5(sketch, host);
  if (typeof ResizeObserver !== "undefined") {
    observer = new ResizeObserver(() => {
      if (!instance._setupDone) return;
      const width = Math.max(260, Math.floor(host.clientWidth || 360));
      if (Math.abs(width - instance.width) >= 2) {
        instance.resizeCanvas(width, height);
        if (!loop) instance.redraw();
      }
    });
    observer.observe(host);
  }

  api = {
    state: options.initialState || {},
    setState(next) {
      api.state = next;
      if (loop) return;
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
      if (instance._setupDone && !loop) instance.redraw();
    },
  };

  return {
    setState: (next) => api.setState(next),
    get state() {
      return api.state;
    },
    dispose() {
      observer?.disconnect();
      instance.remove();
    },
  };
}
