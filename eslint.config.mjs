import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Backend Python files (not lintable by ESLint)
    "backend/**",
    // Playwright MCP logs
    ".playwright-mcp/**",
    // Claude helpers (auto-generated)
    ".claude/**",
  ]),
  // Project-specific rule overrides
  {
    rules: {
      // Downgraded to warn: 371 legacy instances across 100+ files.
      // New code should avoid `any` — enforce via code review.
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars: prefix with _ to suppress
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        caughtErrorsIgnorePattern: "^_",
      }],
    },
  },
]);

export default eslintConfig;
