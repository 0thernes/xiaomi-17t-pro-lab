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
    el("h2", {}, ["Xiaomi 17T Pro Lab — Controls & Provenance"]),
    el("p", {}, [
      "Orbit any 3D subject by dragging; scroll or pinch to dolly; press R to re-frame. Shortcuts: ? opens this dialog, M toggles WebAudio synthesis, 1–9 jump across labs, Esc closes dialogs.",
    ]),
    el("p", {}, [
      "MEASURED is timed live on your device right now. CITED comes from a sourced primary/secondary record in specs.json (including FCC 2AFZZPTC0G internal photos, Xiaomi warhol kernel DT, Arm TRMs, and Kurnal's die report). COMPUTED shows its exact closed-form equation. UNCONFIRMED is published without official vendor verification. UNKNOWN remains genuinely unpublished.",
    ]),
    el("p", {}, [audio.credits]),
    el("button", { type: "button", class: "primary", onClick: () => dialog.close() }, ["Close"]),
  ]);
  helpButton.addEventListener("click", () => dialog.showModal());

  const navNodes = [];
  let lastGroup = null;
  for (const route of ROUTES) {
    if (route.group && route.group !== lastGroup) {
      navNodes.push(el("div", { class: "nav-group-label", "aria-hidden": "true" }, [route.group]));
      lastGroup = route.group;
    }
    navNodes.push(
      el("a", { href: route.hash, dataset: { route: route.id } }, [
        el("span", {}, [route.label]),
        el("span", { class: "nav-scale" }, [route.scale]),
      ]),
    );
  }
  const nav = el("nav", { class: "nav", "aria-label": "Sections" }, navNodes);

  const crumbRoute = el("span", {}, ["Phone"]);
  const crumbScale = el("span", { class: "scale-tag" }, ["10⁻¹ m"]);
  const crumb = el("div", { class: "top-crumb", "aria-label": "Active scale" }, [
    crumbRoute,
    el("span", { class: "sep" }, ["·"]),
    crumbScale,
  ]);

  const iso = isolationStatus();
  const isoDot = el("span", { class: `pulse-dot${iso.isolated ? "" : " warn"}` });
  const isoText = el("span", {}, [iso.isolated ? "COI 5µs" : "100µs timer"]);
  const isoPill = el("div", { class: "top-pill", title: "Cross-origin timer isolation status" }, [isoDot, isoText]);

  const main = el("main", { id: "main", tabindex: "-1" });

  app.replaceChildren(
    el("header", { class: "top" }, [
      el("a", { class: "brand", href: "#/" }, [
        el("span", { class: "brand-mark" }, ["17T"]),
        el("span", { class: "brand-text" }, [
          el("strong", {}, ["Pro Lab"]),
          el("small", {}, [`Dimensity 9500 · v${VERSION}`]),
        ]),
      ]),
      crumb,
      el("div", { class: "top-spacer" }),
      isoPill,
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
          ? "Timers are cross-origin isolated (5 µs class). Every calculation executes live in your browser."
          : "Timers are not cross-origin isolated (100 µs class). Enable Tighten Timers in the CPU lab for 5 µs pointer-chase resolution.",
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
    } else if (/^[1-9]$/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const idx = Number(event.key) - 1;
      if (ROUTES[idx]) location.hash = ROUTES[idx].hash;
    }
  });

  return {
    main,
    setActive(id) {
      const active = ROUTES.find((r) => r.id === id) || ROUTES[0];
      crumbRoute.textContent = active.label;
      crumbScale.textContent = active.scale;
      for (const link of nav.querySelectorAll("a")) {
        if (link.dataset.route === id) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
      }
    },
  };
}
