import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

/** @type {import('eslint').Linter.FlatConfig[]} */
export default [
  // Ignore build artifacts and deps
  { ignores: ["dist/**", "coverage/**", "node_modules/**"] },

  // TypeScript files (src + test)
  ...tseslint.configs.recommended, // parser + plugin + recommended rules
  {
    files: ["src/**/*.ts", "test/**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },

  // Jest config (CJS) – scope JS rules only to this file
  {
    files: ["jest.config.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      ecmaVersion: "latest",
      globals: {
        module: "readonly",
        require: "readonly",
        exports: "readonly",
      },
    },
    // No need to lint dist/*.cjs
    rules: {},
  },

  // Let Prettier handle formatting
  eslintConfigPrettier,
];
