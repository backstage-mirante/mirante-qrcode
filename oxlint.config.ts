import { defineConfig } from "oxlint"

const antiSlopRules = {
  "anti-slop/no-chained-type-assertions": "error",
  "anti-slop/no-conditional-empty-object-spread": "error",
  "anti-slop/no-known-value-widening": "error",
  "anti-slop/no-module-mocking": "error",
  "anti-slop/no-object-parameters": "error",
  "anti-slop/no-reflect-apply": "error",
  "anti-slop/no-reflect-get": "error",
  "anti-slop/no-runtime-typeof": "error",
  "anti-slop/no-shape-in-symbol-names": "error",
  "anti-slop/no-unknown-parameters": "error",
  "anti-slop/no-unknown-returns": "error",
  "anti-slop/no-unknown-type-aliases": "error",
  "anti-slop/no-unsafe-dictionary-type": "error",
  "anti-slop/no-widen-then-assert": "error",
  "anti-slop/require-safety-comment-for-type-assertion": "error",
} as const

export default defineConfig({
  categories: {
    correctness: "error",
    suspicious: "error",
  },
  env: {
    builtin: true,
  },
  ignorePatterns: [
    "build/icon.ico",
    "build/icon.png",
    "coverage/**",
    "node_modules/**",
    "out/**",
    "release/**",
    "tools/oxlint/anti-slop/**",
  ],
  jsPlugins: [
    {
      name: "anti-slop",
      specifier: "./tools/oxlint/anti-slop/index.ts",
    },
  ],
  options: {
    denyWarnings: true,
    reportUnusedDisableDirectives: "error",
  },
  plugins: ["typescript", "react", "vitest", "unicorn", "oxc"],
  rules: {
    ...antiSlopRules,
    "react/react-in-jsx-scope": "off",
  },
  overrides: [
    {
      files: ["**/*.d.ts"],
      rules: {
        "unicorn/require-module-specifiers": "off",
      },
    },
    {
      files: ["src/renderer/**/*.{ts,tsx}"],
      env: {
        browser: true,
      },
    },
    {
      files: [
        "electron-builder.config.cjs",
        "electron.vite.config.ts",
        "scripts/**/*.mjs",
        "src/main/**/*.ts",
        "src/preload/**/*.ts",
        "vitest.config.ts",
      ],
      env: {
        node: true,
      },
    },
    {
      files: ["**/*.test.ts"],
      env: {
        node: true,
        vitest: true,
      },
    },
  ],
})
