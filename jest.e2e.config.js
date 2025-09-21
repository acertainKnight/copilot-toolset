/** @type {import('jest').Config} */
export default {
  displayName: 'E2E Tests',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/e2e'],
  testMatch: [
    '**/*.e2e.test.ts'
  ],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts'
  ],
  coverageDirectory: 'coverage/e2e',
  coverageReporters: ['text', 'lcov', 'html', 'json'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@modelcontextprotocol))'
  ],
  testTimeout: 60000,
  maxWorkers: 1, // E2E tests should run sequentially
  globalSetup: '<rootDir>/tests/e2e/globalSetup.ts',
  globalTeardown: '<rootDir>/tests/e2e/globalTeardown.ts'
};