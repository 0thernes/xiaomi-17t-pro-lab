import taxonomy from "../../data/taxonomy.json" with { type: "json" };
import specs from "../../data/specs.json" with { type: "json" };
import { deviceChain, engineLevels, facetCoverage, sharedNode, stackList } from "../sim/taxonomy-walk.js";
import { CLUSTER, EUV_LAMBDA_NM, NA_LOW } from "../sim/constants.js";
import {
  computedPpi,
  gpuFp32Gflops,
  pixelRate,
  siliconNearestNeighbor,
  ultraToProPowerRatio,
} from "../sim/device-math.js";
import { rayleighCd } from "../sim/rayleigh.js";
import { el, kv, note, panel } from "../dom.js";
import { fmt } from "../format.js";
import { provCited, provComputed } from "../provenance.js";

const FACET_LABEL = {
  structure: "Structure",
  function: "Function",
  materials: "Materials",
  dimensions: "Dimensions",
  physics: "Physics",
  data_signal_paths: "Signal paths",
  trade_offs: "Trade-offs",
  failure_modes: "Failure",
  manufacturing: "Manufacturing",
  dataflow: "Dataflow",
  timing_latency: "Timing",
  throughput: "Throughput",
  power_energy: "Power",
  isa_software_interface: "ISA",
  design_trade_offs: "Trade-offs",
};

export async function mount(main, { route }) {
  const parsed = parseZoom(route.parts);
  const stacks = stackList(taxonomy);
  const stackNav = el("div", { class: "chips" });
  for (const stack of stacks) {
    stackNav.append(linkChip(stack.name, `#/zoom/${stack.id}`, stack.id === parsed.stack));
  }

  let node = null;
  let levels = [];
  if (parsed.stack === "device") {
    const chain = deviceChain(taxonomy, parsed.ids) || [taxonomy.device_taxonomy];
    node = chain.at(-1);
    levels = chain;
  } else {
    levels = engineLevels(taxonomy, parsed.stack) || [];
    node = levels.find((level) => level.id === parsed.levelId) || levels[0];
  }
  if (!node) {
    main.replaceChildren(el("h1", {}, ["Unknown zoom"]), note("That stack is not in taxonomy.json."));
    return { dispose() {} };
  }

  const facetKeys = Object.keys(node.facets || {});
  const facet = facetKeys.includes(parsed.facet) ? parsed.facet : facetKeys[0];
  const facetBody = node.facets[facet];
  const coverage = facetCoverage(node.facets);

  const levelNav = el("div", { class: "chips", role: "list" });
  if (parsed.stack === "device") {
    const chain = deviceChain(taxonomy, parsed.ids) || [taxonomy.device_taxonomy];
    levelNav.append(linkChip("Phone", "#/zoom/device", parsed.ids.length === 0));
    chain.slice(1).forEach((item, index) => {
      const path = chain
        .slice(1, index + 2)
        .map((entry) => entry.id)
        .join("/");
      levelNav.append(linkChip(item.name, `#/zoom/device/${path}/${facet}`, item === node));
    });
    for (const child of node.children || []) {
      const path = [...parsed.ids, child.id].join("/");
      levelNav.append(linkChip(child.name, `#/zoom/device/${path}/${facet}`, false));
    }
  } else {
    for (const level of levels) {
      levelNav.append(linkChip(level.name, `#/zoom/${parsed.stack}/${level.id}/${facet}`, level.id === node.id));
    }
  }

  const facetNav = el("div", { class: "chips" });
  for (const key of facetKeys) {
    const href =
      parsed.stack === "device"
        ? `#/zoom/device${parsed.ids.length ? `/${parsed.ids.join("/")}` : ""}/${key}`
        : `#/zoom/${parsed.stack}/${node.id}/${key}`;
    facetNav.append(linkChip(FACET_LABEL[key] || key, href, key === facet));
  }

  const refs = el("div");
  for (const ref of node.refs || []) {
    const shared = sharedNode(taxonomy, ref);
    if (!shared) continue;
    refs.append(el("h3", {}, [shared.name]), note("Shared node, not a second copy of the physics."));
    for (const [key, value] of Object.entries(shared.facets || {})) {
      refs.append(kv(FACET_LABEL[key] || key, el("span", {}, [value.text, " ", statusBadge(value)])));
    }
  }

  main.replaceChildren(
    el("h1", {}, [node.name]),
    el("p", { class: "lede" }, [
      taxonomy[parsed.stack === "device" ? "device_taxonomy" : parsed.stack].depth_policy || taxonomy.meta.depth_policy,
    ]),
    stackNav,
    el("h2", {}, ["Level"]),
    levelNav,
    el("h2", {}, ["Facet"]),
    facetNav,
    panel(FACET_LABEL[facet] || facet, [
      el("p", {}, [facetBody?.text || "No text."]),
      statusBadge(facetBody),
      facetBody?.note ? note(facetBody.note) : null,
      kv(
        "Facets confirmed on this level",
        el("span", {}, [
          `${coverage.confirmed} / ${coverage.total} `,
          provComputed("count of facets whose status is confirmed"),
        ]),
      ),
    ]),
    panel("Live at this level", [liveWidget(node, parsed.stack)]),
  );
  if (refs.childNodes.length) main.append(panel("Shared physics", [refs]));
  return { dispose() {} };
}

