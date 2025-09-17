import { Charset } from "./index";

/**
 * The set of numeric characters, containing digits 0 through 9.
 * Used for numeric-only charsets and normalization.
 */
export const ALPHABET_NUM = "0123456789";

/**
 * The set of base36 alphanumeric characters, containing digits 0-9 and uppercase letters A-Z.
 * Used for alphanumeric charsets and normalization.
 */
export const ALPHABET_BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Normalizes the input string to only include allowed characters for the specified charset.
 * Strips out any characters not in the charset, and uppercases the input if using the alphanumeric charset.
 *
 * @param input - The input string to normalize.
 * @param charset - The character set to use ("numeric" or "alphanumeric").
 * @returns The normalized string containing only allowed characters.
 */
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

/**
 * Picks a random character from the allowed charset using the provided RNG function.
 *
 * @param rng - A function that returns a random number between 0 (inclusive) and 1 (exclusive).
 * @param charset - The character set to use ("numeric" or "alphanumeric").
 * @returns A single random character from the allowed charset.
 */
export function randChar(rng: () => number, charset: Charset): string {
  const table = charset === "alphanumeric" ? ALPHABET_BASE36 : ALPHABET_NUM;
  return table[Math.floor(rng() * table.length)];
}
