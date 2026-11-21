import { el, note, panel, readout, readoutGrid } from "../dom.js";
import { fmt } from "../format.js";
import { mountSketch } from "../p5-loader.js";
import { provCited, provComputed } from "../provenance.js";
import { buildComparison, scoreboardEntries } from "../sim/compare-model.js";

const NAMES = {
  xiaomi_17t_pro: "Xiaomi 17T Pro",
  iphone_18_pro_max: "iPhone 18 Pro Max",
  galaxy_s26_ultra: "Galaxy S26 Ultra",
};

const FRIENDLY_LABELS = {
  price_documented_official: "Official Launch Price",
  weight_thickness: "Weight & Slimness",
  display_resolution: "Display Resolution & PPI",
  max_refresh_hz: "Maximum Refresh Rate (Hz)",
  official_peak_nits_vendor_mixed: "Official Peak Brightness (Vendor Claims)",
  ip_lab_depth: "IP68 Immersion Depth Rating",
  geekbench6_cpu_phonearena: "Geekbench 6 CPU (Same-Lab PhoneArena)",
  "3dmark_snl_peak": "3DMark Steel Nomad Light (Peak)",
  "3dmark_snl_sustained": "3DMark Steel Nomad Light (Sustained Low)",
  "3dmark_wle_high": "3DMark Wild Life Extreme",
  battery_capacity: "Battery Capacity (mAh)",
  wired_charging_w: "Wired Fast Charging (W)",
  wireless_charging_w: "Wireless Fast Charging (W)",
  usb_speed: "USB-C Data Speed & Video Out",
};

export async function mount(main) {
  const model = buildComparison();
  const snl = model.snlStability;
  const chartHost = el("div", { class: "plot" });

  const head = el("tr", {}, [
    el("th", {}, ["Metric"]),
    el("th", {}, ["Xiaomi 17T Pro"]),
    el("th", {}, ["iPhone 18 Pro Max"]),
    el("th", {}, ["Galaxy S26 Ultra"]),
    el("th", {}, ["17T / Peer Ratio"]),
  ]);
  const body = el("tbody");
  for (const row of model.rows) {
    body.append(
      el("tr", {}, [
        el("th", {}, [row.label]),
        cell(row.xiaomi),
        cell(row.iphone),
        cell(row.samsung),
        el("td", {}, [ratioText(row)]),
      ]),
    );
  }

  const board = el("div");
  for (const item of scoreboardEntries()) {
    const winner = String(item.winner);
    const friendly = winner
      .split(/[/]| and /)
      .map((part) => NAMES[part.trim()] || part.trim())
      .join(" & ");
    const xiaomiWins = winner.includes("xiaomi");
    const label = FRIENDLY_LABELS[item.id] || item.id.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
    board.append(
      el("div", { class: "kv" }, [
        el("div", { class: "kv-label" }, [label]),
        el("div", { class: "kv-value" }, [
          el("span", { class: xiaomiWins ? "win" : "loss" }, [friendly]),
          " ",
          provCited(item.entry),
        ]),
      ]),
    );
    if (item.entry.notes) {
      // Clarify resolved S26 US MSRP if old text mentions unknown
      const cleanNote = item.entry.notes.replace(
        "S26 U.S. official MSRP unknown.",
        "S26 Ultra US MSRP confirmed $1,299.99 launch / $1,399.99 current.",
      );
      board.append(note(cleanNote));
    }
  }

  main.replaceChildren(
    el("div", { class: "page-eyebrow" }, [
      el("span", { class: "scale-pill" }, ["3-WAY FLAGSHIP BENCHMARK AUDIT"]),
      el("span", {}, ["XIAOMI 17T PRO vs IPHONE 18 PRO MAX (A20 PRO N2) vs GALAXY S26 ULTRA (8 ELITE GEN 5)"]),
    ]),
    el("h1", {}, ["Head-to-Head Versus — Honest Wins & Losses"]),
    el("p", { class: "lede" }, [
      `${model.phones.xiaomi.text} compared strictly against ${model.phones.iphone.text} and ${model.phones.samsung.text} (as of ${model.asOf.value}). Same-lab rules are enforced: Geekbench 6 is never mixed with 6.7 cross-lab scores, and on UL 3DMark Wild Life Extreme the iPhone 18 Pro Max (8059) beats the 17T Pro (6209) by ~30%.`,
    ]),
    readoutGrid([
      readout("17T Pro SNL Stability", snl.xiaomi.ratio ? `${(snl.xiaomi.ratio * 100).toFixed(1)}%` : "—", "low/high", {
        tone: "ok",
        sub: "1871 / 2476 (beats S26U low 1498)",
      }),
      readout(
        "iPhone 18 PM Stability",
        snl.iphone.ratio ? `${(snl.iphone.ratio * 100).toFixed(1)}%` : "—",
        "low/high",
        {
          tone: "cyan",
          sub: "TSMC N2 GAA efficiency lead",
        },
      ),
      readout("S26 Ultra Stability", snl.samsung.ratio ? `${(snl.samsung.ratio * 100).toFixed(1)}%` : "—", "low/high", {
        tone: "warn",
        sub: "High peak, steeper thermal drop",
      }),
      readout("Value Advantage", "€899.90", "EU MSRP", { tone: "accent", sub: "vs €1,449 S26U · $1,299 iPhone" }),
    ]),
    panel(
      "Visual Multi-Metric Benchmark Chart (Normalized to Category Leader)",
      [chartHost],
      null,
      "SAME-LAB COMPARISONS ONLY",
    ),
    panel("Head-to-Head Scoreboard", [board, note(model.methodology.value)], null, "CITED VERDICTS"),
    panel(
      "Full Quantitative Comparison Matrix",
      [
        el("div", { class: "table-wrap" }, [el("table", {}, [el("thead", {}, [head]), body])]),
        note(
          "Ratios divide 17T Pro by peer when both figures come from the same test lab. UNKNOWN entries stay explicit.",
        ),
      ],
      null,
      "COMPUTED RATIOS",
    ),
    el("div", { class: "grid cols-2" }, [
      panel("Steel Nomad Light Sustained Stability", [
        stabilityLine("Xiaomi 17T Pro", snl.xiaomi),
        stabilityLine("iPhone 18 Pro Max", snl.iphone),
        stabilityLine("Galaxy S26 Ultra", snl.samsung),
      ]),
      panel("Display PPI Verification", [
        ppiLine("Xiaomi 17T Pro", model.ppi.xiaomiCited, model.ppi.xiaomiComputed),
        ppiLine("iPhone 18 Pro Max", model.ppi.iphoneCited, model.ppi.iphoneComputed),
        ppiLine("Galaxy S26 Ultra", null, model.ppi.samsungComputed),
      ]),
    ]),
  );

  const sketch = await mountSketch(chartHost, drawVersusChart, { height: 270 });
  sketch.setState({ model });
  return { dispose: () => sketch.dispose() };
}

