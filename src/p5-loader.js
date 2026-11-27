let pending = null;

export function loadP5() {
  if (globalThis.p5) return Promise.resolve(globalThis.p5);
  if (!pending) {
    // Prevent p5.js 2.4.0 FES from probing ./<lang>.json and cdn.jsdelivr.net on first load
    try {
      const key = `${navigator.language || "en-US"}-2.4.0`;
      if (!window.localStorage.getItem(key)) window.localStorage.setItem(key, "{}");
    } catch {
      /* localStorage disabled */
    }
    pending = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = new URL("../vendor/p5/p5.min.js", import.meta.url).href;
      script.async = true;
      script.onload = () => {
        if (globalThis.p5) globalThis.p5.disableFriendlyErrors = true;
        resolve(globalThis.p5);
      };
      script.onerror = () => reject(new Error("p5.js did not load"));
      document.head.append(script);
    });
  }
  return pending;
}

/**
 * Instance-mode p5.js sketch with HiDPI crispness, ResizeObserver reflow,
 * optional continuous animation (`loop: true`) with automatic visibility &
 * offscreen IntersectionObserver pause (0% idle CPU burn), and pointer support.
 */
export async function mountSketch(host, draw, options = {}) {
  const p5 = await loadP5();
  const height = options.height || 280;
  const loop = Boolean(options.loop);
  let api = null;
  let observer = null;
  let ioObserver = null;
  let tabVisible = typeof document === "undefined" ? true : !document.hidden;
  let inViewport = true;
  let disposed = false;

  const sketch = (p) => {
    p.setup = () => {
      const width = Math.max(260, Math.floor(host.clientWidth || 360));
      p.createCanvas(width, height);
      p.pixelDensity(Math.min(window.devicePixelRatio || 1, 2));
      if (!loop) p.noLoop();
      else {
        p.frameRate(options.fps || 60);
        if (!tabVisible || !inViewport) p.noLoop();
      }
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

  function syncLoopState() {
    if (!loop || disposed || !instance._setupDone) return;
    if (tabVisible && inViewport) instance.loop();
    else instance.noLoop();
  }

  function onVisibility() {
    tabVisible = !document.hidden;
    syncLoopState();
  }

  if (loop) {
    document.addEventListener("visibilitychange", onVisibility);
    if (typeof IntersectionObserver !== "undefined") {
      ioObserver = new IntersectionObserver(
        (entries) => {
          inViewport = entries.some((e) => e.isIntersecting);
          syncLoopState();
        },
        { rootMargin: "60px", threshold: 0.01 },
      );
      ioObserver.observe(host);
    }
  }

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
      disposed = true;
      observer?.disconnect();
      ioObserver?.disconnect();
      if (loop) document.removeEventListener("visibilitychange", onVisibility);
      instance.remove();
    },
  };
}
