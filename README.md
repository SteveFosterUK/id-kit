# id-kit

Generate and validate **structured IDs**.
- ✅ Supports **numeric** or **alphanumeric (A–Z, 0–9)** charsets
- ✅ Optional checksum (`luhn` for numeric, `mod36` for alphanumeric)
- ✅ Flexible formatting (grouping, separators)
- ✅ Configurable RNG (`Math.random`, Web Crypto, or custom seeded RNG)
- ✅ Zero runtime dependencies • TypeScript types included • ESM + CJS

[![CI](https://github.com/SteveFosterUK/id-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/SteveFosterUK/id-kit/actions)

---

## Install

```bash
npm i idkit
```

## Quick Start

```ts
import { generateId, validateId, formatId, normalizeId } from "id-kit";

// Default: 16 random digits
const id = generateId();
validateId(id);                    // true
formatId(id, { separator: " " });  // "1234 5678 9012 3456"
normalizeId("1234 5678-9012 3456") // "1234567890123456"

// Numeric with Luhn checksum
const luhnId = generateId({ algorithm: "luhn" });
validateId(luhnId, { algorithm: "luhn" }); // true

// Alphanumeric (A–Z, 0–9), no checksum
const a = generateId({ charset: "alphanumeric" });

// Alphanumeric with mod36 checksum
const aChk = generateId({ charset: "alphanumeric", algorithm: "mod36" });
validateId(aChk, { charset: "alphanumeric", algorithm: "mod36" }); // true
```

## Scripts

```bash
npm run build
npm test
npm run lint
npm run format
```

## License

MIT
