import { el } from "./dom.js";
import { ROUTES } from "./routes.js";
import { VERSION } from "./version.js";
import { isolationStatus } from "./isolation.js";

export function mountShell(audio) {
  const app = document.getElementById("app");
  const sound = el("button", { type: "button", id: "sound", "aria-pressed": "false" }, ["Sound off"]);
  sound.addEventListener("click", async () => {
    const muted = await audio.toggle();
    sound.textContent = muted ? "Sound off" : "Sound on";
    sound.setAttribute("aria-pressed", muted ? "false" : "true");
  });
  const helpButton = el("button", { type: "button", id: "help" }, ["Help"]);
  const dialog = el("dialog", {}, [
    el("h2", {}, ["How to move through the lab"]),
    el("p", { class: "note" }, [
      "Tab reaches every control. Arrow along the zoom list when it is focused. M toggles sound. Sound stays off until you turn it on. Esc closes this note.",
    ]),
    el("p", { class: "note" }, [
      "MEASURED is a number taken on this device, in this browser. CITED is a published figure with a link. COMPUTED is arithmetic from a formula written next to the badge. UNKNOWN means the sources do not publish it.",
    ]),
    el("button", { type: "button", class: "primary", onClick: () => dialog.close() }, ["Close"]),
  ]);
  helpButton.addEventListener("click", () => dialog.showModal());
  const nav = el(
    "nav",
    { class: "nav", "aria-label": "Sections" },
    ROUTES.map((route) => el("a", { href: route.hash, dataset: { route: route.id } }, [route.label])),
  );
  const main = el("main", { id: "main", tabindex: "-1" });
  const iso = isolationStatus();
  app.replaceChildren(
    el("header", { class: "top" }, [
      el("a", { class: "brand", href: "#/" }, [
        el("strong", {}, ["17T Pro Lab"]),
        el("span", {}, [`v${VERSION} · Alex Donahue`]),
      ]),
      el("div", { class: "top-spacer" }),
      helpButton,
      sound,
    ]),
    nav,
    main,
    el("footer", { class: "footer" }, [
      el("div", { class: "legend", "aria-label": "Provenance" }, [
        el("span", { class: "badge badge-measured" }, ["MEASURED"]),
        el("span", { class: "badge badge-cited" }, ["CITED"]),
        el("span", { class: "badge badge-computed" }, ["COMPUTED"]),
        el("span", { class: "badge badge-unknown" }, ["UNKNOWN"]),
      ]),
      el("p", {}, [
        iso.isolated
          ? "This page is cross-origin isolated, so explicit timers can use Chrome’s tighter class."
          : "Timers are not cross-origin isolated. The CPU lab repeats work and reports the uncertainty. A service worker can tighten them on GitHub Pages.",
      ]),
    ]),
    dialog,
  );

  window.addEventListener("keydown", (event) => {
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
      event.preventDefault();
      dialog.showModal();
    } else if (event.key === "m" || event.key === "M") {
      sound.click();
    } else if (event.key === "Escape" && dialog.open) {
      dialog.close();
    }
  });

  return {
    main,
    setActive(id) {
      for (const link of nav.querySelectorAll("a")) {
        if (link.dataset.route === id) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    },
  };
}
