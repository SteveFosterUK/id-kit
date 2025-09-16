import { ALPHABET_BASE36 } from "./alphabet";

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

export function mod36Validate(full: string): boolean {
  if (!/^[0-9A-Z]{2,}$/.test(full)) return false;

  const body = full.slice(0, -1);
  const check = full[full.length - 1];

  return mod36CheckChar(body) === check;
}
