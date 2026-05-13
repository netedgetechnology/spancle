'use strict';

/**
 * Spancle Sports OS — Root ESLint Configuration
 *
 * This is the governance layer for all workspaces.
 * Apps and services MUST extend from packages/eslint-config.
 * No workspace may relax rules without a documented architectural decision.
 */

module.exports = {
  root: true,

  parser: '@typescript-eslint/parser',

  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    project: ['./tsconfig.base.json'],
    tsconfigRootDir: __dirname,
  },

  plugins: [
    '@typescript-eslint',
    'import',
  ],

  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier', // MUST be last — disables formatting rules handled by Prettier
  ],

  rules: {
    /* TypeScript */
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/no-unused-vars': ['error', {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_',
    }],
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    }],
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
    '@typescript-eslint/no-unnecessary-type-assertion': 'error',
    '@typescript-eslint/prefer-nullish-coalescing': 'error',
    '@typescript-eslint/prefer-optional-chain': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', {
      prefer: 'type-imports',
      disallowTypeAnnotations: false,
    }],
    '@typescript-eslint/consistent-type-exports': 'error',
    '@typescript-eslint/no-import-type-side-effects': 'error',

    /* NestJS / Decorator Compatibility */
    '@typescript-eslint/no-unsafe-assignment': 'warn',
    '@typescript-eslint/no-unsafe-member-access': 'warn',
    '@typescript-eslint/no-unsafe-call': 'warn',
    '@typescript-eslint/no-unsafe-return': 'warn',

    /* Imports */
    'import/order': ['error', {
      groups: [
        'builtin',
        'external',
        'internal',
        'parent',
        'sibling',
        'index',
        'type',
      ],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    }],
    'import/no-duplicates': 'error',
    'import/no-cycle': ['error', { maxDepth: 5 }],
    'import/no-self-import': 'error',
    'import/no-extraneous-dependencies': ['error', {
      devDependencies: [
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/*.e2e-spec.ts',
        '**/jest.config*.ts',
        '**/jest.config*.js',
        '**/scripts/**',
        '**/tests/**',
      ],
    }],

    /* General Quality */
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-debugger': 'error',
    'no-alert': 'error',
    'prefer-const': 'error',
    'no-var': 'error',
    'eqeqeq': ['error', 'always', { null: 'ignore' }],
    'curly': ['error', 'all'],
    'no-throw-literal': 'error',
    'no-return-await': 'off', // Disabled — @typescript-eslint version preferred
    '@typescript-eslint/return-await': ['error', 'in-try-catch'],
  },

  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
        project: ['./tsconfig.base.json', './apps/*/tsconfig.json', './services/*/tsconfig.json'],
      },
      node: {
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },

  overrides: [
    /* Test files — relaxed rules */
    {
      files: ['**/*.spec.ts', '**/*.test.ts', '**/*.e2e-spec.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        '@typescript-eslint/no-unsafe-assignment': 'off',
        '@typescript-eslint/no-unsafe-member-access': 'off',
        '@typescript-eslint/no-unsafe-call': 'off',
        'import/no-extraneous-dependencies': 'off',
      },
    },
    /* JavaScript config files */
    {
      files: ['*.js', '*.cjs', '*.mjs'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
      },
    },
  ],

  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.next/',
    'coverage/',
    '*.d.ts',
    'pnpm-lock.yaml',
  ],
};
