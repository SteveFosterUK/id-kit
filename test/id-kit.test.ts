import { generateId, validateId, normalizeId, formatId, luhnChecksumDigit, luhnValidate } from "../src";

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

  test("format and normalize", () => {
    const id = generateId({ rng: seeded(7) });
    const pretty = formatId(id, { separator: " " });

    expect(pretty).toMatch(/^\d{4} \d{4} \d{4} \d{4}$/);
    expect(normalizeId(pretty)).toBe(id);
    expect(validateId(pretty)).toBe(true);
  });


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

  test("works fine when totalLength is set without separator (no formatting involved)", () => {
    const id = generateId({ totalLength: 12, rng: seeded(4) });
    expect(id).toMatch(/^\d{12}$/);
    expect(validateId(id, { totalLength: 12 })).toBe(true);
  });

  test("formats with default groups/groupSize when separator is provided and totalLength is omitted", () => {
    const id = generateId({ rng: seeded(5), separator: " " });
    expect(id).toMatch(/^\d{4} \d{4} \d{4} \d{4}$/);
  });

  test("formats with explicit groups/groupSize when totalLength is omitted", () => {
    const id = generateId({ groups: 5, groupSize: 3, rng: seeded(6), separator: "-" });
    expect(id).toMatch(/^\d{3}-\d{3}-\d{3}-\d{3}-\d{3}$/);
  });

  test("luhn opt-in: last digit is checksum", () => {
    const id = generateId({ algorithm: "luhn", rng: seeded(9) });

    expect(id).toMatch(/^\d{16}$/);
    expect(validateId(id, { algorithm: "luhn" })).toBe(true);

    const last = Number(id.slice(-1));      // grab last digit
    const bad = id.slice(0, -1) + ((last + 1) % 10); // flip it

    expect(validateId(bad, { algorithm: "luhn" })).toBe(false);
  });

  test("custom length via groups/groupSize", () => {
    const id = generateId({ groups: 5, groupSize: 3, rng: seeded(123) });

    expect(id).toMatch(/^\d{15}$/);
    expect(validateId(id, { groups: 5, groupSize: 3 })).toBe(true);
  });

  test("generateId throws if totalLength < 2", () => {
    expect(() => generateId({ totalLength: 1 })).toThrow(/total length must be at least 2/i);
  });

  test("formatId throws on wrong length", () => {
    const id = generateId(); // 16 digits
    // Remove one digit so length is wrong for default 4x4 formatting
    expect(() => formatId(id.slice(0, 15), { separator: " " })).toThrow(/expected 16 digits/i);
  });

  test("validateId rejects non-digit input", () => {
    // Contains a letter after normalization
    expect(validateId("1234-5678-90AB-3452")).toBe(false);
  });

  test("generateId respects totalLength and separator", () => {
    const id12 = generateId({ totalLength: 12, rng: seeded(5) });
    expect(id12).toMatch(/^\d{12}$/);

    const pretty = generateId({ rng: seeded(6), separator: "-" });
    expect(pretty).toMatch(/^\d{4}-\d{4}-\d{4}-\d{4}$/);
  });

  test("generateId uses Web Crypto when available (useCrypto: true)", () => {
    const mock: CryptoLike = {
      getRandomValues<T extends ArrayBufferView>(array: T): T {
        // Fill deterministically so the test is stable
        if (array instanceof Uint32Array) {
          array[0] = 0xdeadbeef;
        } else {
          // For completeness if a different view is used later
          new Uint8Array(array.buffer, array.byteOffset, array.byteLength).fill(0xbe);
        }
        return array;
      },
    };

    const id = withMockCrypto(mock, () => generateId({ useCrypto: true }));

    expect(id).toMatch(/^\d{16}$/);
    expect(validateId(id)).toBe(true);
  });

  test("luhnValidate rejects too-short input", () => {
    expect(luhnValidate("4")).toBe(false);
  });

  describe("luhnChecksumDigit", () => {
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
