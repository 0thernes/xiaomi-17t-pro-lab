import { el } from "./dom.js";
import { ROUTES } from "./routes.js";
import { VERSION } from "./version.js";
import { isolationStatus } from "./isolation.js";

const COMMAND_ITEMS = [
  ...ROUTES.map((r) => ({ title: r.label, sub: `${r.group} · ${r.scale}`, hash: r.hash, badge: "LAB" })),
  {
    title: "Gaming PBR Stress Arena",
    sub: "6,000 instanced meshes · P50/P95/P99 frametime scope",
    hash: "#/work/game",
    badge: "WORK",
  },
  {
    title: "Neuralese · TinyStories-8M LLM",
    sub: "Live weight hacking · 16-head Layer-7 attention · 8L residual norms",
    hash: "#/work/llm",
    badge: "WORK",
  },
  {
    title: "Glitchling / Asmodensius A-Life",
    sub: "272 neurons · 14 brain regions · flaw injection · homeostasis",
    hash: "#/work/life",
    badge: "WORK",
  },
  {
    title: "Tsotchke · 3D Bloch Sphere & Quantum Contextuality",
    sub: "Live gate composer · Bell CHSH 2√2 · Mermin-3 · RK4 Lorenz",
    hash: "#/work/sci",
    badge: "WORK",
  },
  {
    title: "GigaChad Mobile Cortex · 60 Hz 5-Caste Swarm",
    sub: "Interactive 2D pheromone grid · drop task attractors & threats",
    hash: "#/work/browser",
    badge: "WORK",
  },
  {
    title: "SK hynix H58GG6AV9H (12 GB LPDDR5X-9600)",
    sub: "76.8 GB/s PoP DRAM · CS Roofline & LLM memory wall",
    hash: "#/memory",
    badge: "PART",
  },
  {
    title: "SK hynix HN8T271EJK (512 GB UFS 4.1)",
    sub: "3,021.5 MB/s seq read · 414 MB/s 4K random",
    hash: "#/memory",
    badge: "PART",
  },
  {
    title: "Xiaomi 3D IceLoop Vapor Chamber (5,500 mm²)",
    sub: "Live 2D FDTD silicon heat PDE & 7,000 mAh Si-C battery",
    hash: "#/thermal",
    badge: "PART",
  },
  {
    title: "ASML NXE 0.33 NA EUV + 2D Fourier OPC Serifs",
    sub: "13.5 nm 91.84 eV · 40-pair Mo/Si Bragg · 6T SRAM & L-Bend OPC",
    hash: "#/litho",
    badge: "PHYS",
  },
  {
    title: "Crank–Nicolson TDSE Quantum Wave-Packet Tunneling",
    sub: "Live HfO₂ gate barrier + Resonant Double-Barrier Diode + Dirac e⁻/e⁺",
    hash: "#/transistor",
    badge: "PHYS",
  },
  {
    title: "FCC 2AFZZPTC0G Board Parts & 22 Conflicts Ledger",
    sub: "MT6993Z · MT6661/MT6667/MT6379 PMICs · OVX9500 · JN5 Periscope",
    hash: "#/specs",
    badge: "FCC",
  },
];

