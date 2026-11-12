import { el, kv, note, panel } from "../dom.js";
import { provCited } from "../provenance.js";
import { conflictsById, getSpecs, openItems } from "../specs.js";

export async function mount(main) {
  const specs = getSpecs();
  const opens = openItems();
  const fresh = conflictsById([16, 17, 18, 19, 20]);
  main.replaceChildren(
    el("h1", {}, ["Specs"]),
    el("p", { class: "lede" }, [
      "Every hardware figure on this site is a leaf of specs.json. Confirmed, unconfirmed, and unknown travel together. The nine items below are still open.",
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
    panel("Conflicts 16–20", [
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
