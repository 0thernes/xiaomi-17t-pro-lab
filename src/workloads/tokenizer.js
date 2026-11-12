/**
 * GPT-2 byte-level BPE.
 * Reference implementation: Neuralese `src/tokenizer.js` (MIT, Alex Donahue,
 * https://github.com/0thernes/neuralese). This file is a clean port for the
 * vendored TinyStories vocab.json and merges.txt.
 */

function bytesToUnicode() {
  const bs = [];
  for (let i = 33; i <= 126; i++) bs.push(i);
  for (let i = 161; i <= 172; i++) bs.push(i);
  for (let i = 174; i <= 255; i++) bs.push(i);
  const cs = bs.slice();
  let n = 0;
  for (let b = 0; b < 256; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(256 + n);
      n += 1;
    }
  }
  const map = new Map();
  bs.forEach((b, i) => map.set(b, String.fromCharCode(cs[i])));
  return map;
}

const PAT = /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

export class GPT2Tokenizer {
  constructor(vocab, mergesText) {
    this.encoder = vocab;
    this.decoder = [];
    for (const [key, value] of Object.entries(vocab)) this.decoder[value] = key;
    this.ranks = new Map();
    let rank = 0;
    for (const line of mergesText.split("\n")) {
      if (!line || line.startsWith("#version")) continue;
      this.ranks.set(line, rank);
      rank += 1;
    }
    this.b2u = bytesToUnicode();
    this.u2b = new Map([...this.b2u].map(([b, u]) => [u, b]));
    this.cache = new Map();
    this.te = new TextEncoder();
    this.td = new TextDecoder("utf-8", { fatal: false });
  }

  bpe(token) {
    const cached = this.cache.get(token);
    if (cached) return cached;
    let word = Array.from(token);
    while (word.length > 1) {
      let best = null;
      let bestRank = Infinity;
      for (let i = 0; i < word.length - 1; i++) {
        const rank = this.ranks.get(`${word[i]} ${word[i + 1]}`);
        if (rank !== undefined && rank < bestRank) {
          bestRank = rank;
          best = i;
        }
      }
      if (best === null) break;
      const a = word[best];
      const b = word[best + 1];
      const next = [];
      for (let i = 0; i < word.length; i++) {
        if (i < word.length - 1 && word[i] === a && word[i + 1] === b) {
          next.push(a + b);
          i += 1;
        } else next.push(word[i]);
      }
      word = next;
    }
    this.cache.set(token, word);
    return word;
  }

  encode(text) {
    const ids = [];
    for (const match of text.matchAll(PAT)) {
      const bytes = this.te.encode(match[0]);
      let unicode = "";
      for (const byte of bytes) unicode += this.b2u.get(byte);
      for (const token of this.bpe(unicode)) {
        const id = this.encoder[token];
        if (id === undefined) throw new Error("Tokenizer missed a piece of the prompt");
        ids.push(id);
      }
    }
    return ids;
  }

  decode(ids) {
    const bytes = [];
    for (const id of ids) {
      const text = this.decoder[id] || "";
      for (const ch of text) bytes.push(this.u2b.get(ch));
    }
    return this.td.decode(new Uint8Array(bytes));
  }
}
