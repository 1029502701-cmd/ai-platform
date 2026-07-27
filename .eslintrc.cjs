module.exports = {
  root: true,
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-var': 'off',
    'prefer-const': 'warn',
    '@typescript-eslint/no-unused-vars': 'warn',
    'no-console': 'off',
    semi: 'off',
    quotes: 'off',
    'no-empty': ['error', { allowEmptyCatch: true }],
    // Pre-existing patterns — relax these rules
    'no-control-regex': 'off',
    'prefer-spread': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'no-useless-escape': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.wrangler/',
    'worker-configuration.d.ts',
    'functions/eslint.config.mjs',
  ],
};
