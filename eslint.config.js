import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // Block undersized touch targets in interactive elements
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/\\b(min-h|h)-(8|9|10|11)\\b/]",
          message: "Interactive targets must be ≥48px (use h-12/min-h-12)."
        },
        {
          selector: "AssignmentExpression[left.property.name='signature'][right.type='TemplateLiteral']",
          message: "Use buildMarketplaceSig() for marketplace.signature — no template literals."
        },
        {
          selector: "AssignmentExpression[left.property.name='signature'][right.type='BinaryExpression']",
          message: "Use buildMarketplaceSig() for marketplace.signature — no string concatenation."
        }
      ],
      // Block new usage of deprecated V3NodeData.year field
      "no-restricted-properties": [
        "error",
        {
          object: "*",
          property: "year",
          message: "Use 'tier' instead of deprecated 'year' field (V3NodeData). Phase 4 will remove 'year'."
        }
      ]
    },
  }
);
