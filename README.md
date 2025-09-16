# id-kit

Generate and validate **structured numeric IDs**.  
**Default:** Mullvad-style **16 random digits** (no checksum).  
**Optional:** `algorithm: "luhn"` for checksum-validated IDs.  
**Zero runtime dependencies.** TypeScript. ESM + CJS.

[![CI](https://github.com/SteveFosterUK/id-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/SteveFosterUK/id-kit/actions)  
_(Add npm badge after publishing)_

## Install

```bash
npm i id-kit
```

## Usage

```ts
import { generateId, validateId, formatId, normalizeId } from "id-kit";

const id = generateId(); // "8539728281355797"
validateId(id); // true
formatId(id, { separator: " " }); // "8539 7282 8135 5797"
normalizeId("8539 7282 8135 5797"); // "8539728281355797"

const luhnId = generateId({ algorithm: "luhn" });
validateId(luhnId, { algorithm: "luhn" }); // true
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
