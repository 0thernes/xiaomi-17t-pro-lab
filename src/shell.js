import { el } from "./dom.js";
import { ROUTES } from "./routes.js";
import { VERSION } from "./version.js";
import { isolationStatus } from "./isolation.js";

export function mountShell(audio) {
  const app = document.getElementById("app");
  app.classList.add("app");
  const sound = el("button", { type: "button", id: "sound", "aria-pressed": "false" }, ["Sound off"]);
  sound.addEventListener("click", async () => {
    const muted = await audio.toggle();
    sound.textContent = muted ? "Sound off" : "Sound on";
    sound.setAttribute("aria-pressed", muted ? "false" : "true");
  });
  const helpButton = el("button", { type: "button", id: "help" }, ["Help"]);
  const dialog = el("dialog", {}, [
    el("h2", {}, ["How to move"]),
    el("p", {}, [
      "The bottom bar is the thumb zone. On a wide screen it becomes a side rail. Drag the model to orbit, scroll to dolly. Sound stays off until you tap it.",
    ]),
    el("p", {}, [
      "MEASURED is this browser. CITED is a sourced leaf in specs.json. COMPUTED shows its formula. UNCONFIRMED is published but not an official vendor figure. UNKNOWN is still open.",
    ]),
    el("p", {}, [audio.credits]),
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
        el("span", { class: "brand-mark" }, ["17T"]),
        el("span", { class: "brand-text" }, [el("strong", {}, ["Pro Lab"]), el("small", {}, [`v${VERSION}`])]),
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
        el("span", { class: "badge badge-unconfirmed" }, ["UNCONFIRMED"]),
        el("span", { class: "badge badge-unknown" }, ["UNKNOWN"]),
      ]),
      el("p", {}, [
        iso.isolated
          ? "Timers are cross-origin isolated."
          : "Timers are not cross-origin isolated. The CPU lab reports that uncertainty.",
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
