/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        target: 'ES2020',
        module: 'commonjs',
        moduleResolution: 'node',
        emitDecoratorMetadata: true,
        experimentalDecorators: true,
        esModuleInterop: true,
        skipLibCheck: true,
        strict: false,
      },
    }],
  },
  testEnvironment: 'node',
};
