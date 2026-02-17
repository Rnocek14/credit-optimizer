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
      "no-console": ["error", { "allow": ["warn", "error"] }],
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
        {
          selector: "Literal[value=/hsl\\(var\\(--/]",
          message: "❌ Don't wrap OKLCH variables in hsl(). Use var(--xxx) directly or color-mix() for opacity. See src/design/COLOR_SYSTEM.md"
        },
        {
          selector: "TemplateLiteral[quasis.0.value.raw=/hsl\\(var\\(--/]",
          message: "❌ Don't wrap OKLCH variables in hsl(). Use var(--xxx) directly or color-mix() for opacity. See src/design/COLOR_SYSTEM.md"
        },
        {
          selector: "JSXAttribute[name.name='href'][value.expression.type='Identifier']",
          message: "❌ Use SafeExternalLink or sanitizeCourseUrl() for dynamic href values. Direct URL variables are unsafe. See src/components/ui/SafeExternalLink.tsx"
        },
        {
          selector: "JSXAttribute[name.name='href'][value.expression.type='MemberExpression']",
          message: "❌ Use SafeExternalLink or sanitizeCourseUrl() for dynamic href values. Direct URL variables are unsafe. See src/components/ui/SafeExternalLink.tsx"
        },
        {
          selector: "ImportDeclaration[source.value=/lib\\/admin/]",
          message: "❌ Admin modules (src/lib/admin/*) can only be imported from admin pages/components. See src/lib/admin/README.md"
        }
      ],
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
  },

  // ══════════════════════════════════════════════════════════════
  // PR 6: Data Access Rules — enforced in shared/features, warn in legacy
  // ══════════════════════════════════════════════════════════════

  // ERROR in shared/ and features/ (the "new world" — must be clean)
  {
    files: ["src/shared/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          {
            name: "@/integrations/supabase/client",
            importNames: ["supabase"],
            message: "In shared/features, import supabase from '@/shared/lib/api/client' instead."
          }
        ],
        patterns: [{
          group: ["@/integrations/supabase/client"],
          message: "In shared/features, import supabase from '@/shared/lib/api/client' instead."
        }]
      }]
    }
  },

  // WARN in pages/components (legacy — being migrated)
  {
    files: ["src/components/**/*.{ts,tsx}", "src/pages/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": [
        "warn",
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
        },
        {
          selector: "ImportDeclaration[source.value=/lib\\/admin/]",
          message: "❌ Admin modules (src/lib/admin/*) can only be imported from admin pages/components."
        },
        // Block direct supabase.from() in components/pages
        {
          selector: "CallExpression[callee.property.name='from'][callee.object.name='supabase']",
          message: "❌ Do not call supabase.from() in components/pages. Use src/shared/lib/api + a hook instead."
        },
        // Block direct supabase.rpc() in components/pages
        {
          selector: "CallExpression[callee.property.name='rpc'][callee.object.name='supabase']",
          message: "❌ Do not call supabase.rpc() in components/pages. Use src/shared/lib/api + a hook instead."
        }
      ],
      // Ban importing supabase client directly in pages/components
      "no-restricted-imports": ["warn", {
        paths: [
          {
            name: "@/integrations/supabase/client",
            importNames: ["supabase"],
            message: "Do not import supabase client in pages/components. Use src/shared/lib/api + hooks instead."
          }
        ],
        patterns: [{
          group: ["@/integrations/supabase/client"],
          message: "Do not import supabase client in pages/components. Use src/shared/lib/api + hooks instead."
        }]
      }]
    }
  },

  // ══════════════════════════════════════════════════════════════
  // PR 7: Prevent rogue ErrorBoundary class definitions
  // ══════════════════════════════════════════════════════════════
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/enhanced/EnhancedErrorBoundary.tsx"],
    rules: {
      "no-restricted-syntax": [
        "warn",
        {
          selector: "ClassDeclaration[id.name='ErrorBoundary']",
          message: "Do not create new ErrorBoundary classes. Use EnhancedErrorBoundary from @/components/enhanced/EnhancedErrorBoundary."
        }
      ]
    }
  }
);
