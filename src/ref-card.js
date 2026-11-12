import { el } from "./dom.js";
import { referencesById } from "./references.js";

/** Link card. Copyrighted photos are not embedded. */
export function referenceCards(ids) {
  return el(
    "div",
    { class: "ref-cards" },
    referencesById(ids).map((item) =>
      el("article", { class: "ref-card" }, [
        item.shipped
          ? el("img", { src: item.shipped, alt: item.title })
          : el("p", { class: "ref-missing" }, ["Photograph not shipped"]),
        el("h3", {}, [item.title]),
        el("p", {}, [item.use]),
        el("p", { class: "note" }, [item.license]),
        el("a", { href: item.url, target: "_blank", rel: "noopener noreferrer" }, ["Open the source"]),
      ]),
    ),
  );
}
