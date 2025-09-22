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
  pattern?: string;
}

export interface ValidateOptions {
  groups?: number;
  groupSize?: number;
  totalLength?: number;
  algorithm?: Algorithm;
  charset?: Charset;
  pattern?: string;
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

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildPatternRegex(pattern: string, charset: Charset): RegExp {
  const trimmed = pattern.trim();
  const klass = charset === "numeric" ? "\\d" : "[0-9A-Z]";
  let out = "";
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i];
    if (ch === "#") {
      out += klass;
    } else {
      out += escapeRegex(ch);
    }
  }
  return new RegExp(`^${out}$`);
}

function lastHashIndex(pattern: string): number {
  const p = pattern.trim();
  let idx = -1;
  for (let i = 0; i < p.length; i++) if (p[i] === "#") idx = i;
  return idx;
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
 * When `pattern` is provided, the last `#` in the pattern is used as the checksum position if an algorithm is selected;
 * the final ID matches the pattern exactly (no extra characters are appended).
 *
 * Checksum is computed over only the generated `#` characters, ignoring any literals in the pattern.
 *
 * @param options - Generation options including groups, groupSize, totalLength, separator, rng, useCrypto, algorithm, charset, and pattern.
 * @returns The generated ID string, optionally formatted with groups and separators.
 * @throws If invalid combinations of options are provided or total length is too short.
 */
export function generateId(options: GenerateOptions = {}): string {
  const charset = options.charset ?? "numeric";
  const algo = options.algorithm ?? "none";
  const rng = getRng(options);

  if (options.pattern && options.pattern.trim() !== "") {
    const pattern = options.pattern.trim();
    const hashPos = lastHashIndex(pattern);

    // If checksum is requested, we require at least one '#' to host it
    if (algo !== "none" && hashPos === -1) {
      throw new Error("pattern requires at least one '#' when a checksum algorithm is used");
    }

    let built = "";
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (ch === "#") {
        // If this is the checksum slot, fill later
        if (algo !== "none" && i === hashPos) {
          built += "#"; // placeholder for checksum to compute later
        } else {
          built += randChar(rng, charset);
        }
      } else {
        built += ch;
      }
    }

    if (algo === "none") {
      return built;
    }

    // Compute checksum over only the generated characters where the pattern has '#',
    // excluding the checksum slot; literals are ignored.
    let bodyForCheck = "";
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "#" && i !== hashPos) {
        bodyForCheck += built[i];
      }
    }

    let checkChar = "";
    if (algo === "luhn") {
      if (charset !== "numeric") throw new Error('algorithm "luhn" requires charset "numeric"');
      checkChar = String(luhnChecksumDigit(bodyForCheck));
    } else if (algo === "mod36") {
      if (charset !== "alphanumeric") throw new Error('algorithm "mod36" requires charset "alphanumeric"');
      checkChar = mod36CheckChar(bodyForCheck);
    }

    // Inject checksum into the checksum slot (last '#')
    let full = "";
    for (let i = 0; i < built.length; i++) {
      const ch = built[i];
      if (ch === "#" && i === hashPos) full += checkChar; else full += ch;
    }
    return full;
  }

  const groups = options.groups ?? DEFAULT_GROUPS;
  const groupSize = options.groupSize ?? DEFAULT_GROUP_SIZE;
  const total = options.totalLength ?? groups * groupSize;

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
 * When `pattern` is provided, the last `#` in the pattern is used as the checksum position if an algorithm is selected;
 * the input must match the pattern exactly, with the checksum character in the checksum slot.
 *
 * Checksum is computed over only the generated `#` characters, ignoring any literals in the pattern.
 *
 * @param input - The input ID string to validate.
 * @param opts - Validation options including groups, groupSize, totalLength, algorithm, charset, and optional pattern.
 * @returns True if the ID is valid according to the options; false otherwise.
 */
export function validateId(input: string, opts: ValidateOptions = {}): boolean {
  const groups = opts.groups ?? DEFAULT_GROUPS;
  const groupSize = opts.groupSize ?? DEFAULT_GROUP_SIZE;
  const expected = opts.totalLength ?? groups * groupSize;
  const charset = opts.charset ?? "numeric";
  const algo = opts.algorithm ?? "none";
  const pattern = opts.pattern?.trim() ?? "";

  if (pattern) {
    const inputStr = String(input);

    // No checksum: whole input must match the pattern
    if (algo === "none") {
      const re = buildPatternRegex(pattern, charset);
      return re.test(inputStr);
    }

    // With checksum: last '#' in the pattern is the checksum position
    const hashPos = lastHashIndex(pattern);
    if (hashPos === -1) return false; // checksum demanded but no slot

    // First, the entire input must match the pattern shape
    const reFull = buildPatternRegex(pattern, charset);
    if (!reFull.test(inputStr)) return false;

    const checkChar = inputStr[hashPos];

    // Build the body for checksum from only the generated '#' positions (excluding checksum slot)
    let bodyForCheck = "";
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === "#" && i !== hashPos) {
        bodyForCheck += inputStr[i];
      }
    }

    if (algo === "luhn") {
      if (charset !== "numeric") return false;
      if (!/^\d+$/.test(bodyForCheck)) return false;
      const expected = String(luhnChecksumDigit(bodyForCheck));
      return expected === checkChar;
    }

    if (algo === "mod36") {
      if (charset !== "alphanumeric") return false;
      const expected = mod36CheckChar(bodyForCheck.toUpperCase());
      return expected === checkChar.toUpperCase();
    }
  }

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
