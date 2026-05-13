import type { Config } from 'jest';

/**
 * Spancle Sports OS — Jest Base Configuration
 *
 * All apps and services extend this config via:
 *   import baseConfig from '../../tests/jest.config.base';
 *
 * Per-workspace jest.config.ts sets:
 *   - rootDir
 *   - moduleNameMapper (path aliases)
 *   - testMatch (unit vs integration vs e2e)
 */

const baseConfig: Config = {
  // Runner
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Transform
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.json',
        diagnostics: {
          ignoreCodes: ['TS151001'],
        },
      },
    ],
  },

  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.dto.ts',           // DTOs excluded — validated by e2e
    '!src/**/*.module.ts',        // Module wiring excluded
    '!src/**/*.entity.ts',        // Entities excluded — tested via repository
    '!src/**/index.ts',           // Barrel files excluded
    '!src/**/*.interface.ts',     // Interfaces excluded
    '!src/**/*.type.ts',          // Types excluded
    '!src/**/*.enum.ts',          // Enums excluded
    '!src/main.ts',               // Bootstrap excluded
  ],

  coverageThresholds: {
    global: {
      branches: 80,
      functions: 85,
      lines: 85,
      statements: 85,
    },
  },

  coverageReporters: ['text', 'lcov', 'json-summary', 'html'],

  coverageDirectory: '<rootDir>/coverage',

  // Module resolution
  moduleFileExtensions: ['js', 'json', 'ts'],

  // Setup files
  setupFilesAfterFramework: [],

  // Timeouts
  testTimeout: 30000,

  // Output
  verbose: true,

  // Detect open handles (catches DB connection leaks)
  detectOpenHandles: true,

  // Run tests serially in CI to prevent port conflicts
  maxWorkers: process.env['CI'] ? 1 : '50%',

  // Cache
  cache: true,

  // Reporters
  reporters: process.env['CI']
    ? [
        'default',
        ['jest-junit', {
          outputDirectory: './test-results',
          outputName: 'junit.xml',
          suiteName: 'Spancle Sports OS',
        }],
      ]
    : ['default'],
};

export default baseConfig;
