/**
 * Documented A64 encodings only. Not a general disassembler and not firmware.
 * Encodings from the Arm Architecture Reference Manual, as listed in
 * docs/research/deep-dive.md.
 */

export const DOCUMENTED_WORDS = Object.freeze({
  NOP: 0xd503201f,
  RET_X30: 0xd65f03c0,
  SVC_0: 0xd4000001,
  ADD_X0_X1_X2: 0x8b020020,
});

const SHIFT = ["LSL", "LSR", "ASR", "ROR"];

export function decodeA64(word) {
  const w = word >>> 0;
  if (w === DOCUMENTED_WORDS.NOP) {
    return {
      mnemonic: "NOP",
      detail: "HINT #0, alias of NOP",
      fields: [{ name: "word", bits: "31:0", value: hex(w) }],
    };
  }
  // Unconditional branch to register: 1101011 00 10 11111 000000 Rn 00000
  // Masks are forced unsigned. JS bitwise ops are signed, and these opcodes set bit 31.
  if ((w & 0xfffffc1f) >>> 0 === 0xd65f0000) {
    const rn = (w >>> 5) & 31;
    return {
      mnemonic: rn === 30 ? "RET" : `BR X${rn}`,
      detail: rn === 30 ? "RET X30" : "branch to register (not the documented RET X30)",
      fields: [
        { name: "opc", bits: "31:21", value: "11010110010" },
        { name: "Rn", bits: "9:5", value: rn },
        { name: "op2", bits: "4:0", value: w & 31 },
      ],
    };
  }
  // SVC: 1101 0100 000 imm16 00001
  if ((w & 0xffe0001f) >>> 0 === 0xd4000001) {
    const imm = (w >>> 5) & 0xffff;
    return {
      mnemonic: `SVC #${imm}`,
      detail: "Supervisor call into a higher exception level",
      fields: [
        { name: "opc", bits: "31:21", value: "11010100000" },
        { name: "imm16", bits: "20:5", value: imm },
      ],
    };
  }
  // Add/sub shifted register: sf op S 01011 shift 0 Rm imm6 Rn Rd
  if (((w >>> 24) & 0x1f) === 0b01011 && ((w >>> 21) & 1) === 0) {
    const sf = (w >>> 31) & 1;
    const op = (w >>> 30) & 1;
    const S = (w >>> 29) & 1;
    const shift = (w >>> 22) & 3;
    const rm = (w >>> 16) & 31;
    const imm6 = (w >>> 10) & 63;
    const rn = (w >>> 5) & 31;
    const rd = w & 31;
    if (sf === 1 && op === 0 && S === 0 && shift !== 3) {
      const reg = (r) => `X${r}`;
      const shiftText = imm6 === 0 ? "" : `, ${SHIFT[shift]} #${imm6}`;
      return {
        mnemonic: `ADD ${reg(rd)}, ${reg(rn)}, ${reg(rm)}${shiftText}`,
        detail: "ADD (shifted register), 64-bit",
        fields: [
          { name: "sf", bits: "31", value: sf },
          { name: "op", bits: "30", value: op },
          { name: "S", bits: "29", value: S },
          { name: "shift", bits: "23:22", value: SHIFT[shift] },
          { name: "Rm", bits: "20:16", value: rm },
          { name: "imm6", bits: "15:10", value: imm6 },
          { name: "Rn", bits: "9:5", value: rn },
          { name: "Rd", bits: "4:0", value: rd },
        ],
      };
    }
  }
  return null;
}

export function toBitString(word) {
  return (word >>> 0).toString(2).padStart(32, "0");
}

function hex(word) {
  return `0x${(word >>> 0).toString(16).toUpperCase().padStart(8, "0")}`;
}

export { hex as toHex };
