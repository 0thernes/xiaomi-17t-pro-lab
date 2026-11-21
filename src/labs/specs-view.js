import { el, kv, note, panel, readout, readoutGrid } from "../dom.js";
import { provCited } from "../provenance.js";
import { conflictsById, getSpecs, openItems, recordEntries } from "../specs.js";

function showValue(value) {
  if (value == null || value === "") return "UNKNOWN";
  if (Array.isArray(value)) return value.map((item) => showValue(item)).join(", ");
  if (typeof value === "object") {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${showValue(item)}`)
      .join("; ");
  }
  return String(value);
}

function recordList(entries, filter = "") {
  const q = filter.trim().toLowerCase();
  const filtered = q
    ? entries.filter((item) =>
        `${item.id} ${showValue(item.entry.value)} ${item.entry.note || ""}`.toLowerCase().includes(q),
      )
    : entries;
  if (!filtered.length) return [note("No entries match that filter.")];
  return filtered.map((item) =>
    el("div", { class: "kv" }, [
      el("div", { class: "kv-label" }, [item.id.replaceAll("_", " ")]),
      el("div", { class: "kv-value" }, [
        el("span", {}, [showValue(item.entry.value)]),
        " ",
        provCited(item.entry),
        item.entry.note ? el("p", { class: "note" }, [item.entry.note]) : null,
      ]),
    ]),
  );
}

export async function mount(main) {
  const specs = getSpecs();
  const opens = openItems();
  const parts = recordEntries("parts");
  const versions = recordEntries("versions");
  const supply = recordEntries("supply_chain");
  const fresh = conflictsById([16, 17, 18, 19, 20, 21, 22]);
  const xiaomiWle = specs.competitors.xiaomi_17t_pro["3dmark_wle_ul_median"];
  const iphoneWle = specs.competitors.iphone_18_pro_max["3dmark_wle_ul_median"];

  const searchInput = el("input", {
    type: "search",
    placeholder: "Filter parts, ICs, conflicts, issues (e.g. hynix, MT6661, UFS, NPU)…",
    "aria-label": "Search specs catalog",
    style: "flex:1 1 280px",
  });
  let activeTab = "all";
  const tabDefs = [
    ["all", "All Sections"],
    ["parts", `FCC Parts (${parts.length})`],
    ["open", `Still Open (${opens.length})`],
    ["issues", `Issues (${specs.issues.length})`],
    ["conflicts", `Conflicts (${specs.conflicts.length})`],
    ["supply", `Supply Chain (${supply.length})`],
  ];
  const tabBtns = [];
  const tabsBar = el("div", { class: "chips" });
  const contentHost = el("div");

  function render() {
    const q = searchInput.value || "";
    const ql = q.trim().toLowerCase();
    const sections = [];

    if (activeTab === "all" || activeTab === "open") {
      const openFiltered = ql
        ? opens.filter((item) => `${item.path} ${item.reason} ${item.row?.value || ""}`.toLowerCase().includes(ql))
        : opens;
      sections.push(
        panel(
          `Still Open / Unconfirmed (${openFiltered.length})`,
          [
            el(
              "ol",
              { class: "open-list" },
              openFiltered.map((item) =>
                el("li", {}, [
                  el("strong", {}, [item.path]),
                  " ",
                  item.row?.status === "unknown" || item.row?.value == null
                    ? el("span", {}, ["UNKNOWN ", provCited(item.row)])
                    : el("span", {}, [`${item.row.value} ${item.row.unit || ""} `, provCited(item.row)]),
                  el("p", { class: "note" }, [item.reason]),
                ]),
              ),
            ),
          ],
          null,
          "HONEST GAPS",
        ),
      );
    }

    if (activeTab === "all" || activeTab === "parts") {
      sections.push(
        panel(
          "FCC 2AFZZPTC0G & Kernel Parts Catalog",
          [note(specs.parts._note), ...recordList(parts, q)],
          null,
          "BOARD BOM",
        ),
      );
    }

    if (activeTab === "all") {
      sections.push(panel("Software, Kernel & Codename Versions", recordList(versions, q), null, "WARHOL BSP"));
    }

    if (activeTab === "all" || activeTab === "issues") {
      const iss = ql
        ? specs.issues.filter((i) => `${i.id} ${i.topic} ${i.summary} ${i.classification}`.toLowerCase().includes(ql))
        : specs.issues;
      sections.push(
        panel(
          `Tracked Engineering Issues (${iss.length})`,
          iss.map((item) =>
            el("div", { class: "kv" }, [
              el("div", { class: "kv-label" }, [`${item.id} · ${item.classification}`]),
              el("div", { class: "kv-value" }, [
                el("strong", {}, [item.topic]),
                " ",
                provCited({ ...item, value: item.topic }),
                el("p", { class: "note" }, [item.summary]),
              ]),
            ]),
          ),
          null,
          "DILLEMAS & ERRATA",
        ),
      );
    }

    if (activeTab === "all" || activeTab === "conflicts") {
      const conf = activeTab === "conflicts" ? specs.conflicts : fresh;
      const cf = ql
        ? conf.filter((c) => `${c.id} ${c.topic} ${c.summary} ${c.classification}`.toLowerCase().includes(ql))
        : conf;
      sections.push(
        panel(
          activeTab === "conflicts" ? `All Source Conflicts (${cf.length})` : `Pass-2 Conflicts #16–22 (${cf.length})`,
          [
            ...cf.map((item) =>
              el("div", { class: "kv" }, [
                el("div", { class: "kv-label" }, [`#${item.id} · ${item.classification}`]),
                el("div", { class: "kv-value" }, [
                  el("strong", {}, [item.topic]),
                  el("p", { class: "note" }, [item.summary]),
                ]),
              ]),
            ),
          ],
          null,
          "SOURCE RECONCILIATION",
        ),
      );
    }

    if (activeTab === "all" || activeTab === "supply") {
      sections.push(
        panel(
          "Supply Chain & Foundry Attribution",
          [note(specs.supply_chain._note), ...recordList(supply, q)],
          null,
          "TSMC + SK HYNIX + CSOT",
        ),
      );
    }

    if (activeTab === "all" && !ql) {
      sections.push(
        panel(
          "Headline Resolved Facts (Pass 1 + Pass 2)",
          [
            kv(
              "Die",
              el("span", {}, [
                `${specs.soc.die_size_mm2.value} ${specs.soc.die_size_mm2.unit} `,
                provCited(specs.soc.die_size_mm2),
              ]),
            ),
            kv(
              "Package",
              el("span", {}, [
                String(specs.soc.package_this_phone.value),
                " ",
                provCited(specs.soc.package_this_phone),
              ]),
            ),
            kv(
              "GPU Clock",
              el("span", {}, [`${specs.soc.gpu_clock_mhz.value} MHz `, provCited(specs.soc.gpu_clock_mhz)]),
            ),
            kv(
              "DRAM",
              el("span", {}, [String(specs.device.dram_vendor.value), " ", provCited(specs.device.dram_vendor)]),
            ),
            kv("UFS 4.1", el("span", {}, [String(specs.parts.ufs.value), " ", provCited(specs.parts.ufs)])),
            kv("PMICs", el("span", {}, [String(specs.device.pmic.value), " ", provCited(specs.device.pmic)])),
            kv(
              "Wild Life Extreme",
              el("span", {}, [`17T Pro ${xiaomiWle.value} vs iPhone ${iphoneWle.value} `, provCited(xiaomiWle)]),
            ),
            kv(
              "Codename / Kernel",
              el("span", {}, [
                `${specs.versions.codename.value} · ${specs.versions.kernel.value} `,
                provCited(specs.versions.kernel),
              ]),
            ),
          ],
          null,
          "AUDIT SUMMARY",
        ),
      );
    }

    contentHost.replaceChildren(...sections);
  }

  tabDefs.forEach(([id, label]) => {
    const btn = el("button", { type: "button", class: "chip", "aria-pressed": id === activeTab ? "true" : "false" }, [
      label,
    ]);
    btn.addEventListener("click", () => {
      activeTab = id;
      tabBtns.forEach((b, idx) => b.setAttribute("aria-pressed", tabDefs[idx][0] === activeTab ? "true" : "false"));
      render();
    });
    tabBtns.push(btn);
    tabsBar.append(btn);
  });
  searchInput.addEventListener("input", render);

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["137 KB VERIFIED SPECS.JSON"]),
      el("span", {}, ["FCC 2AFZZPTC0G · KURNAL DIE REPORT · MI WARHOL KERNEL · ARM TRMS"]),
    ]),
    el("h1", {}, ["Forensic Hardware Catalog & Evidence Ledger"]),
    el("p", { class: "lede" }, [
      "Every hardware specification rendered across this workbench is read directly from data/specs.json with explicit provenance. Search across all 29 board ICs, 22 source conflicts, 12 tracked issues, and 7 genuinely open gaps.",
    ]),
    readoutGrid([
      readout("Board Parts", `${parts.length}`, "ICs", { tone: "cyan", sub: "FCC 2AFZZPTC0G + warhol DT" }),
      readout("Source Conflicts", `${specs.conflicts.length}`, "audited", {
        tone: "accent",
        sub: "Pass 1 + Pass 2 reconciled",
      }),
      readout("Tracked Issues", `${specs.issues.length}`, "items", { tone: "warn", sub: "I1–I12 engineering errata" }),
      readout("Still Open", `${opens.length}`, "leaves", { tone: "ok", sub: "Down from 38 in v0.1.0" }),
    ]),
    el("div", { class: "tool-bar" }, [searchInput, tabsBar]),
    contentHost,
  );

  render();
  return { dispose() {} };
}
