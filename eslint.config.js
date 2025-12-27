import js from "@eslint/js"
import tsPlugin from "@typescript-eslint/eslint-plugin"
import tsParser from "@typescript-eslint/parser"
import prettierConfig from "eslint-config-prettier"
import simpleImportSort from "eslint-plugin-simple-import-sort"
import unusedImports from "eslint-plugin-unused-imports"

export default [
  // Base recommended config
  js.configs.recommended,

  // Global ignores
  {
    ignores: [
      "**/build/**/*",
      "**/dist/**/*",
      "**/node_modules/**/*",
      "**/.next/**/*",
    ],
  },

  // JavaScript config files (babel.config.js, etc.)
  {
    files: ["**/*.js", "**/*.cjs", "**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Node environment globals
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "writable",
        require: "readonly",
        exports: "writable",
      },
    },
  },

  // TypeScript files configuration
  {
    files: ["**/*.ts", "**/*.tsx"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        // Node environment globals
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        module: "readonly",
        require: "readonly",
        // Browser globals
        chrome: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        btoa: "readonly",
        atob: "readonly",
        // React globals (for JSX)
        React: "readonly",
        JSX: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLDivElement: "readonly",
        Event: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        RequestInit: "readonly",
        Response: "readonly",
        Headers: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "simple-import-sort": simpleImportSort,
      "unused-imports": unusedImports,
    },
    rules: {
      // TypeScript recommended rules
      ...tsPlugin.configs.recommended.rules,

      // Disabled rules (as per original config)
      "@typescript-eslint/no-unused-vars": "off", // replaced by unused-imports
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/ban-types": "off",
      "no-var": "off",
      "no-unused-vars": "off", // replaced by unused-imports

      // Import sorting
      "simple-import-sort/exports": "error",
      "simple-import-sort/imports": [
        "error",
        {
          groups: [["^\\u0000", "^node:", "^@?\\w", "^", "^\\."]],
        },
      ],

      // Unused imports handling
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },

  // Test files configuration
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/__tests__/**/*.ts", "**/__tests__/**/*.tsx", "**/test/**/*.ts"],
    languageOptions: {
      globals: {
        // Jest globals
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        fail: "readonly",
        // Node globals for test setup
        global: "writable",
      },
    },
    rules: {
      // Allow unreachable code in tests (sometimes used for fail assertions)
      "no-unreachable": "off",
    },
  },

  // Prettier config (must be last to override other configs)
  prettierConfig,
]
