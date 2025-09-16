import { Charset } from "./index";

export const ALPHABET_NUM = "0123456789";
export const ALPHABET_BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function mapToCharset(input: string, charset: Charset): string {
  // normalize grouping-friendly inputs: strip non-members; uppercase if needed
  const src = charset === "alphanumeric" ? input.toUpperCase() : input;
  const allowed = charset === "alphanumeric" ? ALPHABET_BASE36 : ALPHABET_NUM;
  let out = "";
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (allowed.indexOf(ch) !== -1) out += ch;
  }
  return out;
}

export function randChar(rng: () => number, charset: Charset): string {
  const table = charset === "alphanumeric" ? ALPHABET_BASE36 : ALPHABET_NUM;
  return table[Math.floor(rng() * table.length)];
}
