/** @type {import('jest').Config} */
export default {
  displayName: 'Performance Tests',
  preset: 'ts-jest/presets/default-esm',
  extensionsToTreatAsEsm: ['.ts'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  testEnvironment: 'node',
  roots: ['<rootDir>/tests/performance'],
  testMatch: [
    '**/*.perf.test.ts'
  ],
  collectCoverage: false, // Performance tests don't need coverage
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$|@modelcontextprotocol))'
  ],
  testTimeout: 120000, // 2 minutes for performance tests
  maxWorkers: 1, // Performance tests should run in isolation
  verbose: true,
  silent: false, // We want to see performance output
  reporters: [
    'default',
    ['<rootDir>/tests/performance/PerformanceReporter.ts', {}]
  ]
};