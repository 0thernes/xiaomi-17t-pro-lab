import { validateSpecs } from "../src/sim/validate-specs.js";
import specs from "../data/specs.json" with { type: "json" };

const errors = validateSpecs(specs);
if (errors.length) {
  for (const error of errors) console.error(error);
  process.exit(1);
}
console.log(`specs.json ok (${errors.length} errors)`);
