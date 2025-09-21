/**
 * Test setup for Copilot MCP Toolset
 */

// Global test setup
beforeAll(() => {
  // Setup test environment
  process.env.NODE_ENV = 'test';
  process.env.COPILOT_MCP_TEST = 'true';
});

afterAll(() => {
  // Cleanup test environment
  delete process.env.COPILOT_MCP_TEST;
});

// Mock console methods in test environment
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};