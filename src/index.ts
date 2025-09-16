import { luhnChecksumDigit, luhnValidate } from "./luhn";

export type Algorithm = "none" | "luhn";

export interface GenerateOptions {
  groups?: number;
  groupSize?: number;
  totalLength?: number;
  separator?: string;
  rng?: () => number;
  useCrypto?: boolean;
  algorithm?: Algorithm; // default "none" (pure random, Mullvad-style)
}

export interface ValidateOptions {
  groups?: number;
  groupSize?: number;
  totalLength?: number;
  algorithm?: Algorithm;
}

export interface FormatOptions {
  groups?: number;
  groupSize?: number;
  separator?: string;
}

const DEFAULT_GROUPS = 4;
const DEFAULT_GROUP_SIZE = 4;

interface CryptoLike {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

type GlobalWithCrypto = typeof globalThis & { crypto?: CryptoLike };

function getRng(opts: { rng?: () => number; useCrypto?: boolean }): () => number {
  if (opts.rng) return opts.rng;

  const g = globalThis as GlobalWithCrypto;
  if (opts.useCrypto && g.crypto) {
    const buf = new Uint32Array(1);

    return () => {
      g.crypto!.getRandomValues(buf);

      return buf[0] / 0x1_0000_0000;
    };
  }

  return Math.random;
}

export function normalizeId(input: string): string {
  return input.replace(/\D+/g, "");
}

export function formatId(input: string, opts: FormatOptions = {}): string {
  const groups = opts.groups ?? DEFAULT_GROUPS;
  const groupSize = opts.groupSize ?? DEFAULT_GROUP_SIZE;
  const sep = opts.separator ?? " ";
  const digits = normalizeId(input);
  const expected = groups * groupSize;

  if (digits.length !== expected) {
    throw new Error(`formatId: expected ${expected} digits, got ${digits.length}`);
  }

  const parts: string[] = [];

  for (let i = 0; i < expected; i += groupSize) {
    parts.push(digits.slice(i, i + groupSize));
  }

  return parts.join(sep);
}

/**
 * Default: 16 random digits (Mullvad-style, no checksum).
 * If algorithm === "luhn", last digit is checksum.
 */
export function generateId(options: GenerateOptions = {}): string {
  const groups = options.groups ?? DEFAULT_GROUPS;
  const groupSize = options.groupSize ?? DEFAULT_GROUP_SIZE;
  const total = options.totalLength ?? groups * groupSize;

  if (total < 2) throw new Error("generateId: total length must be at least 2");

  if (options.totalLength && options.separator && options.totalLength !== groups * groupSize) {
    throw new Error("totalLength conflicts with groups/groupSize when using separator");
  }

  const rng = getRng(options);
  const algo = options.algorithm ?? "none";

  let bodyLen = total;
  if (algo === "luhn") bodyLen = total - 1;

  let body = String(1 + Math.floor(rng() * 9)); // 1..9

  for (let i = 1; i < bodyLen; i++) {
    body += String(Math.floor(rng() * 10)); // 0..9
  }

  let full = body;

  if (algo === "luhn") {
    full = body + String(luhnChecksumDigit(body));
  }

  return options.separator
    ? formatId(full, { groups, groupSize, separator: options.separator })
    : full;
}

export function validateId(input: string, opts: ValidateOptions = {}): boolean {
  const groups = opts.groups ?? DEFAULT_GROUPS;
  const groupSize = opts.groupSize ?? DEFAULT_GROUP_SIZE;
  const expected = opts.totalLength ?? groups * groupSize;
  const digits = normalizeId(input);

  if (digits.length !== expected) return false;
  if (!/^\d+$/.test(digits)) return false;

  const algo = opts.algorithm ?? "none";

  if (algo === "luhn") return luhnValidate(digits);

  return true;
}

export { luhnChecksumDigit, luhnValidate };
