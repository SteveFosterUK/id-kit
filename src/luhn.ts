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

export function luhnValidate(full: string): boolean {
  if (!/^\d{2,}$/.test(full)) return false;

  const body = full.slice(0, -1);
  const check = Number(full.slice(-1));

  return luhnChecksumDigit(body) === check;
}
