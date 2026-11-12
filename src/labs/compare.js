import specs from "../../data/specs.json" with { type: "json" };
import { buildComparison, scoreboardEntries } from "../sim/compare-model.js";
import { el, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed } from "../provenance.js";

const NAMES = {
  xiaomi_17t_pro: "17T Pro",
  iphone_18_pro_max: "iPhone 18 Pro Max",
  galaxy_s26_ultra: "Galaxy S26 Ultra",
};

export async function mount(main) {
  const model = buildComparison();
  const head = el("tr", {}, [
    el("th", {}, ["Measure"]),
    el("th", {}, ["17T Pro"]),
    el("th", {}, ["iPhone 18 Pro Max"]),
    el("th", {}, ["Galaxy S26 Ultra"]),
    el("th", {}, ["17T / other"]),
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
  const snl = model.snlStability;
  const board = el("div");
  for (const item of scoreboardEntries()) {
    const winner = String(item.winner);
    const friendly = winner
      .split(/[/]| and /)
      .map((part) => NAMES[part.trim()] || part.trim())
      .join(" and ");
    const xiaomiWins = winner.includes("xiaomi");
    board.append(
      el("div", { class: "kv" }, [
        el("div", { class: "kv-label" }, [item.id.replaceAll("_", " ")]),
        el("div", { class: "kv-value" }, [
          el("span", { class: xiaomiWins ? "win" : "loss" }, [friendly]),
          " ",
          provCited(item.entry),
        ]),
      ]),
    );
    if (item.entry.notes) board.append(note(item.entry.notes));
  }

  main.replaceChildren(
    el("h1", {}, ["Wins and losses"]),
    el("p", { class: "lede" }, [
      `${model.phones.xiaomi.text} against ${model.phones.iphone.text} and ${model.phones.samsung.text}, as of ${model.asOf.value}. Geekbench 6 is never mixed with Geekbench 7. The iPhone has no same-lab Geekbench 6 number in this dossier, so that cell is UNKNOWN.`,
    ]),
    panel("Scoreboard", [board, note(model.methodology.value)]),
    panel("Numbers the page divides", [
      el("div", { style: "overflow-x:auto" }, [el("table", {}, [el("thead", {}, [head]), body])]),
      note(
        "Ratios are 17T Pro divided by the other phone when both values are numbers. A ratio is not a verdict. The scoreboard verdict is the cited one.",
      ),
    ]),
    panel("Steel Nomad Light stability, low / high", [
      stabilityLine("17T Pro", snl.xiaomi),
      stabilityLine("iPhone 18 Pro Max", snl.iphone),
      stabilityLine("Galaxy S26 Ultra", snl.samsung),
      note("PhoneArena’s low score on the 17T Pro beats the Ultra and loses to the iPhone. Peak still loses to both."),
    ]),
    panel("PPI check", [
      ppiLine("17T Pro", model.ppi.xiaomiCited, model.ppi.xiaomiComputed),
      ppiLine("iPhone 18 Pro Max", model.ppi.iphoneCited, model.ppi.iphoneComputed),
      ppiLine("Galaxy S26 Ultra", null, model.ppi.samsungComputed),
      note(
        "Samsung’s cited pages in this dossier give resolution and diagonal, not a PPI integer. The PPI here is computed. It is not labeled as a Samsung specification.",
      ),
    ]),
  );
  return { dispose() {} };
}

function cell(item) {
  return el("td", {}, [item.text, " ", item.entry ? provCited(item.entry) : ""]);
}

function ratioText(row) {
  const parts = [];
  if (row.ratioVsIphone != null) parts.push(`÷ iPhone ${fmt(row.ratioVsIphone, 3)}`);
  if (row.ratioVsSamsung != null) parts.push(`÷ Ultra ${fmt(row.ratioVsSamsung, 3)}`);
  if (!parts.length) return el("span", {}, ["— ", provComputed("no numeric pair")]);
  return el("span", {}, [parts.join(" · "), " ", provComputed("cited value / cited value")]);
}

function stabilityLine(name, item) {
  return el("div", { class: "kv" }, [
    el("div", { class: "kv-label" }, [name]),
    el("div", { class: "kv-value" }, [
      item.ratio == null ? "UNKNOWN" : fmt(item.ratio, 3),
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
      computed ? el("span", {}, [` computed ${fmt(computed.ppi, 5)} `, provComputed(computed.formula)]) : null,
    ]),
  ]);
}
