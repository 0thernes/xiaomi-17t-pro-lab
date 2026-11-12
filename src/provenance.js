import { el } from "./dom.js";

export function badge(kind, label) {
  return el("span", { class: `badge badge-${kind}` }, [label]);
}

export function provMeasured(detail) {
  return el("span", { class: "prov" }, [
    badge("measured", "MEASURED"),
    detail ? el("span", { class: "formula" }, [detail]) : null,
  ]);
}

export function provComputed(formula) {
  return el("span", { class: "prov" }, [badge("computed", "COMPUTED"), el("span", { class: "formula" }, [formula])]);
}

export function provCited(entry) {
  if (!entry || entry.status === "unknown" || entry.value == null) {
    return el("span", { class: "prov" }, [badge("unknown", "UNKNOWN")]);
  }
  const confirmed = entry.status === "confirmed";
  const node = el("span", { class: "prov" }, [
    badge(confirmed ? "cited" : "unconfirmed", confirmed ? "CITED" : "UNCONFIRMED"),
  ]);
  if (typeof entry.source === "string" && /^https?:\/\//.test(entry.source)) {
    node.append(el("a", { href: entry.source, target: "_blank", rel: "noopener noreferrer" }, ["source"]));
  } else if (entry.source) {
    node.append(el("span", { class: "src-note" }, [String(entry.source)]));
  }
  return node;
}

export function withProv(text, prov) {
  return el("span", { class: "with-prov" }, [text, " ", prov]);
}
