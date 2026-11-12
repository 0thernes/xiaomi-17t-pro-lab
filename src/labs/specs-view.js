import { el, kv, note, panel } from "../dom.js";
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

function recordList(entries) {
  return entries.map((item) =>
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
  const fresh = conflictsById([16, 17, 18, 19, 20, 21, 22]);
  const xiaomiWle = specs.competitors.xiaomi_17t_pro["3dmark_wle_ul_median"];
  const iphoneWle = specs.competitors.iphone_18_pro_max["3dmark_wle_ul_median"];
  main.replaceChildren(
    el("h1", {}, ["Specs"]),
    el("p", { class: "lede" }, [
      "Every hardware figure on this site is a leaf of specs.json. Confirmed, unconfirmed, and unknown travel together. Pass 2 adds the parts catalog, versions, issues, and supply chain. FCC photographs are not in this repo.",
    ]),
    panel("Still open", [
      el(
        "ol",
        { class: "open-list" },
        opens.map((item) =>
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
    ]),
    panel("Parts", [note(specs.parts._note), ...recordList(recordEntries("parts"))]),
    panel("Versions", recordList(recordEntries("versions"))),
    panel("Issues", [
      ...specs.issues.map((item) =>
        el("div", { class: "kv" }, [
          el("div", { class: "kv-label" }, [`${item.id} ${item.classification}`]),
          el("div", { class: "kv-value" }, [
            el("strong", {}, [item.topic]),
            " ",
            provCited({ ...item, value: item.topic }),
            el("p", {}, [item.summary]),
          ]),
        ]),
      ),
    ]),
    panel("Supply chain", [note(specs.supply_chain._note), ...recordList(recordEntries("supply_chain"))]),
    panel("Conflicts 16–22", [
      ...fresh.map((item) =>
        el("div", { class: "kv" }, [
          el("div", { class: "kv-label" }, [`#${item.id} ${item.classification}`]),
          el("div", { class: "kv-value" }, [el("strong", {}, [item.topic]), el("p", {}, [item.summary])]),
        ]),
      ),
      note(
        "Classification is the one stored on the conflict. #19 keeps both transistor estimates visible: the leaf is ~30 billion, Kurnal’s library estimate is about 27.3 billion.",
      ),
    ]),
    panel("Headlines that changed", [
      kv(
        "Die",
        el("span", {}, [
          `${specs.soc.die_size_mm2.value} ${specs.soc.die_size_mm2.unit} `,
          provCited(specs.soc.die_size_mm2),
        ]),
      ),
      kv(
        "Package",
        el("span", {}, [String(specs.soc.package_this_phone.value), " ", provCited(specs.soc.package_this_phone)]),
      ),
      kv("GPU clock", el("span", {}, [`${specs.soc.gpu_clock_mhz.value} MHz `, provCited(specs.soc.gpu_clock_mhz)])),
      kv("DRAM", el("span", {}, [String(specs.device.dram_vendor.value), " ", provCited(specs.device.dram_vendor)])),
      kv("UFS", el("span", {}, [String(specs.parts.ufs.value), " ", provCited(specs.parts.ufs)])),
      kv("PMIC", el("span", {}, [String(specs.device.pmic.value), " ", provCited(specs.device.pmic)])),
      kv(
        "Wild Life Extreme",
        el("span", {}, [
          `17T Pro ${xiaomiWle.value} vs iPhone ${iphoneWle.value}. The iPhone wins on the same UL source. `,
          provCited(xiaomiWle),
        ]),
      ),
      kv("Codename", el("span", {}, [String(specs.versions.codename.value), " ", provCited(specs.versions.codename)])),
      kv("Kernel", el("span", {}, [String(specs.versions.kernel.value), " ", provCited(specs.versions.kernel)])),
      kv("NPU", el("span", {}, [`${specs.soc.npu_tops.value} TOPS `, provCited(specs.soc.npu_tops)])),
      kv(
        "USB",
        el("span", {}, [String(specs.device.phone_usb_data.value), " ", provCited(specs.device.phone_usb_data)]),
      ),
      kv(
        "Fingerprint",
        el("span", {}, [String(specs.device.fingerprint.value), " ", provCited(specs.device.fingerprint)]),
      ),
    ]),
  );
  return { dispose() {} };
}