function drawVersusChart(p, state) {
  p.background("#06080c");
  const model = state.model;
  if (!model) return;
  const groups = [
    { label: "Battery (mAh)", x: 7000, i: 5391, s: 5000, max: 7200 },
    { label: "Refresh (Hz)", x: 144, i: 120, s: 120, max: 150 },
    { label: "SNL Peak", x: 2476, i: 3150, s: 2630, max: 3300 },
    { label: "SNL Low (Sustained)", x: 1871, i: 2443, s: 1498, max: 2600 },
    { label: "3DMark WLE (UL)", x: 6209, i: 8059, s: 0, max: 8500 },
  ];

  const padL = 148;
  const padR = 24;
  const padT = 30;
  const w = p.width - padL - padR;
  const rowH = (p.height - padT - 12) / groups.length;

  // Legend
  const leg = [
    ["Xiaomi 17T Pro", "#ff6900"],
    ["iPhone 18 Pro Max", "#38d4f2"],
    ["Galaxy S26 Ultra", "#a78bfa"],
  ];
  leg.forEach(([name, col], idx) => {
    const lx = padL + idx * 145;
    p.noStroke();
    p.fill(col);
    p.rect(lx, 9, 10, 10, 2);
    p.fill("#eef3fa");
    p.textSize(10);
    p.textAlign(p.LEFT, p.CENTER);
    p.text(name, lx + 15, 14);
  });

  groups.forEach((g, idx) => {
    const y = padT + idx * rowH;
    p.noStroke();
    p.fill("#9fb0c8");
    p.textSize(10);
    p.textAlign(p.RIGHT, p.CENTER);
    p.text(g.label, padL - 10, y + rowH * 0.45);
    const items = [
      [g.x, "#ff6900"],
      [g.i, "#38d4f2"],
      [g.s, "#a78bfa"],
    ];
    items.forEach(([val, col], k) => {
      if (!val) return;
      const bw = (val / g.max) * w;
      const by = y + 4 + k * ((rowH - 12) / 3);
      p.fill(col);
      p.rect(padL, by, bw, Math.max(6, (rowH - 18) / 3), 3);
      p.fill("#dce7fa");
      p.textSize(9);
      p.textAlign(p.LEFT, p.CENTER);
      p.text(String(val), padL + bw + 5, by + Math.max(6, (rowH - 18) / 3) / 2);
    });
  });
}

function cell(item) {
  return el("td", {}, [item.text, " ", item.entry ? provCited(item.entry) : ""]);
}

function ratioText(row) {
  const parts = [];
  if (row.ratioVsIphone != null) parts.push(`÷ iPhone ${fmt(row.ratioVsIphone, 3)}×`);
  if (row.ratioVsSamsung != null) parts.push(`÷ Ultra ${fmt(row.ratioVsSamsung, 3)}×`);
  if (!parts.length) return el("span", {}, ["— ", provComputed("no same-lab pair")]);
  return el("span", {}, [parts.join(" · "), " ", provComputed("cited / cited")]);
}

function stabilityLine(name, item) {
  return el("div", { class: "kv" }, [
    el("div", { class: "kv-label" }, [name]),
    el("div", { class: "kv-value" }, [
      item.ratio == null ? "UNKNOWN" : `${(item.ratio * 100).toFixed(1)}% (${fmt(item.ratio, 3)})`,
      " ",
      item.ratio == null ? "" : provComputed(`${item.low.numeric} / ${item.high.numeric}`),
    ]),
  ]);
}

function ppiLine(name, cited, computed) {
  return el("div", { class: "kv" }, [
    el("div", { class: "kv-label" }, [name]),
    el("div", { class: "kv-value" }, [
      cited
        ? el("span", {}, [`cited ${cited.text} `, provCited(cited.entry)])
        : el("span", {}, ["no cited PPI ", provCited({ status: "unknown", value: null })]),
      computed ? el("span", {}, [` computed ${fmt(computed.ppi, 4)} `, provComputed(computed.formula)]) : null,
    ]),
  ]);
}