function parseZoom(parts) {
  const stack = ["device", "cpu", "gpu", "npu"].includes(parts[0]) ? parts[0] : "device";
  const keys = stack === "device" ? taxonomy.meta.facet_keys_device : taxonomy.meta.facet_keys_engines;
  let rest = parts.slice(1);
  let facet = keys[0];
  if (rest.length && keys.includes(rest.at(-1))) {
    facet = rest.at(-1);
    rest = rest.slice(0, -1);
  }
  return { stack, ids: stack === "device" ? rest : [], levelId: stack === "device" ? null : rest[0], facet };
}

function linkChip(label, href, current) {
  return el("a", { class: "chip", href, "aria-current": current ? "true" : null }, [label]);
}

function statusBadge(facet) {
  if (!facet || facet.status === "unknown" || !facet.text) {
    return provCited({ status: "unknown", value: null });
  }
  if (!facet.source) {
    const label = facet.status === "confirmed" ? "CONFIRMED" : "UNCONFIRMED";
    return el("span", { class: "prov" }, [
      el("span", { class: `badge badge-${facet.status === "confirmed" ? "cited" : "unconfirmed"}` }, [label]),
      el("span", { class: "formula" }, ["taxonomy status, no separate URL on this facet"]),
    ]);
  }
  return provCited({
    value: facet.text,
    status: facet.status || "unknown",
    source: facet.source,
    unit: null,
  });
}

function liveWidget(node, stack) {
  const id = node.id || "";
  const refs = node.refs || [];
  const bag = `${id} ${refs.join(" ")} ${stack}`;
  const host = el("div");
  if (/litho|euv/.test(bag)) {
    const cd33 = rayleighCd(0.25, NA_LOW, EUV_LAMBDA_NM);
    host.append(
      kv("CD at k1=0.25, NA 0.33", el("span", {}, [`${fmt(cd33, 4)} nm `, provComputed("0.25 × 13.5 / 0.33")])),
      note("High-NA 0.55 is not applied to N3P. Open the lithography lab for the aerial image."),
    );
  } else if (/quantum|si_quantum/.test(bag)) {
    host.append(
      kv(
        "Si nearest neighbor",
        el("span", {}, [`${fmt(siliconNearestNeighbor() * 1e9, 5)} nm `, provComputed("a√3/4")]),
      ),
    );
  } else if (/cache|dsu|slc/.test(id) || id === "memory") {
    host.append(
      kv("L1", el("span", {}, ["UNKNOWN ", provCited(specs.soc.l1_cache_bytes)])),
      kv(
        "Power ratio of the official clocks",
        el("span", {}, [`${fmt(ultraToProPowerRatio(), 4)} `, provComputed(`${CLUSTER[0].ghz}/${CLUSTER[2].ghz}`)]),
      ),
    );
  } else if (/alu|fp|gpu_l8/.test(id)) {
    host.append(
      kv(
        "FP32 GFLOPS",
        el("span", {}, [gpuFp32Gflops(null) == null ? "UNKNOWN " : "", provCited(specs.soc.gpu_clock_mhz)]),
      ),
    );
  } else if (/bitnet|npu_l7/.test(id)) {
    host.append(kv("log2(3)", el("span", {}, [`${fmt(Math.log2(3), 5)} bits `, provComputed("log2(3)")])));
  } else if (id === "display" || /scan/.test(id)) {
    const [h, w] = specs.device.display_resolution_px.value;
    host.append(
      kv(
        "PPI",
        el("span", {}, [
          `${fmt(computedPpi(w, h, specs.device.display_diagonal_in.value), 5)} `,
          provComputed(`hypot(${w},${h})/${specs.device.display_diagonal_in.value}`),
        ]),
      ),
      kv(
        "Pixel rate",
        el("span", {}, [
          `${fmt(pixelRate(w, h, specs.device.display_refresh_hz_max.value), 4)} px/s `,
          provComputed("width × height × 144"),
        ]),
      ),
    );
  } else {
    host.append(
      kv(
        "Clock power ratio",
        el("span", {}, [`${fmt(ultraToProPowerRatio(), 4)} `, provComputed("f_ultra / f_pro, αCV² cancels")]),
      ),
      note(
        "This level has no tighter published formula. The ratio above is still evaluated. Open CPU, GPU, lithography, or the transistor lab for the longer experiments.",
      ),
    );
  }
  return host;
}
