module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    "plugin:react/recommended",
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    sourceType: "module",
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 12,
  },
  "settings": {
    "react": {
      version: "detect"
    }
  },
  plugins: [
    "@typescript-eslint",
    "react",
    "@typescript-eslint"
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
  }
};
