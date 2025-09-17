import { luhnChecksumDigit, luhnValidate } from "./luhn";
import { mapToCharset, randChar } from "./alphabet";
import { mod36CheckChar, mod36Validate } from "./mod36";

export type Charset = "numeric" | "alphanumeric";
export type Algorithm = "none" | "luhn" | "mod36";

export interface GenerateOptions {
  groups?: number;
  groupSize?: number;
  totalLength?: number;
  separator?: string;
  rng?: () => number;
  useCrypto?: boolean;
  algorithm?: Algorithm; // default "none" (pure random, Mullvad-style)
  charset?: Charset; // default "numeric" (digits only)
}

export interface ValidateOptions {
  groups?: number;
  groupSize?: number;
  totalLength?: number;
  algorithm?: Algorithm;
  charset?: Charset;
}

export interface FormatOptions {
  groups?: number;
  groupSize?: number;
  separator?: string;
  charset?: Charset;
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

/**
 * Normalizes an input string by mapping its characters to the "numeric" charset.
 * This removes or converts any characters not in the numeric set (digits 0-9).
 *
 * @param input - The input string to normalize.
 * @returns The normalized string consisting only of numeric characters.
 */
export function normalizeId(input: string): string {
  return mapToCharset(input, "numeric");
}

/**
 * Normalizes an input string by mapping its characters to the specified charset.
 * This removes or converts any characters not in the given charset.
 *
 * @param input - The input string to normalize.
 * @param charset - The target charset to map to ("numeric" or "alphanumeric").
 * @returns The normalized string consisting only of characters in the specified charset.
 */
export function normalizeIdForCharset(input: string, charset: Charset): string {
  return mapToCharset(input, charset);
}

/**
 * Formats an input string into groups separated by a specified separator.
 * The input is normalized to the given charset before formatting.
 * Throws an error if the input length does not match the expected total length.
 *
 * @param input - The input string to format.
 * @param opts - Formatting options including groups, groupSize, separator, and charset.
 * @returns The formatted string with groups separated by the separator.
 */
export function formatId(input: string, opts: FormatOptions = {}): string {
  const groups = opts.groups ?? DEFAULT_GROUPS;
  const groupSize = opts.groupSize ?? DEFAULT_GROUP_SIZE;
  const sep = opts.separator ?? " ";
  const charset = opts.charset ?? "numeric";

  const normalized = mapToCharset(input, charset);
  const expected = groups * groupSize;

  if (normalized.length !== expected) {
    throw new Error(`formatId: expected ${expected} characters, got ${normalized.length}`);
  }

  const parts: string[] = [];
  for (let i = 0; i < expected; i += groupSize) {
    parts.push(normalized.slice(i, i + groupSize));
  }
  return parts.join(sep);
}

/**
 * Generates a random ID string based on the provided options.
 * Supports numeric or alphanumeric charsets, optional grouping and separators,
 * and optional checksum algorithms ("luhn" for numeric, "mod36" for alphanumeric).
 *
 * @param options - Generation options including groups, groupSize, totalLength, separator, rng, useCrypto, algorithm, and charset.
 * @returns The generated ID string, optionally formatted with groups and separators.
 * @throws If invalid combinations of options are provided or total length is too short.
 */
export function generateId(options: GenerateOptions = {}): string {
  const groups = options.groups ?? DEFAULT_GROUPS;
  const groupSize = options.groupSize ?? DEFAULT_GROUP_SIZE;
  const total = options.totalLength ?? groups * groupSize;
  const charset = options.charset ?? "numeric";
  const algo = options.algorithm ?? "none";

  if (total < 2) throw new Error("generateId: total length must be at least 2");
  if (options.totalLength && options.separator && options.totalLength !== groups * groupSize) {
    throw new Error("totalLength conflicts with groups/groupSize when using separator");
  }
  if (algo === "luhn" && charset !== "numeric") {
    throw new Error('algorithm "luhn" requires charset "numeric"');
  }
  if (algo === "mod36" && charset !== "alphanumeric") {
    throw new Error('algorithm "mod36" requires charset "alphanumeric"');
  }

  const rng = getRng(options);

  // body excludes checksum when an algorithm is chosen
  let bodyLen = total;
  if (algo !== "none") bodyLen = total - 1;

  let body = "";
  if (charset === "numeric") {
    // keep the "no leading zero" UX for numeric bodies
    body += String(1 + Math.floor(rng() * 9)); // 1..9
    for (let i = 1; i < bodyLen; i++) body += String(Math.floor(rng() * 10));
  } else {
    for (let i = 0; i < bodyLen; i++) body += randChar(rng, "alphanumeric");
  }

  let full = body;
  if (algo === "luhn") {
    full = body + String(luhnChecksumDigit(body));
  } else if (algo === "mod36") {
    full = body + mod36CheckChar(body);
  }

  return options.separator
    ? formatId(full, { groups, groupSize, separator: options.separator, charset })
    : full;
}

/**
 * Validates an input ID string against the specified options.
 * Checks length, charset conformity, and optional checksum algorithms.
 *
 * @param input - The input ID string to validate.
 * @param opts - Validation options including groups, groupSize, totalLength, algorithm, and charset.
 * @returns True if the ID is valid according to the options; false otherwise.
 */
export function validateId(input: string, opts: ValidateOptions = {}): boolean {
  const groups = opts.groups ?? DEFAULT_GROUPS;
  const groupSize = opts.groupSize ?? DEFAULT_GROUP_SIZE;
  const expected = opts.totalLength ?? groups * groupSize;
  const charset = opts.charset ?? "numeric";
  const algo = opts.algorithm ?? "none";

  const normalized = mapToCharset(input, charset);
  if (normalized.length !== expected) return false;

  if (algo === "luhn") {
    if (!/^\d+$/.test(normalized)) return false;
    return luhnValidate(normalized);
  }

  if (algo === "mod36") {
    if (!/^[0-9A-Z]+$/.test(normalized)) return false;
    return mod36Validate(normalized);
  }

  // no checksum: just enforce charset membership (already normalized) & length
  return charset === "numeric" ? /^\d+$/.test(normalized) : /^[0-9A-Z]+$/.test(normalized);
}

export { luhnChecksumDigit, luhnValidate };
