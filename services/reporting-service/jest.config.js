module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: {
        module: 'commonjs', moduleResolution: 'node', target: 'ES2021',
        experimentalDecorators: true, emitDecoratorMetadata: true,
        strictPropertyInitialization: false, skipLibCheck: true,
        strict: false, esModuleInterop: true, allowSyntheticDefaultImports: true,
      },
    }],
  },
  testEnvironment: 'node',
};
