/****
 * Calculates the Luhn checksum digit for a given numeric string body.
 *
 * The Luhn algorithm is used to generate a checksum digit that can be appended to a number
 * to help detect errors in data entry or transmission. This function processes the input string
 * from right to left, doubling every second digit, subtracting 9 if the result is greater than 9,
 * and summing all the resulting digits. The checksum digit is the amount needed to round the sum
 * up to the next multiple of 10.
 *
 * @param {string} body - A string consisting only of digit characters (0-9). This represents the number body without the checksum digit.
 * @returns {number} The calculated checksum digit (0-9) that should be appended to the input to form a valid Luhn number.
 * @throws {Error} Throws an error if the input string contains any non-digit characters.
 */
export function luhnChecksumDigit(body: string): number {
  let sum = 0;
  let dbl = true;

  for (let i = body.length - 1; i >= 0; i--) {
    const code = body.charCodeAt(i) - 48;

    if (code < 0 || code > 9) throw new Error("Non-digit in luhnChecksumDigit");

    let v = code;

    if (dbl) {
      v *= 2;
      if (v > 9) v -= 9;
    }

    sum += v;
    dbl = !dbl;
  }

  const m = sum % 10;

  return m === 0 ? 0 : 10 - m;
}

/****
 * Validates a full numeric string including a checksum digit against the Luhn algorithm.
 *
 * This function checks if the input string consists of at least two digits, then separates the body
 * (all but the last digit) and the checksum digit (the last digit). It computes the expected checksum
 * digit for the body and compares it to the provided checksum digit.
 *
 * @param {string} full - A string of digits (at least two characters), where the last digit is the checksum digit.
 * @returns {boolean} Returns true if the checksum digit is valid according to the Luhn algorithm, false otherwise.
 */
export function luhnValidate(full: string): boolean {
  if (!/^\d{2,}$/.test(full)) return false;

  const body = full.slice(0, -1);
  const check = Number(full.slice(-1));

  return luhnChecksumDigit(body) === check;
}
