export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value == null || value === false) continue;
    if (key === "class") node.className = value;
    else if (key === "dataset") Object.assign(node.dataset, value);
    else if (key.startsWith("on") && typeof value === "function") {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? "" : String(value));
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  const list = Array.isArray(children) ? children : [children];
  for (const child of list) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

export function panel(title, children, extra, kicker) {
  const headLeft = kicker
    ? el("div", {}, [el("span", { class: "panel-kicker" }, [kicker]), el("h2", {}, [title])])
    : el("h2", {}, [title]);
  return el("section", { class: "panel" }, [
    el("div", { class: "panel-head" }, [headLeft, extra || null]),
    ...[].concat(children || []),
  ]);
}

export function note(text) {
  return el("p", { class: "note" }, [text]);
}

export function kv(label, value) {
  const valueNode = value instanceof Node ? value : el("span", {}, [value == null ? "UNKNOWN" : String(value)]);
  return el("div", { class: "kv" }, [
    el("div", { class: "kv-label" }, [label]),
    el("div", { class: "kv-value" }, [valueNode]),
  ]);
}

export function readout(label, value, unit = "", { tone = "", sub = "" } = {}) {
  const valEl = el("div", { class: "readout-value" }, [
    value instanceof Node ? value : String(value),
    unit ? el("small", {}, [unit]) : null,
  ]);
  return el("div", { class: `readout-card${tone ? ` ${tone}` : ""}` }, [
    el("span", { class: "readout-label" }, [label]),
    valEl,
    sub ? el("span", { class: "readout-sub" }, [sub]) : null,
  ]);
}

export function readoutGrid(cards) {
  return el("div", { class: "readout-grid" }, cards);
}

/** Tactile range slider with live orange track fill and tabular output chip. */
export function rangeControl(label, min, max, step, value, formatOut = (v) => String(v)) {
  const input = el("input", {
    type: "range",
    min: String(min),
    max: String(max),
    step: String(step),
    value: String(value),
    "aria-label": label,
  });
  const output = el("output", {}, [formatOut(value)]);
  const sync = () => {
    const pct = ((Number(input.value) - min) / Math.max(1e-12, max - min)) * 100;
    input.style.setProperty("--fill", `${Math.max(0, Math.min(100, pct))}%`);
    output.textContent = formatOut(Number(input.value));
  };
  sync();
  input.addEventListener("input", sync);
  return {
    node: el("label", { class: "slider" }, [el("span", {}, [label]), output, input]),
    input,
    output,
    sync,
  };
}
