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
      // Restrict console in production builds (allow in development)
      "no-console": ["error", { "allow": ["warn", "error"] }],
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
        },
        // OKLCH Color System Guards - prevent hsl() wrapping of OKLCH variables
        {
          selector: "Literal[value=/hsl\\(var\\(--/]",
          message: "❌ Don't wrap OKLCH variables in hsl(). Use var(--xxx) directly or color-mix() for opacity. See src/design/COLOR_SYSTEM.md"
        },
        {
          selector: "TemplateLiteral[quasis.0.value.raw=/hsl\\(var\\(--/]",
          message: "❌ Don't wrap OKLCH variables in hsl(). Use var(--xxx) directly or color-mix() for opacity. See src/design/COLOR_SYSTEM.md"
        },
        // URL Sanitization Guards - prevent direct use of dynamic URLs in href
        {
          selector: "JSXAttribute[name.name='href'][value.expression.type='Identifier']",
          message: "❌ Use SafeExternalLink or sanitizeCourseUrl() for dynamic href values. Direct URL variables are unsafe. See src/components/ui/SafeExternalLink.tsx"
        },
        {
          selector: "JSXAttribute[name.name='href'][value.expression.type='MemberExpression']",
          message: "❌ Use SafeExternalLink or sanitizeCourseUrl() for dynamic href values. Direct URL variables are unsafe. See src/components/ui/SafeExternalLink.tsx"
        },
        // BOUNDARY GUARD: Prevent admin module imports outside admin routes
        {
          selector: "ImportDeclaration[source.value=/lib\\/admin/]",
          message: "❌ Admin modules (src/lib/admin/*) can only be imported from admin pages/components. See src/lib/admin/README.md"
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
  },
  // EXCEPTION: Allow admin module imports in admin pages
  {
    files: ["src/pages/admin/**/*.{ts,tsx}", "src/components/admin/**/*.{ts,tsx}", "src/features/admin/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "error",
        // Keep other restrictions but remove admin import restriction for admin files
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
        },
        {
          selector: "Literal[value=/hsl\\(var\\(--/]",
          message: "❌ Don't wrap OKLCH variables in hsl(). Use var(--xxx) directly or color-mix() for opacity."
        },
        {
          selector: "TemplateLiteral[quasis.0.value.raw=/hsl\\(var\\(--/]",
          message: "❌ Don't wrap OKLCH variables in hsl(). Use var(--xxx) directly or color-mix() for opacity."
        },
        {
          selector: "JSXAttribute[name.name='href'][value.expression.type='Identifier']",
          message: "❌ Use SafeExternalLink or sanitizeCourseUrl() for dynamic href values."
        },
        {
          selector: "JSXAttribute[name.name='href'][value.expression.type='MemberExpression']",
          message: "❌ Use SafeExternalLink or sanitizeCourseUrl() for dynamic href values."
        }
        // NOTE: Admin import restriction intentionally omitted for admin files
      ]
    }
  }
);
