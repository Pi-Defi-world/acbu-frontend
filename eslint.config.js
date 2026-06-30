import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { 
    ignores: [".next/**", ".kilo/**"] 
  },
  { 
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx,json}"], 
    languageOptions: { 
      parserOptions: { ecmaFeatures: { jsx: true } }, 
      globals: globals.browser 
    } 
  },
  {
    files: ["*.config.{js,mjs,cjs}", "*.config.*.{js,mjs,cjs}"],
    languageOptions: {
      globals: globals.node,
    },
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-console": ["warn", { "allow": ["warn", "error"] }]
    }
  }
];