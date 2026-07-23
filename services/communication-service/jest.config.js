/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir:              '.',
  testRegex:            '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        // Inline tsconfig so ts-jest compiles spec files without the base chain issue
        module:                    'commonjs',
        moduleResolution:          'node',
        target:                    'ES2021',
        experimentalDecorators:    true,
        emitDecoratorMetadata:     true,
        strictPropertyInitialization: false,
        skipLibCheck:              true,
        strict:                    false,
        esModuleInterop:           true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  collectCoverageFrom: ['src/**/*.(t|j)s'],
  coverageDirectory:   './coverage',
  testEnvironment:     'node',
  moduleNameMapper: {
    '^@common/(.*)$': '<rootDir>/src/common/$1',
    '^@modules/(.*)$': '<rootDir>/src/modules/$1',
  },
};
