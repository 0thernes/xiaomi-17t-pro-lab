/**
 * Tiny in-order pipeline. Five stages, one instruction per stage.
 * A load uses `loadLatency` extra execute cycles. A following instruction
 * that reads that destination stalls in issue until the load writes back.
 * This is a teaching model of a hazard, not the unpublished C1 microarchitecture.
 */

export function createPipeline(program, { loadLatency = 3 } = {}) {
  const regs = new Int32Array(8);
  const mem = new Int32Array(32);
  mem[0] = 7;
  const stages = { fetch: null, decode: null, issue: null, execute: null, writeback: null };
  const pc = { value: 0 };
  let cycle = 0;
  let stalls = 0;
  let retired = 0;
  const pending = new Map();

  function readReg(index, who) {
    if (pending.has(index)) return { stall: true, who };
    return { stall: false, value: regs[index] };
  }

  function tick() {
    cycle += 1;
    let stalled = false;
    if (stages.writeback) {
      const inst = stages.writeback;
      if (inst.dst != null) {
        regs[inst.dst] = inst.result;
        pending.delete(inst.dst);
      }
      retired += 1;
      stages.writeback = null;
    }
    if (stages.execute && !stages.writeback) {
      const inst = stages.execute;
      inst.left -= 1;
      if (inst.left <= 0) {
        stages.writeback = inst;
        stages.execute = null;
      }
    }
    if (stages.issue && !stages.execute) {
      const inst = stages.issue;
      if (inst.op === "add" || inst.op === "mov") {
        const a = readReg(inst.a);
        const b = inst.op === "add" ? readReg(inst.b) : { stall: false, value: 0 };
        if (a.stall || b.stall) stalled = true;
        else {
          inst.result = inst.op === "add" ? a.value + b.value : a.value;
          inst.left = 1;
          if (inst.dst != null) pending.set(inst.dst, inst);
          stages.execute = inst;
          stages.issue = null;
        }
      } else if (inst.op === "load") {
        inst.result = mem[inst.addr];
        inst.left = loadLatency;
        if (inst.dst != null) pending.set(inst.dst, inst);
        stages.execute = inst;
        stages.issue = null;
      }
    }
    if (stages.decode && !stages.issue && !stalled) {
      stages.issue = stages.decode;
      stages.decode = null;
    }
    if (stages.fetch && !stages.decode) {
      stages.decode = stages.fetch;
      stages.fetch = null;
    }
    if (!stages.fetch && pc.value < program.length && !stalled) {
      stages.fetch = { ...program[pc.value], id: pc.value };
      pc.value += 1;
    }
    if (stalled) stalls += 1;
    const occupied = Object.entries(stages)
      .filter(([, inst]) => inst)
      .map(([name, inst]) => ({ stage: name, op: inst.op, id: inst.id }));
    return { cycle, stalls, retired, occupied, regs: Array.from(regs), done: retired >= program.length };
  }

  return { tick, stages };
}
