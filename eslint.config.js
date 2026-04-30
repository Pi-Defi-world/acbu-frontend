import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  { 
    ignores: [".next/**"] 
  },
  { 
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], 
    languageOptions: { 
      parserOptions: { ecmaFeatures: { jsx: true } }, 
      globals: globals.browser 
    } 
  },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "no-console": ["warn", { "allow": ["warn", "error"] }]
    }
  }
];