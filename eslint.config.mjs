import tsparser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**", "*.js", "*.mjs"],
  },
  ...obsidianmd.configs.recommended,
  // Use recommendedTypeChecked for TypeScript files (matches Obsidian's config)
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        sourceType: "module",
        project: "./tsconfig.json",
      },
    },
    rules: {
      // Disable base rules in favor of TypeScript versions
      "no-unused-vars": "off",
      "no-case-declarations": "error",
      "no-prototype-builtins": "off",
      
      // TypeScript ESLint rules
      "@typescript-eslint/no-unused-vars": ["error", { args: "none" }],
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-empty-function": "off",
      "@typescript-eslint/no-inferrable-types": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "error",
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      // Add rule for promises returned in callbacks
      "@typescript-eslint/no-misused-promises": [
        "error",
        {
          checksVoidReturn: true,
          checksConditionals: true,
        },
      ],
      
      // Obsidian plugin rules (ensure command rules are enabled)
      "obsidianmd/commands/no-plugin-id-in-command-id": "error",
      "obsidianmd/commands/no-plugin-name-in-command-name": "error",
      "obsidianmd/ui/sentence-case": "error",
      "obsidianmd/no-static-styles-assignment": "error",
    },
  },
]);

