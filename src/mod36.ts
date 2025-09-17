import { ALPHABET_BASE36 } from "./alphabet";

/**
 * Computes a mod-36 check character for an alphanumeric string consisting of characters [0-9, A-Z].
 *
 * The function sums the index values of each character in the input string according to the base36 alphabet,
 * then computes a check character such that the total sum including the check character is divisible by 36.
 *
 * @param {string} body - The input string containing only uppercase alphanumeric characters [0-9, A-Z].
 * @throws {Error} Throws an error if the input contains characters outside the allowed range.
 * @returns {string} The computed mod-36 check character.
 */
export function mod36CheckChar(body: string): string {
  if (!/^[0-9A-Z]+$/.test(body)) throw new Error("mod36CheckChar: non [0-9A-Z] in body");

  let sum = 0;

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    const v = ALPHABET_BASE36.indexOf(ch);

    sum += v;
  }

  const idx = (36 - (sum % 36)) % 36;
  return ALPHABET_BASE36[idx];
}

/**
 * Validates a string that includes a mod-36 check character at the end.
 *
 * The input string must be at least two characters long and contain only uppercase alphanumeric characters [0-9, A-Z].
 * The function separates the body and the check character, computes the expected check character from the body,
 * and returns whether the provided check character matches the computed one.
 *
 * @param {string} full - The input string with the last character as the mod-36 check character.
 * @returns {boolean} True if the check character is valid for the body; false otherwise or if input is invalid.
 */
export function mod36Validate(full: string): boolean {
  if (!/^[0-9A-Z]{2,}$/.test(full)) return false;

  const body = full.slice(0, -1);
  const check = full[full.length - 1];

  return mod36CheckChar(body) === check;
}
