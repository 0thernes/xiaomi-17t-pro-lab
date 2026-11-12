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

export function panel(title, children, extra) {
  return el("section", { class: "panel" }, [
    el("div", { class: "panel-head" }, [el("h2", {}, [title]), extra || null]),
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
