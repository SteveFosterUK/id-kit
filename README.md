# structured-id

Generate and validate **structured IDs** with ease and flexibility.

- ✅ Supports **numeric** (0–9) or **alphanumeric (A–Z, 0–9)** charsets
- ✅ Optional checksum (`luhn` for numeric, `mod36` for alphanumeric)
- ✅ Flexible formatting (grouping, separators)
- ✅ Configurable RNG (`Math.random`, Web Crypto via `useCrypto`, or custom seeded RNG)
- ✅ Zero runtime dependencies • TypeScript types included • ESM + CJS

[![CI](https://github.com/SteveFosterUK/structured-id/actions/workflows/ci.yml/badge.svg)](https://github.com/SteveFosterUK/structured-id/actions)
[![npm version](https://img.shields.io/npm/v/structured-id.svg)](https://www.npmjs.com/package/structured-id)
[![License](https://img.shields.io/npm/l/structured-id)](https://github.com/SteveFosterUK/structured-id/blob/main/LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue?logo=typescript)
![ESM + CJS](https://img.shields.io/badge/modules-ESM%20%2B%20CJS-green)
[![GitHub Repo](https://img.shields.io/badge/github-structured--id-181717?logo=github)](https://github.com/SteveFosterUK/structured-id)
[![GitHub issues](https://img.shields.io/github/issues/SteveFosterUK/structured-id)](https://github.com/SteveFosterUK/structured-id)
---

## What is a Structured ID?

A **Structured ID** is an identifier generated with a **predefined structure**.
Unlike a raw random string, a structured ID follows rules you define at generation time, such as:

- **Length** — total number of characters (e.g. 16, 20, 24).
- **Grouping** — split into chunks for readability (e.g. `1234-5678-9012-3456`).
- **Charset** — restrict characters (numeric only, or alphanumeric uppercase).
- **Checksum (optional)** — append a validation digit/character to detect typos.

For example, you can generate a 16-character alphanumeric ID with a mod36 checksum, grouped into 4 groups of 4 characters each, making it easy to read and verify:

```ts
import { generateId, formatId, validateId } from "structured-id";

// generate a 16-character alphanumeric ID with mod36 checksum
const id = generateId({ charset: "alphanumeric", totalLength: 16, algorithm: "mod36" });
const formatted = formatId(id, { separator: "-", groupSize: 4, charset: "alphanumeric" });

console.log("Raw ID:", id);
// e.g. "AB12CD34EF56GH78"

console.log("Formatted ID:", formatted);
// e.g. "AB12-CD34-EF56-GH78"

console.log("Is valid?", validateId(id, { charset: "alphanumeric", algorithm: "mod36" })); // true
```

Structured IDs are ideal for cases where codes need to be both **human-friendly** and **machine-validated**, such as:

- Anonymous user IDs
- Invite codes
- Voucher / coupon codes
- Access tokens
- Simple one-time passwords (OTPs)

The **structured-id** library provides a clean, dependency-free way to generate and validate these IDs.

---

## Install

Install the package via npm:

```bash
npm i structured-id
```

or using yarn:

```bash
yarn add structured-id
```

---

## Quick Start

```ts
import { generateId, validateId, formatId, normalizeId } from "structured-id";

// Generate a default ID: 16 random digits (numeric charset, no checksum)
const id = generateId();

console.log("Generated ID:", id);
// e.g. "1234567890123456"

// Validate the generated ID (numeric, no checksum)
const isValid = validateId(id);
console.log("Is valid?", isValid); // true

// Format the ID with spaces every 4 characters
const formatted = formatId(id, { separator: " " });
console.log("Formatted ID:", formatted); // e.g. "1234 5678 9012 3456"

// Normalize an ID by removing spaces and separators
const normalized = normalizeId("1234 5678-9012 3456");
console.log("Normalized ID:", normalized); // "1234567890123456"

// Generate a numeric ID with Luhn checksum
const luhnId = generateId({ algorithm: "luhn" });
console.log("Luhn ID:", luhnId);

console.log("Luhn ID valid?", validateId(luhnId, { algorithm: "luhn" })); // true

// Generate an alphanumeric ID (A–Z, 0–9) without checksum
const alphaNumId = generateId({ charset: "alphanumeric" });
console.log("Alphanumeric ID:", alphaNumId);

// Generate an alphanumeric ID with mod36 checksum
const alphaNumChkId = generateId({ charset: "alphanumeric", algorithm: "mod36" });
console.log("Alphanumeric with checksum:", alphaNumChkId);

console.log("Alphanumeric with checksum valid?", validateId(alphaNumChkId, { charset: "alphanumeric", algorithm: "mod36" })); // true

// Format an alphanumeric ID with dashes every 4 characters
console.log(formatId(alphaNumId, { separator: "-", groupSize: 4, charset: "alphanumeric" })); // e.g. "AB12-CD34-EF56-GH78"

// Generate an ID using Web Crypto RNG
const cryptoId = generateId({ useCrypto: true });
console.log("Crypto RNG ID:", cryptoId);
```

---

## Options

You can customize ID generation, validation, and formatting using the following options:

| Option       | Description                                                                                  | Default          |
|--------------|----------------------------------------------------------------------------------------------|------------------|
| `totalLength`| Total length of the ID including checksum if used                                           | 16               |
| `charset`    | Character set to use: `"numeric"` (digits 0–9) or `"alphanumeric"` (A–Z, 0–9)                | `"numeric"`      |
| `algorithm`  | Checksum algorithm to use: `"luhn"` (numeric), `"mod36"` (alphanumeric), or `"none"`        | `"none"`         |
| `separator`  | Character to use as group separator in formatting (e.g., `" "`, `"-"`)                       | `undefined`      |
| `groups`     | Number of groups used for formatting and default length calculation (`groups * groupSize`) | 4 |
| `groupSize`  | Number of characters per group for formatting                                               | 4                |
| `rng`        | Custom random number generator function to use (defaults to `Math.random`)                   | `Math.random`    |
| `useCrypto`  | Use Web Crypto API for RNG instead of `Math.random`                                         | `false`          |

---

## `validateId`

Validate an ID string for correctness, optionally verifying checksum and charset.

```ts
import { validateId } from "structured-id";

const id = "79927398713"; // Example numeric ID with Luhn checksum

// Validate numeric ID with Luhn checksum
const valid = validateId(id, { algorithm: "luhn" });
console.log(valid); // true or false
```

Options:

- `charset`: `"numeric"` or `"alphanumeric"` (default `"numeric"`)
- `algorithm`: `"luhn"`, `"mod36"`, or `"none"`

---

## `formatId`

Format an ID string by adding separators at regular intervals.

```ts
import { formatId } from "structured-id";

const id = "1234567890123456";

// Format with dashes every 4 characters
const formatted = formatId(id, { separator: "-", groupSize: 4 });
console.log(formatted); // "1234-5678-9012-3456"
```

Options:

- `groups`: number of groups (default `4`)
- `charset`: `"numeric"` or `"alphanumeric"` (default `"numeric"`)
- `separator`: string to insert between groups (e.g., `" "`, `"-"`)
- `groupSize`: number of characters per group (default `4`)

---

## Normalization helpers

Normalize ID strings by removing all whitespace and separators to obtain the raw ID.

```ts
import { normalizeId } from "structured-id";

const messyId = "1234 5678-9012 3456";
const normalized = normalizeId(messyId);
console.log(normalized); // "1234567890123456"
```

---

## Checksum helpers

You can use the included checksum helper functions directly if needed:

- `luhnChecksumDigit(id: string): string` — Generates a Luhn checksum digit for a numeric string.
- `luhnValidate(id: string): boolean` — Validates a numeric string using the Luhn algorithm.
- `mod36CheckChar(id: string): string` — Generates a mod36 checksum character for an alphanumeric string.
- `mod36Validate(id: string): boolean` — Validates an alphanumeric string using mod36 checksum.

Example:

```ts
import { luhnValidate, luhnChecksumDigit } from "structured-id";

const partialId = "7992739871";
const checksum = luhnChecksumDigit(partialId);
const fullId = partialId + checksum;

console.log(luhnValidate(fullId)); // true
```

---

## Comparison Guide

| Charset       | Algorithm | Description                         | ID Length | Checksum Length | Notes                                |
|---------------|-----------|-----------------------------------|-----------|-----------------|-------------------------------------|
| `numeric`     | `luhn`    | Numeric digits with Luhn checksum | 15        | 1               | Common for credit cards and IDs     |
| `alphanumeric`| `mod36`   | Alphanumeric with mod36 checksum  | 15        | 1               | Supports A–Z and digits 0–9          |
| `numeric`     | `none`    | Numeric digits only               | 16        | 0               | Simple random numeric IDs            |
| `alphanumeric`| `none`    | Alphanumeric only                | 16        | 0               | Random alphanumeric IDs              |

---

## Entropy and Rule of Thumb

| Charset       | Bits per Character | Example ID Length | Approximate Entropy (bits) |
|---------------|--------------------|-------------------|----------------------------|
| Numeric (0–9) | 3.32               | 16                | 53                         |
| Alphanumeric (A–Z, 0–9) | 5.17        | 16                | 83                         |

**Rule of Thumb:**
- Use **numeric + Luhn** for compatibility and simplicity when only digits are allowed.
- Use **alphanumeric + mod36** when you need a larger character space and stronger entropy per character.
- Adjust `totalLength` to meet your entropy/security requirements.

---

## RNG Options

By default, `structured-id` uses `Math.random()` as the random number generator, but you can enable Web Crypto RNG by setting `useCrypto: true`:

```ts
import { generateId } from "structured-id";

const id = generateId({ useCrypto: true });
console.log(id);
```

You may also provide seeded or custom RNG functions for deterministic ID generation (useful for testing):

```ts
import { generateId } from "structured-id";

// Custom RNG example
const customRng = () => {
  // deterministic or seeded RNG implementation
  return 0.5;
};

const id = generateId({ rng: customRng });
console.log(id);
```

---

## License

MIT © Steve Foster