export function mountShell(audio) {
  const app = document.getElementById("app");
  app.classList.add("app");

  const sound = el("button", { type: "button", id: "sound", "aria-pressed": "false" }, ["Sound off"]);
  sound.addEventListener("click", async () => {
    const muted = await audio.toggle();
    sound.textContent = muted ? "Sound off" : "Sound on";
    sound.setAttribute("aria-pressed", muted ? "false" : "true");
  });

  // Spotlight Command Palette (Ctrl+K)
  const cmdButton = el(
    "button",
    { type: "button", id: "cmd-open", class: "top-cmd-btn", title: "Jump anywhere (Ctrl+K)" },
    [el("span", {}, ["Search"]), el("kbd", {}, ["Ctrl K"])],
  );
  const cmdInput = el("input", {
    type: "search",
    class: "cmd-input",
    placeholder: "Jump to any lab, physics engine, workload, or FCC IC (e.g. Thermal, Bloch, SK hynix, OPC)…",
    "aria-label": "Search labs and components",
  });
  const cmdList = el("div", { class: "cmd-list", role: "listbox" });
  const cmdDialog = el("dialog", { class: "cmd-dialog" }, [
    el("div", { class: "cmd-head" }, [
      cmdInput,
      el("button", { type: "button", class: "btn", onClick: () => cmdDialog.close() }, ["Esc"]),
    ]),
    cmdList,
  ]);

  let filteredCmds = COMMAND_ITEMS;
  let activeCmdIdx = 0;

  function runCommand(item) {
    if (!item) return;
    cmdDialog.close();
    location.hash = item.hash;
    audio?.blip("detent");
  }

  function renderCommands() {
    const q = cmdInput.value.trim().toLowerCase();
    filteredCmds = q
      ? COMMAND_ITEMS.filter(
          (item) =>
            item.title.toLowerCase().includes(q) ||
            item.sub.toLowerCase().includes(q) ||
            item.badge.toLowerCase().includes(q),
        )
      : COMMAND_ITEMS;
    activeCmdIdx = Math.min(activeCmdIdx, Math.max(0, filteredCmds.length - 1));
    cmdList.replaceChildren(
      ...(filteredCmds.length
        ? filteredCmds.map((item, idx) =>
            el(
              "button",
              {
                type: "button",
                class: `cmd-item${idx === activeCmdIdx ? " active" : ""}`,
                role: "option",
                "aria-selected": idx === activeCmdIdx ? "true" : "false",
                onClick: () => runCommand(item),
              },
              [
                el("span", { class: "cmd-badge" }, [item.badge]),
                el("span", { class: "cmd-copy" }, [el("strong", {}, [item.title]), el("small", {}, [item.sub])]),
              ],
            ),
          )
        : [el("p", { class: "note", style: "margin:10px" }, ["No matching lab, workload, or hardware record."])]),
    );
  }

  function openPalette() {
    cmdInput.value = "";
    activeCmdIdx = 0;
    renderCommands();
    if (!cmdDialog.open) cmdDialog.showModal();
    cmdInput.focus();
  }

  cmdButton.addEventListener("click", openPalette);
  cmdInput.addEventListener("input", () => {
    activeCmdIdx = 0;
    renderCommands();
  });
  cmdInput.addEventListener("keydown", (ev) => {
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      activeCmdIdx = (activeCmdIdx + 1) % Math.max(1, filteredCmds.length);
      renderCommands();
    } else if (ev.key === "ArrowUp") {
      ev.preventDefault();
      activeCmdIdx = (activeCmdIdx - 1 + Math.max(1, filteredCmds.length)) % Math.max(1, filteredCmds.length);
      renderCommands();
    } else if (ev.key === "Enter") {
      ev.preventDefault();
      runCommand(filteredCmds[activeCmdIdx]);
    }
  });
  cmdDialog.addEventListener("click", (ev) => {
    if (ev.target === cmdDialog) cmdDialog.close();
  });

  const helpButton = el("button", { type: "button", id: "help" }, ["Help"]);
  const dialog = el("dialog", {}, [
    el("h2", {}, [`Xiaomi 17T Pro Lab v${VERSION} — Controls & Provenance`]),
    el("p", {}, [
      "Orbit any 3D subject by dragging; scroll or pinch to dolly; hover any component to inspect; click a part to focus; press R to re-frame. Shortcuts: Ctrl+K opens the command palette, ? opens this dialog, M toggles WebAudio sonification, 1–9 jump across labs, Esc closes dialogs.",
    ]),
    el("p", {}, [
      "MEASURED is timed live on your device right now. CITED comes from a sourced primary/secondary record in specs.json (including FCC 2AFZZPTC0G internal photos, Xiaomi warhol kernel DT, Arm TRMs, and Kurnal's die report). COMPUTED shows its exact closed-form or PDE/FFT equation. UNCONFIRMED is published without official vendor verification. UNKNOWN remains genuinely unpublished.",
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
      cmdButton,
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
    cmdDialog,
  );

  window.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (cmdDialog.open) cmdDialog.close();
      else openPalette();
      return;
    }
    const tag = event.target?.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
    if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
      event.preventDefault();
      dialog.showModal();
    } else if (event.key === "m" || event.key === "M") {
      sound.click();
    } else if (event.key === "Escape") {
      if (dialog.open) dialog.close();
      if (cmdDialog.open) cmdDialog.close();
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
