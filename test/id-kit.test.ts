import {
  generateId,
  validateId,
  normalizeId,
  formatId,
  luhnChecksumDigit,
  luhnValidate,
  normalizeIdForCharset,
} from "../src";
import { mod36CheckChar, mod36Validate } from "../src/mod36";
import { ALPHABET_BASE36, ALPHABET_NUM, mapToCharset, randChar } from "../src/alphabet";

function seeded(seed: number) {
  let s = seed >>> 0; // force to uint32
  return () => {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 0x100000000; // normalize to [0,1)
  };
}

interface CryptoLike {
  getRandomValues<T extends ArrayBufferView>(array: T): T;
}

function withMockCrypto<T>(mock: CryptoLike, run: () => T): T {
  const prevDesc = Object.getOwnPropertyDescriptor(globalThis as object, "crypto");
  Object.defineProperty(globalThis, "crypto", {
    value: mock,
    configurable: true,
    writable: true,
    enumerable: true,
  });
  try {
    return run();
  } finally {
    if (prevDesc) {
      Object.defineProperty(globalThis, "crypto", prevDesc);
    } else {
      // delete without `any`
      delete (globalThis as unknown as { crypto?: unknown }).crypto;
    }
  }
}

describe("id-kit", () => {
  // -----------------------------------------------------
  // Numeric (default) — generation & validation
  // -----------------------------------------------------
  describe("numeric (default)", () => {
    test("default: 16-digit random (Mullvad-style, no checksum)", () => {
      const id = generateId({ rng: seeded(12) });
      expect(id).toMatch(/^\d{16}$/);
      expect(validateId(id)).toBe(true);
    });

    test("default: 16-digit random (Mullvad-style, no checksum) unseeded", () => {
      const id = generateId();
      expect(id).toMatch(/^\d{16}$/);
      expect(validateId(id)).toBe(true);
    });

    test("works fine when totalLength is set without separator (no formatting involved)", () => {
      const id = generateId({ totalLength: 12, rng: seeded(4) });
      expect(id).toMatch(/^\d{12}$/);
      expect(validateId(id, { totalLength: 12 })).toBe(true);
    });

    test("custom length via groups/groupSize", () => {
      const id = generateId({ groups: 5, groupSize: 3, rng: seeded(123) });
      expect(id).toMatch(/^\d{15}$/);
      expect(validateId(id, { groups: 5, groupSize: 3 })).toBe(true);
    });

    test("validateId rejects non-digit input", () => {
      // Contains a letter after normalization
      expect(validateId("1234-5678-90AB-3452")).toBe(false);
    });

    test("generateId throws if totalLength < 2", () => {
      expect(() => generateId({ totalLength: 1 })).toThrow(/total length must be at least 2/i);
    });
  });

  // -----------------------------------------------------
  // Formatting
  // -----------------------------------------------------
  describe("formatting", () => {
    test("format and normalize", () => {
      const id = generateId({ rng: seeded(7) });
      const pretty = formatId(id, { separator: " " });
      expect(pretty).toMatch(/^\d{4} \d{4} \d{4} \d{4}$/);
      expect(normalizeId(pretty)).toBe(id);
      expect(validateId(pretty)).toBe(true);
    });

    test("formatId throws on wrong length", () => {
      const id = generateId(); // 16 digits
      // Remove one digit so length is wrong for default 4x4 formatting
      expect(() => formatId(id.slice(0, 15), { separator: " " })).toThrow(/expected 16 characters/i);
    });

    test("formats with default groups/groupSize when separator is provided and totalLength is omitted", () => {
      const id = generateId({ rng: seeded(5), separator: " " });
      expect(id).toMatch(/^\d{4} \d{4} \d{4} \d{4}$/);
    });

    test("formats with explicit groups/groupSize when totalLength is omitted", () => {
      const id = generateId({ groups: 5, groupSize: 3, rng: seeded(6), separator: "-" });
      expect(id).toMatch(/^\d{3}-\d{3}-\d{3}-\d{3}-\d{3}$/);
    });
  });

  // -----------------------------------------------------
  // Length / grouping conflicts
  // -----------------------------------------------------
  describe("length & grouping conflicts", () => {
    test("throws when totalLength conflicts with default groups/groupSize and separator is provided", () => {
      // default groups=4, groupSize=4 => expects 16, but totalLength=12
      expect(() =>
        generateId({ totalLength: 12, separator: "-", rng: seeded(1) }),
      ).toThrow(/conflict/i);
    });

    test("throws when totalLength conflicts with explicit groups/groupSize and separator is provided", () => {
      // groups*groupSize = 15, but totalLength=10
      expect(() =>
        generateId({ totalLength: 10, groups: 5, groupSize: 3, separator: "-", rng: seeded(2) }),
      ).toThrow(/conflict/i);
    });

    test("does NOT throw when totalLength matches groups*groupSize with separator", () => {
      // groups*groupSize = 12, totalLength=12 -> OK
      const id = generateId({
        totalLength: 12,
        groups: 3,
        groupSize: 4,
        separator: "-",
        rng: seeded(3),
      });
      expect(id).toMatch(/^\d{4}-\d{4}-\d{4}$/);
    });

    test("generateId respects totalLength and separator", () => {
      const id12 = generateId({ totalLength: 12, rng: seeded(5) });
      expect(id12).toMatch(/^\d{12}$/);

      const pretty = generateId({ rng: seeded(6), separator: "-" });
      expect(pretty).toMatch(/^\d{4}-\d{4}-\d{4}-\d{4}$/);
    });
  });

  // -----------------------------------------------------
  // Checksums: Luhn (numeric)
  // -----------------------------------------------------
  describe("checksums: luhn (numeric)", () => {
    test("luhn opt-in: last digit is checksum", () => {
      const id = generateId({ algorithm: "luhn", rng: seeded(9) });
      expect(id).toMatch(/^\d{16}$/);
      expect(validateId(id, { algorithm: "luhn" })).toBe(true);

      const last = Number(id.slice(-1)); // grab last digit
      const bad = id.slice(0, -1) + ((last + 1) % 10); // flip it
      expect(validateId(bad, { algorithm: "luhn" })).toBe(false);
    });

    test("luhnValidate rejects too-short input", () => {
      expect(luhnValidate("4")).toBe(false);
    });
  });

  // -----------------------------------------------------
  // RNG & Web Crypto
  // -----------------------------------------------------
  describe("rng & crypto", () => {
    test("generateId uses Web Crypto when available (useCrypto: true)", () => {
      const mock: CryptoLike = {
        getRandomValues<T extends ArrayBufferView>(array: T): T {
          // Deterministic fill without instanceof to avoid TS generic narrowing warnings
          const u8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
          u8.fill(0xbe);
          return array;
        },
      };

      const id = withMockCrypto(mock, () => generateId({ useCrypto: true }));

      expect(id).toMatch(/^\d{16}$/);
      expect(validateId(id)).toBe(true);
    });
  });

  // -----------------------------------------------------
  // Alphanumeric charset + mod36 checksum
  // -----------------------------------------------------
  describe("alphanumeric charset", () => {
    test("alphanumeric: generates 16 chars and validates (no checksum)", () => {
      const id = generateId({ charset: "alphanumeric", rng: seeded(42) });
      expect(id).toMatch(/^[0-9A-Z]{16}$/);
      expect(validateId(id, { charset: "alphanumeric" })).toBe(true);
    });

    test("alphanumeric + mod36: checksum roundtrip", () => {
      // fixed body to make assertion stable
      const body = "ABCDEFGH1234567"; // 15 chars
      const full = body + mod36CheckChar(body);
      expect(validateId(full, { charset: "alphanumeric", algorithm: "mod36" })).toBe(true);
      const bad = body + (full[full.length - 1] === "A" ? "B" : "A");
      expect(validateId(bad, { charset: "alphanumeric", algorithm: "mod36" })).toBe(false);
    });

    test("generateId with alphanumeric + mod36 actually appends the check char and validates", () => {
      const id = generateId({ charset: "alphanumeric", algorithm: "mod36", rng: seeded(9) });
      expect(id).toMatch(/^[0-9A-Z]{16}$/);
      expect(validateId(id, { charset: "alphanumeric", algorithm: "mod36" })).toBe(true);

      // also hit the formatted return path for alphanumeric
      const pretty = formatId(id, { charset: "alphanumeric", separator: " " });
      expect(pretty).toMatch(/^[0-9A-Z]{4}( [0-9A-Z]{4}){3}$/);
    });

    test("formatId works with alphanumeric groups", () => {
      const raw = "ABCD1234WXYZ5678";
      const pretty = formatId(raw, { charset: "alphanumeric", separator: " ", groups: 4, groupSize: 4 });
      expect(pretty).toBe("ABCD 1234 WXYZ 5678");
    });

    test("normalizeIdForCharset: alphanumeric uppercases + strips non-members", () => {
      const out = normalizeIdForCharset("ab-12_z!", "alphanumeric");
      expect(out).toBe("AB12Z");
    });

    test("reject invalid algorithm/charset combos", () => {
      expect(() => generateId({ charset: "alphanumeric", algorithm: "luhn" }))
        .toThrow(/requires charset "numeric"/i);
      expect(() => generateId({ charset: "numeric", algorithm: "mod36" }))
        .toThrow(/requires charset "alphanumeric"/i);
    });
  });

  // -----------------------------------------------------
  // Helpers: alphabet
  // -----------------------------------------------------
  describe("helpers: alphabet", () => {
    test("mapToCharset: numeric filters to digits only", () => {
      const out = mapToCharset("ab12 cd-3Z!", "numeric");
      expect(out).toBe("123"); // letters stripped, only digits kept
    });

    test("mapToCharset: alphanumeric uppercases + strips non-members", () => {
      const out = mapToCharset("ab12 cd-3z!", "alphanumeric");
      expect(out).toBe("AB12CD3Z");
      expect(/^[0-9A-Z]+$/.test(out)).toBe(true);
    });

    test("randChar: numeric uses 0..9 table", () => {
      const zero = () => 0;                 // idx 0
      const almostOne = () => 0.9999999;    // idx length-1
      expect(randChar(zero, "numeric")).toBe(ALPHABET_NUM[0]);               // '0'
      expect(randChar(almostOne, "numeric")).toBe(ALPHABET_NUM[ALPHABET_NUM.length - 1]); // '9'
    });

    test("randChar: alphanumeric uses 0..9A..Z table", () => {
      const zero = () => 0;                 // idx 0
      const almostOne = () => 0.9999999;    // idx 35
      expect(randChar(zero, "alphanumeric")).toBe(ALPHABET_BASE36[0]);               // '0'
      expect(randChar(almostOne, "alphanumeric")).toBe(ALPHABET_BASE36[ALPHABET_BASE36.length - 1]); // 'Z'
    });
  });

  // -----------------------------------------------------
  // Helpers: mod36
  // -----------------------------------------------------
  describe("helpers: mod36", () => {
    test("mod36CheckChar computes a check char for a valid body", () => {
      // Known simple body: sum % 36 === 0 -> check char = '0'
      expect(mod36CheckChar("0")).toBe("0");

      // Another stable example (non-trivial loop work):
      // Just sanity: should return a single base36 char
      const chk = mod36CheckChar("ABCDEFGH1234567");
      expect(chk).toMatch(/^[0-9A-Z]$/);
    });

    test("mod36CheckChar throws on non-[0-9A-Z] characters", () => {
      expect(() => mod36CheckChar("ABC-DEF")).toThrow(/mod36CheckChar/i);
      expect(() => mod36CheckChar("abc")).toThrow(/mod36CheckChar/i); // lower-case rejected
    });

    test("mod36Validate returns false for too-short input", () => {
      expect(mod36Validate("A")).toBe(false); // < 2 chars
    });

    test("mod36Validate returns false for invalid characters", () => {
      expect(mod36Validate("A$")).toBe(false);
    });

    test("mod36Validate passes for body+check from mod36CheckChar", () => {
      const body = "ABCDEFGH1234567";
      const full = body + mod36CheckChar(body);
      expect(mod36Validate(full)).toBe(true);
    });
  });

  // -----------------------------------------------------
  // Helpers: luhn
  // -----------------------------------------------------
  describe("helpers: luhnChecksumDigit", () => {
    test("computes classic known vector", () => {
      expect(luhnChecksumDigit("7992739871")).toBe(3);
    });

    test("computes 0 check digit correctly", () => {
      expect(luhnChecksumDigit("123456781234567")).toBe(0);
    });

    test("computes checksum for Mullvad-style body example", () => {
      expect(luhnChecksumDigit("853972828135579")).toBe(1);
    });

    test("throws on non-digit input", () => {
      expect(() => luhnChecksumDigit("123ABC")).toThrow();
    });
  });
});
