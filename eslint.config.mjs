import tseslint from "typescript-eslint";
import eslint from "@eslint/js";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/*.config.js",
      "**/*.config.ts",
      "**/vite.config.ts",
      "**/vitest.config.ts",
      "**/.vitepress/**",
      "**/out/**",
      "**/output/**",
      "**/.next/**",
      "**/.nuxt/**",
      "**/public/**",
      "**/.cache/**",
      "**/temp/**",
      "**/tmp/**"
    ]
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      import: importPlugin
    },
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        exports: "writable",
        module: "writable",
        require: "readonly",
        global: "writable",
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        Promise: "readonly",
        performance: "readonly",
        crypto: "readonly",
        btoa: "readonly",
        atob: "readonly",
        NodeJS: "readonly",
        WeakRef: "readonly",
        FinalizationRegistry: "readonly",
        queueMicrotask: "readonly",
        structuredClone: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        Event: "readonly",
        EventTarget: "readonly",
        MessageChannel: "readonly",
        MessagePort: "readonly",
        TextDecoder: "readonly",
        TextEncoder: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        FormData: "readonly",
        Headers: "readonly",
        Request: "readonly",
        Response: "readonly",
        fetch: "readonly",
        Blob: "readonly",
        File: "readonly",
        FileReader: "readonly",
        afterEach: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        test: "readonly",
        vi: "readonly",
        jest: "readonly"
      }
    },
    settings: {
      react: {
        version: "detect"
      },
      "import/resolver": {
        typescript: {
          alwaysTryTypes: true
        }
      }
    },
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["error", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-non-null-assertion": "warn",
      
      // React rules
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      
      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      
      // Import rules
      "import/no-unresolved": ["error", {
        ignore: ["^@blac/", "^vite", "^vitest"]
      }],
      "import/named": "error",
      "import/default": "error",
      "import/namespace": "error",
      "import/no-duplicates": "error",
      
      // General rules
      "no-undef": "off", // TypeScript handles this better
      "no-console": "off",
      "no-debugger": "warn"
    }
  },
  {
    files: ["**/*.js"],
    rules: {
      "@typescript-eslint/no-var-requires": "off"
    }
  },
  {
    files: ["**/*.test.ts", "**/*.test.tsx", "**/*.typetest.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }]
    }
  },
  {
    files: ["packages/blac-core/**/*.ts", "packages/blac-core/**/*.tsx", "packages/blac-react/**/*.ts", "packages/blac-react/**/*.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  },
  {
    files: [
      "packages/devtools-connect/**/*.ts",
      "packages/devtools-connect/**/*.tsx",
      "packages/logging-plugin/**/*.ts",
      "packages/logging-plugin/**/*.tsx"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
);
